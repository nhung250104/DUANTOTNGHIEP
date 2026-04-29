/**
 * src/pages/admin/Customerpage.jsx
 *
 * Trang quản lý khách hàng — dùng chung admin & user qua prop isAdmin.
 *  - Admin: thấy toàn bộ KH, biết KH thuộc đối tác nào.
 *  - User : chỉ thấy KH do chính mình tạo (lọc theo userId).
 *
 * Chức năng: liệt kê + tìm kiếm + tạo / sửa / xoá / đổi trạng thái.
 */

import { useState, useEffect, useMemo } from "react";
import api from "../../store/api";
import customerService from "../../store/customerService";
import useAuthStore from "../../store/authStore";
import { notify } from "../../store/Notificationservice";
import "./Customercontractpage.css";

const PAGE_SIZE = 10;

const STATUS_CFG = {
  active:   { label: "Đang giao dịch", cls: "cc-badge--approved" },
  inactive: { label: "Tạm ngưng",       cls: "cc-badge--pending"  },
};

const getNow = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const getMaxId = async () => {
  try {
    const res = await customerService.getAll();
    const list = Array.isArray(res.data) ? res.data : [];
    const ids = list.map((x) => Number(x.id)).filter((n) => !isNaN(n));
    return ids.length > 0 ? Math.max(...ids) : 0;
  } catch {
    return 0;
  }
};

