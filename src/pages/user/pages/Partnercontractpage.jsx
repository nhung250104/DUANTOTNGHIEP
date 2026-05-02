import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../../store/authStore";
import partnerService from "../../../store/Partnerservice";
import api from "../../../store/api";
import CommissionRequestModal from "../../../components/CommissionRequestModal";
import BackButton from "../../../components/BackButton";
import PartnerContractPDFModal from "../../admin/Partnercontractpdfmodal";
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
  } catch { return 0; }
};

const formatCurrency = (n) =>
  new Intl.NumberFormat("vi-VN").format(n || 0) + " đ";

const getInitials = (name = "") =>
  name.trim().split(" ").filter(Boolean).slice(-2).map((w) => w[0].toUpperCase()).join("");

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

// Hoa hồng theo CẤP (level 0..3). 0 = cao nhất.
const DEFAULT_RATES = {
  0: { l1: 35, l2: 18, l3: 10 },
  1: { l1: 30, l2: 15, l3: 7  },
  2: { l1: 25, l2: 12, l3: 5  },
  3: { l1: 20, l2: 10, l3: 3  },
};
const getCommissionRates = (partner) => {
  if (partner?.commissionRates) return partner.commissionRates;
  return DEFAULT_RATES[partner?.level] || DEFAULT_RATES[3];
};

