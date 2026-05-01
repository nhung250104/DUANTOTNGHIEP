import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import partnerService from "../../store/Partnerservice";
import useAuthStore from "../../store/authStore";
import BackButton from "../../components/BackButton";
import "./Partnerdetailpage.css";

/* ─── Helper ─────────────────────────────────────────────── */
const toSlug = (str) =>
  str.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");

const makeRefLink = (name, code) =>
  `sivip.vn/ref/${toSlug(name || "partner")}-${code}`;

/* ─── Atoms ──────────────────────────────────────────────── */
const SectionTitle = ({ children }) => (
  <p className="pd-section-title">{children}</p>
);

const Field = ({ label, value, teal = false }) => (
  <div className="pd-field">
    <p className="pd-field-label">{label}</p>
    <p className={`pd-field-value ${teal ? "pd-teal" : ""}`}>{value || "—"}</p>
  </div>
);

/* ─── Modal: Từ chối ─────────────────────────────────────── */
function RejectModal({ name, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [err,    setErr   ] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) { setErr("Vui lòng nhập lý do từ chối."); return; }
    onSubmit(reason);
  };

  return (
    <div className="pd-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pd-modal">
        <div className="pd-modal-header pd-modal-header--reject">
          <span className="pd-modal-icon">✕</span>
          <div>
            <h3 className="pd-modal-title">Từ chối hồ sơ đăng ký trở thành đối tác</h3>
            <p className="pd-modal-sub">Nhập lý do từ chối hồ sơ của <strong>{name}</strong></p>
          </div>
        </div>
        <div className="pd-modal-body">
          <label className="pd-modal-label">Lý do từ chối *</label>
          {err && <p className="pd-modal-err">{err}</p>}
          <textarea
            className="pd-modal-textarea"
            placeholder="Mô tả lý do từ chối..."
            value={reason}
            onChange={e => { setReason(e.target.value); setErr(""); }}
            rows={5}
          />
        </div>
        <div className="pd-modal-footer">
          <button className="pd-modal-btn-cancel" onClick={onClose}>✕ Hủy</button>
          <button className="pd-modal-btn-send"   onClick={handleSubmit}>✓ Gửi</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal: Phê duyệt ───────────────────────────────────── */
function ApproveModal({ name, onClose, onSubmit }) {
  const [file, setFile] = useState(null);
  const [err,  setErr ] = useState("");
  const fileRef = useRef();

  const handleFile = e => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setErr(""); }
  };

  const handleSubmit = () => {
    if (!file) { setErr("Vui lòng tải lên file hợp đồng."); return; }
    onSubmit(file);
  };

  return (
    <div className="pd-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pd-modal">
        <div className="pd-modal-header pd-modal-header--approve">
          <span className="pd-modal-icon">✓</span>
          <div>
            <h3 className="pd-modal-title">Duyệt hồ sơ đăng ký đối tác</h3>
            <p className="pd-modal-sub">Duyệt hồ sơ của <strong>{name}</strong></p>
          </div>
        </div>
        <div className="pd-modal-body">
          <label className="pd-modal-label">Tải lên hợp đồng *</label>
          {err && <p className="pd-modal-err">{err}</p>}
          <input
            ref={fileRef} type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: "none" }}
            onChange={handleFile}
          />
          <div
            className={`pd-upload-box ${file ? "pd-upload-box--filled" : ""}`}
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <>
                <span className="pd-upload-icon">📄</span>
                <span className="pd-upload-filename">{file.name}</span>
              </>
            ) : (
              <>
                <span className="pd-upload-arrow">⬆</span>
                <span className="pd-upload-text">Tải lên hợp đồng</span>
              </>
            )}
          </div>
        </div>
        <div className="pd-modal-footer">
          <button className="pd-modal-btn-cancel" onClick={onClose}>✕ Hủy</button>
          <button className="pd-modal-btn-send"   onClick={handleSubmit}>✓ Gửi</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
/**
 * Props:
 *   userMode (bool): true → user xem hồ sơ của chính mình (không có URL id,
 *                    ẩn các nút admin action, thay bằng nút "Xem hoa hồng").
 */
