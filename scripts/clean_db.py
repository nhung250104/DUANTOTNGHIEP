"""
clean_db.py — dọn dữ liệu trùng lặp trong db.json.

Logic:
  - users: nhóm theo email (đã trim + lowercase). Giữ user có id NHỎ NHẤT
    (vào trước), xoá các user dup khác.
  - partners: nhóm theo email. Giữ partner có id nhỏ nhất, xoá phần còn lại.
  - Khi xoá user/partner, cập nhật các tham chiếu (parentId, partnerId, userId)
    nếu trỏ tới id đã xoá → trỏ về id "sống sót".
  - notifications: nhóm theo (type, partnerId, message), giữ id nhỏ nhất.

Idempotent: chạy lại không gây hại.

Usage:
    python3 scripts/clean_db.py
"""

import json
from pathlib import Path
from collections import defaultdict

DB = Path(__file__).resolve().parent.parent / "src" / "mock" / "db.json"


def norm_email(e):
    return (e or "").strip().lower()


def main():
    with open(DB, "r", encoding="utf-8") as f:
        d = json.load(f)

    users    = d.get("users", [])
    partners = d.get("partners", [])

    # ── Dedupe users theo email, giữ id nhỏ nhất ──
    by_email = defaultdict(list)
    for u in users:
        if u.get("email"):
            by_email[norm_email(u["email"])].append(u)
    user_remap = {}  # old_id → kept_id
    for email, group in by_email.items():
        if len(group) <= 1:
            continue
        group_sorted = sorted(group, key=lambda x: int(x["id"]))
        keeper = group_sorted[0]
        for dup in group_sorted[1:]:
            user_remap[str(dup["id"])] = str(keeper["id"])
            print(f"[users] dup email={email}: drop id={dup['id']} → keep id={keeper['id']}")

    # Loại bỏ users có id nằm trong dup
    dropped_user_ids = set(user_remap.keys())
    users_clean = [u for u in users if str(u["id"]) not in dropped_user_ids]

    # ── Dedupe partners theo email, giữ id nhỏ nhất ──
    by_email_p = defaultdict(list)
    for p in partners:
        if p.get("email"):
            by_email_p[norm_email(p["email"])].append(p)
    partner_remap = {}
    for email, group in by_email_p.items():
        if len(group) <= 1:
            continue
        group_sorted = sorted(group, key=lambda x: int(x["id"]))
        keeper = group_sorted[0]
        for dup in group_sorted[1:]:
            partner_remap[str(dup["id"])] = str(keeper["id"])
            print(f"[partners] dup email={email}: drop id={dup['id']} → keep id={keeper['id']}")

    dropped_partner_ids = set(partner_remap.keys())
    partners_clean = [p for p in partners if str(p["id"]) not in dropped_partner_ids]

    # ── Cập nhật references ──
    # partner.userId → có thể đã được remap
    # partner.parentId → có thể đã được remap (theo partner_remap)
    for p in partners_clean:
        if str(p.get("userId")) in user_remap:
            p["userId"] = user_remap[str(p["userId"])]
        if p.get("parentId") and str(p["parentId"]) in partner_remap:
            p["parentId"] = partner_remap[str(p["parentId"])]

    # customers.userId
    for c in d.get("customers", []):
        if str(c.get("userId")) in user_remap:
            c["userId"] = user_remap[str(c["userId"])]

    # customerContracts.partnerId
    for c in d.get("customerContracts", []):
        if str(c.get("partnerId")) in partner_remap:
            c["partnerId"] = partner_remap[str(c["partnerId"])]

    # commissionHistory.partnerId, sourcePartnerId
    for h in d.get("commissionHistory", []):
        if str(h.get("partnerId")) in partner_remap:
            h["partnerId"] = partner_remap[str(h["partnerId"])]
        if str(h.get("sourcePartnerId")) in partner_remap:
            h["sourcePartnerId"] = partner_remap[str(h["sourcePartnerId"])]

    # promotionHistory.partnerId
    for h in d.get("promotionHistory", []):
        if str(h.get("partnerId")) in partner_remap:
            h["partnerId"] = partner_remap[str(h["partnerId"])]

    # upgradeRequests, branchTransferRequests, joinTeamRequests, commissionRequests, notifications
    for col in ["upgradeRequests", "branchTransferRequests", "joinTeamRequests",
                "commissionRequests", "notifications"]:
        for r in d.get(col, []):
            if str(r.get("partnerId")) in partner_remap:
                r["partnerId"] = partner_remap[str(r["partnerId"])]
            if str(r.get("currentParentId", "")) in partner_remap:
                r["currentParentId"] = partner_remap[str(r["currentParentId"])]
            if str(r.get("newParentId", "")) in partner_remap:
                r["newParentId"] = partner_remap[str(r["newParentId"])]

    # ── Dedupe notifications theo (type, partnerId, message) ──
    by_key = defaultdict(list)
    for n in d.get("notifications", []):
        key = (n.get("type"), str(n.get("partnerId")), n.get("message"))
        by_key[key].append(n)
    noti_clean = []
    seen_ids = set()
    for n in d.get("notifications", []):
        key = (n.get("type"), str(n.get("partnerId")), n.get("message"))
        group = by_key[key]
        if len(group) <= 1:
            noti_clean.append(n)
            continue
        keeper = sorted(group, key=lambda x: int(x["id"]))[0]
        if str(n["id"]) == str(keeper["id"]) and n["id"] not in seen_ids:
            noti_clean.append(n)
            seen_ids.add(n["id"])
        elif n["id"] != keeper["id"]:
            print(f"[notifications] drop dup id={n['id']} (kept {keeper['id']}): {n.get('title')}")

    # ── Đồng bộ user.name + status với partner cùng email ──
    # Khi dedupe user theo email, đôi khi user "sống sót" có name không khớp
    # (vd "gdggs" thay vì "Nông Thị Trương Nhung"). Sync lại theo partner.
    partner_by_email = {norm_email(p.get("email")): p for p in partners_clean if p.get("email")}
    for u in users_clean:
        p = partner_by_email.get(norm_email(u.get("email", "")))
        if p and p.get("name") and u.get("name") != p.get("name"):
            print(f"[users] sync name id={u['id']}: '{u['name']}' → '{p['name']}'")
            u["name"] = p["name"]
        if p and u.get("status") == "locked" and p.get("status") == "approved":
            print(f"[users] unlock id={u['id']} (partner approved)")
            u["status"] = "active"

    # Lưu lại
    d["users"]         = users_clean
    d["partners"]      = partners_clean
    d["notifications"] = noti_clean

    schema = d.pop("$schema", None)
    if schema is not None:
        d["$schema"] = schema

    with open(DB, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

    print()
    print("Sau dedupe:")
    print(f"  users:         {len(users_clean)} (was {len(users)})")
    print(f"  partners:      {len(partners_clean)} (was {len(partners)})")
    print(f"  notifications: {len(noti_clean)} (was {len(d.get('notifications', []))})")


if __name__ == "__main__":
    main()
