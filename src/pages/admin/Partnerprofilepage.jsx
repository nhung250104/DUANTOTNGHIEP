import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import partnerService from "../../store/Partnerservice";
import api from "../../store/api";
import useAuthStore from "../../store/authStore";
import "./Partnerprofilepage.css";

const PAGE_SIZE = 17;

/* ══════════════════════════════════════════════
   Helper: lấy maxId của 1 collection
══════════════════════════════════════════════ */
const getMaxId = async (collection) => {
  try {
    const res  = await api.get(`/${collection}`);
    const list = Array.isArray(res.data) ? res.data : [];
    const ids  = list.map((x) => Number(x.id)).filter((n) => !isNaN(n));
    return ids.length > 0 ? Math.max(...ids) : 0;
  } catch {
    return 0;
  }
};

/* ══════════════════════════════════════════════
   Modal upload hợp đồng khi duyệt nâng cấp
══════════════════════════════════════════════ */
function UpgradeApproveModal({ req, onClose, onSubmit }) {
  const [file,    setFile   ] = useState(null);
  const [err,     setErr    ] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setErr(""); }
  };

  const handleSubmit = async () => {
    if (!file) { setErr("Vui lòng tải lên file hợp đồng."); return; }
    setLoading(true);
    await onSubmit(req, file);
    setLoading(false);
  };

  const nextLevel = (req.currentLevel || 1) + 1;

  return (
    <div className="pp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pp-modal">
        <div className="pp-modal-header pp-modal-header--approve">
          <span className="pp-modal-icon">✓</span>
          <div>
            <h3 className="pp-modal-title">Duyệt nâng cấp lên Cấp {nextLevel}</h3>
            <p className="pp-modal-sub">
              Nâng cấp <strong>{req.partnerName}</strong> từ Cấp {req.currentLevel || 1} lên Cấp {nextLevel}
            </p>
          </div>
        </div>

        <div className="pp-modal-body">
          <label className="pp-modal-label">Tải lên hợp đồng *</label>
          {err && <p className="pp-modal-err">{err}</p>}
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={handleFile} />
          <div
            className={`pp-upload-box ${file ? "pp-upload-box--filled" : ""}`}
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <>
                <span className="pp-upload-icon">📄</span>
                <span className="pp-upload-filename">{file.name}</span>
              </>
            ) : (
              <>
                <span className="pp-upload-arrow">⬆</span>
                <span className="pp-upload-text">Tải lên hợp đồng (.pdf, .doc, .docx)</span>
              </>
            )}
          </div>
        </div>

        <div className="pp-modal-footer">
          <button className="pp-modal-btn-cancel" onClick={onClose} disabled={loading}>✕ Hủy</button>
          <button className="pp-modal-btn-send" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang xử lý..." : "✓ Xác nhận duyệt"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Reusable table
