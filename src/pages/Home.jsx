import React from "react";
import "./Home.css";
import { Link } from "react-router-dom";
import heroImg from "../assets/hero.png";

const Home = () => {
  return (
    <div className="home">

      {/* ===== HERO ===== */}
      <section className="hero">

        {/* ── Cột trái ── */}
        <div className="hero-left">

          {/* Badge */}
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Phần mềm kế toán &amp; ERP 
          </div>

          <h1 className="hero-title">
            Giải pháp quản trị<br />
            <span className="hero-title-accent">doanh nghiệp toàn diện</span>
          </h1>

          <p className="hero-desc">
            SIVIP cung cấp nền tảng kế toán &amp; ERP hoạt động hoàn toàn trên
            cloud — truy cập mọi lúc, mọi nơi, tối ưu cho doanh nghiệp Việt.
          </p>

          {/* Buttons */}
          <div className="hero-buttons">
            <Link to="/register" className="hero-btn-primary">
              Đăng ký miễn phí
            </Link>
            <a
              href="https://sivip.vn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-btn-outline"
            >
              Tìm hiểu thêm →
            </a>
          </div>

          {/* Trust bar */}
          <div className="hero-trust">
            <div className="hero-trust-item">
              <span className="hero-trust-num">+90</span>
              <span className="hero-trust-label">Khách hàng</span>
            </div>
            <div className="hero-trust-divider" />
            <div className="hero-trust-item">
              <span className="hero-trust-num">+100</span>
              <span className="hero-trust-label">Đối tác</span>
            </div>
            <div className="hero-trust-divider" />
            <div className="hero-trust-item">
              <span className="hero-trust-num">2011</span>
              <span className="hero-trust-label">Thành lập</span>
            </div>
          </div>
        </div>

        {/* ── Cột phải ── */}
        <div className="hero-right">
          <div className="hero-img-wrap">
            <img src={heroImg} alt="SIVIP hero" className="hero-img" />

            {/* Card nổi 1 — góc trên trái */}
            <div className="hero-card hero-card-tl">
              <span className="hero-card-icon">🚀</span>
              <div>
                <p className="hero-card-title">Công nghệ tiên tiến</p>
                <p className="hero-card-sub">Chạy hoàn toàn trên web</p>
              </div>
            </div>

            {/* Card nổi 2 — góc dưới phải */}
            <div className="hero-card hero-card-br">
              <span className="hero-card-icon">🛡️</span>
              <div>
                <p className="hero-card-title">Bảo mật dữ liệu</p>
                <p className="hero-card-sub">Mã hóa 256-bit SSL</p>
              </div>
            </div>

            {/* Badge uptime */}
            <div className="hero-uptime">
              <span className="hero-uptime-dot" />
              99.9% Uptime
            </div>
          </div>
        </div>

      </section>

      {/* ===== 3 FEATURES STRIP ===== */}
      <div className="hero-features">
        {[
          { icon: "☁️", title: "Cloud 100%",     desc: "Không cần cài đặt, cập nhật tự động" },
          { icon: "⚡", title: "Xử lý nhanh",    desc: "Tối ưu trên dữ liệu lớn, không lag"  },
          { icon: "🤝", title: "Hỗ trợ tận tâm", desc: "Đội ngũ hỗ trợ xuyên suốt 24/7"     },
        ].map((f, i) => (
          <div className="hero-feature-item" key={i}>
            <span className="hero-feature-icon">{f.icon}</span>
            <div>
              <p className="hero-feature-title">{f.title}</p>
              <p className="hero-feature-desc">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== PRODUCTS ===== */}
      <section className="products" id="products">
        <h2>Sản phẩm</h2>
        <div className="product-grid">
          {[
            { title: "Sivip Online",          image: "https://start-platform.com/pimg/3196/3774/660-330-fb/arten-von-online-plattformen.jpg", desc: "Phần mềm quản lý bán hàng và tài chính cho doanh nghiệp." },
            { title: "Sivip Online ERP",       image: "https://cdn.fpt-is.com/vi/phan-mem-erp-gia-bao-nhieu-2.png",                           desc: "Hệ thống ERP giúp quản lý toàn bộ nguồn lực doanh nghiệp." },
            { title: "Hóa đơn điện tử",        image: "https://bcp.cdnchinhphu.vn/334894974524682240/2025/6/7/hoadn2-17493004901971541765728.jpg", desc: "Giải pháp hóa đơn điện tử theo chuẩn của Tổng cục Thuế." },
            { title: "Xử lý hóa đơn đầu vào", image: "https://cdn.luatvietnam.vn/uploaded/images/original/2023/07/21/xuat-hoa-don-sai-thoi-diem_2107115122.jpg", desc: "Tự động đọc và xử lý hóa đơn đầu vào bằng AI." },
            { title: "CRM tích hợp AI",        image: "https://funix.edu.vn/wp-content/uploads/2023/10/funix-AI-trong-CRM.jpg",                desc: "Quản lý khách hàng và phân tích dữ liệu thông minh." },
            { title: "Triển khai Odoo",        image: "https://bmstech.com.vn/web/image/4655-140ba9e8/odoo.webp",                              desc: "Dịch vụ triển khai và tùy chỉnh hệ thống Odoo ERP." },
          ].map((product, index) => (
            <div className="product-card" key={index}>
              <img src={product.image} alt={product.title} />
              <h3>{product.title}</h3>
              <p>{product.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="stats">
        <div>+90<br /><span>Khách hàng</span></div>
        <div>99%<br /><span>Khách hàng hài lòng</span></div>
        <div>+100<br /><span>Đối tác</span></div>
        <div>+10<br /><span>Kinh nghiệm</span></div>
      </section>

      {/* ===== CLIENTS ===== */}
      <section className="clients">
        <h2>Khách hàng theo ngành nghề</h2>
        <div className="client-grid">
          {[
            "TẬP ĐOÀN HOÀNH SƠN",
            "TỔNG CÔNG TY VẬN TẢI THỦY - CTCP",
            "CÔNG TY CP VẬN TẢI TM BẢO NGUYÊN",
            "CÔNG TY TNHH THÁI PHÙNG",
            "CÔNG TY CỔ PHẦN BÊ TÔNG TÂY NINH",
            "CTY TNHH MTV PT HẠ TẦNG KCN CHU LAI",
          ].map((item, index) => (
            <div className="client-card" key={index}>{item}</div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default Home;