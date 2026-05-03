import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../store/api";
import useAuthStore from "../../store/authStore";
import { getContractsForPartner, CONTRACT_STATUS, commissionExamples } from "../../store/partnerContractService";
import PartnerContractPDFModal from "./Partnercontractpdfmodal";
import BackButton from "../../components/BackButton";
import "./PartnerContractPage.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n || 0) + " đ";

const getInitials = (name = "") =>
  name.trim().split(" ").filter(Boolean).slice(-2).map((w) => w[0].toUpperCase()).join("");

// Hoa hồng theo HẠNG (rank).
const RANK_RATES = {
  "Member":         { l1: 20, l2: 10, l3: 3  },
  "Leader":         { l1: 25, l2: 12, l3: 5  },
  "Partner":        { l1: 30, l2: 15, l3: 7  },
  "Senior Partner": { l1: 35, l2: 18, l3: 10 },
};
const getCommissionByRank = (rank = "Member") => RANK_RATES[rank] || RANK_RATES["Member"];

/* ─── Components ─────────────────────────────────────────── */
function InfoItem({ label, value, highlight }) {
  return (
    <div className="pc-detail-item">
      <span className="pc-detail-label">{label}</span>
      <span className={`pc-detail-value ${highlight ? "pc-detail-value--highlight" : ""}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function CommCard({ label, value }) {
  return (
    <div className="pc-comm-card">
      <span className="pc-comm-label">{label}</span>
      <span className="pc-comm-value">{value}%</span>
    </div>
  );
}

/* ═════════ MAIN ═════════ */
function Partnercontractdetailpage() {
  const { source, id } = useParams();
  const navigate       = useNavigate();
  const location       = useLocation();
  const passedData     = location.state?.contract;

  const currentUser = useAuthStore((s) => s.user);
  const isAdmin     = currentUser?.role === "Admin";
  const fileRef     = useRef();

  const [contract,   setContract  ] = useState(null);
  const [rawPartner, setRawPartner] = useState(null);
  const [loading,    setLoading   ] = useState(true);
  const [error,      setError     ] = useState("");
  const [showPDF,    setShowPDF   ] = useState(false);
  const [uploading,  setUploading ] = useState(false);

  /* ── Fetch ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Ưu tiên dùng data truyền từ trang trước (nhanh hơn)
        if (passedData) {
          setContract(passedData);
          return;
        }

        // Fetch partner + tất cả upgradeRequests để dùng partnerContractService.
        let partner = null;
        if (source === "partner") {
          const res = await api.get(`/partners/${id}`);
          partner = res.data;
        } else if (source === "upgrade") {
          const upRes = await api.get(`/upgradeRequests/${id}`);
          const pRes  = await api.get(`/partners/${upRes.data.partnerId}`);
          partner = pRes.data;
        }
        if (!partner) { setError("Không tìm thấy hồ sơ đối tác."); return; }
        setRawPartner(partner);

        const upgRes = await api.get(`/upgradeRequests?partnerId=${partner.id}`);
        const upgs   = Array.isArray(upgRes.data) ? upgRes.data : [];

        // Xác định contract đang xem (theo source + id trong URL)
        const allContracts = getContractsForPartner(partner, upgs);
        const targetId = source === "partner" ? `partner-${id}` : `upgrade-${id}`;
        const c = allContracts.find((x) => x.id === targetId) || allContracts[0];
        if (!c) { setError("Không tìm thấy hợp đồng."); return; }

        const isIndependent = (partner.memberType || "").toUpperCase() === "INDEPENDENT";
        setContract({
          code:            c.code,
          partnerCode:     `${String(partner.code || partner.id).padStart(6, "0")}`,
          partnerName:     partner.name,
          partnerEmail:    partner.email,
          partnerPhone:    partner.phone,
          partnerAddress:  partner.address,
          partnerCccd:     partner.cccd,
          contractType:    c.contractType,
          signDate:        c.signDate,
          status:          c.status,                  // ACTIVE / PENDING / EXPIRED / REJECTED
          contractFile:    c.contractFile,
          level:           partner.level,
          rank:            c.rank,
          rates:           c.rates,
          showTierRates:   !isIndependent,
          isIndependent,
          commissionL1:    c.rates.l1,
          commissionL2:    c.rates.l2,
          commissionL3:    c.rates.l3,
          totalCommission: partner.commission || 0,
        });

      } catch (err) {
        console.error(err);
        setError("Không tìm thấy thông tin hợp đồng.");
      } finally {
        setLoading(false);
      }
    };

    if (id && source) fetchData();
  }, [id, source]);

  /* ── Upload ── */
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !rawPartner) return;
    setUploading(true);
    try {
      if (source === "partner") {
        await api.patch(`/partners/${rawPartner.id}`, { contractFile: file.name });
      } else {
        await api.patch(`/upgradeRequests/${id}`, { contractFile: file.name });
      }
      setContract((prev) => ({ ...prev, contractFile: file.name }));
      alert("✅ Tải lên thành công!");
    } catch {
      alert("❌ Tải lên thất bại.");
    } finally {
      setUploading(false);
    }
  };

  /* ── UI states ── */
  if (loading) return (
    <div className="pc-loading"><div className="pc-spinner" /><p>Đang tải...</p></div>
  );

  if (error || !contract) return (
    <div className="pc-error-wrap">
      <p>⚠️ {error}</p>
      <BackButton />
    </div>
  );

  const statusCfg = CONTRACT_STATUS[contract.status] || CONTRACT_STATUS.PENDING;
  const statusLabel = statusCfg.label;
  const statusCls   = (
    contract.status === "ACTIVE"   ? "pc-badge--approved" :
    contract.status === "EXPIRED"  ? "pc-badge--expired"  :
    contract.status === "REJECTED" ? "pc-badge--expired"  :
    "pc-badge--pending"
  );
  const examples = commissionExamples(contract.rates);

  return (
    <div className="pc-page">

      {/* ── Page title ── */}
      <div className="page-header">
        <div className="page-header-left">
          <BackButton />
          <h1 style={{ marginTop: 8 }}>Thông tin hợp đồng đối tác</h1>
          <p>Thông tin hợp đồng đối tác</p>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="pc-hero">
        <div className="pc-hero-left">
          <div className="pc-hero-avatar">{getInitials(contract.partnerName)}</div>
          <div>
            <p className="pc-hero-name">{contract.partnerName}</p>
            <p className="pc-hero-code">#{contract.partnerCode}</p>
          </div>
        </div>
        <div className="pc-hero-right">
          <p className="pc-hero-date-label">Ngày tạo hợp đồng</p>
          <p className="pc-hero-date-value">{contract.signDate || "—"}</p>
        </div>
      </div>

      {/* ── Detail card ── */}
      <div className="pc-detail-card">

        {/* Row 1 */}
        <div className="pc-detail-row">
          <InfoItem label="Mã Hợp đồng"       value={contract.code}        highlight />
          <InfoItem label="Đối tác"            value={contract.partnerName} highlight />
          <div className="pc-detail-item">
            <span className="pc-detail-label">Trạng thái</span>
            <span className={`pc-badge ${statusCls}`}>{statusLabel}</span>
          </div>
          <InfoItem label="Ngày tạo hợp đồng" value={contract.signDate} />
        </div>

        {/* Row 2: Hoa hồng — INDEPENDENT/awaiting không có cấp nên không có % cấp 1/2/3 */}
        <div className="pc-detail-row">
          {contract.showTierRates ? (
            <div>
              <div className="pc-comm-row">
                <CommCard label="Tỉ lệ hoa hồng cấp 1" value={contract.commissionL1} />
                <CommCard label="Tỉ lệ hoa hồng cấp 2" value={contract.commissionL2} />
                <CommCard label="Tỉ lệ hoa hồng cấp 3" value={contract.commissionL3} />
              </div>
              {/* Ví dụ tính hoa hồng — admin reference */}
              <div style={{
                marginTop: 12, padding: "12px 14px", borderRadius: 8,
                background: "#f0fdfa", border: "1px solid #99f6e4", fontSize: 13,
              }}>
                <p style={{ fontWeight: 700, color: "#0f766e", margin: "0 0 6px" }}>
                  💡 Ví dụ tính hoa hồng (HĐ trị giá 10.000.000 đ)
                </p>
                {examples.map((ex, i) => (
                  <div key={i} style={{ marginBottom: 4, color: "#334155" }}>
                    <strong>{ex.title}:</strong>{" "}
                    <span style={{ color: "#0f766e" }}>{ex.example}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              padding: "12px 14px", borderRadius: 8,
              background: "#fef3c7", border: "1px solid #fde68a",
              color: "#92400e", fontSize: 13, lineHeight: 1.5,
            }}>
              💡 {contract.isIndependent
                ? "Đối tác Tự do riêng lẻ chỉ hưởng hoa hồng cá nhân theo từng hợp đồng đã ký, không tham gia tuyến hoa hồng cấp 1/2/3."
                : "Đối tác chưa được phân nhánh — chưa có cấp trong cây nên chưa áp dụng tỉ lệ hoa hồng cấp 1/2/3."}
            </div>
          )}
        </div>

        {/* Row 3: Tổng hoa hồng */}
        <div className="pc-detail-row">
          <InfoItem
            label="Tổng hoa hồng đã nhận"
            value={fmt(contract.totalCommission)}
            highlight
          />
        </div>

        {/* Row 4: File + upload */}
        <div className="pc-detail-row pc-detail-row--last">
          <div className="pc-files-row">
            {contract.contractFile ? (
              <div
                className="pc-file-box pc-file-box--clickable"
                onClick={() => setShowPDF(true)}
                title="Click để xem hợp đồng"
              >
                <div className="pc-file-left">
                  <div className="pc-file-icon">📄</div>
                  <div>
                    <p className="pc-file-name">{contract.contractFile}</p>
                    <p className="pc-file-sub">Click để xem · 2.4 MB</p>
                  </div>
                </div>
                <button
                  className="pc-btn-download"
                  onClick={(e) => e.stopPropagation()}
                >
                  ⬇ Tải xuống
                </button>
              </div>
            ) : (
              <div className="pc-no-file">
                <span>⚠️</span>
                <p>Chưa có file hợp đồng.</p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={handleUpload}
            />
            <div
              className="pc-upload-box"
              onClick={() => !uploading && fileRef.current?.click()}
            >
              <span className="pc-upload-icon">⬆</span>
              <p className="pc-upload-text">
                {uploading ? "Đang tải lên..." : "Tải lên hợp đồng mới"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PDF Modal ── */}
      {showPDF && (
        <PartnerContractPDFModal
          contract={contract}
          onClose={() => setShowPDF(false)}
        />
      )}
    </div>
  );
}

export default Partnercontractdetailpage;