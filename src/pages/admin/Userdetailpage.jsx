import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import userService from "../../store/userService";
import "./Userdetailpage.css";

const ROLES = ["Admin", "Đối tác"];

function Userdetailpage() {
  const { id }   = useParams();   // id từ URL luôn là string
  const navigate = useNavigate();

  const [user,         setUser        ] = useState(null);
  const [loading,      setLoading     ] = useState(true);
  const [error,        setError       ] = useState("");
  const [tab,          setTab         ] = useState("info");
  const [selectedRole, setSelectedRole] = useState("");
  const [confirmLock,  setConfirmLock ] = useState(false);
  const [saving,       setSaving      ] = useState(false);
  const [saveMsg,      setSaveMsg     ] = useState("");

  /* ── Fetch user theo id ── */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError("");
        // Gọi với string id — json-server khớp cả string lẫn number
        const res  = await userService.getById(id);
        const data = res.data;

        if (!data || (Array.isArray(data) && data.length === 0)) {
          setError("Không tìm thấy người dùng.");
          return;
        }

        // json-server đôi khi trả array khi query bằng string
        const user = Array.isArray(data) ? data[0] : data;
        setUser(user);
        setSelectedRole(user.role || "Đối tác");
      } catch {
        setError("Không thể tải thông tin người dùng.");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  /* ── Khóa / Mở khóa — giữ nguyên toàn bộ thông tin user ── */
  const toggleLock = async () => {
    try {
      setSaving(true);
      const newStatus  = user.status === "active" ? "locked" : "active";
      // Gửi toàn bộ object để không mất field nào
      const updatedUser = { ...user, status: newStatus };
      await userService.update(id, updatedUser);
      // Chỉ cập nhật state status, không reload → không mất UI
      setUser(updatedUser);
      setSaveMsg(newStatus === "locked" ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
    } catch {
      setSaveMsg("Thao tác thất bại, vui lòng thử lại.");
    } finally {
      setSaving(false);
      setConfirmLock(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  /* ── Lưu phân quyền ── */
  const saveRole = async () => {
    try {
      setSaving(true);
      const updatedUser = { ...user, role: selectedRole };
      await userService.update(id, updatedUser);
      setUser(updatedUser);
      setSaveMsg("Đã lưu phân quyền thành công.");
    } catch {
      setSaveMsg("Lưu phân quyền thất bại.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  /* ── Loading / Error states ── */
  if (loading) return (
    <div className="us-loading">
      <div className="us-spinner" />
      <p>Đang tải thông tin...</p>
    </div>
  );

  if (error || !user) return (
    <div className="us-error">
      ⚠️ {error || "Không tìm thấy người dùng."}
      <button onClick={() => navigate("/admin/users")}>← Quay lại</button>
    </div>
  );

  const initials = (user.name || "U")
    .split(" ").slice(-2).map((w) => w[0].toUpperCase()).join("");
  const isLocked = user.status === "locked";

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="ud-btn-back" onClick={() => navigate("/admin/users")}>
            ← Quay lại
          </button>
          <h1 style={{ marginTop: 8 }}>Thông tin tài khoản</h1>
          <p>{user.name}</p>
        </div>
      </div>

      {/* Toast */}
      {saveMsg && (
        <div className="ud-toast">
          {saveMsg.includes("thất bại") ? "⚠️" : "✅"} {saveMsg}
        </div>
      )}

      <div className="ud-body">

        {/* ── Cột trái ── */}
        <div className="ud-left">
          <div className="ud-avatar">{initials}</div>
          <p className="ud-name">{user.name}</p>
          <span className={`ud-role-badge ${isLocked ? "ud-role-badge--locked" : ""}`}>
            {isLocked ? "Tạm khóa" : user.role}
          </span>

          <div className="ud-quick">
            {[
              { label: "Email:",         value: user.email },
              { label: "Số điện thoại:", value: user.phone, teal: true },
              { label: "Mã người dùng",  value: String(user.id).padStart(5, "0"), teal: true },
              { label: "Ngày tham gia",  value: user.joinDate || user.createdAt },
            ].map((f) => (
              <div className="ud-quick-item" key={f.label}>
                <div>
                  <p className="ud-quick-label">{f.label}</p>
                  <p className={`ud-quick-value ${f.teal ? "ud-teal" : ""}`}>
                    {f.value || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cột phải ── */}
        <div className="ud-right">
          <div className="ud-tabs">
            <button
              className={`ud-tab ${tab === "info" ? "ud-tab--active" : ""}`}
              onClick={() => setTab("info")}
            >
              Thông tin cá nhân
            </button>
            <button
              className={`ud-tab ${tab === "permission" ? "ud-tab--active" : ""}`}
              onClick={() => setTab("permission")}
            >
              Phân quyền
            </button>
          </div>

          <div className="ud-card">

            {/* ── Tab: Thông tin cá nhân ── */}
            {tab === "info" && (
              <>
                <div className="ud-card-header">
                  <h3 className="ud-card-title">Thông tin cá nhân</h3>
                  <button
                    className={`ud-btn-lock ${isLocked ? "ud-btn-unlock" : ""}`}
                    onClick={() => setConfirmLock(true)}
                    disabled={saving}
                  >
                    🔒 {isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                  </button>
                </div>
                <div className="ud-fields">
                  {[
                    { label: "Họ và tên",      value: user.name     },
                    { label: "Ngày sinh",       value: user.dob      },
                    { label: "Giới tính",       value: user.gender   },
                    { label: "Số điện thoại",   value: user.phone    },
                    { label: "Email",           value: user.email    },
                    { label: "Tỉnh/Thành phố", value: user.province },
                    { label: "Xã/Phường",       value: user.ward     },
                    { label: "Số nhà/phố",      value: user.address  },
                  ].map((f) => (
                    <div className="ud-field" key={f.label}>
                      <p className="ud-field-label">{f.label}</p>
                      <p className="ud-field-value">{f.value || "—"}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Tab: Phân quyền ── */}
            {tab === "permission" && (
              <>
                <div className="ud-card-header">
                  <h3 className="ud-card-title">Quản lý phân quyền</h3>
                  <select
                    className="ud-role-select"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {[
                  { title: "Quản lý tài khoản", perms: ["Phân quyền","Xem thông tin tài khoản người dùng","Khóa/Mở khóa tài khoản","Xem thông tin cá nhân","Đổi mật khẩu"] },
                  { title: "Quản lý hồ sơ đối tác", perms: ["Xem hồ sơ","Cập nhật hồ sơ người dùng","Phê duyệt hồ sơ"] },
                  { title: "Quản lý báo cáo - thống kê", perms: ["Xem báo cáo","Xuất báo cáo"] },
                ].map((group) => (
                  <div className="ud-perm-group" key={group.title}>
                    <p className="ud-perm-group-title">{group.title}</p>
                    <div className="ud-perm-list">
                      {group.perms.map((p) => (
                        <label key={p}><input type="checkbox" /> {p}</label>
                      ))}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 20 }}>
                  <button className="ud-btn-save-role" onClick={saveRole} disabled={saving}>
                    {saving ? "Đang lưu..." : "✓ Lưu phân quyền"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm khóa/mở ── */}
      {confirmLock && (
        <div className="ud-confirm-overlay" onClick={() => setConfirmLock(false)}>
          <div className="ud-confirm" onClick={(e) => e.stopPropagation()}>
            <p className="ud-confirm-text">
              {isLocked
                ? `Xác nhận mở khóa tài khoản của "${user.name}"?`
                : `Xác nhận khóa tài khoản của "${user.name}"?`}
            </p>
            <div className="ud-confirm-btns">
              <button className="ap-btn-cancel" onClick={() => setConfirmLock(false)}>Hủy</button>
              <button
                className={isLocked ? "ud-btn-save-role" : "ud-btn-lock-confirm"}
                onClick={toggleLock}
                disabled={saving}
              >
                {saving ? "Đang xử lý..." : isLocked ? "Mở khóa" : "Khóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Userdetailpage;