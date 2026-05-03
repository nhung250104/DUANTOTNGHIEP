/**
 * src/store/treeService.js
 *
 * Helpers cho cây phân cấp đối tác (org chart).
 *
 * QUY TẮC (theo spec):
 *   - Cây quản lý qua `parent_id`.
 *   - Cấp 0 = ROOT (không có parent). Con: level = parent.level + 1. Tối đa 3 cấp (0..3).
 *   - INDEPENDENT (memberType="INDEPENDENT") đứng ngoài cây — level = null.
 *   - Level KHÔNG nên lưu cứng — luôn tính động từ chuỗi parent.
 *     (Ta vẫn cache `partner.level` ở DB cho hiệu năng nhưng treeService
 *      cung cấp hàm tính lại để bảo toàn nguồn-sự-thật là parent_id.)
 *
 * API:
 *   computeLevel(id, all)         → 0..3 hoặc null nếu INDEPENDENT
 *   findRoot(id, all)             → partner ở đỉnh nhánh (parent_id=null)
 *   getUpline(id, all)            → mảng tổ tiên từ ROOT xuống tới (không gồm) partner
 *   getDownline(id, all)          → mảng phẳng tất cả con cháu (không gồm partner)
 *   getTree(rootId, all)          → cây {…partner, children:[]} bắt đầu từ rootId
 *   countF1(id, all)              → số F1 (con trực tiếp đã approved)
 *   isInSubtree(targetId, rootId) → kiểm tra targetId có nằm trong subtree của rootId
 */

const MAX_DEPTH = 3;

const findById = (all, id) =>
  (all || []).find((p) => String(p.id) === String(id)) || null;

const isIndependent = (p) =>
  (p?.memberType || "").toUpperCase() === "INDEPENDENT";

/** Tính level động từ chuỗi parent. INDEPENDENT → null. ROOT → 0. */
export function computeLevel(id, all, _seen = new Set()) {
  const p = findById(all, id);
  if (!p || isIndependent(p)) return null;
  if (!p.parentId) return 0;
  const key = String(id);
  if (_seen.has(key)) return 0; // cycle guard
  _seen.add(key);
  const pl = computeLevel(p.parentId, all, _seen);
  if (pl == null) return 1;
  return Math.min(MAX_DEPTH, pl + 1);
}

/** Tìm partner ở đỉnh nhánh (parent_id=null). */
export function findRoot(id, all, _seen = new Set()) {
  let cur = findById(all, id);
  while (cur?.parentId) {
    const key = String(cur.id);
    if (_seen.has(key)) break;
    _seen.add(key);
    const parent = findById(all, cur.parentId);
    if (!parent) break;
    cur = parent;
  }
  return cur;
}

/** Mảng tổ tiên từ ROOT xuống cha trực tiếp (không gồm chính partner). */
export function getUpline(id, all) {
  const result = [];
  const seen = new Set();
  let cur = findById(all, id);
  while (cur?.parentId && !seen.has(String(cur.id))) {
    seen.add(String(cur.id));
    const parent = findById(all, cur.parentId);
    if (!parent) break;
    result.unshift(parent); // ROOT-first
    cur = parent;
  }
  return result;
}

/** Mảng phẳng tất cả con cháu của partner (không gồm partner). */
export function getDownline(id, all) {
  const result = [];
  const queue = [String(id)];
  const seen = new Set([String(id)]);
  while (queue.length > 0) {
    const cur = queue.shift();
    (all || [])
      .filter((p) => String(p.parentId) === cur && !seen.has(String(p.id)))
      .forEach((child) => {
        seen.add(String(child.id));
        result.push(child);
        queue.push(String(child.id));
      });
  }
  return result;
}

/** Build cây {…partner, children:[]} bắt đầu từ rootId. */
export function getTree(rootId, all) {
  if (!rootId) return null;
  const map = {};
  (all || []).forEach((p) => {
    if (p?.id != null) map[String(p.id)] = { ...p, children: [] };
  });
  (all || []).forEach((p) => {
    if (
      p?.parentId &&
      String(p.id) !== String(p.parentId) &&
      map[String(p.parentId)] &&
      map[String(p.id)]
    ) {
      map[String(p.parentId)].children.push(map[String(p.id)]);
    }
  });
  return map[String(rootId)] || null;
}

/** Số F1 — con trực tiếp đã approved. */
export function countF1(id, all) {
  return (all || []).filter(
    (p) => String(p.parentId) === String(id) && p.status === "approved"
  ).length;
}

/** Kiểm tra targetId có nằm trong subtree của rootId (kể cả chính rootId). */
export function isInSubtree(targetId, rootId, all) {
  if (String(targetId) === String(rootId)) return true;
  const downline = getDownline(rootId, all);
  return downline.some((p) => String(p.id) === String(targetId));
}

export const TREE_MAX_DEPTH = MAX_DEPTH;
