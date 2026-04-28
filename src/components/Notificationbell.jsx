/**
 * src/components/NotificationBell.jsx
 *
 * Chuông thông báo dùng chung admin & user:
 *  - Admin   → thấy notification recipientType="admin" (hoặc legacy không có field)
 *  - User    → thấy notification recipientType="user" và recipientUserId === user.id
 *  - Click → mark read + navigate theo `link` nếu có (fallback theo `type` cho legacy)
 *  - Auto-poll mỗi 30s
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import notificationService from "../store/Notificationservice";
import useAuthStore from "../store/authStore";
import "./Notificationbell.css";

const TYPE_ICON = {
  new_partner_request:        "👤",
  partner_approved:           "✅",
  partner_rejected:           "❌",
  new_customer_contract:      "📑",
  customer_contract_approved: "✅",
  customer_contract_rejected: "❌",
  upgrade_request:            "⬆️",
  upgrade_approved:           "✅",
  upgrade_rejected:           "❌",
  commission_request:         "💰",
  commission_approved:        "✅",
  commission_rejected:        "❌",
  branch_transfer_request:    "↪",
  branch_transfer_approved:   "✅",
  branch_transfer_rejected:   "❌",
  customer_assigned:          "👥",
};

const FALLBACK_LINK = {
  new_partner_request: (n) => `/admin/partners-profile/${n.partnerId}?request=true`,
  upgrade_request:     "/admin/partners",
  new_customer_contract: "/admin/customer-contracts",
  commission_request:  "/admin/partner-contracts",
  branch_transfer_request: "/admin/orgchart",
};

function NotificationBell() {
  const navigate    = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin     = currentUser?.role?.toLowerCase() === "admin";

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropRef = useRef();

  const visible = notifications.filter((n) => {
    if (isAdmin) {
      // Admin: thấy notification dành cho admin (hoặc legacy không có field)
      return !n.recipientType || n.recipientType === "admin";
    }
    // User: chỉ thấy của chính mình
    return n.recipientType === "user" && String(n.recipientUserId) === String(currentUser?.id);
  });

  const unreadCount = visible.filter((n) => !n.read).length;

  /* ── Fetch ── */
  const fetchAll = async () => {
    try {
      const res  = await notificationService.getAll();
      const list = Array.isArray(res.data) ? res.data : [];
      setNotifications(list.sort((a, b) => Number(b.id) - Number(a.id)));
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Click outside ── */
  useEffect(() => {
    const onDoc = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleClick = async (noti) => {
    if (!noti.read) {
      try { await notificationService.markRead(noti.id); } catch { /* ignore */ }
      setNotifications((prev) =>
        prev.map((n) => (n.id === noti.id ? { ...n, read: true } : n))
      );
    }
    setOpen(false);

    // Navigate ưu tiên `link`, fallback theo type
    let target = noti.link;
    if (!target) {
      const fb = FALLBACK_LINK[noti.type];
      target = typeof fb === "function" ? fb(noti) : fb;
    }
    if (target) navigate(target);
  };

  const handleMarkAll = async () => {
    try { await notificationService.markAllRead(); } catch { /* ignore */ }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="nb-wrap" ref={dropRef}>
      <button className="nb-bell" onClick={() => setOpen((o) => !o)} aria-label="Thông báo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nb-dropdown">
          <div className="nb-header">
            <span className="nb-title">Thông báo</span>
            {unreadCount > 0 && (
              <button className="nb-mark-all" onClick={handleMarkAll}>
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="nb-list">
            {visible.length === 0 ? (
              <div className="nb-empty">
                <span>🔔</span>
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              visible.slice(0, 50).map((noti) => (
                <div
                  key={noti.id}
                  className={`nb-item ${!noti.read ? "nb-item--unread" : ""}`}
                  onClick={() => handleClick(noti)}
                >
                  <div className="nb-item-icon">{TYPE_ICON[noti.type] || "🔔"}</div>
                  <div className="nb-item-body">
                    <p className="nb-item-title">{noti.title}</p>
                    <p className="nb-item-msg">{noti.message}</p>
                    <p className="nb-item-time">{noti.createdAt}</p>
                  </div>
                  {!noti.read && <span className="nb-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
