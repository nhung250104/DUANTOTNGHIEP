/**
 * CustomerContractPage.jsx
 *
 * Dùng chung cho admin và đối tác qua prop isAdmin
 * Admin  → xem tất cả HĐ
 * Đối tác → chỉ xem HĐ của mình (map userId → partnerId)
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useAuthStore from "../../store/authStore";
import "./CustomerContractPage.css";

/* ─── API base ───────────────────────────────────────────── */
const BASE = "http://localhost:3000";

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n || 0) + " đ";

const getNow = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const DEFAULT_RATES = {
  1: { l1: 20, l2: 10, l3: 3 },
  2: { l1: 25, l2: 12, l3: 5 },
  3: { l1: 30, l2: 15, l3: 7 },
};
const ratesOf = (partner) =>
  partner?.commissionRates || DEFAULT_RATES[partner?.level] || DEFAULT_RATES[1];

const nextId = async (collection) => {
  try {
    const res  = await axios.get(`${BASE}/${collection}`);
    const list = Array.isArray(res.data) ? res.data : [];
    const ids  = list.map((x) => Number(x.id)).filter((n) => !isNaN(n));
    return String((ids.length > 0 ? Math.max(...ids) : 0) + 1);
  } catch { return "1"; }
};

/**
 * Khi admin duyệt HĐ KH: ghi commissionHistory cho partner ký + cấp trên (F1, F2),
 * cập nhật counter partner (contracts++, commission += personal), ghi systemLog.
 */
async function applyContractCommission(contract, adminUser) {
  // 1. Lấy chuỗi partner: signing → parent → grandparent
  const pRes = await axios.get(`${BASE}/partners`);
  const partners = Array.isArray(pRes.data) ? pRes.data : [];
  const findById = (id) => partners.find((p) => String(p.id) === String(id));

  const signer = findById(contract.partnerId);
  if (!signer) return;
  const parent      = signer.parentId ? findById(signer.parentId) : null;
  const grandparent = parent?.parentId ? findById(parent.parentId) : null;

  const value = Number(contract.value) || 0;
  const records = [];

  // L1 — personal
  const r1 = ratesOf(signer);
  records.push({
    receiver: signer,
    type: "L1",
    rate: r1.l1,
    amount: Math.round(value * r1.l1 / 100),
  });
  // L2 — parent
  if (parent) {
    const r2 = ratesOf(parent);
    records.push({
      receiver: parent,
      type: "L2",
      rate: r2.l2,
      amount: Math.round(value * r2.l2 / 100),
    });
  }
  // L3 — grandparent
  if (grandparent) {
    const r3 = ratesOf(grandparent);
    records.push({
      receiver: grandparent,
      type: "L3",
      rate: r3.l3,
      amount: Math.round(value * r3.l3 / 100),
    });
  }

  // 2. POST commissionHistory
  for (const r of records) {
    const id = await nextId("commissionHistory");
    await axios.post(`${BASE}/commissionHistory`, {
      id,
      partnerId:         String(r.receiver.id),
      partnerName:       r.receiver.name,
      sourcePartnerId:   String(signer.id),
      sourcePartnerName: signer.name,
      contractId:        String(contract.id),
      contractCode:      contract.code,
      contractValue:     value,
      commissionType:    r.type,
      rate:              r.rate,
      commissionAmount:  r.amount,
      createdAt:         getNow(),
    });
  }

  // 3. Cập nhật counter cho từng partner nhận
  for (const r of records) {
    const cur = r.receiver;
    const updated = {
      ...cur,
      // Chỉ tăng số HĐ ký cho L1 (signer); L2/L3 chỉ cộng tiền
      contracts:  r.type === "L1" ? (cur.contracts || 0) + 1 : cur.contracts || 0,
      commission: (cur.commission || 0) + r.amount,
    };
    await axios.put(`${BASE}/partners/${cur.id}`, updated);
  }

  // 4. systemLog
  try {
    const id = await nextId("systemLogs");
    await axios.post(`${BASE}/systemLogs`, {
      id,
      type:        "approve_customer_contract",
      actorId:     String(adminUser?.id || ""),
      actorName:   adminUser?.name || "admin",
      targetId:    String(contract.id),
      targetType:  "customerContract",
      description: `Duyệt HĐ ${contract.code} (${signer.name}, ${value.toLocaleString("vi-VN")} đ)`,
      createdAt:   getNow(),
    });
  } catch { /* log lỗi không chặn flow */ }
}

const PAGE_SIZE = 10;

