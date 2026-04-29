/**
 * src/pages/admin/Commissionrequestlistpage.jsx
 *
 * Admin xét duyệt YÊU CẦU KIỂM TRA / ĐIỀU CHỈNH HOA HỒNG.
 *
 * Luồng:
 *   - User báo lỗi (errorType + description + evidenceFiles).
 *   - Admin xem yêu cầu + minh chứng + commission history liên quan.
 *   - Approve:
 *       + nhập adjustmentAmount (VND, có thể âm/dương)
 *       + tạo entry mới trong /commissionHistory (commissionType="adjustment")
 *       + partner.commission += adjustmentAmount
 *       + ghi systemLog
 *       + notify user
 *   - Reject: chọn lý do, ghi rejectReason, notify user.
 */

import { useState, useEffect } from "react";
import api from "../../store/api";
import { notify } from "../../store/Notificationservice";
import "./Customercontractpage.css";

const PAGE_SIZE = 10;

const STATUS_CFG = {
  pending:  { label: "Chờ duyệt", cls: "cc-badge--pending"  },
  approved: { label: "Đã duyệt",  cls: "cc-badge--approved" },
  rejected: { label: "Từ chối",   cls: "cc-badge--rejected" },
};

const ERROR_LABEL = {
  missing:      "Thiếu hoa hồng",
  wrong_amount: "Sai số tiền",
  wrong_source: "Sai nguồn commission",
  wrong_upline: "Sai tuyến trên",
  other:        "Khác",
};

const REJECT_REASONS = [
  "Không đủ căn cứ điều chỉnh",
  "Hoa hồng đã được tính đúng theo quy định",
  "Minh chứng không hợp lệ",
  "Yêu cầu trùng lặp",
  "Lý do khác",
];

const fmtMoney = (n) => new Intl.NumberFormat("vi-VN").format(n || 0);

