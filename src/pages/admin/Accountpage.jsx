/**
 * src/pages/admin/AccountPage.jsx
 * Trang thông tin tài khoản cá nhân của admin.
 * - Xem thông tin (Image 1)
 * - Chỉnh sửa (Image 2/3): click "Chỉnh sửa" → input bật lên, nút Hủy/Lưu
 * - Đổi mật khẩu: click "Đổi mật khẩu" → modal
 */

import { useState } from "react";
import useAuthStore from "../../store/authStore";
import "./AccountPage.css";
import { Mail, Phone, Hash, Calendar } from "lucide-react";

/* ─── Mock data (thay bằng API) ─────────────────────────── */
const MOCK_USER = {
  name:      "Admin",
  role:      "Admin",
  email:     "admin@sivip.vn",
  phone:     "0123456789",
  code:      "000000",
  joinDate:  "05/02/2026",
  dob:       "01/01/1990",
  gender:    "Nam",
  province:  "Đà Nẵng",
  ward:      "Ngũ Hành Sơn",
  address:   "71 Ngũ Hành Sơn",
};

/* ─── Đổi mật khẩu modal ─────────────────────────────────── */
function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext,    setShowNext   ] = useState(false);
  const [err,  setErr ] = useState("");
  const [done, setDone] = useState(false);

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = () => {
    if (!form.current)              return setErr("Vui lòng nhập mật khẩu hiện tại.");
    if (form.next.length < 8)       return setErr("Mật khẩu mới tối thiểu 8 ký tự.");
    if (form.next !== form.confirm) return setErr("Mật khẩu xác nhận không khớp.");
    setErr("");
    // TODO: await authService.changePassword(form)
    setDone(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal">
        <h3 className="ap-modal-title">🔒 Đổi mật khẩu</h3>
        {done
          ? <p className="ap-modal-success">✅ Đổi mật khẩu thành công!</p>
          : <>
              {err && <p className="ap-modal-err">{err}</p>}
              <div className="ap-modal-field">
                <label>Mật khẩu hiện tại</label>
                <div className="ap-input-wrap">
                  <input name="current" type={showCurrent ? "text" : "password"}
                    placeholder="Nhập mật khẩu hiện tại" value={form.current} onChange={onChange} />
                  <span className="ap-eye" onClick={() => setShowCurrent(s => !s)}>
                    {showCurrent ? "🙈" : "👁"}
                  </span>
                </div>
              </div>
              <div className="ap-modal-field">
                <label>Mật khẩu mới</label>
                <div className="ap-input-wrap">
                  <input name="next" type={showNext ? "text" : "password"}
                    placeholder="Ít nhất 8 ký tự" value={form.next} onChange={onChange} />
                  <span className="ap-eye" onClick={() => setShowNext(s => !s)}>
                    {showNext ? "🙈" : "👁"}
                  </span>
                </div>
              </div>
              <div className="ap-modal-field">
                <label>Xác nhận mật khẩu mới</label>
                <div className="ap-input-wrap">
                  <input name="confirm" type="password"
                    placeholder="Nhập lại mật khẩu mới" value={form.confirm} onChange={onChange} />
                </div>
                {form.confirm && (
                  <p className={`ap-match ${form.next === form.confirm ? "ok" : "err"}`}>
                    {form.next === form.confirm ? "✅ Khớp" : "❌ Chưa khớp"}
                  </p>
                )}
              </div>
              <div className="ap-modal-footer">
                <button className="ap-btn-cancel" onClick={onClose}>✕ Hủy</button>
                <button className="ap-btn-save"   onClick={onSubmit}>✓ Xác nhận</button>
              </div>
            </>
        }
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
function AccountPage() {
  const storeUser = useAuthStore(s => s.user);
  const [info, setInfo]     = useState({ ...MOCK_USER, ...storeUser });
  const [editing, setEdit]  = useState(false);
  const [draft,   setDraft] = useState({ ...info });
  const [showPwModal, setShowPwModal] = useState(false);

  const onDraftChange = e => setDraft(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = () => {
    setInfo({ ...draft });
    setEdit(false);
    // TODO: await userService.updateProfile(draft)
  };

  const handleCancel = () => {
    setDraft({ ...info });
    setEdit(false);
  };

  const initials = info.name.split(" ").slice(-2).map(w => w[0].toUpperCase()).join("");

  return (
    <div className="ap-page">
      {/* Page title */}
      <div className="ap-page-header">
        <h1>Thông tin tài khoản</h1>
        <p>{info.name}</p>
      </div>

      <div className="ap-body">

        {/* ── Cột trái: avatar + info nhanh ── */}
        <div className="ap-left">
          <div className="ap-avatar-circle">{initials}</div>
          <p className="ap-name">{info.name}</p>
          <span className="ap-role-badge">{info.role}</span>

          <div className="ap-quick-info">
            <div className="ap-quick-item">
              <span className="ap-quick-icon">✉️</span>
              <div>
                <p className="ap-quick-label">Email:</p>
                <p className="ap-quick-value">{info.email}</p>
              </div>
            </div>
            <div className="ap-quick-item">
              <span className="ap-quick-icon">📞</span>
              <div>
                <p className="ap-quick-label">Số điện thoại:</p>
                <p className="ap-quick-value ap-teal">{info.phone}</p>
              </div>
            </div>
            <div className="ap-quick-item">
              <span className="ap-quick-icon ap-teal">#</span>
              <div>
                <p className="ap-quick-label">Mã người dùng</p>
                <p className="ap-quick-value">{info.code}</p>
              </div>
            </div>
            <div className="ap-quick-item">
              <span className="ap-quick-icon">📅</span>
              <div>
                <p className="ap-quick-label">Ngày tham gia</p>
                <p className="ap-quick-value">{info.joinDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Cột phải: thông tin chi tiết ── */}
        <div className="ap-right">
          {/* Tabs */}
          <div className="ap-tabs">
            <button className="ap-tab ap-tab--active">Thông tin cá nhân</button>
          </div>

          <div className="ap-detail-card">
            {/* Header card */}
            <div className="ap-detail-header">
              <h3 className="ap-detail-title">Thông tin cá nhân</h3>
              <div className="ap-detail-actions">
                {!editing ? (
                  <>
                    <button className="ap-btn-pw" onClick={() => setShowPwModal(true)}>
                      🔒 Đổi mật khẩu
                    </button>
                    <button className="ap-btn-edit" onClick={() => setEdit(true)}>
                      ✏️ Chỉnh sửa
                    </button>
                  </>
                ) : (
                  <>
                    <button className="ap-btn-cancel" onClick={handleCancel}>✕ Hủy</button>
                    <button className="ap-btn-save"   onClick={handleSave}>✓ Lưu</button>
                  </>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="ap-fields">
              {[
                { label: "Họ và tên:",      name: "name",     value: draft.name,     col: 1 },
                { label: "Ngày sinh",        name: "dob",      value: draft.dob,      col: 1 },
                { label: "Giới tính",        name: "gender",   value: draft.gender,   col: 1 },
                { label: "Số điện thoại",    name: "phone",    value: draft.phone,    col: 2 },
                { label: "Email",            name: "email",    value: draft.email,    col: 2 },
                { label: "Tỉnh/Thành phố",  name: "province", value: draft.province, col: 3 },
                { label: "Xã/Phường",        name: "ward",     value: draft.ward,     col: 3 },
                { label: "Số nhà/phố",       name: "address",  value: draft.address,  col: 3 },
              ].map(f => (
                <div className="ap-field" key={f.name}>
                  <p className="ap-field-label">{f.label}</p>
                  {editing
                    ? <input className="ap-field-input" name={f.name} value={f.value} onChange={onDraftChange} />
                    : <p className="ap-field-value">{info[f.name]}</p>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Modal đổi mật khẩu */}
      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}
    </div>
  );
}

export default AccountPage;