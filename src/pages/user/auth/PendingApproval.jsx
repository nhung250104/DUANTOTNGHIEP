/**
 * src/pages/user/auth/PendingApproval.jsx
 *
 * Hiển thị sau khi đăng ký thành công.
 * Thông báo tài khoản đang chờ admin duyệt.
 */

import { Link } from "react-router-dom";
import logo from "../../../assets/logo.jpg";
import "./auth.css";

function PendingApproval() {
  return (
    <>
      {/* ── Header ── */}
      <header className="auth-hdr">
        <Link to="/">
          <img src={logo} alt="SIVIP" className="auth-hdr-logo" />
        </Link>
      </header>

      {/* ── Nội dung ── */}
      <div className="pending-page">
        <div className="pending-card">

          {/* Icon */}
          <div className="pending-icon-wrap">
            <div className="pending-icon">📋</div>
            <div className="pending-ring" />
          </div>

          {/* Tiêu đề */}
          <h1 className="pending-title">Đăng ký thành công!</h1>
          <p className="pending-subtitle">
            Cảm ơn bạn đã đăng ký trở thành đối tác của <strong>SIVIP</strong>.
          </p>

          {/* Thông báo chính */}
          <div className="pending-notice">
            <div className="pending-notice-icon">⏳</div>
            <div>
              <p className="pending-notice-title">Tài khoản đang chờ xét duyệt</p>
              <p className="pending-notice-desc">
                Hồ sơ đăng ký của bạn đã được ghi nhận và đang được đội ngũ
                quản trị viên SIVIP xem xét. Quá trình xét duyệt thường mất
                từ <strong>1 – 3 ngày làm việc</strong>.
              </p>
            </div>
          </div>

          {/* Thông báo gmail */}
          <div className="pending-email-box">
            <span className="pending-email-icon">✉️</span>
            <div>
              <p className="pending-email-title">Theo dõi trạng thái qua Gmail</p>
              <p className="pending-email-desc">
                Chúng tôi sẽ gửi thông báo kết quả xét duyệt đến địa chỉ
                email bạn đã đăng ký. Vui lòng kiểm tra cả hộp thư
                <strong> Spam / Quảng cáo</strong> nếu không thấy email trong hộp thư đến.
              </p>
            </div>
          </div>

          {/* Các bước tiếp theo */}
          <div className="pending-steps">
            <p className="pending-steps-title">Các bước tiếp theo:</p>
            <div className="pending-step">
              <span className="step-num">1</span>
              <span>Admin xem xét hồ sơ và giấy tờ của bạn</span>
            </div>
            <div className="pending-step">
              <span className="step-num">2</span>
              <span>Bạn nhận email thông báo kết quả xét duyệt</span>
            </div>
            <div className="pending-step">
              <span className="step-num">3</span>
              <span>Đăng nhập và bắt đầu sử dụng hệ thống SIVIP</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pending-actions">
            <Link to="/login" className="pending-btn-login">
              Đăng nhập
            </Link>
            <a
              href="https://sivip.vn/"
              target="_blank"
              rel="noopener noreferrer"
              className="pending-btn-home"
            >
              Về trang chủ SIVIP
            </a>
          </div>

          {/* Liên hệ hỗ trợ */}
          <p className="pending-support">
            Cần hỗ trợ? Liên hệ{" "}
            <a href="mailto:support@sivip.vn" className="link">support@sivip.vn</a>
            {" "}hoặc hotline{" "}
            <a href="tel:19001234" className="link">1900 1234</a>
          </p>

        </div>
      </div>
    </>
  );
}

export default PendingApproval;