const MONTHS      = Array.from({ length: 12 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS       = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const STATUS_CFG = {
  approved: { label: "Hiệu Lực",  cls: "cc-badge--approved" },
  pending:  { label: "Chờ duyệt", cls: "cc-badge--pending"  },
  expired:  { label: "Hết hạn",   cls: "cc-badge--expired"  },
  rejected: { label: "Từ chối",   cls: "cc-badge--rejected" },
};

const REJECT_REASONS = [
  "Thông tin khách hàng không hợp lệ",
  "File hợp đồng không đúng mẫu",
  "Giá trị hợp đồng không phù hợp",
  "Hợp đồng chưa có chữ ký / đóng dấu",
  "Khách hàng trùng với hợp đồng khác",
  "Lý do khác",
];

/* ═══════════════════════════════════════════════
   Modal: Duyệt
═══════════════════════════════════════════════ */
function ApproveModal({ onClose, onConfirm, loading }) {
  return (
    <div className="cc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal">
        <div className="cc-modal-header cc-modal-header--approve">
          <span className="cc-modal-icon">✓</span>
          <div>
            <h3 className="cc-modal-title">Duyệt hợp đồng ĐT - KH</h3>
            <p className="cc-modal-sub">Duyệt hợp đồng đối tác - khách hàng</p>
          </div>
        </div>

        <div className="cc-modal-body">
          <div className="cc-modal-info-box">
            Sau khi duyệt, hợp đồng sẽ hiệu lực và hệ thống tự động tính hoa hồng
            cho đối tác. Đối tác sẽ nhận thông báo qua email.
          </div>
        </div>

        <div className="cc-modal-footer">
          <button className="cc-btn-cancel" onClick={onClose} disabled={loading}>
            ✕ Hủy
          </button>
          <button className="cc-btn-confirm" onClick={onConfirm} disabled={loading}>
            {loading ? "Đang xử lý..." : "✓ Đồng ý"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Modal: Từ chối
═══════════════════════════════════════════════ */
function RejectModal({ onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [err,    setErr   ] = useState("");

  const handleSubmit = () => {
    if (!reason) { setErr("Vui lòng chọn lý do từ chối."); return; }
    onConfirm(reason, detail);
  };

  return (
    <div className="cc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal">
        <div className="cc-modal-header cc-modal-header--reject">
          <span className="cc-modal-icon cc-modal-icon--reject">✕</span>
          <div>
            <h3 className="cc-modal-title cc-modal-title--reject">
              Từ chối yêu cầu hợp đồng ĐT - KH
            </h3>
            <p className="cc-modal-sub">Duyệt hợp đồng đối tác - khách hàng</p>
          </div>
        </div>

        <div className="cc-modal-body">
          {err && <p className="cc-modal-err">{err}</p>}

          <label className="cc-modal-label">
            Lý do từ chối <span className="cc-req">*</span>
          </label>
          <select
            className="cc-modal-select"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setErr(""); }}
          >
            <option value="">Chọn lý do từ chối</option>
            {REJECT_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <label className="cc-modal-label" style={{ marginTop: 16 }}>
            Mô tả chi tiết
          </label>
          <textarea
            className="cc-modal-textarea"
            placeholder="Mô tả cụ thể lý do từ chối"
            rows={4}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        </div>

        <div className="cc-modal-footer">
          <button className="cc-btn-cancel" onClick={onClose} disabled={loading}>
            ✕ Hủy
          </button>
          <button className="cc-btn-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang xử lý..." : "✓ Đồng ý"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════ */
function CustomerContractPage({ isAdmin = false }) {
  const navigate    = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [contracts,     setContracts    ] = useState([]);
  const [loading,       setLoading      ] = useState(true);
  const [error,         setError        ] = useState("");

  /* Filters */
  const [tab,    setTab   ] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [month,  setMonth ] = useState("");
  const [year,   setYear  ] = useState("");
  const [page,   setPage  ] = useState(1);

  /* Modals */
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget,  setRejectTarget ] = useState(null);
  const [modalLoading,  setModalLoading ] = useState(false);

  /* ── Fetch ── */
  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Lấy tất cả hợp đồng
      const res  = await axios.get(`${BASE}/customerContracts`);
      let list   = Array.isArray(res.data) ? res.data : [];

      // 2. Nếu là đối tác → lọc theo partnerId của mình
      if (!isAdmin && currentUser) {
        const pRes  = await axios.get(`${BASE}/partners`);
        const pList = Array.isArray(pRes.data) ? pRes.data : [];

        // Tìm partner theo userId trước, fallback email
        const me = pList.find(
          (p) =>
            String(p.userId) === String(currentUser.id) ||
            p.email === currentUser.email
        );

        if (me) {
          // Lọc HĐ theo partnerId (so sánh string để tránh lỗi kiểu dữ liệu)
          list = list.filter((c) => String(c.partnerId) === String(me.id));
        } else {
          // Không tìm thấy partner → không có HĐ nào
          list = [];
        }
      }

      setContracts(list);
    } catch (err) {
      console.error("Lỗi fetch customerContracts:", err);
      setError("Không thể tải dữ liệu hợp đồng. Kiểm tra json-server đang chạy chưa.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAdmin]);

  /* ── Filter ── */
  const filtered = contracts.filter((c) => {
    // Tab pending
    if (tab === "pending" && c.status !== "pending") return false;

    // Search: mã HĐ, đối tác, khách hàng
    const q = search.trim().toLowerCase();
    if (
      q &&
      ![c.code, c.partnerName, c.customerName]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q))
    ) return false;

    // Status dropdown (chỉ tab all)
    if (status && c.status !== status) return false;

    // Tháng / năm theo signDate "dd/mm/yyyy"
    if (month || year) {
      const parts = (c.signDate || "").split("/"); // [dd, mm, yyyy]
      if (parts.length === 3) {
        if (month && parts[1] !== String(month).padStart(2, "0")) return false;
        if (year  && parts[2] !== String(year))                   return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  /* ── Duyệt ── */
  const handleApprove = async () => {
    if (!approveTarget) return;
    setModalLoading(true);
    try {
      const updated = { ...approveTarget, status: "approved" };
      await axios.put(`${BASE}/customerContracts/${approveTarget.id}`, updated);
      // Ghi commissionHistory + cập nhật counter partner + systemLog
      await applyContractCommission(updated, currentUser);
      setContracts((prev) =>
        prev.map((c) => (c.id === approveTarget.id ? updated : c))
      );
      setApproveTarget(null);
    } catch (err) {
      console.error("Lỗi duyệt HĐ:", err);
      alert("Duyệt thất bại. Vui lòng thử lại.");
    } finally {
      setModalLoading(false);
    }
  };

  /* ── Từ chối ── */
  const handleReject = async (reason, detail) => {
    if (!rejectTarget) return;
    setModalLoading(true);
    try {
      const updated = {
        ...rejectTarget,
        status:       "rejected",
        rejectReason: reason,
        rejectDetail: detail,
      };
      await axios.put(`${BASE}/customerContracts/${rejectTarget.id}`, updated);
      try {
        const id = await nextId("systemLogs");
        await axios.post(`${BASE}/systemLogs`, {
          id,
          type:        "reject_customer_contract",
          actorId:     String(currentUser?.id || ""),
          actorName:   currentUser?.name || "admin",
          targetId:    String(updated.id),
          targetType:  "customerContract",
          description: `Từ chối HĐ ${updated.code}: ${reason}${detail ? ` — ${detail}` : ""}`,
          createdAt:   getNow(),
        });
      } catch {/* log lỗi không chặn flow */}
      setContracts((prev) =>
        prev.map((c) => (c.id === rejectTarget.id ? updated : c))
      );
      setRejectTarget(null);
    } catch (err) {
      console.error("Lỗi từ chối HĐ:", err);
      alert("Từ chối thất bại. Vui lòng thử lại.");
    } finally {
      setModalLoading(false);
    }
  };

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  return (
    <div className="cc-page">

      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Quản lý hợp đồng khách hàng</h1>
          <p>Quản lý toàn bộ hợp đồng khách hàng của đối tác</p>
        </div>
        <button
          className="cc-btn-create"
          onClick={() =>
            navigate(
              isAdmin
                ? "/admin/customer-contracts/tao-moi"
                : "/hop-dong-khach-hang/tao-moi"
            )
          }
        >
          + Tạo HD
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="cc-tabs">
        <button
          className={`cc-tab ${tab === "all" ? "cc-tab--active" : ""}`}
          onClick={() => { setTab("all"); resetPage(); }}
        >
          Tất cả hợp đồng
        </button>
        <button
          className={`cc-tab ${tab === "pending" ? "cc-tab--active" : ""}`}
          onClick={() => { setTab("pending"); resetPage(); }}
        >
          Chờ duyệt
          {contracts.filter((c) => c.status === "pending").length > 0 && (
            <span className="cc-tab-badge">
              {contracts.filter((c) => c.status === "pending").length}
            </span>
          )}
        </button>
      </div>

      {/* ── Card ── */}
      <div className="cc-card">

        {/* ── Filters ── */}
        <div className="cc-filters">
          <input
            className="cc-search"
            placeholder="Tìm kiếm mã HĐ, đối tác, khách hàng,..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          />

          {tab === "all" && (
            <select
              className="cc-select"
              value={status}
              onChange={(e) => { setStatus(e.target.value); resetPage(); }}
            >
              <option value="">Tất cả</option>
              <option value="approved">Hiệu Lực</option>
              <option value="pending">Chờ duyệt</option>
              <option value="expired">Hết hạn</option>
              <option value="rejected">Từ chối</option>
            </select>
          )}

          <div className="cc-filters-right">
            <select
              className="cc-select"
              value={month}
              onChange={(e) => { setMonth(e.target.value); resetPage(); }}
            >
              <option value="">Tháng</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <select
              className="cc-select"
              value={year}
              onChange={(e) => { setYear(e.target.value); resetPage(); }}
            >
              <option value="">Năm</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="cc-loading">
            <div className="cc-spinner" />
            <p>Đang tải dữ liệu...</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="cc-error">
            ⚠️ {error}
            <button onClick={fetchContracts}>Thử lại</button>
          </div>
        )}

        {/* ══════════════════════════════════════
            Tab: Tất cả hợp đồng
        ══════════════════════════════════════ */}
        {!loading && !error && tab === "all" && (
          <div className="cc-table-wrap">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Mã HĐ</th>
                  {isAdmin && <th>Đối tác</th>}
                  <th>Khách hàng</th>
                  <th>Ngày ký</th>
                  <th>Ngày hết hạn</th>
                  <th>Giá trị</th>
                  <th>Hoa hồng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="cc-empty">
                      Không có hợp đồng nào
                    </td>
                  </tr>
                ) : (
                  pageData.map((c) => {
                    const cfg      = STATUS_CFG[c.status] || STATUS_CFG.pending;
                    const isActive = c.status === "approved" || c.status === "pending";
                    return (
                      <tr
                        key={c.id}
                        className="cc-row"
                        onClick={() =>
                          navigate(
                            isAdmin
                              ? `/admin/customer-contracts/${c.id}`
                              : `/hop-dong-khach-hang/${c.id}`
                          )
                        }
                      >
                        <td>
                          <span className={`cc-code ${isActive ? "cc-code--active" : ""}`}>
                            {c.code}
                          </span>
                        </td>
                        {isAdmin && <td>{c.partnerName}</td>}
                        <td>{c.customerName}</td>
                        <td>{c.signDate}</td>
                        <td>{c.expireDate}</td>
                        <td><strong>{fmt(c.value)}</strong></td>
                        <td>{fmt(c.commission)}</td>
                        <td>
                          <span className={`cc-badge ${cfg.cls}`}>{cfg.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ══════════════════════════════════════
            Tab: Chờ duyệt
        ══════════════════════════════════════ */}
        {!loading && !error && tab === "pending" && (
          <div className="cc-table-wrap">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Mã HĐ</th>
                  {isAdmin && <th>Đối tác</th>}
                  <th>Khách hàng</th>
                  <th>Ngày gửi</th>
                  <th>Giá trị</th>
                  <th>File HĐ</th>
                  {isAdmin && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 5} className="cc-empty">
                      Không có hợp đồng chờ duyệt
                    </td>
                  </tr>
                ) : (
                  pageData.map((c) => (
                    <tr
                      key={c.id}
                      className="cc-row"
                      onClick={() =>
                        navigate(
                          isAdmin
                            ? `/admin/customer-contracts/${c.id}`
                            : `/hop-dong-khach-hang/${c.id}`
                        )
                      }
                    >
                      <td>
                        <span className="cc-code cc-code--active">{c.code}</span>
                      </td>
                      {isAdmin && <td>{c.partnerName}</td>}
                      <td>{c.customerName}</td>
                      <td>{c.createdAt}</td>
                      <td><strong>{fmt(c.value)}</strong></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {c.contractFile ? (
                          <a
                            href={`/${c.contractFile}`}
                            className="cc-file-link"
                            target="_blank"
                            rel="noreferrer"
                          >
                            📄 {c.contractFile}
                          </a>
                        ) : "—"}
                      </td>
                      {isAdmin && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="cc-action-btns">
                            <button
                              className="cc-btn-approve"
                              onClick={() => setApproveTarget(c)}
                            >
                              Chấp nhận
                            </button>
                            <button
                              className="cc-btn-reject"
                              onClick={() => setRejectTarget(c)}
                            >
                              Từ chối
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer: count + pagination ── */}
        {!loading && !error && (
          <div className="cc-footer">
            <span className="cc-count">
              Hiển thị {pageData.length}/{filtered.length} Hợp đồng
            </span>
            {totalPages > 1 && (
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
            )}
          </div>
        )}
      </div>

      {/* ── Modal duyệt ── */}
      {approveTarget && (
        <ApproveModal
          onClose={() => setApproveTarget(null)}
          onConfirm={handleApprove}
          loading={modalLoading}
        />
      )}

      {/* ── Modal từ chối ── */}
      {rejectTarget && (
        <RejectModal
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
          loading={modalLoading}
        />
      )}
    </div>
  );
}

export default CustomerContractPage;