const getNow = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/* ─── Approve modal: nhập adjustmentAmount ─────────────────── */
function ApproveModal({ target, onClose, onConfirm, loading }) {
  const [adjustment, setAdjustment] = useState("");
  const [adminNote,  setAdminNote ] = useState("");
  const [err,        setErr       ] = useState("");

  const submit = () => {
    const num = Number(String(adjustment).replace(/\D/g, "")) * (String(adjustment).trim().startsWith("-") ? -1 : 1);
    if (!adjustment || isNaN(num) || num === 0) {
      setErr("Vui lòng nhập số tiền điều chỉnh khác 0 (dương = bù thêm, âm = trừ).");
      return;
    }
    setErr("");
    onConfirm({ adjustmentAmount: num, adminNote: adminNote.trim() });
  };

  return (
    <div className="cc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal" style={{ maxWidth: 560 }}>
        <div className="cc-modal-header cc-modal-header--approve">
          <span className="cc-modal-icon">✓</span>
          <div>
            <h3 className="cc-modal-title">Duyệt yêu cầu kiểm tra hoa hồng</h3>
            <p className="cc-modal-sub">{target.partnerName} · {ERROR_LABEL[target.errorType] || target.errorTypeLabel || "—"}</p>
          </div>
        </div>
        <div className="cc-modal-body">
          {err && <p className="cc-modal-err">{err}</p>}

          <div className="cc-modal-info-box" style={{ background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa" }}>
            <strong>Mô tả của user:</strong>
            <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{target.description || "—"}</p>
            {target.relatedContractCode && (
              <p style={{ marginTop: 8, fontSize: 12 }}>📄 HĐ liên quan: <strong>{target.relatedContractCode}</strong></p>
            )}
          </div>

          <label className="cc-modal-label" style={{ marginTop: 14 }}>
            Số tiền điều chỉnh (VNĐ) <span className="cc-req">*</span>
          </label>
          <input
            className="cc-modal-select"
            placeholder="Dương = bù thêm cho user, âm = trừ. VD: 5000000 hoặc -200000"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
          />
          {adjustment && !isNaN(Number(adjustment)) && Number(adjustment) !== 0 && (
            <p style={{ fontSize: 12, color: Number(adjustment) >= 0 ? "#15803d" : "#b91c1c", marginTop: 4 }}>
              {Number(adjustment) >= 0 ? "+ " : ""}{fmtMoney(Number(adjustment))} đ sẽ được cộng vào hoa hồng tích luỹ của user.
            </p>
          )}

          <label className="cc-modal-label" style={{ marginTop: 14 }}>Ghi chú của admin</label>
          <textarea
            className="cc-modal-textarea"
            placeholder="Lý do điều chỉnh, căn cứ tính toán..."
            rows={3}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
        </div>
        <div className="cc-modal-footer">
          <button className="cc-btn-cancel"  onClick={onClose} disabled={loading}>✕ Hủy</button>
          <button className="cc-btn-confirm" onClick={submit}  disabled={loading}>
            {loading ? "Đang xử lý..." : "✓ Tạo điều chỉnh"}
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

  const handleApprove = async ({ adjustmentAmount, adminNote }) => {
    if (!approveTarget) return;
    setModalLoading(true);
    try {
      // 1. Cập nhật commissionHistory: thêm 1 entry kiểu "adjustment" — bất biến.
      const histRes = await api.get("/commissionHistory");
      const histList = Array.isArray(histRes.data) ? histRes.data : [];
      const histIds = histList.map((x) => Number(x.id)).filter((n) => !isNaN(n));
      const newHistId = String((histIds.length > 0 ? Math.max(...histIds) : 0) + 1);
      await api.post("/commissionHistory", {
        id:                newHistId,
        partnerId:         String(approveTarget.partnerId),
        partnerName:       approveTarget.partnerName,
        sourcePartnerId:   String(approveTarget.partnerId),
        sourcePartnerName: approveTarget.partnerName,
        contractId:        null,
        contractCode:      approveTarget.relatedContractCode || `ADJ-${approveTarget.id}`,
        contractValue:     0,
        commissionType:    "ADJ",         // adjustment record
        rate:              0,
        commissionAmount:  adjustmentAmount,
        adjustmentRequestId: approveTarget.id,
        adjustmentNote:    adminNote || `Điều chỉnh theo yêu cầu #${approveTarget.id}: ${ERROR_LABEL[approveTarget.errorType] || approveTarget.errorTypeLabel || ""}`,
        createdAt:         getNow(),
      });

      // 2. Cập nhật partner.commission += adjustmentAmount
      try {
        const pRes = await api.get(`/partners/${approveTarget.partnerId}`);
        const partner = pRes.data;
        if (partner) {
          await api.put(`/partners/${approveTarget.partnerId}`, {
            ...partner,
            commission: (Number(partner.commission) || 0) + adjustmentAmount,
          });

          // Notify user
          if (partner.userId) {
            await notify({
              recipientType:   "user",
              recipientUserId: partner.userId,
              type:            "commission_approved",
              title:           "Yêu cầu kiểm tra hoa hồng được duyệt",
              message:         `Admin đã điều chỉnh ${adjustmentAmount >= 0 ? "+" : ""}${fmtMoney(adjustmentAmount)} đ vào hoa hồng tích luỹ của bạn. ${adminNote ? `Ghi chú: ${adminNote}` : ""}`,
              link:            "/my-commission",
              partnerId:       approveTarget.partnerId,
              partnerName:     approveTarget.partnerName,
            });
          }
        }
      } catch (e) { console.warn("Update partner.commission failed:", e); }

      // 3. Cập nhật request
      const updated = {
        ...approveTarget,
        status:           "approved",
        processedAt:      getNow(),
        adjustmentAmount,
        adminNote,
      };
      await api.put(`/commissionRequests/${approveTarget.id}`, updated);

      // 4. systemLog
      try {
        const slRes = await api.get("/systemLogs");
        const slIds = (Array.isArray(slRes.data) ? slRes.data : [])
          .map((x) => Number(x.id)).filter((n) => !isNaN(n));
        await api.post("/systemLogs", {
          id:         String((slIds.length > 0 ? Math.max(...slIds) : 0) + 1),
          type:       "approve_commission_adjustment",
          actorId:    "",
          actorName:  "admin",
          targetId:   String(approveTarget.partnerId),
          targetType: "partner",
          description: `Điều chỉnh ${adjustmentAmount >= 0 ? "+" : ""}${fmtMoney(adjustmentAmount)}đ cho ${approveTarget.partnerName} (req #${approveTarget.id})${adminNote ? ` — ${adminNote}` : ""}`,
          createdAt:  getNow(),
        });
      } catch { /* ignore */ }

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

      // Notify user
      try {
        const pRes = await api.get(`/partners/${rejectTarget.partnerId}`);
        const partner = pRes.data;
        if (partner?.userId) {
          await notify({
            recipientType:   "user",
            recipientUserId: partner.userId,
            type:            "commission_rejected",
            title:           "Yêu cầu chỉnh sửa hoa hồng bị từ chối",
            message:         `Lý do: ${reason}${detail ? ` — ${detail}` : ""}`,
            link:            "/partner-contract",
            partnerId:       rejectTarget.partnerId,
            partnerName:     rejectTarget.partnerName,
          });
        }
      } catch { /* ignore */ }

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
          <h1>Yêu cầu kiểm tra hoa hồng</h1>
          <p>Xét duyệt các yêu cầu kiểm tra/điều chỉnh hoa hồng kèm minh chứng</p>
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
                  <th>Loại lỗi</th>
                  <th>Mô tả & HĐ liên quan</th>
                  <th>Minh chứng</th>
                  <th>Điều chỉnh</th>
                  <th>Trạng thái</th>
                  {tab === "pending" && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr><td colSpan={tab === "pending" ? 8 : 7} className="cc-empty">Không có yêu cầu nào</td></tr>
                ) : (
                  pageData.map((r) => {
                    const cfg = STATUS_CFG[r.status] || STATUS_CFG.pending;
                    const errLbl = ERROR_LABEL[r.errorType] || r.errorTypeLabel || "—";
                    const desc = r.description || r.requestDetail || "";
                    const files = Array.isArray(r.evidenceFiles) ? r.evidenceFiles : [];
                    return (
                      <tr key={r.id} className="cc-row">
                        <td>{r.createdAt}</td>
                        <td>
                          <div>{r.partnerName}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.partnerCode}</div>
                        </td>
                        <td>
                          <span style={{
                            display: "inline-block", padding: "3px 8px", borderRadius: 6,
                            background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 600,
                          }}>{errLbl}</span>
                        </td>
                        <td style={{ maxWidth: 280 }}>
                          <div style={{ whiteSpace: "normal", color: "#475569", fontSize: 13 }}>{desc || "—"}</div>
                          {r.relatedContractCode && (
                            <div style={{ marginTop: 4, fontSize: 11, color: "#0d9488" }}>📄 {r.relatedContractCode}</div>
                          )}
                          {r.status === "rejected" && r.rejectReason && (
                            <div style={{ marginTop: 4, fontSize: 12, color: "#b91c1c" }}>
                              Lý do từ chối: {r.rejectReason}
                            </div>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {files.length === 0 ? (
                            <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {files.map((f, i) => (
                                <a
                                  key={i}
                                  href={f.dataUrl || "#"}
                                  download={f.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: 11, color: "#0d9488", textDecoration: "underline" }}
                                  title={f.name}
                                >
                                  📎 {f.name?.length > 24 ? f.name.slice(0, 22) + "..." : f.name}
                                </a>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          {r.status === "approved" && r.adjustmentAmount != null ? (
                            <div>
                              <strong style={{ color: r.adjustmentAmount >= 0 ? "#15803d" : "#b91c1c" }}>
                                {r.adjustmentAmount >= 0 ? "+" : ""}{fmtMoney(r.adjustmentAmount)} đ
                              </strong>
                              {r.adminNote && (
                                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{r.adminNote}</div>
                              )}
                            </div>
                          ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                        </td>
                        <td><span className={`cc-badge ${cfg.cls}`}>{cfg.label}</span></td>
                        {tab === "pending" && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="cc-action-btns">
                              <button className="cc-btn-approve" onClick={() => setApproveTarget(r)}>Duyệt</button>
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
