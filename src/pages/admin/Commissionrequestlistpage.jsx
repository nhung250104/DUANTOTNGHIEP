/**
 * src/pages/admin/Commissionrequestlistpage.jsx
 *
 * Admin xét duyệt yêu cầu chỉnh sửa hoa hồng từ đối tác.
 * - GET /commissionRequests
 * - Approve: cập nhật partner.commissionRates (hoặc đặt level/levelLabel mới
 *   theo bảng tương ứng) — ở đây chúng ta lưu rate trực tiếp vào partner
 *   để Partnercontractpage.jsx user và Commissionpage admin cùng đọc được.
 * - Reject : nhập lý do, mark request rejected.
 */

import { useState, useEffect } from "react";
import api from "../../store/api";
import "./Customercontractpage.css";

const PAGE_SIZE = 10;

const STATUS_CFG = {
  pending:  { label: "Chờ duyệt", cls: "cc-badge--pending"  },
  approved: { label: "Đã duyệt",  cls: "cc-badge--approved" },
  rejected: { label: "Từ chối",   cls: "cc-badge--rejected" },
};

const REJECT_REASONS = [
  "Chưa đủ doanh số tối thiểu",
  "Tỉ lệ đề nghị vượt khung chính sách",
  "Hồ sơ chưa rõ ràng",
  "Lý do khác",
];

