import api from "./api";

const NotificationService = {
  getAll:    ()         => api.get("/notifications"),
  getUnread: ()         => api.get("/notifications?read=false"),
  create:    (data)     => api.post("/notifications", data),
  markRead:  (id)       => api.patch(`/notifications/${id}`, { read: true }),
  markAllRead: ()       => api.get("/notifications?read=false").then(async (res) => {
    const list = Array.isArray(res.data) ? res.data : [];
    await Promise.all(list.map((n) => api.patch(`/notifications/${n.id}`, { read: true })));
  }),
  delete:    (id)       => api.delete(`/notifications/${id}`),
};

export default NotificationService;