/**
 * src/pages/user/pages/Myprofilepage.jsx
 *
 * Thông tin cá nhân của đối tác.
 * - Lấy user từ authStore, partner từ /partners (match theo userId → email).
 * - Xem / Chỉnh sửa: họ tên, ngày sinh, giới tính, SĐT, địa chỉ.
 * - Đổi mật khẩu: xác thực password cũ (so khớp /users/:id), rồi PUT mật khẩu mới.
 * - Email không cho sửa (khoá đăng nhập).
 */

import { useState, useEffect } from "react";
import api from "../../../store/api";
import useAuthStore from "../../../store/authStore";
import "../../admin/Accountpage.css";

/* ═══════════════════════════════════════════════
   Modal đổi mật khẩu (gọi API thật)
═══════════════════════════════════════════════ */
function ChangePasswordModal({ userId, onClose }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext,    setShowNext   ] = useState(false);
  const [err,     setErr    ] = useState("");
  const [done,    setDone   ] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async () => {
    if (!form.current)              return setErr("Vui lòng nhập mật khẩu hiện tại.");
    if (form.next.length < 8)       return setErr("Mật khẩu mới tối thiểu 8 ký tự.");
    if (form.next !== form.confirm) return setErr("Mật khẩu xác nhận không khớp.");
    setErr("");
    setLoading(true);
    try {
      // Lấy user hiện tại để so khớp password cũ
      const res = await api.get(`/users/${userId}`);
      const user = res.data;
      if (!user || user.password !== form.current) {
        setErr("Mật khẩu hiện tại không đúng.");
        return;
      }
      await api.put(`/users/${userId}`, { ...user, password: form.next });
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      console.error(e);
      setErr("Đổi mật khẩu thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ap-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal">
        <h3 className="ap-modal-title">🔒 Đổi mật khẩu</h3>
        {done ? (
          <p className="ap-modal-success">✅ Đổi mật khẩu thành công!</p>
        ) : (
          <>
            {err && <p className="ap-modal-err">{err}</p>}

            <div className="ap-modal-field">
              <label>Mật khẩu hiện tại</label>
              <div className="ap-input-wrap">
                <input
                  name="current"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Nhập mật khẩu hiện tại"
                  value={form.current}
                  onChange={onChange}
                />
                <span className="ap-eye" onClick={() => setShowCurrent((s) => !s)}>
                  {showCurrent ? "🙈" : "👁"}
                </span>
              </div>
            </div>

            <div className="ap-modal-field">
              <label>Mật khẩu mới</label>
              <div className="ap-input-wrap">
                <input
                  name="next"
                  type={showNext ? "text" : "password"}
                  placeholder="Ít nhất 8 ký tự"
                  value={form.next}
                  onChange={onChange}
                />
                <span className="ap-eye" onClick={() => setShowNext((s) => !s)}>
                  {showNext ? "🙈" : "👁"}
                </span>
              </div>
            </div>

            <div className="ap-modal-field">
              <label>Xác nhận mật khẩu mới</label>
              <div className="ap-input-wrap">
                <input
                  name="confirm"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={form.confirm}
                  onChange={onChange}
                />
              </div>
              {form.confirm && (
                <p className={`ap-match ${form.next === form.confirm ? "ok" : "err"}`}>
                  {form.next === form.confirm ? "✅ Khớp" : "❌ Chưa khớp"}
                </p>
              )}
            </div>

            <div className="ap-modal-footer">
              <button className="ap-btn-cancel" onClick={onClose} disabled={loading}>
                ✕ Hủy
              </button>
              <button className="ap-btn-save" onClick={onSubmit} disabled={loading}>
                {loading ? "Đang lưu..." : "✓ Xác nhận"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Page
═══════════════════════════════════════════════ */
function Myprofilepage() {
  const currentUser = useAuthStore((s) => s.user);
  const updateAuth  = useAuthStore((s) => s.login);
  const token       = useAuthStore((s) => s.token);

  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState("");

  const [editing, setEditing] = useState(false);
  const [draft,   setDraft  ] = useState({});
  const [saving,  setSaving ] = useState(false);
  const [showPw,  setShowPw ] = useState(false);

  /* ── Fetch partner của user đang đăng nhập ── */
  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        setError("");
        const res  = await api.get("/partners");
        const list = Array.isArray(res.data) ? res.data : [];
        const found =
          list.find((p) => String(p.userId) === String(currentUser.id)) ||
          list.find((p) => p.email === currentUser.email);
        setPartner(found || null);
        setDraft(found ? { ...found } : {});
      } catch (e) {
        console.error(e);
        setError("Không tải được thông tin cá nhân. Kiểm tra server.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const onDraftChange = (e) => setDraft((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCancel = () => {
    setDraft({ ...partner });
    setEditing(false);
  };

  const handleSave = async () => {
    if (!partner) return;
    if (!draft.name?.trim()) { alert("Họ tên không được để trống."); return; }
    setSaving(true);
    try {
      // Cập nhật partner
      const updatedPartner = { ...partner, ...draft };
      await api.put(`/partners/${partner.id}`, updatedPartner);

      // Đồng bộ name/phone/email sang user để hiển thị nhất quán
      try {
        const uRes = await api.get(`/users/${currentUser.id}`);
        const u = uRes.data;
        if (u) {
          const updatedUser = {
            ...u,
            name:  updatedPartner.name,
            phone: updatedPartner.phone,
          };
          await api.put(`/users/${currentUser.id}`, updatedUser);
          // Cập nhật authStore để sidebar/header refresh
          const { password: _pw, ...safeUser } = updatedUser;
          updateAuth(safeUser, token);
        }
      } catch (e) {
        // không chặn luồng nếu user đồng bộ lỗi
        console.warn("Đồng bộ user thất bại:", e);
      }

      setPartner(updatedPartner);
      setEditing(false);
    } catch (e) {
      console.error(e);
      alert("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="ap-page">
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          Đang tải...
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="ap-page">
        <div className="ap-page-header">
          <h1>Thông tin cá nhân</h1>
          <p>{currentUser?.name}</p>
        </div>
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          {error ||
            "Chưa có hồ sơ đối tác liên kết với tài khoản này. Nếu bạn vừa đăng ký, vui lòng chờ admin duyệt hồ sơ."}
        </div>
      </div>
    );
  }

  const name = draft.name || partner.name || "";
  const initials = name.split(" ").filter(Boolean).slice(-2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <div className="ap-page">
      {/* Page title */}
      <div className="ap-page-header">
        <h1>Thông tin cá nhân</h1>
        <p>{partner.name}</p>
      </div>

      <div className="ap-body">
        {/* Cột trái */}
        <div className="ap-left">
          <div className="ap-avatar-circle">{initials || "?"}</div>
          <p className="ap-name">{partner.name}</p>
          <span className="ap-role-badge">
            {partner.levelLabel || (partner.level ? `Cấp ${partner.level}` : "Đối tác")}
          </span>

          <div className="ap-quick-info">
            <div className="ap-quick-item">
              <span className="ap-quick-icon">✉️</span>
              <div>
                <p className="ap-quick-label">Email:</p>
                <p className="ap-quick-value">{partner.email}</p>
              </div>
            </div>
            <div className="ap-quick-item">
              <span className="ap-quick-icon">📞</span>
              <div>
                <p className="ap-quick-label">Số điện thoại:</p>
                <p className="ap-quick-value ap-teal">{partner.phone || "—"}</p>
              </div>
            </div>
            <div className="ap-quick-item">
              <span className="ap-quick-icon ap-teal">#</span>
              <div>
                <p className="ap-quick-label">Mã đối tác</p>
                <p className="ap-quick-value">{partner.code || "—"}</p>
              </div>
            </div>
            <div className="ap-quick-item">
              <span className="ap-quick-icon">📅</span>
              <div>
                <p className="ap-quick-label">Ngày tham gia</p>
                <p className="ap-quick-value">{partner.joinDate || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải */}
        <div className="ap-right">
          <div className="ap-tabs">
            <button className="ap-tab ap-tab--active">Thông tin cá nhân</button>
          </div>

          <div className="ap-detail-card">
            <div className="ap-detail-header">
              <h3 className="ap-detail-title">Thông tin cá nhân</h3>
              <div className="ap-detail-actions">
                {!editing ? (
                  <>
                    <button className="ap-btn-pw" onClick={() => setShowPw(true)}>
                      🔒 Đổi mật khẩu
                    </button>
                    <button className="ap-btn-edit" onClick={() => setEditing(true)}>
                      ✏️ Chỉnh sửa
                    </button>
                  </>
                ) : (
                  <>
                    <button className="ap-btn-cancel" onClick={handleCancel} disabled={saving}>
                      ✕ Hủy
                    </button>
                    <button className="ap-btn-save" onClick={handleSave} disabled={saving}>
                      {saving ? "Đang lưu..." : "✓ Lưu"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="ap-fields">
              {[
                { label: "Họ và tên:",     name: "name",     editable: true  },
                { label: "Ngày sinh",       name: "dob",      editable: true  },
                { label: "Giới tính",       name: "gender",   editable: true  },
                { label: "Số điện thoại",   name: "phone",    editable: true  },
                { label: "Email",           name: "email",    editable: false },
                { label: "Tỉnh/Thành phố", name: "province", editable: true  },
                { label: "Xã/Phường",       name: "ward",     editable: true  },
                { label: "Địa chỉ",          name: "address",  editable: true  },
              ].map((f) => (
                <div className="ap-field" key={f.name}>
                  <p className="ap-field-label">{f.label}</p>
                  {editing && f.editable ? (
                    <input
                      className="ap-field-input"
                      name={f.name}
                      value={draft[f.name] ?? ""}
                      onChange={onDraftChange}
                    />
                  ) : (
                    <p className="ap-field-value">{partner[f.name] ?? "—"}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPw && (
        <ChangePasswordModal
          userId={currentUser.id}
          onClose={() => setShowPw(false)}
        />
      )}
    </div>
  );
}

export default Myprofilepage;
