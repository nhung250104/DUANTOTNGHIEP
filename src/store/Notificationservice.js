import api from "./api";

const getNow = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const nextId = async () => {
  try {
    const res  = await api.get("/notifications");
    const list = Array.isArray(res.data) ? res.data : [];
    const ids  = list.map((x) => Number(x.id)).filter((n) => !isNaN(n));
    return String((ids.length > 0 ? Math.max(...ids) : 0) + 1);
  } catch {
    return String(Date.now());
  }
};

/**
 * notify({ recipientType, recipientUserId, type, title, message, link, partnerId, partnerName })
 *
 * recipientType: "admin" | "user"
 *   - "admin"  → mọi admin đều thấy (broadcast)
 *   - "user"   → chỉ user có id = recipientUserId thấy
 *
 * link: optional, route khi click vào item
 */
const notify = async ({
  recipientType = "admin",
  recipientUserId = null,
  type,
  title,
  message,
  link = null,
  partnerId = null,
  partnerName = null,
}) => {
  try {
    const id = await nextId();
    return api.post("/notifications", {
      id,
      recipientType,
      recipientUserId: recipientUserId ? String(recipientUserId) : null,
      type,
      title,
      message,
      link,
      partnerId: partnerId ? String(partnerId) : null,
      partnerName,
      read: false,
      createdAt: getNow(),
    });
  } catch (e) {
    console.warn("notify() failed:", e);
  }
};

const NotificationService = {
  getAll:    ()       => api.get("/notifications"),
  getUnread: ()       => api.get("/notifications?read=false"),
  create:    (data)   => api.post("/notifications", data),
  markRead:  (id)     => api.patch(`/notifications/${id}`, { read: true }),
  markAllRead: () => api.get("/notifications?read=false").then(async (res) => {
    const list = Array.isArray(res.data) ? res.data : [];
    await Promise.all(list.map((n) => api.patch(`/notifications/${n.id}`, { read: true })));
  }),
  delete:    (id)     => api.delete(`/notifications/${id}`),
  notify,
};

export default NotificationService;
export { notify };