import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Header.css";
import logoImg from "../assets/logo.jpg";
import useAuthStore from "../store/authStore";

const HeaderLogin = () => {
  const navigate        = useNavigate();
  const [open, setOpen]         = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef    = useRef(null);

  const user      = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const name = user?.name || user?.email || "Admin";

  const initials = name
    .split(" ")
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join("");

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="header-login">
      {/* ── Logo căn giữa ── */}
      <div className="hl-logo">
        <img src={logoImg} alt="SIVIP" />
      </div>

      {/* ── Bên phải: chuông + user ── */}
      <div className="hl-right">

        {/* Chuông thông báo */}
        <div className="hl-notif" ref={notifRef}>
          <button
            className="hl-notif-btn"
            onClick={() => { setNotifOpen(o => !o); setOpen(false); }}
          >
            🔔
            <span className="hl-notif-badge">1</span>
          </button>

          {notifOpen && (
            <div className="hl-notif-dropdown">
              <p className="hl-notif-title">Thông báo</p>
              <div className="hl-notif-item">
                <span>📋</span>
                <div>
                  <p>Có 1 đối tác mới chờ duyệt</p>
                  <span>5 phút trước</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User avatar + tên + dropdown */}
        <div className="hl-user" ref={dropdownRef}>
          <button
            className="hl-user-btn"
            onClick={() => { setOpen(o => !o); setNotifOpen(false); }}
            title={name}
          >
            {user?.avatar
              ? <img src={user.avatar} alt={name} className="hl-avatar-img" />
              : <span className="hl-avatar-initials">{initials}</span>
            }
            <span className="hl-username">{name.split(" ").slice(-1)[0]}</span>
            <span className={`hl-caret ${open ? "hl-caret-up" : ""}`}>▾</span>
          </button>

          {open && (
            <div className="hl-user-dropdown">

              {/* Info */}
              <div className="hl-dropdown-info">
                <div className="hl-dropdown-avatar">
                  {user?.avatar
                    ? <img src={user.avatar} alt={name} />
                    : <span>{initials}</span>
                  }
                </div>
                <div>
                  <p className="hl-dropdown-name">{name}</p>
                  <p className="hl-dropdown-email">{user?.email}</p>
                </div>
              </div>

              <div className="hl-divider" />

              <Link to="/admin/account"    className="hl-dropdown-item" onClick={() => setOpen(false)}>👤 Thông tin cá nhân</Link>
              <Link to="/admin/news" className="hl-dropdown-item" onClick={() => setOpen(false)}>📊 Quản lý</Link>
              <Link to="/settings"   className="hl-dropdown-item" onClick={() => setOpen(false)}>⚙️ Cài đặt</Link>

              <div className="hl-divider" />

              <button className="hl-dropdown-item hl-logout" onClick={handleLogout}>
                🚪 Đăng xuất
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default HeaderLogin;