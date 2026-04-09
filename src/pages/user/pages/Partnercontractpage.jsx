import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../../store/authStore";
import partnerService from "../../../store/Partnerservice";
import "./PartnerContractPage.css";

// ─── Helpers ────────────────────────────────────────────────
const formatCurrency = (amount) =>
  new Intl.NumberFormat("vi-VN").format(amount || 0) + " đ";

const getInitials = (name = "") =>
  name.trim().split(" ").filter(Boolean).slice(-2).map((w) => w[0].toUpperCase()).join("");

// Tuỳ chỉnh tỉ lệ hoa hồng theo cấp — chỉnh theo nghiệp vụ thực tế
const getCommissionRates = (level = 1) => {
  const rates = {
    1: { l1: 20, l2: 10, l3: 3 },
    2: { l1: 25, l2: 12, l3: 5 },
    3: { l1: 30, l2: 15, l3: 7 },
  };
  return rates[level] || rates[1];
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

  const commission   = getCommissionRates(partner.level);
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
              <button className="pcp-btn-edit" onClick={() => navigate("/hop-dong-doi-tac/chinh-sua")}>
                Yêu cầu chỉnh sửa HH
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
    </div>
  );
}

export default Partnercontractpage;