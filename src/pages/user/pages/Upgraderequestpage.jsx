import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../../store/authStore";
import partnerService from "../../../store/Partnerservice";
import api from "../../../store/api";
import "./UpgradeRequestPage.css";

/* ─── Helper: tạo id tăng dần ─────────────────────────── */
const getMaxId = async (collection) => {
  try {
    const res  = await api.get(`/${collection}`);
    const list = Array.isArray(res.data) ? res.data : [];
    const ids  = list.map((x) => Number(x.id)).filter((n) => !isNaN(n));
    return ids.length > 0 ? Math.max(...ids) : 0;
  } catch { return 0; }
};

const getNow = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/* ─── Component ────────────────────────────────────────── */
function Upgraderequestpage() {
  const navigate    = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [partner,  setPartner ] = useState(null);
  const [loading,  setLoading ] = useState(true);
  const [error,    setError   ] = useState("");
  const [reason,   setReason  ] = useState("");
  const [file,     setFile    ] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success,  setSuccess ] = useState(false);
  const fileRef = useRef();

  /* ── Lấy thông tin đối tác của user đang đăng nhập ── */
  useEffect(() => {
    const fetchPartner = async () => {
      try {
        const res  = await partnerService.getAll();
        const list = Array.isArray(res.data) ? res.data : [];
        // Tìm partner theo email hoặc userId
        const found = list.find(
          (p) => p.email === currentUser?.email || p.userId === String(currentUser?.id)
        );
        if (!found) {
          setError("Không tìm thấy hồ sơ đối tác. Vui lòng liên hệ admin.");
        } else {
          setPartner(found);
        }
      } catch {
        setError("Không thể tải thông tin đối tác.");
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchPartner();
  }, [currentUser]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) { setError("Vui lòng nhập lý do yêu cầu nâng cấp."); return; }
    if (!file)           { setError("Vui lòng upload hợp đồng đã ký."); return; }
    if (!partner)        { setError("Không tìm thấy hồ sơ đối tác."); return; }

    // Chỉ cấp 1 và 2 mới được nâng cấp
    const currentLevel = partner.level || 1;
    if (currentLevel >= 3) {
      setError("Bạn đã đạt cấp bậc tối đa.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      /* 1. Tạo yêu cầu nâng cấp */
      const maxId  = await getMaxId("upgradeRequests");
      const newReq = {
        id:           String(maxId + 1),
        partnerId:    partner.id,
        partnerCode:  partner.code,
        partnerName:  partner.name,
        currentLevel: currentLevel,
        reason:       reason,
        contractFile: file.name,
        status:       "pending",
        submittedAt:  getNow(),
      };
      await api.post("/upgradeRequests", newReq);

      /* 2. Tạo thông báo cho admin */
      const maxNotiId = await getMaxId("notifications");
      await api.post("/notifications", {
        id:          String(maxNotiId + 1),
        type:        "upgrade_request",
        title:       "Yêu cầu nâng cấp đối tác",
        message:     `${partner.name} (${partner.code}) yêu cầu nâng cấp từ Cấp ${currentLevel} lên Cấp ${currentLevel + 1}.`,
        partnerId:   partner.id,
        partnerName: partner.name,
        read:        false,
        createdAt:   getNow(),
      });

      setSuccess(true);
    } catch {
      setError("Gửi yêu cầu thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="urp-loading">
      <div className="urp-spinner" />
      <p>Đang tải thông tin...</p>
    </div>
  );

  /* ── Success ── */
  if (success) return (
    <div className="urp-success-wrap">
      <div className="urp-success-card">
        <div className="urp-success-icon">✅</div>
        <h2>Gửi yêu cầu thành công!</h2>
        <p>Yêu cầu nâng cấp lên <strong>Cấp {(partner?.level || 1) + 1}</strong> của bạn đã được gửi đến admin.</p>
        <p className="urp-success-sub">Chúng tôi sẽ xem xét và phản hồi trong vòng <strong>1-3 ngày làm việc</strong>.</p>
        <button className="urp-btn-back" onClick={() => navigate("/dashboard")}>
          ← Quay lại trang chủ
        </button>
      </div>
    </div>
  );

  const currentLevel = partner?.level || 1;
  const nextLevel    = currentLevel + 1;

  return (
    <div className="urp-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="urp-btn-nav" onClick={() => navigate(-1)}>← Quay lại</button>
          <h1 style={{ marginTop: 8 }}>Yêu cầu nâng cấp đối tác</h1>
          <p>Gửi yêu cầu nâng cấp từ Cấp {currentLevel} lên Cấp {nextLevel}</p>
        </div>
      </div>

      <div className="urp-body">

        {/* ── Cột trái: thông tin hiện tại ── */}
        <div className="urp-info-card">
          <h3 className="urp-card-title">Thông tin đối tác</h3>

          <div className="urp-avatar">
            {(partner?.name || "?").split(" ").slice(-2).map((w) => w[0].toUpperCase()).join("")}
          </div>
          <p className="urp-partner-name">{partner?.name}</p>

          <div className="urp-level-row">
            <span className="urp-level-badge urp-level-badge--current">Cấp {currentLevel}</span>
            <span className="urp-arrow">→</span>
            <span className="urp-level-badge urp-level-badge--next">Cấp {nextLevel}</span>
          </div>

          <div className="urp-info-list">
            {[
              { label: "Mã đối tác",  value: partner?.code },
              { label: "Email",       value: partner?.email },
              { label: "Điện thoại",  value: partner?.phone },
              { label: "Địa chỉ",    value: partner?.address },
              { label: "Ngày tham gia", value: partner?.joinDate },
            ].map((f) => (
              <div key={f.label} className="urp-info-item">
                <span className="urp-info-label">{f.label}</span>
                <span className="urp-info-value">{f.value || "—"}</span>
              </div>
            ))}
          </div>

          {/* Quyền lợi khi lên cấp */}
          <div className="urp-benefits">
            <p className="urp-benefits-title">🎁 Quyền lợi khi lên Cấp {nextLevel}</p>
            <ul>
              <li>Nhận link giới thiệu riêng</li>
              <li>Hưởng hoa hồng gián tiếp từ Cấp 1</li>
              <li>Hỗ trợ đào tạo nâng cao</li>
              <li>Báo cáo doanh số chi tiết</li>
            </ul>
          </div>
        </div>

        {/* ── Cột phải: form gửi yêu cầu ── */}
        <div className="urp-form-card">
          <h3 className="urp-card-title">Thông tin yêu cầu</h3>

          {error && <div className="urp-error">{error}</div>}

          <form onSubmit={onSubmit}>

            {/* Lý do */}
            <div className="urp-field">
              <label className="urp-label">Lý do yêu cầu nâng cấp <span className="urp-required">*</span></label>
              <textarea
                className="urp-textarea"
                placeholder="Mô tả lý do bạn muốn nâng cấp lên Cấp (kinh nghiệm, kế hoạch kinh doanh...)"
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Download hợp đồng mẫu */}
            <div className="urp-field">
              <label className="urp-label">Hợp đồng đối tác Cấp {nextLevel} <span className="urp-required">*</span></label>
              <div className="urp-download-box">
                <span className="urp-download-icon">📄</span>
                <div>
                  <p className="urp-download-name">Hợp đồng mẫu Cấp {nextLevel} - SIVIP.pdf</p>
                  <p className="urp-download-sub">Tải về, ký tay rồi upload lại bên dưới</p>
                </div>
                <a
                  href="/hop_dong_mau_cap2.pdf"
                  download="hop_dong_mau_cap2.pdf"
                  className="urp-btn-download"
                >
                  ⬇ Tải mẫu
                </a>
              </div>
            </div>

            {/* Upload hợp đồng đã ký */}
            <div className="urp-field">
              <label className="urp-label">Upload hợp đồng đã ký <span className="urp-required">*</span></label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: "none" }}
                onChange={onFile}
              />
              <div
                className={`urp-upload-box ${file ? "urp-upload-box--filled" : ""}`}
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <>
                    <span style={{ fontSize: 28 }}>📄</span>
                    <div>
                      <p className="urp-upload-filename">{file.name}</p>
                      <p className="urp-upload-sub">Click để đổi file</p>
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 28, color: "#94a3b8" }}>⬆</span>
                    <div>
                      <p className="urp-upload-text">Click để tải lên hợp đồng đã ký</p>
                      <p className="urp-upload-sub">.pdf, .doc, .docx</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Cam kết */}
            <div className="urp-commit">
              <p>Bằng cách gửi yêu cầu này, tôi xác nhận rằng:</p>
              <ul>
                <li>Thông tin và hợp đồng tôi cung cấp là chính xác và hợp lệ.</li>
                <li>Tôi đã đọc và đồng ý với tất cả các điều khoản trong hợp đồng.</li>
                <li>Tôi cam kết thực hiện đầy đủ nghĩa vụ của Đối tác Cấp {nextLevel}.</li>
              </ul>
            </div>

            <button className="urp-btn-submit" type="submit" disabled={submitting}>
              {submitting ? "Đang gửi..." : `✓ Gửi yêu cầu nâng cấp lên Cấp ${nextLevel}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Upgraderequestpage;