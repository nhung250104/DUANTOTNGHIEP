import React from "react";

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

const Footer = () => {
  return (
    <div id="footer" style={{ background: "#0f766e", marginTop: "0px" }}>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "40px 20px",
          display: "grid",
          gridTemplateColumns: "1fr 1.5fr 1fr",
          gap: "50px",
          color: "white",
        }}
      >
        {/* Cột 1 */}
        <div>
          <h3 style={{ marginBottom: "20px" }}>Khám phá</h3>

          {[
            { label: "Trang chủ",          action: scrollTop                    },
            { label: "Sản phẩm",           action: () => scrollTo("products")   },
            { label: "Liên hệ",            action: () => scrollTo("footer")     },
            { label: "Chính sách & bảo mật", action: null                       },
          ].map(({ label, action }) => (
            <p
              key={label}
              onClick={action || undefined}
              style={{
                cursor:        action ? "pointer" : "default",
                marginBottom:  "8px",
                opacity:       action ? 1 : 0.7,
                transition:    "opacity 0.2s",
                userSelect:    "none",
              }}
              onMouseEnter={e => { if (action) e.target.style.opacity = "0.75"; }}
              onMouseLeave={e => { if (action) e.target.style.opacity = "1";    }}
            >
              {label}
            </p>
          ))}

          <div
            style={{
              marginTop:    "20px",
              background:   "#ef4444",
              padding:      "10px 20px",
              borderRadius: "30px",
              display:      "inline-block",
              fontWeight:   "bold",
              cursor:       "pointer",
            }}
          >
            📞 0912 010 329
          </div>
        </div>

        {/* Cột 2 */}
        <div>
          <h3 style={{ marginBottom: "20px" }}>Về chúng tôi</h3>
          <p style={{ lineHeight: "1.8" }}>
            Sivip được thành lập từ tháng 6/2011, chuyên sâu trong lĩnh vực
            phần mềm kế toán online và giải pháp quản lý toàn diện doanh nghiệp.
            Hệ thống có khả năng tùy biến cao, tốc độ xử lý nhanh trên dữ liệu lớn.
          </p>
        </div>

        {/* Cột 3 */}
        <div>
          <h3 style={{ marginBottom: "20px" }}>Kết nối với chúng tôi</h3>
          <p style={{ marginBottom: "8px" }}>📧 auto@sivip.vn</p>
          <p style={{ marginBottom: "8px" }}>📞 02363 668 959 - 0912 010 329</p>
          <p style={{ marginBottom: "8px" }}>📍 253-255 Văn Tiến Dũng, Đà Nẵng</p>
        </div>
      </div>

      {/* Bottom */}
      <div
        style={{
          textAlign:  "center",
          padding:    "20px",
          borderTop:  "1px solid rgba(255,255,255,0.2)",
          color:      "white",
          fontSize:   "14px",
        }}
      >
        © 2026 Sivip. All rights reserved.
      </div>
    </div>
  );
};

export default Footer;