function Partnerdetailpage({ userMode = false } = {}) {
  const { id: routeId } = useParams();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const isRequest       = searchParams.get("request") === "true" && !userMode;
  const currentUser     = useAuthStore((s) => s.user);

  const [partner,  setPartner ] = useState(null);
  const [loading,  setLoading ] = useState(true);
  const [error,    setError   ] = useState("");
  const [modal,    setModal   ] = useState(null);
  const [done,     setDone    ] = useState(null);
  const [saving,   setSaving  ] = useState(false);

  const [activeTab, setActiveTab] = useState("info");

  // Trong userMode, lookup partner theo currentUser thay vì id từ URL.
  // Set state id riêng để các handler vẫn dùng được khi cần.
  const [resolvedId, setResolvedId] = useState(routeId);
  const id = resolvedId;

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        setLoading(true);
        setError("");

        if (userMode) {
          // User xem chính mình
          if (!currentUser) return;
          const all = await partnerService.getAll();
          const list = Array.isArray(all.data) ? all.data : [];
          const me = list.find(
            (p) => String(p.userId) === String(currentUser.id) || p.email === currentUser.email
          );
          if (!me) { setError("Không tìm thấy hồ sơ đối tác của bạn."); return; }
          setPartner(me);
          setResolvedId(String(me.id));
          return;
        }

        const res  = await partnerService.getById(routeId);
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        if (!data) { setError("Không tìm thấy hồ sơ."); return; }
        setPartner(data);
        setResolvedId(String(data.id));
      } catch {
        setError("Không thể tải thông tin hồ sơ.");
      } finally {
        setLoading(false);
      }
    };
    fetchPartner();
  }, [routeId, userMode, currentUser]);

  const handleReject = async (reason) => {
    try {
      setSaving(true);
      await partnerService.update(id, { ...partner, status: "rejected", rejectReason: reason });
      setPartner(p => ({ ...p, status: "rejected", rejectReason: reason }));
      setModal(null);
      setDone("rejected");
    } catch {
      alert("Từ chối thất bại, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (file) => {
    try {
      setSaving(true);
      const updated = {
        ...partner,
        status:       "approved",
        contractFile: file.name,
        joinDate:     new Date().toLocaleDateString("vi-VN"),
        // tier = hạng nâng cấp (1/2/3); level = độ sâu trong cây (root=0)
        tier:         1,
        tierLabel:    "Hạng 1",
        level:        0,
        levelLabel:   "Cấp 0",
        parentId:     null,
      };
      await partnerService.update(id, updated);
      setPartner(updated);
      setModal(null);
      setDone("approved");
    } catch {
      alert("Phê duyệt thất bại, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="pd-loading">
      <div className="pd-spinner" />
      <p>Đang tải thông tin...</p>
    </div>
  );

  if (error || !partner) return (
    <div className="pd-error">
      ⚠️ {error || "Không tìm thấy hồ sơ này."}
      <BackButton to="/admin/partners" />
    </div>
  );

  const p = partner;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          {!userMode && <BackButton to="/admin/partners" />}
          <h1 style={{ marginTop: userMode ? 0 : 8 }}>
            {userMode
              ? "Thông tin đối tác của tôi"
              : (isRequest ? "Thông tin yêu cầu trở thành đối tác" : "Thông tin đối tác")}
          </h1>
          <p>{p.name}</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignSelf: "flex-end", flexWrap: "wrap" }}>
          {/* ── userMode: chỉ nút Xem hoa hồng ── */}
          {userMode && (
            <button
              className="pd-tab-btn pd-tab-btn--commission pd-tab-btn--active"
              onClick={() => navigate("/my-commission")}
            >
              💰 Xem hoa hồng
            </button>
          )}

          {/* ── Admin: Nút Thông tin đối tác / Hoa hồng ── */}
          {!userMode && !isRequest && (
            <>
              <button
                className={`pd-tab-btn ${activeTab === "info" ? "pd-tab-btn--active" : ""}`}
                onClick={() => {
                  setActiveTab("info");
                  navigate(`/admin/partners-profile/${id}`);
                }}
              >
                Thông tin đối tác
              </button>
              <button
                className={`pd-tab-btn pd-tab-btn--commission ${activeTab === "commission" ? "pd-tab-btn--active" : ""}`}
                onClick={() => {
                  setActiveTab("commission");
                  navigate(`/admin/partners-profile/${id}/commission`);
                }}
              >
                Hoa hồng
              </button>
            </>
          )}

          {/* Nút hành động cho yêu cầu chờ duyệt (admin only) */}
          {!userMode && isRequest && !done && (
            <>
              <button
                className="pd-btn-reject-hdr"
                onClick={() => setModal("reject")}
                disabled={saving}
              >
                Từ chối
              </button>
              <button
                className="pd-btn-approve-hdr"
                onClick={() => setModal("approve")}
                disabled={saving}
              >
                Phê duyệt
              </button>
            </>
          )}

          {!userMode && done === "approved" && <div className="pd-status pd-status--approved">✓ Đã phê duyệt</div>}
          {!userMode && done === "rejected" && <div className="pd-status pd-status--rejected">✕ Đã từ chối</div>}
        </div>
      </div>

      <div className="pd-card">
        <div className="pd-layout">

          {/* ── Cột trái ── */}
          <div className="pd-left">
            <SectionTitle>Thông tin cá nhân</SectionTitle>
            <div className="pd-grid">
              <Field label="Họ và tên"  value={p.name}   />
              <Field label="Ngày sinh"  value={p.dob}    />
              <Field label="Giới tính"  value={p.gender} />
              <Field label="Số CCCD"    value={p.cccd}   teal />
            </div>

            <div className="pd-divider" />

            <SectionTitle>Thông tin liên lạc</SectionTitle>
            <div className="pd-grid">
              <Field label="Tỉnh/Thành phố" value={p.province || p.address} />
              <Field label="Xã/Phường"       value={p.ward}     />
              <Field label="Số nhà/phố"      value={p.street}   />
              <Field label="Số điện thoại"   value={p.phone}    />
              <Field label="Email"           value={p.email}    />
            </div>

            {!isRequest && (
              <>
                <div className="pd-divider" />
                <SectionTitle>Thông tin công việc</SectionTitle>
                <div className="pd-grid">
                  <Field label="Mã đối tác"            value={p.code}              />
                  <Field label="Cấp"                   value={p.levelLabel || (p.level != null ? `Cấp ${p.level}` : "—")} teal />
                  <Field label="Quản lý bởi"           value={p.managedBy}         />
                  <Field label="Ngân hàng"             value={p.bank}              />
                  <Field label="Số tài khoản"          value={p.bankAccount}       />
                  <Field label="Số hợp đồng đã ký"     value={p.contracts != null ? String(p.contracts) : undefined} />
                  <Field label="Tổng hoa hồng đã nhận" value={p.commission}        />
                </div>

                <div className="pd-divider" />

                <div className="pd-grid">
                  <div className="pd-field">
                    <p className="pd-field-label">Link giới thiệu</p>
                    {(p.refLink || (p.level >= 1)) ? (
                      <div className="pd-reflink-wrap">
                        <span className="pd-link pd-reflink-text">
                          {p.refLink || makeRefLink(p.name, p.code)}
                        </span>
                        <button
                          className="pd-reflink-copy"
                          title="Sao chép link"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `https://${p.refLink || makeRefLink(p.name, p.code)}`
                            );
                            alert("Đã sao chép link giới thiệu!");
                          }}
                        >
                          📋
                        </button>
                      </div>
                    ) : (
                      <p className="pd-field-value pd-field-value--muted">
                        Chưa được cấp link giới thiệu (admin cần duyệt hồ sơ trước).
                      </p>
                    )}
                  </div>
                  <div className="pd-field">
                    <p className="pd-field-label">Hợp đồng</p>
                    {p.contractFile
                      ? <a href="#" className="pd-link">{p.contractFile}</a>
                      : <p className="pd-field-value">—</p>
                    }
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Cột phải: CCCD ── */}
          <div className="pd-right">
            <SectionTitle>Giấy tờ tùy thân (CCCD)</SectionTitle>
            <div className="pd-cccd-group">
              <div>
                <p className="pd-cccd-label">Hình ảnh CCCD mặt trước</p>
                <div className="pd-cccd-box">
                  {p.cccdFront
                    ? <img src={p.cccdFront} alt="CCCD mặt trước" />
                    : <span className="pd-cccd-placeholder">📷</span>
                  }
                </div>
              </div>
              <div>
                <p className="pd-cccd-label">Hình ảnh CCCD mặt sau</p>
                <div className="pd-cccd-box">
                  {p.cccdBack
                    ? <img src={p.cccdBack} alt="CCCD mặt sau" />
                    : <span className="pd-cccd-placeholder">📷</span>
                  }
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals ── */}
      {modal === "reject" && (
        <RejectModal
          name={p.name}
          onClose={() => setModal(null)}
          onSubmit={handleReject}
        />
      )}
      {modal === "approve" && (
        <ApproveModal
          name={p.name}
          onClose={() => setModal(null)}
          onSubmit={handleApprove}
        />
      )}
    </div>
  );
}

export default Partnerdetailpage;