══════════════════════════════════════════════ */
function PartnerTable({ data, onRowClick, extraColumns = [] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pageData   = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="pp-table-wrap">
        <table className="pp-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã đối tác</th>
              <th>Họ và tên</th>
              <th>Số điện thoại</th>
              <th>Địa chỉ</th>
              {extraColumns.map((c) => <th key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={5 + extraColumns.length} className="pp-empty">
                  Không có dữ liệu
                </td>
              </tr>
            ) : pageData.map((row, idx) => (
              <tr key={row.id} className="pp-row" onClick={() => onRowClick?.(row.id)}>
                <td>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                <td>{row.code}</td>
                <td>{row.name}</td>
                <td>{row.phone}</td>
                <td>{row.address}</td>
                {extraColumns.map((c) => (
                  <td key={c.key} onClick={(e) => e.stopPropagation()}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pp-pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`pp-page-btn ${p === page ? "pp-page-btn--active" : ""}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════
   Page
══════════════════════════════════════════════ */
function Partnerprofilepage() {
  const navigate      = useNavigate();
  const currentUser   = useAuthStore((s) => s.user);
  const [tab, setTab] = useState("approved");

  const [partners,        setPartners       ] = useState([]);
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [loading,         setLoading        ] = useState(true);
  const [error,           setError          ] = useState("");
  const [approveModal,    setApproveModal   ] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [partnerRes, upgradeRes] = await Promise.all([
        partnerService.getAll(),
        api.get("/upgradeRequests"),
      ]);
      setPartners(Array.isArray(partnerRes.data) ? partnerRes.data : partnerRes.data?.data || []);
      setUpgradeRequests(Array.isArray(upgradeRes.data) ? upgradeRes.data : []);
    } catch {
      setError("Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  /* ─────────────────────────────────────────────────────────
     Duyệt hồ sơ mới → kích hoạt + đồng bộ tài khoản user
  ───────────────────────────────────────────────────────── */
  const handleApprove = async (partner) => {
    try {
      const approvedDate = new Date().toLocaleDateString("vi-VN");

      // 1. Cập nhật partner → approved + level 1
      await partnerService.update(partner.id, {
        ...partner,
        status:     "approved",
        level:      1,
        levelLabel: "Cấp 1",
        joinDate:   approvedDate,
      });

      // 2. Có userId → kích hoạt + đồng bộ thông tin user liên kết
      if (partner.userId) {
        try {
          const userRes = await api.get(`/users/${partner.userId}`);
          const user    = userRes.data;
          if (user) {
            await api.put(`/users/${partner.userId}`, {
              ...user,
              status: "active",      // kích hoạt tài khoản
              name:   partner.name,  // đồng bộ tên
              email:  partner.email, // đồng bộ email
              phone:  partner.phone, // đồng bộ SĐT
            });
          }
        } catch {
          // user không tìm thấy theo id — không block luồng duyệt
          console.warn(`Không tìm thấy user với id=${partner.userId}`);
        }
      } else {
        // 3. Không có userId (data cũ nhập tay) → tìm hoặc tạo user mới
        try {
          const existRes  = await api.get(`/users?email=${encodeURIComponent(partner.email)}`);
          const existList = Array.isArray(existRes.data) ? existRes.data : [];

          if (existList.length > 0) {
            // Đã có user trùng email → kích hoạt + gắn userId vào partner
            const existUser = existList[0];
            await api.put(`/users/${existUser.id}`, {
              ...existUser,
              status: "active",
              name:   partner.name,
              phone:  partner.phone,
            });
            await partnerService.update(partner.id, {
              ...partner,
              status:     "approved",
              level:      1,
              levelLabel: "Cấp 1",
              joinDate:   approvedDate,
              userId:     existUser.id, // gắn lại userId để đồng bộ về sau
            });
          } else {
            // Chưa có user → tạo mới rồi gắn userId vào partner
            const maxId  = await getMaxId("users");
            const newUser = {
              id:       String(maxId + 1),
              name:     partner.name,
              email:    partner.email,
              phone:    partner.phone,
              password: "123456", // mật khẩu mặc định, đối tác đổi sau khi đăng nhập
              role:     "Đối tác",
              status:   "active",
            };
            const createdRes  = await api.post("/users", newUser);
            const createdUser = createdRes.data;

            await partnerService.update(partner.id, {
              ...partner,
              status:     "approved",
              level:      1,
              levelLabel: "Cấp 1",
              joinDate:   approvedDate,
              userId:     createdUser.id,
            });
          }
        } catch (e) {
          console.error("Lỗi khi tạo/gắn user cho partner:", e);
        }
      }

      // 4. Cập nhật state local
      setPartners((prev) =>
        prev.map((p) =>
          p.id === partner.id
            ? { ...p, status: "approved", level: 1, levelLabel: "Cấp 1", joinDate: approvedDate }
            : p
        )
      );

      alert(`✅ Đã duyệt hồ sơ "${partner.name}" thành công!`);
    } catch (err) {
      console.error(err);
      alert("Duyệt thất bại. Vui lòng thử lại.");
    }
  };

  /* ─────────────────────────────────────────────────────────
     Từ chối hồ sơ mới → xoá partner + xoá user liên kết
  ───────────────────────────────────────────────────────── */
  const handleReject = async (partner) => {
    if (!window.confirm(`Xác nhận từ chối hồ sơ của "${partner.name}"?`)) return;
    try {
      // Xoá partner
      await partnerService.delete(partner.id);

      // Xoá luôn user liên kết (nếu có và đang pending_approval)
      if (partner.userId) {
        try {
          const userRes = await api.get(`/users/${partner.userId}`);
          const user    = userRes.data;
          if (user && user.status === "pending_approval") {
            await api.delete(`/users/${partner.userId}`);
          }
        } catch {
          // bỏ qua nếu không tìm thấy user
        }
      }

      setPartners((prev) => prev.filter((p) => p.id !== partner.id));
    } catch {
      alert("Từ chối thất bại.");
    }
  };

  /* ─────────────────────────────────────────────────────────
     Duyệt nâng cấp cấp bậc đối tác
  ───────────────────────────────────────────────────────── */
  const handleApproveUpgrade = async (req, file) => {
    try {
      const nextLevel  = (req.currentLevel || 1) + 1;
      const partnerRes = await partnerService.getById(req.partnerId);
      const partner    = Array.isArray(partnerRes.data) ? partnerRes.data[0] : partnerRes.data;

      await partnerService.update(req.partnerId, {
        ...partner,
        level:        nextLevel,
        levelLabel:   `Cấp ${nextLevel}`,
        contractFile: file.name,
        // Cấp 2 trở lên mới có link giới thiệu
        refLink: nextLevel >= 2
          ? `sivip.vn/ref/${partner.code}`
          : partner.refLink,
      });

      await api.patch(`/upgradeRequests/${req.id}`, {
        status:       "approved",
        contractFile: file.name,
        approvedAt:   new Date().toLocaleDateString("vi-VN"),
      });

      // Ghi promotionHistory + systemLog (không chặn flow nếu lỗi)
      try {
        const phId = await getMaxId("promotionHistory");
        await api.post("/promotionHistory", {
          id:         String(phId + 1),
          partnerId:  String(req.partnerId),
          partnerName: req.partnerName,
          oldLevel:   req.currentLevel || 1,
          newLevel:   nextLevel,
          approvedBy: currentUser?.name || "admin",
          reason:     req.reason || "",
          createdAt:  new Date().toLocaleDateString("vi-VN"),
        });
        const slId = await getMaxId("systemLogs");
        await api.post("/systemLogs", {
          id:         String(slId + 1),
          type:       "approve_upgrade",
          actorId:    String(currentUser?.id || ""),
          actorName:  currentUser?.name || "admin",
          targetId:   String(req.partnerId),
          targetType: "partner",
          description: `Nâng cấp ${req.partnerName} từ Cấp ${req.currentLevel || 1} lên Cấp ${nextLevel}`,
          createdAt:  new Date().toLocaleDateString("vi-VN"),
        });
      } catch (e) {
        console.warn("Không ghi được promotionHistory/systemLog:", e);
      }

      setUpgradeRequests((prev) =>
        prev.map((r) =>
          r.id === req.id ? { ...r, status: "approved", contractFile: file.name } : r
        )
      );
      setPartners((prev) =>
        prev.map((p) =>
          p.id === req.partnerId
            ? { ...p, level: nextLevel, levelLabel: `Cấp ${nextLevel}` }
            : p
        )
      );
      setApproveModal(null);
      alert(`✅ Đã nâng cấp ${req.partnerName} lên Cấp ${nextLevel} thành công!`);
    } catch {
      alert("Duyệt nâng cấp thất bại.");
    }
  };

  /* ─────────────────────────────────────────────────────────
     Từ chối nâng cấp
  ───────────────────────────────────────────────────────── */
  const handleRejectUpgrade = async (req) => {
    if (!window.confirm(`Xác nhận từ chối yêu cầu nâng cấp của "${req.partnerName}"?`)) return;
    try {
      await api.patch(`/upgradeRequests/${req.id}`, {
        status:     "rejected",
        rejectedAt: new Date().toLocaleDateString("vi-VN"),
      });
      setUpgradeRequests((prev) =>
        prev.map((r) => r.id === req.id ? { ...r, status: "rejected" } : r)
      );
    } catch {
      alert("Từ chối thất bại.");
    }
  };

  /* ── Derived lists ── */
  const approved        = partners.filter((p) => p.status === "approved");
  const pending         = partners.filter((p) => p.status === "pending");
  const pendingUpgrades = upgradeRequests.filter((r) => r.status === "pending");

  /* ══════════════════════════════════════════════
     Render
  ══════════════════════════════════════════════ */
  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Danh sách hồ sơ đối tác</h1>
          <p>Danh sách đối tác và yêu cầu trở thành đối tác</p>
        </div>
      </div>

      {loading && (
        <div className="pp-loading">
          <div className="pp-spinner" />
          <p>Đang tải dữ liệu...</p>
        </div>
      )}

      {error && !loading && (
        <div className="pp-error">
          ⚠️ {error}
          <button onClick={fetchAll}>Thử lại</button>
        </div>
      )}

      {!loading && !error && (
        <div className="pp-card">
          {/* ── Tabs ── */}
          <div className="pp-tabs">
            <button
              className={`pp-tab ${tab === "approved" ? "pp-tab--active" : ""}`}
              onClick={() => setTab("approved")}
            >
              Danh sách đối tác{" "}
              <span className="pp-tab-count">{approved.length}</span>
            </button>

            <button
              className={`pp-tab ${tab === "pending" ? "pp-tab--active" : ""}`}
              onClick={() => setTab("pending")}
            >
              Yêu cầu trở thành đối tác{" "}
              <span className={`pp-tab-count ${pending.length > 0 ? "pp-tab-count--pending" : ""}`}>
                {pending.length}
              </span>
            </button>

            <button
              className={`pp-tab ${tab === "upgrade" ? "pp-tab--active" : ""}`}
              onClick={() => setTab("upgrade")}
            >
              Yêu cầu nâng cấp đối tác{" "}
              <span className={`pp-tab-count ${pendingUpgrades.length > 0 ? "pp-tab-count--pending" : ""}`}>
                {pendingUpgrades.length}
              </span>
            </button>
          </div>

          {/* ── Tab: Danh sách đã duyệt ── */}
          {tab === "approved" && (
            <PartnerTable
              data={approved}
              onRowClick={(id) => navigate(`/admin/partners-profile/${id}`)}
            />
          )}

          {/* ── Tab: Chờ duyệt hồ sơ mới ── */}
          {tab === "pending" && (
            <PartnerTable
              data={pending}
              onRowClick={(id) => navigate(`/admin/partners-profile/${id}?request=true`)}
              extraColumns={[
                {
                  key:    "submittedAt",
                  label:  "Ngày gửi",
                  render: (row) => row.submittedAt || "—",
                },
                {
                  key:   "action",
                  label: "Thao tác",
                  render: (row) => (
                    <div className="pp-action-btns">
                      <button className="pp-btn-approve" onClick={() => handleApprove(row)}>
                        ✓ Duyệt
                      </button>
                      <button className="pp-btn-reject" onClick={() => handleReject(row)}>
                        ✕ Từ chối
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}

          {/* ── Tab: Yêu cầu nâng cấp ── */}
          {tab === "upgrade" && (
            <div className="pp-table-wrap">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã đối tác</th>
                    <th>Họ và tên</th>
                    <th>Cấp hiện tại</th>
                    <th>Yêu cầu lên</th>
                    <th>Ngày gửi</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {upgradeRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="pp-empty">
                        Không có yêu cầu nâng cấp nào
                      </td>
                    </tr>
                  ) : upgradeRequests.map((req, idx) => {
                    const nextLevel = (req.currentLevel || 1) + 1;
                    return (
                      <tr
                        key={req.id}
                        className="pp-row"
                        onClick={() => navigate(`/admin/partners-profile/${req.partnerId}`)}
                      >
                        <td>{idx + 1}</td>
                        <td>{req.partnerCode}</td>
                        <td>{req.partnerName}</td>
                        <td>
                          <span className={`pp-level-badge pp-level-badge--${req.currentLevel || 1}`}>
                            Cấp {req.currentLevel || 1}
                          </span>
                        </td>
                        <td>
                          <span className={`pp-level-badge pp-level-badge--${nextLevel}`}>
                            Cấp {nextLevel}
                          </span>
                        </td>
                        <td>{req.submittedAt || "—"}</td>
                        <td>
                          <span className={`pp-status-badge pp-status-badge--${req.status}`}>
                            {req.status === "pending"
                              ? "Chờ duyệt"
                              : req.status === "approved"
                              ? "Đã duyệt"
                              : "Từ chối"}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {req.status === "pending" ? (
                            <div className="pp-action-btns">
                              <button
                                className="pp-btn-approve"
                                onClick={() => setApproveModal(req)}
                              >
                                ✓ Duyệt
                              </button>
                              <button
                                className="pp-btn-reject"
                                onClick={() => handleRejectUpgrade(req)}
                              >
                                ✕ Từ chối
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: 13 }}>
                              {req.contractFile || "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal duyệt nâng cấp ── */}
      {approveModal && (
        <UpgradeApproveModal
          req={approveModal}
          onClose={() => setApproveModal(null)}
          onSubmit={handleApproveUpgrade}
        />
      )}
    </div>
  );
}

export default Partnerprofilepage;