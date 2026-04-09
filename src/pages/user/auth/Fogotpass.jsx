/**
 * src/pages/user/auth/Fogotpass.jsx
 *
 * Khi kết nối backend:
 *   → thay setTimeout() bằng: await authService.forgotPassword(email)
 */
 
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../../assets/logo.jpg";
import "./Auth.css";
 
function Fogotpass() {
  const [email,   setEmail  ] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError  ] = useState("");
 
  const onSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError("Vui lòng nhập email.");
      return;
    }
    setError("");
    setLoading(true);
    // TODO: await authService.forgotPassword(email);
    setTimeout(() => { setLoading(false); setSuccess(true); }, 1000);
  };
 
  return (
    <>
      {/* Header */}
      <header className="auth-hdr">
        <span className="auth-breadcrumb">Quên mật khẩu</span>
        <img src={logo} alt="SIVIP" className="auth-hdr-logo" />
      </header>
 
      {/* Body */}
      <div className="auth-body">
        <div className="auth-card">
          <h2 className="form-title">Quên mật khẩu</h2>
          <p className="form-sub">
            Vui lòng điền gmail của bạn để nhận mã xác nhận
          </p>
 
          {error   && <div className="banner-err">{error}</div>}
          {success && (
            <div className="banner-ok">
              ✅ Mã xác nhận đã được gửi! Kiểm tra hộp thư của bạn.
            </div>
          )}
 
          {!success && (
            <form onSubmit={onSubmit}>
              <div className="form-fields">
                <div className="field">
                  <div className="input-wrap">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <button className="btn" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : "Gửi mã"}
              </button>
            </form>
          )}
 
          <p className="form-foot" style={{ marginTop: 18 }}>
            <Link to="/login" className="link">← Quay lại đăng nhập</Link>
          </p>
        </div>
 
        {/* Illustration */}
        <div className="auth-illus">
          <img
            src="https://businessingmag.com/cms/wp-content/uploads/2020/01/small-business-accounting.jpg"
            alt="SIVIP illustration"
          />
        </div>
      </div>
    </>
  );
}
 
export default Fogotpass;