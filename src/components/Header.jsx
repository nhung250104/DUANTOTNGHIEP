import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Header.css";
import logoImg from "../assets/logo.jpg";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Cuộn tới section theo id
  // Nếu đang ở trang khác → navigate về "/" trước rồi mới cuộn
  const scrollTo = (id) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollTop = () => {
    if (location.pathname !== "/") {
      navigate("/");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="header">
      <div className="header-container">

        {/* Logo */}
        <div className="logo">
          <Link to="/">
            <img src={logoImg} alt="logo" />
          </Link>
        </div>

        {/* Menu */}
        <nav className="nav">
          <span className="nav-link" onClick={scrollTop}>
            Trang chủ
          </span>
          <span className="nav-link" onClick={() => scrollTo("products")}>
            Sản phẩm
          </span>
          <span className="nav-link" onClick={() => scrollTo("footer")}>
            Liên hệ
          </span>
        </nav>

        {/* Auth */}
        <div className="auth">
          <Link to="/login"    className="btn-signin">Đăng nhập</Link>
          <Link to="/register" className="btn-signup">Đăng ký</Link>
        </div>

      </div>
    </header>
  );
};

export default Header;