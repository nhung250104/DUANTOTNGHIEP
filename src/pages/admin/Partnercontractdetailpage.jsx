import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../store/api";
import useAuthStore from "../../store/authStore";
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

        if (source === "partner") {
          const res     = await api.get(`/partners/${id}`);
          const partner = res.data;
          const comm    = getCommissionByRank(partner.rank);
          const isIndependent = (partner.memberType || "").toUpperCase() === "INDEPENDENT";
          const hasLevel      = partner.level != null;

          setRawPartner(partner);
          setContract({
            code:            `HDDT${String(partner.id).padStart(6, "0")}`,
            partnerCode:     `${String(partner.code || partner.id).padStart(6, "0")}`,
            partnerName:     partner.name,
            partnerEmail:    partner.email,
            partnerPhone:    partner.phone,
            partnerAddress:  partner.address,
            partnerCccd:     partner.cccd,
            contractType:    "Đăng ký làm đối tác",
            signDate:        partner.joinDate,
            status:          partner.status === "approved" ? "approved" : "pending",
            contractFile:    partner.contractFile,
            level:           partner.level,
            rank:            partner.rank || "Member",
            // INDEPENDENT/awaiting (chưa có cấp): không hiển thị tỉ lệ HH theo cấp.
            showTierRates:   !isIndependent && hasLevel,
            isIndependent,
            commissionL1:    comm.l1,
            commissionL2:    comm.l2,
            commissionL3:    comm.l3,
            totalCommission: partner.commission || 0,
          });

        } else if (source === "upgrade") {
          const [upRes, pRes] = await Promise.all([
            api.get(`/upgradeRequests/${id}`),
            // partnerId chưa biết nên fetch upgrade trước rồi mới fetch partner
          ]);
          const upgrade   = upRes.data;
          const pRes2     = await api.get(`/partners/${upgrade.partnerId}`);
          const partner   = pRes2.data;
          // Hợp đồng nâng cấp: dùng newRank trên upgradeRequest (Member→Leader→Partner→Senior Partner).
          const newRank   = upgrade.newRank || partner?.rank || "Leader";
          const comm      = getCommissionByRank(newRank);
          const isIndependent2 = (partner?.memberType || "").toUpperCase() === "INDEPENDENT";
          const hasLevel2      = partner?.level != null;

          setRawPartner(partner);
          setContract({
            // Mã HĐ nâng cấp: HDDT + 6 chữ số tăng dần (lấy theo upgrade id, +1000 để tách
            // khỏi HĐ đăng ký đầu tiên, đảm bảo không trùng).
            code:            `HDDT${String(1000 + Number(upgrade.id)).padStart(6, "0")}`,
            partnerCode:     upgrade.partnerCode || `${String(upgrade.partnerId).padStart(6, "0")}`,
            partnerName:     upgrade.partnerName,
            partnerEmail:    partner?.email,
            partnerPhone:    partner?.phone,
            partnerAddress:  partner?.address,
            partnerCccd:     partner?.cccd,
            contractType:    `Nâng hạng lên ${newRank}`,
            signDate:        upgrade.approvedAt || upgrade.submittedAt,
            status:          "approved",
            contractFile:    upgrade.contractFile,
            level:           partner?.level,
            rank:            newRank,
            showTierRates:   !isIndependent2 && hasLevel2,
            isIndependent:   isIndependent2,
            commissionL1:    comm.l1,
            commissionL2:    comm.l2,
            commissionL3:    comm.l3,
            totalCommission: partner?.commission || 0,
          });
        }

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

  const statusLabel = contract.status === "approved" ? "Hiệu Lực" : "Chờ Duyệt";
  const statusCls   = contract.status === "approved" ? "pc-badge--approved" : "pc-badge--pending";

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
            <div className="pc-comm-row">
              <CommCard label="Tỉ lệ hoa hồng cấp 1" value={contract.commissionL1} />
              <CommCard label="Tỉ lệ hoa hồng cấp 2" value={contract.commissionL2} />
              <CommCard label="Tỉ lệ hoa hồng cấp 3" value={contract.commissionL3} />
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