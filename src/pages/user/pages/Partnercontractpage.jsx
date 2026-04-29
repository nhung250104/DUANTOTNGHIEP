import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../../store/authStore";
import partnerService from "../../../store/Partnerservice";
import api from "../../../store/api";
import "./PartnerContractPage.css";

/* ─── Helpers ───────────────────────────────────────────── */
const getNow = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const getMaxId = async (collection) => {
  try {
    const res = await api.get(`/${collection}`);
    const list = Array.isArray(res.data) ? res.data : [];
    const ids = list.map((x) => Number(x.id)).filter((n) => !isNaN(n));
    return ids.length > 0 ? Math.max(...ids) : 0;
  } catch {
    return 0;
  }
};

/* ─── Modal: Yêu cầu chỉnh sửa hoa hồng ────────────────── */
/* ─── Modal: Yêu cầu tham gia đội nhóm (cho INDEPENDENT) ────────────── */
const extractCode = (input = "") => {
  const t = input.trim();
  const m = t.match(/\/ref\/([^/?#\s]+)/);
  if (m) return m[1];
  if (t.includes("/")) {
    const parts = t.split("/").filter(Boolean);
    return parts[parts.length - 1];
  }
  return t;
};

function JoinTeamModal({ partner, onClose, onSubmitted }) {
  const [newParentInput, setNewParentInput] = useState("");
  const [foundParent,    setFoundParent   ] = useState(null);
  const [lookup,         setLookup        ] = useState("idle"); // idle|loading|found|not_found|invalid
  const [reason,         setReason        ] = useState("");
  const [err,            setErr           ] = useState("");
  const [loading,        setLoading       ] = useState(false);

  /* Lookup parent (debounce 500ms) */
  useEffect(() => {
    const raw = newParentInput.trim();
    if (!raw) { setLookup("idle"); setFoundParent(null); return; }
    setLookup("loading");
    setFoundParent(null);
    const t = setTimeout(async () => {
      const code = extractCode(raw);
      if (!code) { setLookup("not_found"); return; }
      try {
        const res = await api.get(`/partners?code=${code}&status=approved`);
        const list = Array.isArray(res.data) ? res.data : [];
        const found = list[0] || null;
        if (!found) { setLookup("not_found"); return; }
        if ((found.level || 1) < 2) { setLookup("invalid"); setFoundParent(found); return; }
        setFoundParent(found);
        setLookup("found");
      } catch { setLookup("not_found"); }
    }, 500);
    return () => clearTimeout(t);
  }, [newParentInput]);

  const handleSubmit = async () => {
    if (!reason.trim()) { setErr("Vui lòng nhập lý do."); return; }
    if (newParentInput.trim() && lookup !== "found") {
      setErr("Mã/link cấp trên đề xuất không hợp lệ. Bỏ trống để admin tự chọn.");
      return;
    }
    setErr(""); setLoading(true);
    try {
      const maxId = await getMaxId("joinTeamRequests");
      const payload = {
        id:               String(maxId + 1),
        partnerId:        String(partner.id),
        partnerCode:      `DT${String(partner.code || partner.id).padStart(6, "0")}`,
        partnerName:      partner.name,
        newParentId:      foundParent ? String(foundParent.id) : null,
        newParentName:    foundParent?.name || null,
        newParentCode:    foundParent ? `DT${String(foundParent.code || foundParent.id).padStart(6, "0")}` : null,
        reason:           reason.trim(),
        status:           "pending",
        createdAt:        getNow(),
        processedAt:      null,
        rejectReason:     null,
      };
      await api.post("/joinTeamRequests", payload);

      // Notify admin (legacy without recipientType — bell admin còn nhận)
      const maxNoti = await getMaxId("notifications");
      await api.post("/notifications", {
        id:          String(maxNoti + 1),
        type:        "join_team_request",
        title:       "Yêu cầu tham gia đội nhóm",
        message:     `${partner.name} (Independent) xin chuyển sang chế độ đội nhóm${foundParent ? ` dưới cấp trên ${foundParent.name}` : ""}.`,
        partnerId:   String(partner.id),
        partnerName: partner.name,
        read:        false,
        createdAt:   getNow(),
      });

      onSubmitted();
    } catch (e) {
      console.error(e);
      setErr("Gửi yêu cầu thất bại.");
    } finally { setLoading(false); }
  };

  return (
    <div className="pcp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pcp-modal">
        <div className="pcp-modal-header">
          <span className="pcp-modal-icon">🤝</span>
          <div>
            <h3 className="pcp-modal-title">Yêu cầu tham gia đội nhóm</h3>
            <p className="pcp-modal-sub">Chuyển từ "Hoạt động riêng lẻ" sang chế độ đội nhóm có cấp trên</p>
          </div>
        </div>

        <div className="pcp-modal-body">
          {err && <p className="pcp-modal-err">{err}</p>}

          <label className="pcp-modal-label">
            Mã hoặc link cấp trên đề xuất <span style={{ color: "#94a3b8", fontWeight: 400 }}>(không bắt buộc)</span>
          </label>
          <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 6px" }}>
            Bỏ trống để admin tự chọn cấp trên cho bạn.
          </p>
          <input
            className="pcp-modal-input"
            style={{ maxWidth: "none", width: "100%", boxSizing: "border-box" }}
            placeholder="Ví dụ: 000003 hoặc sivip.vn/ref/000003"
            value={newParentInput}
            onChange={(e) => setNewParentInput(e.target.value)}
            autoComplete="off"
          />
          {lookup !== "idle" && (
            <div style={{
              marginTop: 8, padding: "8px 12px", borderRadius: 6, fontSize: 12,
              background: lookup === "found" ? "#f0fdf4" : lookup === "loading" ? "#f8fafc" : "#fff5f5",
              color:      lookup === "found" ? "#166534" : lookup === "loading" ? "#64748b" : "#b91c1c",
              border:     `1px solid ${lookup === "found" ? "#bbf7d0" : lookup === "loading" ? "#e2e8f0" : "#fecaca"}`,
            }}>
              {lookup === "loading"   && "🔍 Đang tìm..."}
              {lookup === "not_found" && "❌ Không tìm thấy đối tác phù hợp."}
              {lookup === "invalid"   && "⚠️ Đối tác chưa đủ điều kiện làm cấp trên (yêu cầu Cấp 2 trở lên)."}
              {lookup === "found" && foundParent && (
                <>✅ {foundParent.name} · {foundParent.levelLabel || `Cấp ${foundParent.level}`} · Mã: {foundParent.code}</>
              )}
            </div>
          )}

          <label className="pcp-modal-label" style={{ marginTop: 14 }}>
            Lý do <span style={{ color: "#e53e3e" }}>*</span>
          </label>
          <textarea
            className="pcp-modal-textarea"
            placeholder="Trình bày lý do bạn muốn tham gia đội nhóm..."
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="pcp-modal-footer">
          <button className="pcp-modal-btn-cancel" onClick={onClose} disabled={loading}>✕ Hủy</button>
          <button className="pcp-modal-btn-send" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang gửi..." : "✓ Gửi yêu cầu"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal: Yêu cầu kiểm tra / điều chỉnh hoa hồng
 *
 * Khác với rate-change cũ: đây là báo lỗi commission cho 1 hợp đồng cụ thể.
 * - errorType: missing | wrong_amount | wrong_source | wrong_upline | other
 * - description + evidenceFiles (base64) + relatedContractCode (tuỳ chọn)
 * - Admin nhận → review → tạo adjustment cộng/trừ vào commissionHistory.
 */
const ERROR_TYPES = [
  { value: "missing",      label: "Thiếu hoa hồng" },
  { value: "wrong_amount", label: "Sai số tiền" },
  { value: "wrong_source", label: "Sai nguồn commission" },
  { value: "wrong_upline", label: "Sai tuyến trên" },
  { value: "other",        label: "Khác" },
];

function CommissionRequestModal({ partner, onClose, onSubmitted }) {
  const [form, setForm] = useState({
    errorType:           "",
    description:         "",
    relatedContractCode: "",
  });
  const [files,   setFiles  ] = useState([]); // { name, dataUrl, size }
  const [err,     setErr    ] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onPickFiles = async (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    const picked = await Promise.all(list.map((f) => new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve({ name: f.name, dataUrl: r.result, size: f.size });
      r.readAsDataURL(f);
    })));
    setFiles((prev) => [...prev, ...picked]);
    // reset input để lần sau chọn cùng file vẫn được
    e.target.value = "";
  };

  const removeFile = (idx) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!form.errorType)              return setErr("Vui lòng chọn loại lỗi.");
    if (!form.description.trim())     return setErr("Vui lòng mô tả chi tiết tình huống.");
    if (form.description.trim().length < 10) return setErr("Mô tả quá ngắn — vui lòng nêu rõ vấn đề.");
    setErr("");
    setLoading(true);
    try {
      const maxId    = await getMaxId("commissionRequests");
      const errLabel = ERROR_TYPES.find((t) => t.value === form.errorType)?.label || form.errorType;

      const newRequest = {
        id:                  String(maxId + 1),
        partnerId:           String(partner.id),
        partnerCode:         `DT${String(partner.code || partner.id).padStart(6, "0")}`,
        partnerName:         partner.name,
        errorType:           form.errorType,
        errorTypeLabel:      errLabel,
        description:         form.description.trim(),
        evidenceFiles:       files.map((f) => ({ name: f.name, dataUrl: f.dataUrl, size: f.size })),
        relatedContractCode: form.relatedContractCode.trim() || null,
        // Admin sẽ điền khi duyệt:
        adjustmentAmount:    null,
        adminNote:           null,
        // Backward compat (giữ field cũ làm placeholder, không dùng nữa):
        currentL1:    null, currentL2: null, currentL3: null,
        requestedL1:  null, requestedL2: null, requestedL3: null,
        requestDetail: form.description.trim(),
        status:       "pending",
        createdAt:    getNow(),
        processedAt:  null,
        rejectReason: null,
      };
      await api.post("/commissionRequests", newRequest);

      // Notification cho admin
      try {
        const maxNotiId = await getMaxId("notifications");
        await api.post("/notifications", {
          id:          String(maxNotiId + 1),
          type:        "commission_request",
          title:       "Yêu cầu kiểm tra hoa hồng",
          message:     `${partner.name} báo lỗi: ${errLabel}.`,
          partnerId:   String(partner.id),
          partnerName: partner.name,
          read:        false,
          createdAt:   getNow(),
        });
      } catch { /* không chặn flow */ }

      onSubmitted();
    } catch (e) {
      console.error(e);
      setErr("Gửi yêu cầu thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const fmtBytes = (n) => n < 1024 ? `${n} B` : n < 1024*1024 ? `${(n/1024).toFixed(1)} KB` : `${(n/1024/1024).toFixed(1)} MB`;

  return (
    <div className="pcp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pcp-modal" style={{ maxWidth: 600 }}>
        <div className="pcp-modal-header">
          <span className="pcp-modal-icon">⚠️</span>
          <div>
            <h3 className="pcp-modal-title">Yêu cầu kiểm tra hoa hồng</h3>
            <p className="pcp-modal-sub">Báo lỗi cụ thể để admin xem xét và điều chỉnh</p>
          </div>
        </div>

        <div className="pcp-modal-body">
          {err && <p className="pcp-modal-err">{err}</p>}

          <label className="pcp-modal-label">Loại lỗi <span style={{ color: "#e53e3e" }}>*</span></label>
          <select
            className="pcp-modal-input"
            name="errorType"
            value={form.errorType}
            onChange={onChange}
            style={{ maxWidth: "none", width: "100%", boxSizing: "border-box" }}
          >
            <option value="">— Chọn loại lỗi —</option>
            {ERROR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <label className="pcp-modal-label" style={{ marginTop: 14 }}>
            Mã HĐ liên quan <span style={{ color: "#94a3b8", fontWeight: 400 }}>(tuỳ chọn)</span>
          </label>
          <input
            className="pcp-modal-input"
            style={{ maxWidth: "none", width: "100%", boxSizing: "border-box" }}
            name="relatedContractCode"
            value={form.relatedContractCode}
            onChange={onChange}
            placeholder="VD: HDKH000001"
          />

          <label className="pcp-modal-label" style={{ marginTop: 14 }}>
            Mô tả chi tiết <span style={{ color: "#e53e3e" }}>*</span>
          </label>
          <textarea
            className="pcp-modal-textarea"
            placeholder='VD: "Tôi ký hợp đồng 100 triệu nhưng chỉ nhận 5 triệu thay vì 10 triệu (10%)..."'
            rows={4}
            name="description"
            value={form.description}
            onChange={onChange}
          />

          <label className="pcp-modal-label" style={{ marginTop: 14 }}>
            File minh chứng <span style={{ color: "#94a3b8", fontWeight: 400 }}>(hợp đồng, ảnh, tài liệu liên quan)</span>
          </label>
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xlsx"
            onChange={onPickFiles}
            style={{ fontSize: 13, display: "block", padding: "6px 0" }}
          />
          {files.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {files.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 10px", borderRadius: 6,
                  background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12,
                }}>
                  <span>📎</span>
                  <span style={{ flex: 1, color: "#334155" }}>{f.name}</span>
                  <span style={{ color: "#94a3b8" }}>{fmtBytes(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer" }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pcp-modal-footer">
          <button className="pcp-modal-btn-cancel" onClick={onClose} disabled={loading}>✕ Hủy</button>
          <button className="pcp-modal-btn-send" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang gửi..." : "✓ Gửi yêu cầu kiểm tra"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────
const formatCurrency = (amount) =>
  new Intl.NumberFormat("vi-VN").format(amount || 0) + " đ";

const getInitials = (name = "") =>
  name.trim().split(" ").filter(Boolean).slice(-2).map((w) => w[0].toUpperCase()).join("");

// Hoa hồng theo "tier" (hạng nâng cấp 1/2/3) — KHÔNG phải level (độ sâu trong cây).
// Ưu tiên rate tự định nghĩa cho partner (sau khi admin duyệt yêu cầu chỉnh sửa HH).
const DEFAULT_RATES = {
  1: { l1: 20, l2: 10, l3: 3 },
  2: { l1: 25, l2: 12, l3: 5 },
  3: { l1: 30, l2: 15, l3: 7 },
};
const getCommissionRates = (partner) => {
  if (partner?.commissionRates) return partner.commissionRates;
  return DEFAULT_RATES[partner?.tier] || DEFAULT_RATES[1];
};

// ─── Sub-components ─────────────────────────────────────────
function InfoItem({ label, value, highlight }) {
  return (
    <div className="pcp-info-item">
      <span className="pcp-info-label">{label}</span>
      <span className={`pcp-info-value ${highlight ? "pcp-info-value--highlight" : ""}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const isApproved = status === "approved";
  return (
    <div className="pcp-info-item">
      <span className="pcp-info-label">Trạng thái</span>
      <span className={`pcp-status-badge ${isApproved ? "pcp-status-badge--approved" : "pcp-status-badge--pending"}`}>
        <span className={`pcp-status-dot ${isApproved ? "pcp-status-dot--approved" : "pcp-status-dot--pending"}`} />
        {isApproved ? "Hiệu Lực" : "Chờ Duyệt"}
      </span>
    </div>
  );
}

function CommissionCard({ label, value }) {
  return (
    <div className="pcp-commission-card">
      <span className="pcp-commission-card-label">{label}</span>
      <span className="pcp-commission-card-value">{value}%</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
function Partnercontractpage() {
  const navigate    = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState("");

  const [showCommModal, setShowCommModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [submitDone,    setSubmitDone   ] = useState(false);

  // ── Fetch partner theo user đang đăng nhập ──────────────────
  // Ưu tiên: userId → email (fallback cho data cũ chưa có userId)
  useEffect(() => {
    const fetchPartner = async () => {
      if (!currentUser) return;
      try {
        const res  = await partnerService.getAll(); // GET /partners
        const list = Array.isArray(res.data) ? res.data : [];

        // 1. Tìm theo userId (chuẩn — Register.jsx đã gắn userId)
        let found = list.find((p) => p.userId === String(currentUser.id));

        // 2. Fallback: tìm theo email (cho data cũ chưa có userId)
        if (!found) {
          found = list.find((p) => p.email === currentUser.email);
        }

        if (!found) {
          setError("Không tìm thấy hồ sơ đối tác của bạn. Vui lòng liên hệ admin.");
        } else {
          setPartner(found);
        }
      } catch {
        setError("Không thể tải thông tin hợp đồng. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    fetchPartner();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="pcp-loading">
        <div className="pcp-spinner" />
        <p>Đang tải thông tin hợp đồng...</p>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="pcp-error-wrap">
        <div className="pcp-error-icon">⚠️</div>
        <p className="pcp-error-msg">{error || "Không tìm thấy dữ liệu."}</p>
        <button className="pcp-btn-back" onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
    );
  }

  const commission   = getCommissionRates(partner);
  const contractCode = `HDDT${String(partner.id).padStart(6, "0")}`;
  const canUpgrade   = (partner.tier || 1) < 3;          // hạng nâng cấp 1/2/3
  const isIndependent = partner.memberType === "INDEPENDENT";

  return (
    <div className="pcp-page">

      <div className="pcp-title-wrap">
        <h1 className="pcp-title">Thông tin hợp đồng đối tác cá nhân</h1>
        <p className="pcp-subtitle">Thông tin hợp đồng đối tác</p>
      </div>

      <div className="pcp-hero">
        <div className="pcp-hero-left">
          <div className="pcp-avatar">{getInitials(partner.name)}</div>
          <div>
            <p className="pcp-hero-name">{partner.name}</p>
            <p className="pcp-hero-code">#{partner.code || String(partner.id).padStart(6, "0")}</p>
            {/* Hiển thị "Diện" để user biết mình đang ở trạng thái nào */}
            {(() => {
              const cls = partner.memberType === "INDEPENDENT" && !partner.parentId
                ? { label: "Tự do hoạt động riêng lẻ", color: "#0ea5e9" }
                : !partner.parentId
                  ? { label: "Tự do chờ xếp nhánh",     color: "#f97316" }
                  : { label: "Đã có cấp trên",          color: "#16a34a" };
              return (
                <span style={{
                  display: "inline-block", marginTop: 6,
                  padding: "3px 10px", borderRadius: 999,
                  fontSize: 11, fontWeight: 600,
                  background: cls.color + "1A", color: cls.color,
                  border: `1px solid ${cls.color}40`,
                }}>
                  {cls.label}
                </span>
              );
            })()}
          </div>
        </div>
        <div className="pcp-hero-right">
          <p className="pcp-hero-date-label">Ngày tạo hợp đồng</p>
          <p className="pcp-hero-date-value">{partner.joinDate || "—"}</p>
        </div>
      </div>

      <div className="pcp-detail-card">

        {/* Row 1 */}
        <div className="pcp-row">
          <div className="pcp-info-grid">
            <InfoItem label="Mã Hợp đồng"       value={contractCode}     highlight />
            <InfoItem label="Đối tác"            value={partner.name}    highlight />
            <StatusBadge status={partner.status} />
            <InfoItem label="Ngày tạo hợp đồng"  value={partner.joinDate} />
          </div>
        </div>

        {/* Row 2 */}
        <div className="pcp-row">
          <div className="pcp-commission-row">
            <div className="pcp-commission-cards">
              <CommissionCard label="Tỉ lệ hoa hồng cấp 1" value={commission.l1} />
              <CommissionCard label="Tỉ lệ hoa hồng cấp 2" value={commission.l2} />
              <CommissionCard label="Tỉ lệ hoa hồng cấp 3" value={commission.l3} />
            </div>
            <div className="pcp-actions">
              <button className="pcp-btn-edit" onClick={() => setShowCommModal(true)}>
                ⚠️ Báo lỗi hoa hồng
              </button>
              <button
                className="pcp-btn-upgrade"
                style={{ background: "#0f766e" }}
                onClick={() => navigate("/my-commission")}
              >
                💰 Xem hoa hồng
              </button>
              {/* INDEPENDENT: nút yêu cầu tham gia đội nhóm thay cho nâng cấp */}
              {isIndependent ? (
                <button
                  className="pcp-btn-upgrade"
                  style={{ background: "#0ea5e9" }}
                  onClick={() => setShowJoinModal(true)}
                >
                  🤝 Yêu cầu tham gia đội nhóm
                </button>
              ) : canUpgrade && (
                <button className="pcp-btn-upgrade" onClick={() => navigate("/upgrade-requests")}>
                  ⬆ Yêu cầu nâng cấp đối tác
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 3 */}
        <div className="pcp-row">
          <InfoItem
            label="Tổng hoa hồng đã nhận"
            value={formatCurrency(partner.commission)}
            highlight
          />
        </div>

        {/* Banner: gửi thành công */}
        {submitDone && (
          <div className="pcp-row">
            <div className="pcp-success-banner">
              ✅ Đã gửi yêu cầu kiểm tra hoa hồng. Admin sẽ xem xét và phản hồi sớm.
            </div>
          </div>
        )}

        {/* Row 4 */}
        <div className="pcp-row">
          {partner.contractFile ? (
            <div className="pcp-file-box">
              <div className="pcp-file-left">
                <div className="pcp-file-icon">📄</div>
                <div>
                  <p className="pcp-file-name">{contractCode}.pdf</p>
                  <p className="pcp-file-sub">Hợp đồng đối tác cá nhân</p>
                </div>
              </div>
              <a href={partner.contractFile} download className="pcp-btn-download">⬇ Tải xuống</a>
            </div>
          ) : (
            <div className="pcp-no-file">
              <span>⚠️</span>
              <p>Chưa có file hợp đồng. Vui lòng liên hệ admin để được hỗ trợ.</p>
            </div>
          )}
        </div>

      </div>

      {showCommModal && (
        <CommissionRequestModal
          partner={partner}
          onClose={() => setShowCommModal(false)}
          onSubmitted={() => {
            setShowCommModal(false);
            setSubmitDone(true);
            setTimeout(() => setSubmitDone(false), 5000);
          }}
        />
      )}

      {showJoinModal && (
        <JoinTeamModal
          partner={partner}
          onClose={() => setShowJoinModal(false)}
          onSubmitted={() => {
            setShowJoinModal(false);
            setSubmitDone(true);
            setTimeout(() => setSubmitDone(false), 5000);
          }}
        />
      )}
    </div>
  );
}

export default Partnercontractpage;