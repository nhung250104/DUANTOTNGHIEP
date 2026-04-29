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

/* ─── Điều kiện nâng cấp theo TIER (hạng nâng cấp, không phải tree depth) ──── */
const UPGRADE_CONDITIONS = {
  // Hạng 1 → Hạng 2
  1: { minF1: 5,  minContracts: 10, minRevenue: 300_000_000 },
  // Hạng 2 → Hạng 3
  2: { minF1: 10, minContracts: 25, minRevenue: 700_000_000 },
  // Hạng 3 = trần.
};
const MAX_TIER = 3;

/* ─── Component ────────────────────────────────────────── */
function Upgraderequestpage() {
  const navigate    = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [partner,    setPartner   ] = useState(null);
  const [allPartners,setAllPartners] = useState([]);
  const [contracts,  setContracts ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [error,      setError     ] = useState("");
  const [reason,     setReason    ] = useState("");
  const [file,       setFile      ] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess   ] = useState(false);
  const fileRef = useRef();

  /* ── Fetch partner + danh sách partner + HĐ KH ── */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          partnerService.getAll(),
          api.get("/customerContracts"),
        ]);
        const pList = Array.isArray(pRes.data) ? pRes.data : [];
        const cList = Array.isArray(cRes.data) ? cRes.data : [];
        setAllPartners(pList);
        setContracts(cList);

        const found = pList.find(
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
    if (currentUser) fetchAll();
  }, [currentUser]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  /* ── Tính điều kiện trước khi cho gửi ── */
  const stats = (() => {
    if (!partner) return { f1: 0, ok: 0, revenue: 0 };
    const f1Count = allPartners.filter(
      (p) => String(p.parentId) === String(partner.id) && p.status === "approved"
    ).length;
    const myApproved = contracts.filter(
      (c) => String(c.partnerId) === String(partner.id) && c.status === "approved"
    );
    const okContracts = myApproved.length;
    const revenue = myApproved.reduce((s, c) => s + (Number(c.value) || 0), 0);
    return { f1: f1Count, ok: okContracts, revenue };
  })();

  const currentTierEarly = partner?.tier || 1;
  const cfg = UPGRADE_CONDITIONS[currentTierEarly]; // undefined nếu đã max
  const conditions = cfg
    ? [
        { key: "f1",      label: "Số F1 trực tiếp (đã duyệt)", current: stats.f1,      target: cfg.minF1 },
        { key: "ok",      label: "Hợp đồng KH đã duyệt",        current: stats.ok,      target: cfg.minContracts },
        { key: "revenue", label: "Doanh thu HĐ đã duyệt (VNĐ)", current: stats.revenue, target: cfg.minRevenue, money: true },
      ]
    : [];
  const conditionsMet = conditions.length > 0 && conditions.every((c) => c.current >= c.target);
  const isMaxTier     = currentTierEarly >= MAX_TIER;

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) { setError("Vui lòng nhập lý do yêu cầu nâng cấp."); return; }
    if (!file)           { setError("Vui lòng upload hợp đồng đã ký."); return; }
    if (!partner)        { setError("Không tìm thấy hồ sơ đối tác."); return; }

    // Hạng 1, 2 mới được nâng cấp; Hạng 3 = trần
    const currentTier = partner.tier || 1;
    if (currentTier >= MAX_TIER) {
      setError(`Bạn đã đạt Hạng ${MAX_TIER} — hạng nâng cấp tối đa. Quyền lợi: hưởng nhiều hoa hồng hơn từ tuyến dưới.`);
      return;
    }
    if (!conditionsMet) {
      setError("Bạn chưa đủ điều kiện nâng cấp. Vui lòng xem chi tiết bên dưới.");
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
        // Lưu cả 2: currentLevel (giữ tên field cũ cho backward-compat) = tier hiện tại
        currentLevel: currentTier,
        currentTier:  currentTier,
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
        message:     `${partner.name} (${partner.code}) yêu cầu nâng cấp từ Hạng ${currentTier} lên Hạng ${currentTier + 1}.`,
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
        <p>Yêu cầu nâng cấp lên <strong>Hạng {(partner?.tier || 1) + 1}</strong> của bạn đã được gửi đến admin.</p>
        <p className="urp-success-sub">Chúng tôi sẽ xem xét và phản hồi trong vòng <strong>1-3 ngày làm việc</strong>.</p>
        <button className="urp-btn-back" onClick={() => navigate("/dashboard")}>
          ← Quay lại trang chủ
        </button>
      </div>
    </div>
  );

  const currentTierShown = partner?.tier || 1;
  const nextTier         = currentTierShown + 1;

  return (
    <div className="urp-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="urp-btn-nav" onClick={() => navigate(-1)}>← Quay lại</button>
          <h1 style={{ marginTop: 8 }}>Yêu cầu nâng cấp đối tác</h1>
          <p>Gửi yêu cầu nâng cấp từ Hạng {currentTierShown} lên Hạng {nextTier}</p>
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
            <span className="urp-level-badge urp-level-badge--current">Hạng {currentTierShown}</span>
            <span className="urp-arrow">→</span>
            <span className="urp-level-badge urp-level-badge--next">Hạng {nextTier}</span>
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
            <p className="urp-benefits-title">🎁 Quyền lợi khi lên Hạng {nextTier}</p>
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
          <h3 className="urp-card-title">Điều kiện nâng cấp</h3>

          {isMaxTier ? (
            <div style={{
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              borderRadius: 10, padding: 14, marginBottom: 18,
              fontSize: 13, color: "#1e40af",
            }}>
              🏆 Bạn đã đạt <strong>Hạng {MAX_TIER}</strong> — cấp bậc tối đa.
              Hệ thống không còn cấp cao hơn để nâng. Quyền lợi của bạn:
              <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                <li>Hưởng tỉ lệ hoa hồng cá nhân cao nhất.</li>
                <li>Nhận hoa hồng từ tuyến dưới (F1, F2) ở mức cao nhất.</li>
                <li>Có quyền yêu cầu chỉnh sửa hoa hồng trực tiếp với admin.</li>
              </ul>
            </div>
          ) : (
          <div style={{
            border: `1px solid ${conditionsMet ? "#bbf7d0" : "#fde68a"}`,
            background: conditionsMet ? "#f0fdf4" : "#fffbeb",
            borderRadius: 10, padding: 14, marginBottom: 18,
          }}>
            <p style={{ fontSize: 12, color: "#475569", margin: "0 0 8px" }}>
              Yêu cầu để lên <strong>Hạng {currentTierEarly + 1}</strong>:
            </p>
            {conditions.map((c) => {
              const ok = c.current >= c.target;
              const pct = Math.min(100, Math.round((c.current / c.target) * 100));
              const fmtNum = (n) => c.money
                ? new Intl.NumberFormat("vi-VN").format(n) + " đ"
                : new Intl.NumberFormat("vi-VN").format(n);
              return (
                <div key={c.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: "#334155" }}>
                      {ok ? "✅" : "⚠️"} {c.label}
                    </span>
                    <span style={{ color: ok ? "#15803d" : "#92400e", fontWeight: 600 }}>
                      {fmtNum(c.current)} / {fmtNum(c.target)}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%",
                      background: ok ? "#22c55e" : "#f59e0b",
                      transition: "width 0.3s",
                    }} />
                  </div>
                </div>
              );
            })}
            {!conditionsMet && (
              <p style={{ fontSize: 12, color: "#78350f", marginTop: 8, marginBottom: 0 }}>
                Bạn cần đạt đủ cả 3 điều kiện trên mới có thể gửi yêu cầu nâng cấp.
              </p>
            )}
          </div>
          )}

          <h3 className="urp-card-title">Thông tin yêu cầu</h3>

          {error && <div className="urp-error">{error}</div>}

          <form onSubmit={onSubmit}>

            {/* Lý do */}
            <div className="urp-field">
              <label className="urp-label">Lý do yêu cầu nâng cấp <span className="urp-required">*</span></label>
              <textarea
                className="urp-textarea"
                placeholder="Mô tả lý do bạn muốn nâng cấp lên Hạng (kinh nghiệm, kế hoạch kinh doanh...)"
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Download hợp đồng mẫu */}
            <div className="urp-field">
              <label className="urp-label">Hợp đồng đối tác Hạng {nextTier} <span className="urp-required">*</span></label>
              <div className="urp-download-box">
                <span className="urp-download-icon">📄</span>
                <div>
                  <p className="urp-download-name">Hợp đồng mẫu Hạng {nextTier} - SIVIP.pdf</p>
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
                <li>Tôi cam kết thực hiện đầy đủ nghĩa vụ của Đối tác Hạng {nextTier}.</li>
              </ul>
            </div>

            <button
              className="urp-btn-submit"
              type="submit"
              disabled={submitting || !conditionsMet || isMaxTier}
              title={
                isMaxTier ? `Đã đạt Hạng ${MAX_TIER} — cấp bậc tối đa` :
                !conditionsMet ? "Bạn chưa đủ điều kiện nâng cấp" : ""
              }
            >
              {submitting
                ? "Đang gửi..."
                : isMaxTier
                  ? `🏆 Đã đạt Hạng ${MAX_TIER} — cấp tối đa`
                  : conditionsMet
                    ? `✓ Gửi yêu cầu nâng cấp lên Hạng ${nextTier}`
                    : "🔒 Chưa đủ điều kiện nâng cấp"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Upgraderequestpage;