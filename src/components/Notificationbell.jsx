/**
 * src/components/NotificationBell.jsx
 *
 * Chuông thông báo cho admin:
 * - Badge đỏ hiển thị số chưa đọc
 * - Click mở dropdown danh sách
 * - Click từng item → navigate đến hồ sơ
 * - Mark all read
 * - Auto-poll mỗi 30s
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import notificationService from "../store/Notificationservice";
import "./NotificationBell.css";

function NotificationBell() {
  const navigate  = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open,          setOpen          ] = useState(false);
  const dropRef = useRef();

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ── Fetch notifications ── */
  const fetchNotifications = async () => {
    try {
      const res  = await notificationService.getAll();
      const list = Array.isArray(res.data) ? res.data : [];
      // Mới nhất lên đầu
      setNotifications(list.sort((a, b) => b.id - a.id));
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll mỗi 30 giây để nhận thông báo mới
    const timer = setInterval(fetchNotifications, 30000);
    return () => clearInterval(timer);
  }, []);

  /* ── Click outside to close ── */
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Click vào 1 thông báo ── */
  const handleClick = async (noti) => {
    // Mark as read
    if (!noti.read) {
      await notificationService.markRead(noti.id);
      setNotifications((prev) =>
        prev.map((n) => n.id === noti.id ? { ...n, read: true } : n)
      );
    }
    setOpen(false);

    // Navigate đến hồ sơ nếu là yêu cầu đối tác
    if (noti.type === "new_partner_request" && noti.partnerId) {
      navigate(`/admin/partners-profile/${noti.partnerId}?request=true`);
    }
  };

  /* ── Mark all read ── */
  const handleMarkAll = async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  /* ── Icon theo type ── */
  const getIcon = (type) => {
    switch (type) {
      case "new_partner_request": return "👤";
      default: return "🔔";
    }
  };

  return (
    <div className="nb-wrap" ref={dropRef}>
      {/* ── Bell button ── */}
      <button className="nb-bell" onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {/* ── Dropdown ── */}
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
            {notifications.length === 0 ? (
              <div className="nb-empty">
                <span>🔔</span>
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((noti) => (
                <div
                  key={noti.id}
                  className={`nb-item ${!noti.read ? "nb-item--unread" : ""}`}
                  onClick={() => handleClick(noti)}
                >
                  <div className="nb-item-icon">{getIcon(noti.type)}</div>
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