const getNow = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/* ─── Approve modal ─────────────────────────────── */
function ApproveModal({ target, onClose, onConfirm, loading }) {
  return (
    <div className="cc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal">
        <div className="cc-modal-header cc-modal-header--approve">
          <span className="cc-modal-icon">✓</span>
          <div>
            <h3 className="cc-modal-title">Duyệt yêu cầu chỉnh sửa hoa hồng</h3>
            <p className="cc-modal-sub">{target.partnerName}</p>
          </div>
        </div>
        <div className="cc-modal-body">
          <div className="cc-modal-info-box">
            Tỉ lệ hoa hồng của đối tác <strong>{target.partnerName}</strong> sẽ được cập nhật:
            <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
              <div>Cấp 1: <strong>{target.currentL1}%</strong> → <strong style={{ color: "#0d9488" }}>{target.requestedL1 ?? target.currentL1}%</strong></div>
              <div>Cấp 2: <strong>{target.currentL2}%</strong> → <strong style={{ color: "#0d9488" }}>{target.requestedL2 ?? target.currentL2}%</strong></div>
              <div>Cấp 3: <strong>{target.currentL3}%</strong> → <strong style={{ color: "#0d9488" }}>{target.requestedL3 ?? target.currentL3}%</strong></div>
            </div>
          </div>
        </div>
        <div className="cc-modal-footer">
          <button className="cc-btn-cancel"  onClick={onClose}   disabled={loading}>✕ Hủy</button>
          <button className="cc-btn-confirm" onClick={onConfirm} disabled={loading}>
            {loading ? "Đang xử lý..." : "✓ Đồng ý"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Reject modal ──────────────────────────────── */
function RejectModal({ target, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [err,    setErr   ] = useState("");

  const submit = () => {
    if (!reason) { setErr("Vui lòng chọn lý do từ chối."); return; }
    onConfirm(reason, detail);
  };

  return (
    <div className="cc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal">
        <div className="cc-modal-header cc-modal-header--reject">
          <span className="cc-modal-icon cc-modal-icon--reject">✕</span>
          <div>
            <h3 className="cc-modal-title cc-modal-title--reject">Từ chối yêu cầu</h3>
            <p className="cc-modal-sub">{target.partnerName}</p>
          </div>
        </div>
        <div className="cc-modal-body">
          {err && <p className="cc-modal-err">{err}</p>}
          <label className="cc-modal-label">Lý do từ chối <span className="cc-req">*</span></label>
          <select className="cc-modal-select" value={reason} onChange={(e) => { setReason(e.target.value); setErr(""); }}>
            <option value="">Chọn lý do từ chối</option>
            {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="cc-modal-label" style={{ marginTop: 16 }}>Mô tả chi tiết</label>
          <textarea
            className="cc-modal-textarea"
            placeholder="Mô tả cụ thể (tuỳ chọn)"
            rows={4}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        </div>
        <div className="cc-modal-footer">
          <button className="cc-btn-cancel"  onClick={onClose} disabled={loading}>✕ Hủy</button>
          <button className="cc-btn-confirm" onClick={submit}  disabled={loading}>
            {loading ? "Đang xử lý..." : "✓ Đồng ý"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
function Commissionrequestlistpage() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading ] = useState(true);
  const [error,    setError   ] = useState("");

  const [tab,    setTab   ] = useState("pending");
  const [search, setSearch] = useState("");
  const [page,   setPage  ] = useState(1);

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget,  setRejectTarget ] = useState(null);
  const [modalLoading,  setModalLoading ] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true); setError("");
      const res = await api.get("/commissionRequests");
      const list = Array.isArray(res.data) ? res.data : [];
      setRequests(list.sort((a, b) => Number(b.id) - Number(a.id)));
    } catch (e) {
      console.error(e);
      setError("Không tải được danh sách yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = requests.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        ![r.partnerName, r.partnerCode]
          .filter(Boolean)
          .some((f) => f.toLowerCase().includes(q))
      ) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setModalLoading(true);
    try {
      // Cập nhật rate trên partner để Partnercontractpage user đọc
      const pRes = await api.get(`/partners/${approveTarget.partnerId}`);
      const partner = pRes.data;
      if (partner) {
        await api.put(`/partners/${approveTarget.partnerId}`, {
          ...partner,
          commissionRates: {
            l1: approveTarget.requestedL1 ?? approveTarget.currentL1,
            l2: approveTarget.requestedL2 ?? approveTarget.currentL2,
            l3: approveTarget.requestedL3 ?? approveTarget.currentL3,
          },
        });
      }
      const updated = { ...approveTarget, status: "approved", processedAt: getNow() };
      await api.put(`/commissionRequests/${approveTarget.id}`, updated);
      setRequests((prev) => prev.map((r) => (r.id === approveTarget.id ? updated : r)));
      setApproveTarget(null);
    } catch (e) {
      console.error(e);
      alert("Duyệt thất bại. Vui lòng thử lại.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleReject = async (reason, detail) => {
    if (!rejectTarget) return;
    setModalLoading(true);
    try {
      const updated = {
        ...rejectTarget,
        status:       "rejected",
        rejectReason: reason + (detail ? ` — ${detail}` : ""),
        processedAt:  getNow(),
      };
      await api.put(`/commissionRequests/${rejectTarget.id}`, updated);
      setRequests((prev) => prev.map((r) => (r.id === rejectTarget.id ? updated : r)));
      setRejectTarget(null);
    } catch (e) {
      console.error(e);
      alert("Từ chối thất bại. Vui lòng thử lại.");
    } finally {
      setModalLoading(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const resetPage = () => setPage(1);

  return (
    <div className="cc-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Yêu cầu chỉnh sửa hoa hồng</h1>
          <p>Xét duyệt các yêu cầu điều chỉnh tỉ lệ hoa hồng từ đối tác</p>
        </div>
      </div>

      <div className="cc-tabs">
        <button
          className={`cc-tab ${tab === "pending" ? "cc-tab--active" : ""}`}
          onClick={() => { setTab("pending"); resetPage(); }}
        >
          Chờ duyệt
          {pendingCount > 0 && <span className="cc-tab-badge">{pendingCount}</span>}
        </button>
        <button
          className={`cc-tab ${tab === "all" ? "cc-tab--active" : ""}`}
          onClick={() => { setTab("all"); resetPage(); }}
        >
          Tất cả
        </button>
        <button
          className={`cc-tab ${tab === "approved" ? "cc-tab--active" : ""}`}
          onClick={() => { setTab("approved"); resetPage(); }}
        >
          Đã duyệt
        </button>
        <button
          className={`cc-tab ${tab === "rejected" ? "cc-tab--active" : ""}`}
          onClick={() => { setTab("rejected"); resetPage(); }}
        >
          Từ chối
        </button>
      </div>

      <div className="cc-card">
        <div className="cc-filters">
          <input
            className="cc-search"
            placeholder="Tìm theo tên / mã đối tác..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          />
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
                  <th>Ngày gửi</th>
                  <th>Đối tác</th>
                  <th>Hiện tại (L1/L2/L3)</th>
                  <th>Đề xuất (L1/L2/L3)</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  {tab === "pending" && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr><td colSpan={tab === "pending" ? 7 : 6} className="cc-empty">Không có yêu cầu nào</td></tr>
                ) : (
                  pageData.map((r) => {
                    const cfg = STATUS_CFG[r.status] || STATUS_CFG.pending;
                    return (
                      <tr key={r.id} className="cc-row">
                        <td>{r.createdAt}</td>
                        <td>
                          <div>{r.partnerName}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.partnerCode}</div>
                        </td>
                        <td>{r.currentL1}% / {r.currentL2}% / {r.currentL3}%</td>
                        <td style={{ color: "#0d9488", fontWeight: 600 }}>
                          {(r.requestedL1 ?? r.currentL1)}% / {(r.requestedL2 ?? r.currentL2)}% / {(r.requestedL3 ?? r.currentL3)}%
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <div style={{ whiteSpace: "normal", color: "#475569" }}>{r.requestDetail}</div>
                          {r.status === "rejected" && r.rejectReason && (
                            <div style={{ marginTop: 4, fontSize: 12, color: "#b91c1c" }}>
                              Lý do từ chối: {r.rejectReason}
                            </div>
                          )}
                        </td>
                        <td><span className={`cc-badge ${cfg.cls}`}>{cfg.label}</span></td>
                        {tab === "pending" && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="cc-action-btns">
                              <button className="cc-btn-approve" onClick={() => setApproveTarget(r)}>Chấp nhận</button>
                              <button className="cc-btn-reject"  onClick={() => setRejectTarget(r)}>Từ chối</button>
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
            <span className="cc-count">
              Hiển thị {pageData.length}/{filtered.length} yêu cầu
            </span>
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

      {approveTarget && (
        <ApproveModal
          target={approveTarget}
          onClose={() => setApproveTarget(null)}
          onConfirm={handleApprove}
          loading={modalLoading}
        />
      )}
      {rejectTarget && (
        <RejectModal
          target={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
          loading={modalLoading}
        />
      )}
    </div>
  );
}

export default Commissionrequestlistpage;
