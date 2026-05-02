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

    # 6. Tách 2 khái niệm rõ ràng:
    #    - level (cấp trong cây): 0=ROOT, 1=F1, 2=F2, 3=F3. Tính từ parentId chain.
    #    - rank  (hạng): "Member" | "Leader" | "Partner" | "Senior Partner". Theo KPI.
    partners = d.get("partners", [])

    # Map old field semantic → rank.
    # Lịch sử migrate: level cũ trước đây từng là tier (3=newcomer, 0=top).
    # Map: level cũ 3→Member, 2→Leader, 1→Partner, 0→Senior Partner.
    OLD_LEVEL_TO_RANK = {3: "Member", 2: "Leader", 1: "Partner", 0: "Senior Partner"}

    # Step 1: Backup level/tier cũ thành rank (chỉ làm 1 lần)
    for p in partners:
        if p.get("rank"):
            continue  # đã migrate
        if p.get("tier") in (1, 2, 3):
            # tier 1=newcomer, 3=top
            tier_to_rank = {1: "Member", 2: "Leader", 3: "Partner"}
            p["rank"] = tier_to_rank.get(p["tier"], "Member")
        elif isinstance(p.get("level"), int) and 0 <= p["level"] <= 3:
            p["rank"] = OLD_LEVEL_TO_RANK.get(p["level"], "Member")
        else:
            p["rank"] = "Member"
        p["rankLabel"] = p["rank"]
        p.pop("tier", None)
        p.pop("tierLabel", None)

    # Step 2: Recompute level = tree depth (0..3, cap 3)
    by_id = {str(p.get("id")): p for p in partners}

    def compute_depth(pid, seen=None):
        seen = seen or set()
        if pid in seen:
            return 0  # cycle guard
        seen.add(pid)
        p = by_id.get(str(pid))
        if not p or not p.get("parentId"):
            return 0
        return min(3, compute_depth(str(p["parentId"]), seen) + 1)

    for p in partners:
        depth = compute_depth(str(p.get("id")))
        p["level"]      = depth
        p["levelLabel"] = f"Cấp {depth}"

    # 7. Migrate upgradeRequests: thêm currentRank/newRank cho entry chỉ có currentLevel.
    #    Lý do: spec mới — nâng cấp = nâng HẠNG (rank) chứ không phải level.
    OLD_LEVEL_TO_RANK_LEGACY = {3: "Member", 2: "Leader", 1: "Partner", 0: "Senior Partner"}
    NEXT_RANK = {"Member": "Leader", "Leader": "Partner", "Partner": "Senior Partner"}
    for r in d.get("upgradeRequests", []):
        if r.get("currentRank") and r.get("newRank"):
            continue
        # Suy ra hạng cũ từ currentLevel cũ (semantic legacy: 3=newcomer/Member, 0=top).
        old_lvl = r.get("currentLevel")
        if isinstance(old_lvl, int):
            cur_rank = OLD_LEVEL_TO_RANK_LEGACY.get(old_lvl, "Member")
        else:
            cur_rank = "Member"
        r["currentRank"] = r.get("currentRank") or cur_rank
        r["newRank"]     = r.get("newRank") or NEXT_RANK.get(cur_rank, cur_rank)

    # 8. Đảm bảo $schema vẫn nằm cuối (cho tidy)
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
