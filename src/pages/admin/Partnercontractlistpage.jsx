/**
 * PartnerContractListPage.jsx
 *
 * Tổng hợp hợp đồng đối tác từ 2 nguồn:
 *   1. partners (status=approved, level=1)  → HĐ đăng ký làm đối tác
 *   2. upgradeRequests (status=approved)    → HĐ nâng cấp cấp 2, 3
 *
 * Admin: xem tất cả
 * Đối tác: chỉ xem của mình
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useAuthStore from "../../store/authStore";
import "./PartnerContractPage.css";

const BASE = "http://localhost:3000";

/* ─── Helpers ────────────────────────────────────────────── */
const PAGE_SIZE   = 17;
const MONTHS      = Array.from({ length: 12 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS       = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const STATUS_CFG = {
  approved: { label: "Hiệu Lực", cls: "pc-badge--approved" },
  expired:  { label: "Hết hạn",  cls: "pc-badge--expired"  },
  pending:  { label: "Chờ duyệt",cls: "pc-badge--pending"  },
};

const CONTRACT_TYPES = [
  "Đăng ký làm đối tác",
  "Đăng ký làm đối tác cấp 2",
  "Đăng ký làm đối tác cấp 3",
];

/**
 * Tổng hợp danh sách hợp đồng từ partners + upgradeRequests
 * Mỗi record trả về có dạng chuẩn:
 * {
 *   id, code, partnerId, partnerName, partnerCode,
 *   contractType, signDate, status, contractFile,
 *   level, source  // "partner" | "upgrade"
 * }
 */
const buildContractList = (partners, upgradeRequests) => {
  const list = [];

  // 1. HĐ đăng ký làm đối tác (từ partners approved)
  partners
    .filter((p) => p.status === "approved")
    .forEach((p) => {
      list.push({
        id:           `partner-${p.id}`,
        partnerId:    p.id,
        partnerCode:  `DT${String(p.code).padStart(6, "0")}`,
        partnerName:  p.name,
        contractType: "Đăng ký làm đối tác",
        signDate:     p.joinDate || "—",
        status:       "approved",
        contractFile: p.contractFile || null,
        level:        1,
        source:       "partner",
        // Data đầy đủ cho detail page
        _partner:     p,
      });
    });

  // 2. HĐ nâng cấp (từ upgradeRequests approved)
  upgradeRequests
    .filter((r) => r.status === "approved")
    .forEach((r) => {
      const nextLevel = (r.currentLevel || 1) + 1;
      list.push({
        id:           `upgrade-${r.id}`,
        upgradeId:    r.id,
        partnerId:    r.partnerId,
        partnerCode:  r.partnerCode || `DT${String(r.partnerId).padStart(6, "0")}`,
        partnerName:  r.partnerName,
        contractType: `Đăng ký làm đối tác cấp ${nextLevel}`,
        signDate:     r.approvedAt || r.submittedAt || "—",
        status:       "approved",
        contractFile: r.contractFile || null,
        level:        nextLevel,
        source:       "upgrade",
        // Data đầy đủ cho detail page
        _upgrade:     r,
      });
    });

  // Sắp xếp: mới nhất trước (theo signDate dd/mm/yyyy)
  list.sort((a, b) => {
    const toMs = (d = "") => {
      const p = d.split("/");
      if (p.length !== 3) return 0;
      return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
    };
    return toMs(b.signDate) - toMs(a.signDate);
  });

  return list;
};

/* ═══════════════════════════════════════════════
   Main
═══════════════════════════════════════════════ */
function Partnercontractlistpage() {
  const navigate    = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin     = currentUser?.role === "Admin";

  const [contracts, setContracts] = useState([]);
  const [loading,   setLoading  ] = useState(true);
  const [error,     setError    ] = useState("");

  // Filters
  const [tab,          setTab         ] = useState("list");
  const [search,       setSearch      ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter,   setTypeFilter  ] = useState("");
  const [month,        setMonth       ] = useState("");
  const [year,         setYear        ] = useState("");
  const [page,         setPage        ] = useState(1);

  /* ── Fetch ── */
  const fetchContracts = async () => {
    if (!currentUser) return;
    try {
      setLoading(true); setError("");

      const [partnersRes, upgradesRes] = await Promise.all([
        axios.get(`${BASE}/partners`),
        axios.get(`${BASE}/upgradeRequests`),
      ]);

      let partners        = Array.isArray(partnersRes.data) ? partnersRes.data : [];
      let upgradeRequests = Array.isArray(upgradesRes.data) ? upgradesRes.data : [];

      // Đối tác: chỉ xem của mình
      if (!isAdmin) {
        const me = partners.find(
          (p) =>
            String(p.userId) === String(currentUser.id) ||
            p.email === currentUser.email
        );
        if (me) {
          partners        = partners.filter((p) => String(p.id) === String(me.id));
          upgradeRequests = upgradeRequests.filter((r) => String(r.partnerId) === String(me.id));
        } else {
          partners        = [];
          upgradeRequests = [];
        }
      }

      setContracts(buildContractList(partners, upgradeRequests));
    } catch (err) {
      console.error(err);
      setError("Không thể tải dữ liệu hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContracts(); }, [currentUser]);

  /* ── Filter ── */
  const filtered = contracts.filter((c) => {
    const q = search.trim().toLowerCase();
    if (
      q &&
      ![c.partnerCode, c.partnerName, c.contractType]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q))
    ) return false;

    if (statusFilter && c.status !== statusFilter) return false;
    if (typeFilter   && c.contractType !== typeFilter) return false;

    if (month || year) {
      const parts = (c.signDate || "").split("/");
      if (parts.length === 3) {
        if (month && parts[1] !== String(month).padStart(2, "0")) return false;
        if (year  && parts[2] !== String(year))                   return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const resetPage  = () => setPage(1);

  /* ── Navigate to detail ── */
  const goDetail = (c) => {
    // Encode source và id vào URL để detail page biết lấy data từ đâu
    const path = isAdmin
      ? `/admin/partner-contracts/${c.source}/${c.source === "partner" ? c.partnerId : c.upgradeId}`
      : `/hop-dong-doi-tac/${c.source}/${c.source === "partner" ? c.partnerId : c.upgradeId}`;
    navigate(path);
  };

  /* ── Render ── */
  return (
    <div className="pc-page">

      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Quản lý hợp đồng đối tác</h1>
          <p>Duyệt, tạo, chỉnh sửa và theo dõi toàn bộ hợp đồng đối tác</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="pc-tabs">
        <button
          className={`pc-tab ${tab === "list" ? "pc-tab--active" : ""}`}
          onClick={() => { setTab("list"); resetPage(); }}
        >
          Danh sách hợp đồng
        </button>
        <button
          className={`pc-tab ${tab === "commission" ? "pc-tab--active" : ""}`}
          onClick={() => { setTab("commission"); resetPage(); }}
        >
          Danh sách yêu cầu chỉnh sửa hoa hồng
        </button>
      </div>

      <div className="pc-card">

        {/* ══ Tab: Danh sách hợp đồng ══ */}
        {tab === "list" && (
          <>
            {/* Filters */}
            <div className="pc-filters">
              <input
                className="pc-search"
                placeholder="Tìm kiếm mã đối tác, họ tên, loại hợp đồng,..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              />
              <select
                className="pc-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
              >
                <option value="">Trạng thái</option>
                <option value="approved">Hiệu Lực</option>
                <option value="expired">Hết hạn</option>
              </select>
              <select
                className="pc-select"
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); resetPage(); }}
              >
                <option value="">Loại hợp đồng</option>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="pc-filters-right">
                <select
                  className="pc-select"
                  value={month}
                  onChange={(e) => { setMonth(e.target.value); resetPage(); }}
                >
                  <option value="">Tháng</option>
                  {MONTHS.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
                </select>
                <select
                  className="pc-select"
                  value={year}
                  onChange={(e) => { setYear(e.target.value); resetPage(); }}
                >
                  <option value="">Năm</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {loading && (
              <div className="pc-loading">
                <div className="pc-spinner" /><p>Đang tải dữ liệu...</p>
              </div>
            )}

            {!loading && error && (
              <div className="pc-error">
                ⚠️ {error}
                <button onClick={fetchContracts}>Thử lại</button>
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="pc-table-wrap">
                  <table className="pc-table">
                    <thead>
                      <tr>
                        <th>Mã HĐ</th>
                        <th>Họ và tên</th>
                        <th>Ngày ký</th>
                        <th>Loại hợp đồng</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="pc-empty">
                            Không có hợp đồng nào
                          </td>
                        </tr>
                      ) : pageData.map((c) => {
                        const cfg = STATUS_CFG[c.status] || STATUS_CFG.approved;
                        return (
                          <tr
                            key={c.id}
                            className="pc-row"
                            onClick={() => goDetail(c)}
                          >
                            <td className="pc-code">{c.partnerCode}</td>
                            <td>{c.partnerName}</td>
                            <td>{c.signDate}</td>
                            <td>
                              <span className={`pc-type-tag pc-type-tag--${c.level}`}>
                                {c.contractType}
                              </span>
                            </td>
                            <td>
                              <span className={`pc-badge ${cfg.cls}`}>{cfg.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pc-footer">
                  <span className="pc-count">
                    Hiển thị {pageData.length}/{filtered.length} Hợp đồng
                  </span>
                  {totalPages > 1 && (
                    <div className="pc-pagination">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          className={`pc-page-btn ${p === page ? "pc-page-btn--active" : ""}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ══ Tab: Yêu cầu chỉnh sửa hoa hồng ══ */}
        {tab === "commission" && (
          <CommissionRequestTab isAdmin={isAdmin} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Tab: Yêu cầu chỉnh sửa hoa hồng
═══════════════════════════════════════════════ */
function CommissionRequestTab({ isAdmin, currentUser }) {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading ] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [reqRes, pRes] = await Promise.all([
          axios.get(`${BASE}/commissionRequests`),
          axios.get(`${BASE}/partners`),
        ]);
        let list   = Array.isArray(reqRes.data) ? reqRes.data : [];
        const pList = Array.isArray(pRes.data) ? pRes.data : [];

        if (!isAdmin && currentUser) {
          const me = pList.find(
            (p) =>
              String(p.userId) === String(currentUser.id) ||
              p.email === currentUser.email
          );
          list = me
            ? list.filter((r) => String(r.partnerId) === String(me.id))
            : [];
        }

        setRequests(list);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [isAdmin, currentUser]);

  const handleApprove = async (req) => {
    try {
      await axios.patch(`${BASE}/commissionRequests/${req.id}`, { status: "approved" });
      setRequests((prev) =>
        prev.map((r) => r.id === req.id ? { ...r, status: "approved" } : r)
      );
    } catch { alert("Thao tác thất bại."); }
  };

  const handleReject = async (req) => {
    if (!window.confirm(`Từ chối yêu cầu của "${req.partnerName}"?`)) return;
    try {
      await axios.patch(`${BASE}/commissionRequests/${req.id}`, { status: "rejected" });
      setRequests((prev) =>
        prev.map((r) => r.id === req.id ? { ...r, status: "rejected" } : r)
      );
    } catch { alert("Thao tác thất bại."); }
  };

  if (loading) return (
    <div className="pc-loading"><div className="pc-spinner" /><p>Đang tải...</p></div>
  );

  return (
    <div className="pc-table-wrap">
      <table className="pc-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã đối tác</th>
            <th>Họ và tên</th>
            <th>Yêu cầu thay đổi</th>
            <th>Ngày gửi</th>
            <th>Trạng thái</th>
            {isAdmin && <th>Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr>
              <td colSpan={isAdmin ? 7 : 6} className="pc-empty">
                Không có yêu cầu nào
              </td>
            </tr>
          ) : requests.map((r, idx) => (
            <tr key={r.id} className="pc-row">
              <td>{idx + 1}</td>
              <td>{r.partnerCode}</td>
              <td>{r.partnerName}</td>
              <td style={{ maxWidth: 280, color: "#64748b", fontSize: 13 }}>
                {r.requestDetail || "—"}
              </td>
              <td>{r.createdAt}</td>
              <td>
                <span className={`pc-badge ${
                  r.status === "approved" ? "pc-badge--approved" :
                  r.status === "rejected" ? "pc-badge--expired"  :
                  "pc-badge--pending"
                }`}>
                  {r.status === "approved" ? "Đã duyệt" :
                   r.status === "rejected" ? "Từ chối"  : "Chờ duyệt"}
                </span>
              </td>
              {isAdmin && (
                <td>
                  {r.status === "pending" ? (
                    <div className="pc-action-btns">
                      <button className="pc-btn-approve" onClick={() => handleApprove(r)}>
                        ✓ Duyệt
                      </button>
                      <button className="pc-btn-reject" onClick={() => handleReject(r)}>
                        ✕ Từ chối
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Partnercontractlistpage;