/* ─── Modal: Yêu cầu tham gia đội nhóm (cho INDEPENDENT) ─── */
function JoinTeamModal({ partner, onClose, onSubmitted }) {
  const [newParentInput, setNewParentInput] = useState("");
  const [foundParent,    setFoundParent   ] = useState(null);
  const [lookup,         setLookup        ] = useState("idle");
  const [reason,         setReason        ] = useState("");
  const [err,            setErr           ] = useState("");
  const [loading,        setLoading       ] = useState(false);

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
      await api.post("/joinTeamRequests", {
        id:               String(maxId + 1),
        partnerId:        String(partner.id),
        partnerCode:      `${String(partner.code || partner.id).padStart(6, "0")}`,
        partnerName:      partner.name,
        newParentId:      foundParent ? String(foundParent.id) : null,
        newParentName:    foundParent?.name || null,
        newParentCode:    foundParent ? `${String(foundParent.code || foundParent.id).padStart(6, "0")}` : null,
        reason:           reason.trim(),
        status:           "pending",
        createdAt:        getNow(),
        processedAt:      null,
        rejectReason:     null,
      });
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

/* ─── Helpers UI ─────────────────────────────────────────── */
const SectionTitle = ({ children }) => (
  <h3 style={{
    fontSize: 14, fontWeight: 700, color: "#0f766e",
    margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 0.5,
    borderBottom: "2px solid #0d9488", paddingBottom: 8,
  }}>{children}</h3>
);

const Field = ({ label, value, highlight }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", fontSize: 13 }}>
    <span style={{ color: "#64748b" }}>{label}:</span>
    <span style={{
      color: highlight ? "#0d9488" : "#0f172a",
      fontWeight: highlight ? 700 : 500, textAlign: "right",
    }}>{value || "—"}</span>
  </div>
);

const StatusPill = ({ status }) => {
  const isApproved = status === "approved";
  const isPending  = status === "pending";
  const cfg = isApproved
    ? { label: "Hiệu lực", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" }
    : isPending
      ? { label: "Chờ duyệt", bg: "#fef9c3", color: "#854d0e", border: "#fde68a" }
      : { label: "Từ chối", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color }} />
      {cfg.label}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════ */
function Partnercontractpage() {
  const navigate    = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [partner,   setPartner]   = useState(null);
  const [contracts, setContracts] = useState([]);   // customerContracts của user
  const [loading,   setLoading]   = useState(true);
  const [error,     setError  ]   = useState("");

  const [showCommModal, setShowCommModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPDF,       setShowPDF]       = useState(false);
  const [submitDone,    setSubmitDone   ] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      if (!currentUser) return;
      try {
        const [pRes, cRes] = await Promise.all([
          partnerService.getAll(),
          api.get("/customerContracts"),
        ]);
        const pList = Array.isArray(pRes.data) ? pRes.data : [];
        const cList = Array.isArray(cRes.data) ? cRes.data : [];

        let found = pList.find((p) => p.userId === String(currentUser.id));
        if (!found) found = pList.find((p) => p.email === currentUser.email);

        if (!found) {
          setError("Không tìm thấy hồ sơ đối tác của bạn. Vui lòng liên hệ admin.");
          return;
        }
        setPartner(found);
        setContracts(cList.filter((c) => String(c.partnerId) === String(found.id)));
      } catch {
        setError("Không thể tải thông tin hợp đồng. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [currentUser]);

  if (loading) return (
    <div className="pcp-loading">
      <div className="pcp-spinner" />
      <p>Đang tải thông tin hợp đồng...</p>
    </div>
  );

  if (error || !partner) return (
    <div className="pcp-error-wrap">
      <div className="pcp-error-icon">⚠️</div>
      <p className="pcp-error-msg">{error || "Không tìm thấy dữ liệu."}</p>
      <BackButton />
    </div>
  );

  const commission   = getCommissionRates(partner);
  const contractCode = `HDDT${String(partner.id).padStart(6, "0")}`;
  const canUpgrade   = (partner.level ?? 3) > 0;
  const isIndependent = partner.memberType === "INDEPENDENT";

  // Stats: HĐ KH approved + doanh thu
  const approvedContracts = contracts.filter((c) => c.status === "approved");
  const signedContractsCount = approvedContracts.length;
  const totalRevenue         = approvedContracts.reduce((s, c) => s + (Number(c.value) || 0), 0);

  // Diện
  const dienCfg = isIndependent
    ? { label: "Tự do hoạt động riêng lẻ", color: "#0ea5e9" }
    : !partner.parentId
      ? { label: "Tự do chờ xếp nhánh",     color: "#f97316" }
      : { label: "Đã có cấp trên",          color: "#16a34a" };

  // Contract data cho PDF modal
  const pdfContractData = {
    code:            contractCode,
    partnerCode:     `${String(partner.code || partner.id).padStart(6, "0")}`,
    partnerName:     partner.name,
    partnerEmail:    partner.email,
    partnerPhone:    partner.phone,
    partnerAddress:  partner.address || partner.street,
    partnerCccd:     partner.cccd,
    contractType:    `Đối tác Cấp ${partner.level ?? 3}`,
    signDate:        partner.joinDate,
    status:          partner.status,
    contractFile:    partner.contractFile,
    level:           partner.level ?? 3,
    commissionL1:    commission.l1,
    commissionL2:    commission.l2,
    commissionL3:    commission.l3,
    totalCommission: partner.commission || 0,
  };

  return (
    <div className="pcp-page">

      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <BackButton />
          <h1 style={{ marginTop: 8 }}>Hợp đồng hợp tác đối tác</h1>
          <p>Hợp đồng số: <strong style={{ color: "#0d9488" }}>{contractCode}</strong></p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowPDF(true)}
            style={{
              padding: "8px 14px", borderRadius: 8,
              background: "#0d9488", color: "#fff",
              border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            👁 Xem trước hợp đồng
          </button>
        </div>
      </div>

      {/* ── Hero card ── */}
      <div className="pcp-hero">
        <div className="pcp-hero-left">
          <div className="pcp-avatar">{getInitials(partner.name)}</div>
          <div>
            <p className="pcp-hero-name">{partner.name}</p>
            <p className="pcp-hero-code">#{partner.code || String(partner.id).padStart(6, "0")}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              <span style={{
                display: "inline-block", padding: "3px 10px", borderRadius: 999,
                fontSize: 11, fontWeight: 600,
                background: dienCfg.color + "1A", color: dienCfg.color,
                border: `1px solid ${dienCfg.color}40`,
              }}>{dienCfg.label}</span>
              <span style={{
                display: "inline-block", padding: "3px 10px", borderRadius: 999,
                fontSize: 11, fontWeight: 600,
                background: "#e0f2fe", color: "#075985",
              }}>
                {partner.levelLabel || `Cấp ${partner.level ?? 3}`}
              </span>
            </div>
          </div>
        </div>
        <div className="pcp-hero-right">
          <div style={{ marginBottom: 8 }}><StatusPill status={partner.status} /></div>
          <p className="pcp-hero-date-label">Ngày ký hợp đồng</p>
          <p className="pcp-hero-date-value">{partner.joinDate || "—"}</p>
        </div>
      </div>

      <div className="pcp-detail-card">

        {/* ── Section: Thông tin các bên ── */}
        <div className="pcp-row">
          <SectionTitle>Thông tin các bên</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <p style={{ fontWeight: 700, color: "#0d9488", margin: "0 0 8px", fontSize: 13 }}>BÊN A — CÔNG TY</p>
              <Field label="Tên công ty"   value="CÔNG TY CP PHẦN MỀM SIVIP" />
              <Field label="Địa chỉ"        value="126 Phan Châu Trinh, Hải Châu, Đà Nẵng" />
              <Field label="Điện thoại"     value="0945 367 403" />
              <Field label="Email"          value="info@sivip.vn" />
              <Field label="MST"            value="0401234567" />
            </div>
            <div style={{ background: "#f0fdfa", padding: 14, borderRadius: 10, border: "1px solid #99f6e4" }}>
              <p style={{ fontWeight: 700, color: "#0d9488", margin: "0 0 8px", fontSize: 13 }}>BÊN B — ĐỐI TÁC</p>
              <Field label="Họ và tên"     value={partner.name} highlight />
              <Field label="Mã đối tác"     value={`${String(partner.code || partner.id).padStart(6, "0")}`} />
              <Field label="CCCD"           value={partner.cccd} />
              <Field label="Điện thoại"     value={partner.phone} />
              <Field label="Email"          value={partner.email} />
              <Field label="Địa chỉ"        value={partner.address || partner.street} />
            </div>
          </div>
        </div>

        {/* ── Section: Điều khoản hợp đồng ── */}
        <div className="pcp-row">
          <SectionTitle>Điều khoản hợp đồng</SectionTitle>
          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
            <p style={{ fontWeight: 700, color: "#0f172a", margin: "10px 0 4px" }}>Điều 1. Mục đích hợp tác</p>
            <p style={{ margin: 0 }}>
              Hai bên hợp tác trên cơ sở tự nguyện, cùng có lợi để phát triển mạng lưới phân phối sản phẩm/dịch vụ
              của Bên A; Bên B đóng vai trò là <strong>đối tác kinh doanh</strong> được cấp mã định danh và link giới thiệu.
            </p>

            <p style={{ fontWeight: 700, color: "#0f172a", margin: "12px 0 4px" }}>Điều 2. Quyền lợi của Bên B</p>
            <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
              <li>Hưởng tỉ lệ hoa hồng <strong>cá nhân</strong> theo cấp đã được phân loại (xem Điều 3).</li>
              <li>Hưởng hoa hồng <strong>đội nhóm (F1, F2)</strong> nếu là thành viên hệ thống đội nhóm.</li>
              <li>Được cấp <strong>link giới thiệu riêng</strong>: <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>{partner.refLink || `sivip.vn/ref/${partner.code}`}</code></li>
              <li>Được hỗ trợ đào tạo, tài liệu sản phẩm, công cụ bán hàng từ Bên A.</li>
            </ul>

            <p style={{ fontWeight: 700, color: "#0f172a", margin: "12px 0 4px" }}>Điều 3. Tỉ lệ hoa hồng (Cấp {partner.level ?? 3})</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 8 }}>
              <div className="pcp-commission-card">
                <span className="pcp-commission-card-label">Cấp 1 — HĐ tự ký</span>
                <span className="pcp-commission-card-value">{commission.l1}%</span>
              </div>
              <div className="pcp-commission-card">
                <span className="pcp-commission-card-label">Cấp 2 — F1 ký</span>
                <span className="pcp-commission-card-value">{commission.l2}%</span>
              </div>
              <div className="pcp-commission-card">
                <span className="pcp-commission-card-label">Cấp 3 — Đội nhóm</span>
                <span className="pcp-commission-card-value">{commission.l3}%</span>
              </div>
            </div>

            <p style={{ fontWeight: 700, color: "#0f172a", margin: "12px 0 4px" }}>Điều 4. Nghĩa vụ của Bên B</p>
            <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
              <li>Thực hiện hoạt động kinh doanh đúng pháp luật, không gây ảnh hưởng uy tín Bên A.</li>
              <li>Bảo mật thông tin khách hàng, tài liệu nội bộ.</li>
              <li>Báo cáo hợp đồng khách hàng đúng và đủ qua hệ thống.</li>
              <li>Cập nhật hồ sơ cá nhân khi có thay đổi.</li>
            </ul>

            <p style={{ fontWeight: 700, color: "#0f172a", margin: "12px 0 4px" }}>Điều 5. Thời hạn & chấm dứt hợp đồng</p>
            <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
              <li>Hiệu lực kể từ ngày ký <strong>{partner.joinDate || "—"}</strong> và có giá trị đến khi một trong hai bên có thông báo chấm dứt.</li>
              <li>Bên A có quyền chấm dứt hợp đồng nếu Bên B vi phạm nghĩa vụ tại Điều 4.</li>
              <li>Bên B có quyền chấm dứt hợp đồng bằng văn bản với thời gian báo trước 15 ngày.</li>
            </ul>
          </div>
        </div>

        {/* ── Section: Tổng hợp hoạt động ── */}
        <div className="pcp-row">
          <SectionTitle>Tổng hợp hoạt động</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Số HĐ KH đã ký (đã duyệt)</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: "4px 0 0" }}>{signedContractsCount}</p>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Tổng doanh thu</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#0d9488", margin: "4px 0 0" }}>{formatCurrency(totalRevenue)}</p>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Hoa hồng tích luỹ</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#16a34a", margin: "4px 0 0" }}>{formatCurrency(partner.commission)}</p>
            </div>
          </div>
        </div>

        {/* ── Section: Cam kết ── */}
        <div className="pcp-row">
          <SectionTitle>Cam kết của Bên B</SectionTitle>
          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 10, padding: 14, fontSize: 13, color: "#78350f",
          }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Tôi, <strong>{partner.name}</strong>, cam kết:</p>
            <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
              <li>Thông tin cá nhân và giấy tờ tùy thân tôi cung cấp là chính xác và hợp pháp.</li>
              <li>Tuân thủ đầy đủ các điều khoản tại Điều 4 của hợp đồng này.</li>
              <li>Chịu trách nhiệm về mọi giao dịch phát sinh dưới mã đối tác của tôi.</li>
              <li>Đồng ý với chính sách hoa hồng và quy định nâng cấp đối tác của hệ thống SIVIP.</li>
            </ul>
          </div>
        </div>

        {/* ── Section: Action buttons ── */}
        <div className="pcp-row">
          <SectionTitle>Hành động</SectionTitle>
          <div className="pcp-actions" style={{ flexWrap: "wrap" }}>
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

        {submitDone && (
          <div className="pcp-row">
            <div className="pcp-success-banner">
              ✅ Đã gửi yêu cầu. Admin sẽ xem xét và phản hồi sớm.
            </div>
          </div>
        )}

        {/* ── Section: Chữ ký ── */}
        <div className="pcp-row">
          <SectionTitle>Chữ ký các bên</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{
              border: "1px dashed #cbd5e1", borderRadius: 10, padding: 20,
              textAlign: "center", background: "#f8fafc",
            }}>
              <p style={{ fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>BÊN A</p>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>(Ký, ghi rõ họ tên)</p>
              <div style={{ marginTop: 30, color: "#0d9488", fontStyle: "italic" }}>
                ✓ Đã ký số · SIVIP Software JSC
              </div>
            </div>
            <div style={{
              border: "1px dashed #cbd5e1", borderRadius: 10, padding: 20,
              textAlign: "center", background: "#f0fdfa",
            }}>
              <p style={{ fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>BÊN B</p>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>(Ký, ghi rõ họ tên)</p>
              <div style={{ marginTop: 30, color: "#0d9488", fontStyle: "italic" }}>
                {partner.status === "approved"
                  ? `✓ Đã ký · ${partner.name}`
                  : "Chờ ký..."}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: File hợp đồng ── */}
        <div className="pcp-row">
          <SectionTitle>File hợp đồng</SectionTitle>
          {partner.contractFile ? (
            <div
              className="pcp-file-box"
              onClick={() => setShowPDF(true)}
              title="Click để xem hợp đồng"
              style={{ cursor: "pointer" }}
            >
              <div className="pcp-file-left">
                <div className="pcp-file-icon">📄</div>
                <div>
                  <p className="pcp-file-name">{contractCode}.pdf</p>
                  <p className="pcp-file-sub">Click để xem trước · Hợp đồng đối tác cá nhân</p>
                </div>
              </div>
              <a
                href={partner.contractFile}
                download
                className="pcp-btn-download"
                onClick={(e) => e.stopPropagation()}
              >⬇ Tải xuống</a>
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

      {showPDF && (
        <PartnerContractPDFModal
          contract={pdfContractData}
          onClose={() => setShowPDF(false)}
        />
      )}
    </div>
  );
}

export default Partnercontractpage;
