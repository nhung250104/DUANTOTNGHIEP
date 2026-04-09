import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import userService from "../../store/userService";
import "./Userspage.css";

const PAGE_SIZE = 15;

/* ─── Modal thêm người dùng ──────────────────────────────── */
function AddUserModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", role: "Đối tác",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await onSuccess(form);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Tạo người dùng thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ud-confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="add-modal">
        <h3 className="add-modal-title">Thêm người dùng</h3>

        {error && <p className="add-modal-err">{error}</p>}

        <div className="add-modal-grid">
          {[
            { label: "Họ và tên *",   name: "name",     type: "text",     placeholder: "Nguyễn Văn A"    },
            { label: "Email *",        name: "email",    type: "email",    placeholder: "email@sivip.vn"  },
            { label: "Số điện thoại", name: "phone",    type: "tel",      placeholder: "0123456789"      },
            { label: "Mật khẩu *",    name: "password", type: "password", placeholder: "Ít nhất 8 ký tự" },
          ].map((f) => (
            <div className="add-modal-field" key={f.name}>
              <label>{f.label}</label>
              <input
                name={f.name} type={f.type} placeholder={f.placeholder}
                value={form[f.name]} onChange={onChange}
              />
            </div>
          ))}

          <div className="add-modal-field">
            <label>Vai trò</label>
            <select name="role" value={form.role} onChange={onChange}>
              <option>Admin</option>
              <option>Đối tác</option>
            </select>
          </div>
        </div>

        <div className="add-modal-footer">
          <button className="ap-btn-cancel" onClick={onClose} disabled={loading}>✕ Hủy</button>
          <button className="ud-btn-save-role" onClick={onSubmit} disabled={loading}>
            {loading ? "Đang tạo..." : "✓ Tạo người dùng"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
function Userspage() {
  const navigate = useNavigate();

  const [users,     setUsers    ] = useState([]);
  const [loading,   setLoading  ] = useState(true);
  const [error,     setError    ] = useState("");
  const [page,      setPage     ] = useState(1);
  const [showModal, setShowModal] = useState(false);

  /* ── Fetch ── */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await userService.getAll();
      // Hỗ trợ cả 2 dạng: res.data = [] hoặc res.data = { data: [] }
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setUsers(list);
    } catch {
      setError("Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Tạo user với id số tăng dần ── */
  const handleCreateUser = async (data) => {
    // Lọc chỉ lấy những user có id là số hợp lệ
    const numericIds = users
      .map((u) => Number(u.id))
      .filter((n) => !isNaN(n) && n > 0);

    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;

    const newUser = {
      id: String(maxId + 1), // ✅ id luôn là chuỗi số, tăng dần
      name:     data.name,
      email:    data.email,
      phone:    data.phone,
      password: data.password,
      role:     data.role || "Đối tác",
      status:   "active",
    };

    await userService.create(newUser); // throw nếu lỗi → modal bắt được
    await fetchUsers();                // reload để lấy data mới nhất
  };

  useEffect(() => { fetchUsers(); }, []);

  /* ── Sort: id số giảm dần (mới nhất lên đầu), bỏ id chữ ── */
  const sortedUsers = [...users]
    .filter((u) => !isNaN(Number(u.id)) && Number(u.id) > 0)
    .sort((a, b) => Number(b.id) - Number(a.id));

  const totalPages = Math.ceil(sortedUsers.length / PAGE_SIZE);
  const pageData   = sortedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatId = (id) => String(id).padStart(5, "0");

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Danh sách người dùng</h1>
          <p>Quản lý tất cả tài khoản trong hệ thống</p>
        </div>
        <button className="btn-create" onClick={() => setShowModal(true)}>
          + Thêm người dùng
        </button>
      </div>

      {loading && (
        <div className="us-loading">
          <div className="us-spinner" />
          <p>Đang tải dữ liệu...</p>
        </div>
      )}

      {error && !loading && (
        <div className="us-error">
          ⚠️ {error}
          <button onClick={fetchUsers}>Thử lại</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="us-table-wrap">
            <table className="us-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã người dùng</th>
                  <th>Email</th>
                  <th>Họ và tên</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                      Chưa có người dùng nào
                    </td>
                  </tr>
                ) : (
                  pageData.map((u, i) => (
                    <tr
                      key={u.id}
                      className="us-row"
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                    >
                      <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td>{formatId(u.id)}</td>
                      <td>{u.email}</td>
                      <td className="us-name-cell">{u.name}</td>
                      <td>{u.role}</td>
                      <td>
                        <span className={`us-badge us-badge--${u.status === "active" ? "active" : "locked"}`}>
                          {u.status === "active" ? "Hoạt động" : "Tạm khóa"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="us-pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`us-page-btn ${p === page ? "us-page-btn--active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <AddUserModal onClose={() => setShowModal(false)} onSuccess={handleCreateUser} />
      )}
    </div>
  );
}

export default Userspage;