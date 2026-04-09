import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../store/api";
import "./CustomerContractPage.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n || 0) + " đ";

const getInitials = (name = "") =>
  name.trim().split(" ").filter(Boolean).slice(-2).map((w) => w[0].toUpperCase()).join("");

const statusCfg = {
  approved: { label: "Hiệu Lực",  cls: "cc-badge--approved" },
  pending:  { label: "Chờ duyệt", cls: "cc-badge--pending"  },
  expired:  { label: "Hết hạn",   cls: "cc-badge--expired"  },
  rejected: { label: "Từ chối",   cls: "cc-badge--rejected" },
};

/* ─── Info row ───────────────────────────────────────────── */
function InfoItem({ label, value, highlight, wide }) {
  return (
    <div className={`cc-detail-item ${wide ? "cc-detail-item--wide" : ""}`}>
      <span className="cc-detail-label">{label}</span>
      <span className={`cc-detail-value ${highlight ? "cc-detail-value--highlight" : ""}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
function Customercontractdetail({ isAdmin = false }) {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [loading,  setLoading ] = useState(true);
  const [error,    setError   ] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/customerContracts/${id}`);
        setContract(res.data);
      } catch {
        setError("Không tìm thấy hợp đồng.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return (
    <div className="cc-loading"><div className="cc-spinner" /><p>Đang tải...</p></div>
  );

  if (error || !contract) return (
    <div className="cc-error-wrap">
      <p className="cc-error-msg">⚠️ {error || "Không tìm thấy hợp đồng."}</p>
      <button className="cc-btn-back" onClick={() => navigate(-1)}>← Quay lại</button>
    </div>
  );

  const cfg = statusCfg[contract.status] || statusCfg.pending;

  return (
    <div className="cc-page">
      {/* ── Page title ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Quản lý hợp đồng khách hàng</h1>
          <p>Quản lý toàn bộ hợp đồng khách hàng của đối tác</p>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="cc-hero">
        <div className="cc-hero-left">
          <div className="cc-hero-avatar">
            {getInitials(contract.customerName)}
          </div>
          <div>
            <p className="cc-hero-name">{contract.customerName}</p>
            <p className="cc-hero-code">#{contract.code}</p>
          </div>
        </div>
        <div className="cc-hero-dates">
          <div className="cc-hero-date-item">
            <span className="cc-hero-date-label">NGÀY HIỆU LỰC</span>
            <span className="cc-hero-date-value">{contract.signDate}</span>
          </div>
          <div className="cc-hero-date-item">
            <span className="cc-hero-date-label">NGÀY HẾT HIỆU LỰC</span>
            <span className="cc-hero-date-value">{contract.expireDate}</span>
          </div>
        </div>
      </div>

      {/* ── Detail card ── */}
      <div className="cc-detail-card">

        {/* Row 1: Mã HĐ · Mã đối tác · Đối tác · Trạng thái */}
        <div className="cc-detail-row">
          <InfoItem label="Mã Hợp đồng"         value={contract.code}        highlight />
          <InfoItem label="Mã đối tác ký hợp đồng" value={contract.partnerCode} />
          <InfoItem label="Đối tác ký hợp đồng"  value={contract.partnerName} />
          <div className="cc-detail-item">
            <span className="cc-detail-label">Trạng thái</span>
            <span className={`cc-badge ${cfg.cls}`}>{cfg.label}</span>
          </div>
        </div>

        {/* Row 2: Khách hàng · MST · SĐT */}
        <div className="cc-detail-row">
          <InfoItem label="Khách hàng"            value={contract.customerName}    highlight />
          <InfoItem label="Mã số thuế"            value={contract.customerTax}     />
          <InfoItem label="Số điện thoại khách hàng" value={contract.customerPhone} />
        </div>

        {/* Row 3: Ngày ký · Ngày hết hiệu lực */}
        <div className="cc-detail-row">
          <InfoItem label="Ngày ký"               value={contract.signDate}   />
          <InfoItem label="Ngày hết hiệu lực"     value={contract.expireDate} />
        </div>

        {/* Row 4: Giá trị · Hoa hồng trực tiếp */}
        <div className="cc-detail-row">
          <InfoItem label="Giá trị hợp đồng"      value={fmt(contract.value)}      highlight />
          <InfoItem label="Hoa hồng trực tiếp"    value={fmt(contract.commission)} highlight />
        </div>

        {/* Row 5: Lý do từ chối (nếu có) */}
        {contract.status === "rejected" && contract.rejectReason && (
          <div className="cc-detail-row">
            <div className="cc-reject-box">
              <span className="cc-reject-title">❌ Lý do từ chối:</span>
              <span className="cc-reject-reason">{contract.rejectReason}</span>
              {contract.rejectDetail && (
                <span className="cc-reject-detail">{contract.rejectDetail}</span>
              )}
            </div>
          </div>
        )}

        {/* Row 6: File hợp đồng */}
        <div className="cc-detail-row cc-detail-row--last">
          {contract.contractFile ? (
            <div className="cc-file-box">
              <div className="cc-file-left">
                <div className="cc-file-icon">📄</div>
                <div>
                  <p className="cc-file-name">{contract.contractFile}</p>
                  <p className="cc-file-sub">2.4 MB</p>
                </div>
              </div>
              <a
                href={`/${contract.contractFile}`}
                download
                className="cc-btn-download"
              >
                ⬇ Tải xuống
              </a>
            </div>
          ) : (
            <div className="cc-no-file">
              <span>⚠️</span>
              <p>Chưa có file hợp đồng.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Customercontractdetail;