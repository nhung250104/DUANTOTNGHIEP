import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../store/api";
import useAuthStore from "../../store/authStore";
import PartnerContractPDFModal from "./Partnercontractpdfmodal";
import "./PartnerContractPage.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n || 0) + " đ";

const getInitials = (name = "") =>
  name.trim().split(" ").filter(Boolean).slice(-2).map((w) => w[0].toUpperCase()).join("");

const getCommissionByLevel = (level = 1) => {
  const table = {
    1: { l1: 20, l2: 10, l3: 3 },
    2: { l1: 25, l2: 12, l3: 5 },
    3: { l1: 30, l2: 15, l3: 7 },
  };
  return table[level] || table[1];
};

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
          const comm    = getCommissionByLevel(partner.tier || 1);

          setRawPartner(partner);
          setContract({
            code:            `HDDT${String(partner.id).padStart(6, "0")}`,
            partnerCode:     `DT${String(partner.code || partner.id).padStart(6, "0")}`,
            partnerName:     partner.name,
            partnerEmail:    partner.email,
            partnerPhone:    partner.phone,
            partnerAddress:  partner.address,
            partnerCccd:     partner.cccd,
            contractType:    "Đăng ký làm đối tác",
            signDate:        partner.joinDate,
            status:          partner.status === "approved" ? "approved" : "pending",
            contractFile:    partner.contractFile,
            level:           1,
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
          const nextLevel = (upgrade.currentLevel || 1) + 1;
          const comm      = getCommissionByLevel(nextLevel);

          setRawPartner(partner);
          setContract({
            code:            `HDDT-C${nextLevel}-${String(upgrade.id).padStart(4, "0")}`,
            partnerCode:     upgrade.partnerCode || `DT${String(upgrade.partnerId).padStart(6, "0")}`,
            partnerName:     upgrade.partnerName,
            partnerEmail:    partner?.email,
            partnerPhone:    partner?.phone,
            partnerAddress:  partner?.address,
            partnerCccd:     partner?.cccd,
            contractType:    `Đăng ký làm đối tác cấp ${nextLevel}`,
            signDate:        upgrade.approvedAt || upgrade.submittedAt,
            status:          "approved",
            contractFile:    upgrade.contractFile,
            level:           nextLevel,
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
      <button onClick={() => navigate(-1)}>← Quay lại</button>
    </div>
  );

  const statusLabel = contract.status === "approved" ? "Hiệu Lực" : "Chờ Duyệt";
  const statusCls   = contract.status === "approved" ? "pc-badge--approved" : "pc-badge--pending";

  return (
    <div className="pc-page">

      {/* ── Page title ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Thông tin hợp đồng đối tác</h1>
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

        {/* Row 2: Hoa hồng */}
        <div className="pc-detail-row">
          <div className="pc-comm-row">
            <CommCard label="Tỉ lệ hoa hồng cấp 1" value={contract.commissionL1} />
            <CommCard label="Tỉ lệ hoa hồng cấp 2" value={contract.commissionL2} />
            <CommCard label="Tỉ lệ hoa hồng cấp 3" value={contract.commissionL3} />
          </div>
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