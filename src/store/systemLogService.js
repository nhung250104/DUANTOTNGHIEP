/**
 * src/store/systemLogService.js
 *
 * Helper ghi nhật ký systemLogs cho mọi thao tác admin.
 * Best-effort: không chặn flow chính nếu ghi log thất bại.
 */

import api from "./api";

const getNow = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Ghi 1 entry systemLog. Trả về true/false.
 *
 * @param {Object} entry
 * @param {string} entry.type        VD: "approve_partner", "reject_upgrade"
 * @param {Object} entry.actor       { id, name } admin thực hiện
 * @param {Object} [entry.target]    { id, type } đối tượng bị tác động
 * @param {string} entry.description Mô tả ngắn gọn để hiển thị
 * @param {Object} [entry.metadata]  Bổ sung dữ liệu nếu cần
 */
export async function logSystemAction({ type, actor, target, description, metadata }) {
  try {
    const res = await api.get("/systemLogs");
    const list = Array.isArray(res.data) ? res.data : [];
    const ids  = list.map((x) => Number(x.id)).filter((n) => !isNaN(n));
    const id   = String((ids.length > 0 ? Math.max(...ids) : 0) + 1);

    await api.post("/systemLogs", {
      id,
      type:        type || "unknown",
      actorId:     String(actor?.id || ""),
      actorName:   actor?.name || "admin",
      targetId:    String(target?.id || ""),
      targetType:  target?.type || "",
      description: description || "",
      metadata:    metadata || null,
      createdAt:   getNow(),
    });
    return true;
  } catch (e) {
    console.warn("logSystemAction failed:", e);
    return false;
  }
}