/* ─── Modal: Tạo / Sửa ──────────────────────────────────── */
function CustomerModal({ initial, onClose, onSubmit, loading, isAdmin, partners }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    name:        initial?.name    ?? "",
    phone:       initial?.phone   ?? "",
    email:       initial?.email   ?? "",
    address:     initial?.address ?? "",
    note:        initial?.note    ?? "",
    status:      initial?.status  ?? "active",
    ownerUserId: initial?.userId  ?? "",   // dùng cho admin chọn đối tác phụ trách
  });
  const [err, setErr] = useState("");

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = () => {
    if (!form.name.trim())  return setErr("Tên khách hàng là bắt buộc.");
    if (!form.phone.trim()) return setErr("Số điện thoại là bắt buộc.");
    if (isAdmin && !isEdit && !form.ownerUserId) {
      return setErr("Vui lòng chọn đối tác phụ trách KH này.");
    }
    setErr("");
    onSubmit(form);
  };

  // Sắp xếp partners đã approved cho dropdown của admin
  const approvedPartners = (partners || []).filter((p) => p.status === "approved");

  return (
    <div className="cc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal" style={{ maxWidth: 540 }}>
        <div className="cc-modal-header cc-modal-header--approve">
          <span className="cc-modal-icon">{isEdit ? "✎" : "+"}</span>
          <div>
            <h3 className="cc-modal-title">{isEdit ? "Cập nhật khách hàng" : "Thêm khách hàng mới"}</h3>
            <p className="cc-modal-sub">{isEdit ? form.name : "Điền thông tin để bắt đầu chăm sóc khách hàng"}</p>
          </div>
        </div>

        <div className="cc-modal-body">
          {err && <p className="cc-modal-err">{err}</p>}

          {/* Admin tạo mới: chọn đối tác phụ trách */}
          {isAdmin && !isEdit && (
            <>
              <label className="cc-modal-label">Đối tác phụ trách <span className="cc-req">*</span></label>
              <select
                className="cc-modal-select"
                name="ownerUserId"
                value={form.ownerUserId}
                onChange={onChange}
              >
                <option value="">— Chọn đối tác —</option>
                {approvedPartners.map((p) => (
                  <option key={p.id} value={String(p.userId)}>
                    {p.name} · DT{String(p.code || p.id).padStart(6, "0")}
                  </option>
                ))}
              </select>
            </>
          )}

          <label className="cc-modal-label" style={{ marginTop: 12 }}>Tên khách hàng <span className="cc-req">*</span></label>
          <input className="cc-modal-select" name="name"  value={form.name}  onChange={onChange} placeholder="VD: Công ty TNHH ABC" />

          <label className="cc-modal-label" style={{ marginTop: 12 }}>Số điện thoại <span className="cc-req">*</span></label>
          <input className="cc-modal-select" name="phone" value={form.phone} onChange={onChange} placeholder="0xxxxxxxxx" />

          <label className="cc-modal-label" style={{ marginTop: 12 }}>Email</label>
          <input className="cc-modal-select" name="email" value={form.email} onChange={onChange} placeholder="contact@abc.com" />

          <label className="cc-modal-label" style={{ marginTop: 12 }}>Địa chỉ</label>
          <input className="cc-modal-select" name="address" value={form.address} onChange={onChange} />

          <label className="cc-modal-label" style={{ marginTop: 12 }}>Ghi chú</label>
          <textarea
            className="cc-modal-textarea"
            rows={3}
            name="note"
            value={form.note}
            onChange={onChange}
            placeholder="Thông tin chăm sóc, sở thích, ngành nghề..."
          />

          {isEdit && (
            <>
              <label className="cc-modal-label" style={{ marginTop: 12 }}>Trạng thái</label>
              <select className="cc-modal-select" name="status" value={form.status} onChange={onChange}>
                <option value="active">Đang giao dịch</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
            </>
          )}
        </div>

        <div className="cc-modal-footer">
          <button className="cc-btn-cancel"  onClick={onClose} disabled={loading}>✕ Hủy</button>
          <button className="cc-btn-confirm" onClick={submit}  disabled={loading}>
            {loading ? "Đang lưu..." : (isEdit ? "✓ Cập nhật" : "✓ Tạo mới")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal: Confirm xoá ────────────────────────────────── */
function ConfirmDelete({ name, onClose, onConfirm, loading }) {
  return (
    <div className="cc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal" style={{ maxWidth: 420 }}>
        <div className="cc-modal-header cc-modal-header--reject">
          <span className="cc-modal-icon cc-modal-icon--reject">!</span>
          <div>
            <h3 className="cc-modal-title cc-modal-title--reject">Xoá khách hàng</h3>
            <p className="cc-modal-sub">{name}</p>
          </div>
        </div>
        <div className="cc-modal-body">
          <div className="cc-modal-info-box" style={{ background: "#fff5f5", color: "#991b1b" }}>
            Hành động này không khôi phục được. Hợp đồng đã ký với KH này vẫn được giữ.
          </div>
        </div>
        <div className="cc-modal-footer">
          <button className="cc-btn-cancel"  onClick={onClose}   disabled={loading}>✕ Hủy</button>
          <button className="cc-btn-confirm" onClick={onConfirm} disabled={loading}>
            {loading ? "Đang xoá..." : "🗑 Xoá"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Page
═══════════════════════════════════════════════ */
function Customerpage({ isAdmin = false }) {
  const currentUser = useAuthStore((s) => s.user);

  const [customers, setCustomers] = useState([]);
  const [partners,  setPartners ] = useState([]); // dùng để hiển thị tên đối tác cho admin
  const [loading,   setLoading  ] = useState(true);
  const [error,     setError    ] = useState("");

  const [search,    setSearch   ] = useState("");
  const [status,    setStatus   ] = useState("");
  const [page,      setPage     ] = useState(1);

  const [editTarget,   setEditTarget  ] = useState(null);
  const [createOpen,   setCreateOpen  ] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  /* ── Fetch ── */
  const fetchData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError("");

      if (isAdmin) {
        const [cRes, pRes] = await Promise.all([
          customerService.getAll(),
          api.get("/partners"),
        ]);
        setCustomers(Array.isArray(cRes.data) ? cRes.data : []);
        setPartners(Array.isArray(pRes.data) ? pRes.data : []);
      } else {
        const cRes = await customerService.getByUserId(String(currentUser.id));
        setCustomers(Array.isArray(cRes.data) ? cRes.data : []);
        setPartners([]);
      }
    } catch (e) {
      console.error(e);
      setError("Không tải được danh sách khách hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [currentUser, isAdmin]);

  /* ── Map userId → partner name (cho admin hiển thị) ── */
  const partnerOfCustomer = useMemo(() => {
    if (!isAdmin) return () => null;
    const byUserId = new Map(partners.map((p) => [String(p.userId), p]));
    return (c) => byUserId.get(String(c.userId)) || null;
  }, [partners, isAdmin]);

  /* ── Filter / sort / paginate ── */
  const filtered = customers
    .filter((c) => {
      if (status && c.status !== status) return false;
      const q = search.trim().toLowerCase();
      if (q) {
        const haystack = [c.name, c.phone, c.email, c.address].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => Number(b.id) - Number(a.id)); // mới nhất lên đầu

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Reset page khi data shrink
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(1);
  }, [totalPages, page]);

  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const resetPage = () => setPage(1);

  /* ── Handlers ── */
  const handleCreate = async (form) => {
    setModalLoading(true);
    try {
      const max = await getMaxId();
      // Admin tạo: chỉ định đối tác phụ trách qua ownerUserId.
      // User tạo: gán userId = mình.
      const ownerUserId = isAdmin ? String(form.ownerUserId) : String(currentUser.id);
      const payload = {
        id: String(max + 1),
        userId: ownerUserId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        note: form.note.trim(),
        status: "active",
        createdAt: getNow(),
      };
      await customerService.create(payload);

      // Nếu admin tạo cho đối tác khác → notify đối tác đó
      if (isAdmin && ownerUserId !== String(currentUser.id)) {
        await notify({
          recipientType:   "user",
          recipientUserId: ownerUserId,
          type:            "customer_assigned",
          title:           "Bạn được giao một khách hàng mới",
          message:         `Admin vừa thêm khách hàng "${payload.name}" vào danh sách của bạn. Vào mục Khách hàng để bắt đầu chăm sóc.`,
          link:            "/khach-hang",
        });
      }

      setCustomers((prev) => [...prev, payload]);
      setCreateOpen(false);
    } catch (e) {
      console.error(e);
      alert("Tạo khách hàng thất bại.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleEdit = async (form) => {
    if (!editTarget) return;
    setModalLoading(true);
    try {
      const updated = { ...editTarget, ...form, name: form.name.trim() };
      await customerService.update(editTarget.id, updated);
      setCustomers((prev) => prev.map((c) => (c.id === editTarget.id ? updated : c)));
      setEditTarget(null);
    } catch (e) {
      console.error(e);
      alert("Cập nhật khách hàng thất bại.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    try {
      await customerService.remove(deleteTarget.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      alert("Xoá khách hàng thất bại.");
    } finally {
      setModalLoading(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="cc-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isAdmin ? "Quản lý khách hàng" : "Khách hàng của tôi"}</h1>
          <p>{isAdmin ? "Toàn bộ khách hàng do đối tác trong hệ thống tạo" : "Khách hàng do bạn quản lý"}</p>
        </div>
        <button className="cc-btn-create" onClick={() => setCreateOpen(true)}>+ Thêm khách hàng</button>
      </div>

      <div className="cc-card">
        <div className="cc-filters">
          <input
            className="cc-search"
            placeholder="Tìm theo tên / SĐT / email / địa chỉ..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          />
          <select
            className="cc-select"
            value={status}
            onChange={(e) => { setStatus(e.target.value); resetPage(); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang giao dịch</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
        </div>

        {loading && <div className="cc-loading"><div className="cc-spinner" /><p>Đang tải...</p></div>}

        {!loading && error && (
          <div className="cc-error">⚠️ {error}<button onClick={fetchData}>Thử lại</button></div>
        )}

        {!loading && !error && (
          <div className="cc-table-wrap">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Tên khách hàng</th>
                  {isAdmin && <th>Đối tác phụ trách</th>}
                  <th>SĐT</th>
                  <th>Email</th>
                  <th>Địa chỉ</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  {!isAdmin && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 7} className="cc-empty">
                      {isAdmin
                        ? "Chưa có khách hàng nào trong hệ thống."
                        : "Bạn chưa có khách hàng. Bấm \"Thêm KH\" để bắt đầu."}
                    </td>
                  </tr>
                ) : (
                  pageData.map((c) => {
                    const cfg = STATUS_CFG[c.status] || STATUS_CFG.active;
                    const owner = partnerOfCustomer(c);
                    return (
                      <tr key={c.id} className="cc-row">
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          {c.note && (
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{c.note}</div>
                          )}
                        </td>
                        {isAdmin && (
                          <td>
                            {owner ? (
                              <>
                                <div>{owner.name}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                  DT{String(owner.code || owner.id).padStart(6, "0")}
                                </div>
                              </>
                            ) : "—"}
                          </td>
                        )}
                        <td>{c.phone || "—"}</td>
                        <td>{c.email || "—"}</td>
                        <td>{c.address || "—"}</td>
                        <td>{c.createdAt}</td>
                        <td><span className={`cc-badge ${cfg.cls}`}>{cfg.label}</span></td>
                        {!isAdmin && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="cc-action-btns">
                              <button className="cc-btn-approve" onClick={() => setEditTarget(c)}>Sửa</button>
                              <button className="cc-btn-reject"  onClick={() => setDeleteTarget(c)}>Xoá</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="cc-footer">
            <span className="cc-count">Hiển thị {pageData.length}/{filtered.length} KH</span>
            <div className="cc-pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`cc-page-btn ${p === page ? "cc-page-btn--active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <CustomerModal
          isAdmin={isAdmin}
          partners={partners}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          loading={modalLoading}
        />
      )}
      {editTarget && (
        <CustomerModal
          isAdmin={isAdmin}
          partners={partners}
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
          loading={modalLoading}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={modalLoading}
        />
      )}
    </div>
  );
}

export default Customerpage;
