"""
Migration cho db.json — Phase 1.

Thêm các collection mới (idempotent) và field memberType cho users + partners.
Chạy nhiều lần không gây hại: chỉ điền giá trị nếu chưa có.

Usage:
    python3 scripts/migrate_db.py
"""

import json
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "src" / "mock" / "db.json"

NEW_COLLECTIONS = [
    "customers",
    "commissionHistory",
    "promotionHistory",
    "systemLogs",
    "joinTeamRequests",
]

VALID_MEMBER_TYPES = {"NORMAL", "INDEPENDENT", "PARTNER", "ADMIN"}


def main():
    with open(DB, "r", encoding="utf-8") as f:
        d = json.load(f)

    # 1. Thêm collection mới
    for col in NEW_COLLECTIONS:
        if col not in d:
            d[col] = []

    # 2. memberType cho users
    for u in d.get("users", []):
        existing = u.get("memberType")
        if existing in VALID_MEMBER_TYPES:
            continue
        role = (u.get("role") or "").strip().lower()
        u["memberType"] = "ADMIN" if role == "admin" else "NORMAL"

    # 3. memberType cho partners
    #    - level >= 2 -> PARTNER (đã từng nâng cấp)
    #    - còn lại    -> NORMAL (admin có thể đổi sang INDEPENDENT thủ công)
    for p in d.get("partners", []):
        existing = p.get("memberType")
        if existing in VALID_MEMBER_TYPES:
            continue
        level = p.get("level") or 0
        p["memberType"] = "PARTNER" if level >= 2 else "NORMAL"

    # 4. Backfill refLink cho mọi đối tác đã duyệt (mọi cấp, không chỉ >=2).
    #    Spec mới: Cấp 1 cũng có mã + link giới thiệu.
    for p in d.get("partners", []):
        if p.get("status") == "approved" and not p.get("refLink") and p.get("code"):
            p["refLink"] = f"sivip.vn/ref/{p['code']}"

    # 5. Seed promotionHistory cho Nguyễn Văn D (id=4) nếu đã đạt Cấp 3 mà chưa có lịch sử.
    partners = d.get("partners", [])
    promotions = d.get("promotionHistory", [])
    vand = next((p for p in partners if p.get("id") == "4" and (p.get("level") or 0) >= 3), None)
    if vand and not any(h.get("partnerId") == "4" for h in promotions):
        max_id = max([int(h["id"]) for h in promotions if str(h.get("id", "")).isdigit()] or [0])
        promotions.append({
            "id":          str(max_id + 1),
            "partnerId":   "4",
            "partnerName": vand.get("name", "Nguyễn Văn D"),
            "oldLevel":    1,
            "newLevel":    2,
            "approvedBy":  "Admin",
            "reason":      "Đã đạt 5 F1 trực tiếp + 10 hợp đồng KH thành công.",
            "createdAt":   "15/02/2026",
        })
        promotions.append({
            "id":          str(max_id + 2),
            "partnerId":   "4",
            "partnerName": vand.get("name", "Nguyễn Văn D"),
            "oldLevel":    2,
            "newLevel":    3,
            "approvedBy":  "Admin",
            "reason":      "Đã đạt 10 F1 trực tiếp + 25 hợp đồng + doanh thu 700tr.",
            "createdAt":   "10/04/2026",
        })
        d["promotionHistory"] = promotions

    # 6. Đảm bảo $schema vẫn nằm cuối (cho tidy)
    schema = d.pop("$schema", None)
    if schema is not None:
        d["$schema"] = schema

    with open(DB, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

    summary = {k: (len(v) if isinstance(v, list) else "—") for k, v in d.items() if k != "$schema"}
    members = {}
    for u in d.get("users", []):
        members[u.get("memberType", "?")] = members.get(u.get("memberType", "?"), 0) + 1

    print("Collections:")
    for k, n in summary.items():
        marker = " (NEW)" if k in NEW_COLLECTIONS else ""
        print(f"  {k}: {n}{marker}")
    print()
    print("memberType users:", members)


if __name__ == "__main__":
    main()
