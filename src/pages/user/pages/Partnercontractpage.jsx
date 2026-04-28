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
function CommissionRequestModal({ partner, currentRates, onClose, onSubmitted }) {
  const [form, setForm] = useState({
    requestedL1: currentRates.l1,
    requestedL2: currentRates.l2,
    requestedL3: currentRates.l3,
    requestDetail: "",
  });
  const [err,     setErr    ] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({
      ...p,
      [name]: name === "requestDetail" ? value : Number(value),
    }));
  };

  const handleSubmit = async () => {
    if (!form.requestDetail.trim()) {
      setErr("Vui lòng nhập lý do/yêu cầu cụ thể.");
      return;
    }
    if ([form.requestedL1, form.requestedL2, form.requestedL3].some((n) => isNaN(n) || n < 0 || n > 100)) {
      setErr("Tỉ lệ hoa hồng phải trong khoảng 0–100%.");
      return;
    }
    if (
      form.requestedL1 === currentRates.l1 &&
      form.requestedL2 === currentRates.l2 &&
      form.requestedL3 === currentRates.l3
    ) {
      setErr("Bạn chưa thay đổi tỉ lệ hoa hồng nào so với hiện tại.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const maxId = await getMaxId("commissionRequests");
      const newRequest = {
        id:           String(maxId + 1),
        partnerId:    String(partner.id),
        partnerCode:  `DT${String(partner.code || partner.id).padStart(6, "0")}`,
        partnerName:  partner.name,
        currentL1:    currentRates.l1,
        currentL2:    currentRates.l2,
        currentL3:    currentRates.l3,
        requestedL1:  form.requestedL1,
        requestedL2:  form.requestedL2,
        requestedL3:  form.requestedL3,
        requestDetail: form.requestDetail.trim(),
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
          title:       "Yêu cầu chỉnh sửa hoa hồng",
          message:     `${partner.name} gửi yêu cầu chỉnh sửa tỉ lệ hoa hồng.`,
          partnerId:   String(partner.id),
          partnerName: partner.name,
          read:        false,
          createdAt:   getNow(),
        });
      } catch {
        /* không chặn flow nếu noti lỗi */
      }

      onSubmitted();
    } catch (e) {
      console.error(e);
      setErr("Gửi yêu cầu thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pcp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pcp-modal">
        <div className="pcp-modal-header">
          <span className="pcp-modal-icon">✏️</span>
          <div>
            <h3 className="pcp-modal-title">Yêu cầu chỉnh sửa hoa hồng</h3>
            <p className="pcp-modal-sub">Gửi yêu cầu tới admin để điều chỉnh tỉ lệ hoa hồng</p>
          </div>
        </div>

        <div className="pcp-modal-body">
          {err && <p className="pcp-modal-err">{err}</p>}

          <div className="pcp-modal-rates">
            {[
              { name: "requestedL1", label: "Tỉ lệ HH cấp 1 mong muốn", current: currentRates.l1 },
              { name: "requestedL2", label: "Tỉ lệ HH cấp 2 mong muốn", current: currentRates.l2 },
              { name: "requestedL3", label: "Tỉ lệ HH cấp 3 mong muốn", current: currentRates.l3 },
            ].map((f) => (
              <div className="pcp-modal-rate" key={f.name}>
                <label className="pcp-modal-label">{f.label}</label>
                <div className="pcp-modal-rate-row">
                  <input
                    className="pcp-modal-input"
                    type="number"
                    min="0" max="100" step="0.5"
                    name={f.name}
                    value={form[f.name]}
                    onChange={onChange}
                  />
                  <span className="pcp-modal-current">Hiện tại: {f.current}%</span>
                </div>
              </div>
            ))}
          </div>

          <label className="pcp-modal-label" style={{ marginTop: 12 }}>
            Lý do / yêu cầu cụ thể <span style={{ color: "#e53e3e" }}>*</span>
          </label>
          <textarea
            className="pcp-modal-textarea"
            placeholder="Ví dụ: Đã đạt doanh số quý 1/2026, đề nghị nâng % cấp 1 lên..."
            rows={4}
            name="requestDetail"
            value={form.requestDetail}
            onChange={onChange}
          />
        </div>

        <div className="pcp-modal-footer">
          <button className="pcp-modal-btn-cancel" onClick={onClose} disabled={loading}>
            ✕ Hủy
          </button>
          <button className="pcp-modal-btn-send" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang gửi..." : "✓ Gửi yêu cầu"}
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

// Tuỳ chỉnh tỉ lệ hoa hồng theo cấp; ưu tiên rate tự định nghĩa cho partner
// (sau khi admin duyệt yêu cầu chỉnh sửa hoa hồng).
const DEFAULT_RATES = {
  1: { l1: 20, l2: 10, l3: 3 },
  2: { l1: 25, l2: 12, l3: 5 },
  3: { l1: 30, l2: 15, l3: 7 },
};
const getCommissionRates = (partner) => {
  if (partner?.commissionRates) return partner.commissionRates;
  return DEFAULT_RATES[partner?.level] || DEFAULT_RATES[1];
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
  const canUpgrade   = (partner.level || 1) < 3;

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
                Yêu cầu chỉnh sửa HH
              </button>
              <button
                className="pcp-btn-upgrade"
                style={{ background: "#0f766e" }}
                onClick={() => navigate("/my-commission")}
              >
                💰 Xem hoa hồng
              </button>
              {canUpgrade && (
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
              ✅ Đã gửi yêu cầu chỉnh sửa hoa hồng. Vui lòng chờ admin xét duyệt.
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
          currentRates={commission}
          onClose={() => setShowCommModal(false)}
          onSubmitted={() => {
            setShowCommModal(false);
            setSubmitDone(true);
            setTimeout(() => setSubmitDone(false), 5000);
          }}
        />
      )}
    </div>
  );
}

export default Partnercontractpage;