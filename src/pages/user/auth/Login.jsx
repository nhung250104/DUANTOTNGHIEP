/**
 * src/pages/user/auth/Login.jsx
 *
 * Đăng nhập thật từ /users trong db.json
 * - So khớp email + password
 * - Lưu user + token vào authStore
 * - Chuyển trang theo role: Admin → /admin/news | Đối tác → /
 * - Kiểm tra status: locked → báo lỗi, không cho vào
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../../assets/logo.jpg";
import "./Auth.css";
import useAuthStore from "../../../store/authStore";
import api from "../../../store/api";

/* ─── Atom: Input ────────────────────────────────────────── */
const Input = ({ icon, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="field">
      <div className="input-wrap">
        <input
          {...props}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ borderBottomColor: focused ? "var(--orange)" : undefined }}
        />
        {icon && <span className="eye">{icon}</span>}
      </div>
    </div>
  );
};

/* ─── Page ───────────────────────────────────────────────── */
function Login() {
  const [form,     setForm    ] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading ] = useState(false);
  const [error,    setError   ] = useState("");

  const navigate = useNavigate();
  const login    = useAuthStore((state) => state.login);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      /* ── Tìm user theo email ── */
      const res  = await api.get(`/users?email=${encodeURIComponent(form.email)}`);
      const list = Array.isArray(res.data) ? res.data : [];

      if (list.length === 0) {
        setError("Email không tồn tại trong hệ thống.");
        return;
      }

      const user = list[0];

      /* ── Kiểm tra mật khẩu ── */
      if (user.password !== form.password) {
        setError("Mật khẩu không đúng.");
        return;
      }

      /* ── Kiểm tra trạng thái tài khoản ── */
      if (user.status === "pending_approval") {
        navigate("/pending-approval");
        return;
      }
      if (user.status === "locked") {
        setError("Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ admin.");
        return;
      }

      /* ── Đăng nhập thành công ── */
      // Không lưu password trong store
      const { password: _pw, ...safeUser } = user;
      const token = btoa(`${user.id}:${user.email}:${Date.now()}`);

      login(safeUser, token);

      /* ── Chuyển trang theo role (so sánh không phân biệt hoa thường) ── */
      if (user.role?.toLowerCase() === "admin") {
        navigate("/admin/news");
      } else {
        navigate("/dashboard");
      }

    } catch (err) {
      console.error(err);
      setError("Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="auth-hdr">
        <img src={logo} alt="SIVIP" className="auth-hdr-logo" />
      </header>

      {/* Body */}
      <div className="auth-body">
        <div className="auth-card">
          <h2 className="form-title">Đăng nhập</h2>

          {error && <div className="banner-err">{error}</div>}

          <form onSubmit={onSubmit}>
            <div className="form-fields">
              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={onChange}
              />
              <Input
                name="password"
                type={showPass ? "text" : "password"}
                placeholder="Mật khẩu"
                value={form.password}
                onChange={onChange}
                icon={
                  <span onClick={() => setShowPass((s) => !s)}>
                    {showPass ? "🙈" : "👁"}
                  </span>
                }
              />
            </div>

            <div className="form-forgot">
              <Link to="/forgot-password" className="link">Quên mật khẩu</Link>
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : "Đăng nhập"}
            </button>
          </form>

          <p className="form-foot">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="link">Đăng ký</Link>
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

export default Login;