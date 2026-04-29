/**
 * src/store/placementService.js
 *
 * Auto-placement cho thành viên "Tự do chờ xếp nhánh" (status=approved, parentId=null,
 * memberType=NORMAL).
 *
 * Rule:
 *   1. Ưu tiên node có ít F1 nhất.
 *   2. F1 bằng nhau → node có id nhỏ hơn (vào hệ thống trước) ưu tiên.
 *   3. Node đầy (F1 ≥ MAX_F1_PER_NODE) → bỏ qua.
 *   4. Không tạo vòng lặp: ứng viên không được nằm trong subtree của partner đang xếp.
 *
 * Ngưỡng "đầy" mặc định 10 — có thể truyền vào pickPlacement(maxPerNode).
 */

import api from "./api";

export const DEFAULT_MAX_F1 = 10;

/* ─── Helpers (pure) ─────────────────────────────────────── */

/** Đếm F1 của 1 partner (số con trực tiếp đã approved). */
const countF1 = (partners, parentId) =>
  partners.filter((p) => String(p.parentId) === String(parentId) && p.status === "approved").length;

/** Lấy toàn bộ subtree (id) của partner, kể cả chính nó. */
function collectSubtreeIds(partners, rootId) {
  const ids = new Set([String(rootId)]);
  // Lặp qua mỗi vòng — số lần lặp ≤ độ sâu cây
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of partners) {
      if (p.parentId && ids.has(String(p.parentId)) && !ids.has(String(p.id))) {
        ids.add(String(p.id));
        changed = true;
      }
    }
  }
  return ids;
}

/* ─── Core algorithm (pure) ──────────────────────────────── */

/**
 * Trả về node phù hợp nhất để gắn `target` làm F1, hoặc null nếu không còn slot.
 *
 * @param {Array}  partners      Toàn bộ partners (raw data)
 * @param {Object} target        Partner đang cần xếp (đã có id)
 * @param {Number} maxPerNode    Ngưỡng "đầy" (mặc định 10)
 * @returns {Object|null}        partner phù hợp hoặc null
 */
export function pickPlacement(partners, target, maxPerNode = DEFAULT_MAX_F1) {
  if (!target?.id) return null;

  // Loại trừ subtree của target để tránh loop, và loại chính target.
  const excluded = collectSubtreeIds(partners, target.id);

  // Active candidates: approved + tham gia hệ thống (NORMAL/PARTNER), không phải INDEPENDENT.
  const candidates = partners
    .filter((p) =>
      p.status === "approved"
      && p.memberType !== "INDEPENDENT"
      && !excluded.has(String(p.id))
    )
    .map((p) => ({ p, f1: countF1(partners, p.id) }))
    .filter(({ f1 }) => f1 < maxPerNode)
    .sort((a, b) => {
      if (a.f1 !== b.f1) return a.f1 - b.f1;            // ít F1 trước
      return Number(a.p.id) - Number(b.p.id);           // tie-breaker: id nhỏ hơn (vào trước)
    });

  return candidates.length > 0 ? candidates[0].p : null;
}

/* ─── API integration ────────────────────────────────────── */

/**
 * Áp dụng auto-placement cho 1 partner đang ở diện "chờ xếp nhánh".
 * Trả về { ok, partner, parent, reason }.
 */
export async function autoPlaceOne(target, maxPerNode = DEFAULT_MAX_F1) {
  // Pull dữ liệu mới nhất để tránh stale state
  const res = await api.get("/partners");
  const all = Array.isArray(res.data) ? res.data : [];

  const fresh = all.find((p) => String(p.id) === String(target.id));
  if (!fresh) return { ok: false, reason: "Không tìm thấy partner" };
  if (fresh.parentId)               return { ok: false, reason: "Đối tác đã có cấp trên rồi" };
  if (fresh.memberType === "INDEPENDENT") return { ok: false, reason: "INDEPENDENT không thuộc cây phân cấp" };
  if (fresh.status !== "approved")  return { ok: false, reason: "Đối tác chưa được duyệt" };

  const parent = pickPlacement(all, fresh, maxPerNode);
  if (!parent) return { ok: false, reason: "Không tìm thấy cấp trên phù hợp (mọi node đã đầy hoặc rỗng hệ thống)" };

  const updated = {
    ...fresh,
    parentId:     String(parent.id),
    referralCode: parent.code || null,
    memberType:   "NORMAL",
  };
  await api.put(`/partners/${fresh.id}`, updated);

  return { ok: true, partner: updated, parent };
}
