import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../../../assets/logo.jpg";
import api from "../../../store/api";
import "./auth.css";

/* ─── Helpers ────────────────────────────────────────────── */
const getNow = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const extractCode = (input = "") => {
  const trimmed = input.trim();
  // Nếu chứa "/ref/" thì lấy phần sau cùng
  const refMatch = trimmed.match(/\/ref\/([^/?#\s]+)/);
  if (refMatch) return refMatch[1];
  // Nếu chứa "/" khác (url khác dạng) thì lấy segment cuối
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").filter(Boolean);
    return parts[parts.length - 1];
  }
  // Thuần mã số
  return trimmed;
};

/**
 * Tìm đối tác theo code — mọi đối tác approved (bao gồm cấp 1) đều có
 * thể là người giới thiệu (mã/link giới thiệu được cấp ngay khi duyệt hồ sơ).
 */
const findPartnerByCode = async (code) => {
  try {
    const res  = await api.get(`/partners?code=${code}&status=approved`);
    const list = Array.isArray(res.data) ? res.data : [];
    return list[0] || null;
  } catch {
    return null;
  }
};

/** Lấy maxId hiện tại của 1 collection */
const getMaxId = async (collection) => {
  try {
    const res  = await api.get(`/${collection}`);
    const list = Array.isArray(res.data) ? res.data : [];
    const ids  = list.map((x) => Number(x.id)).filter((n) => !isNaN(n));
    return ids.length > 0 ? Math.max(...ids) : 0;
  } catch {
    return 0;
  }
};

/** Che tên kiểu ngân hàng: "Nguyễn Văn A" → "Nguyễn V** A" */
const maskName = (name = "") => {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0] + "***";
  return parts
    .map((p, i) => {
      if (i === 0 || i === parts.length - 1) return p; // giữ nguyên họ & tên cuối
      return p[0] + "**"; // che tên đệm
    })
    .join(" ");
};

/* ─── Atom: Input ────────────────────────────────────────── */
const Input = ({ label, icon, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="pf-field">
      {label && <label>{label}</label>}
      <div style={{ position: "relative" }}>
        <input
          {...props}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ borderBottomColor: focused ? "var(--orange)" : undefined }}
        />
        {icon && (
          <span style={{
            position: "absolute", right: 4, top: "50%",
            transform: "translateY(-50%)", pointerEvents: "none", fontSize: 16,
          }}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Atom: UploadBox ────────────────────────────────────── */
const UploadBox = ({ id, label, sublabel, accept, preview, onChange, icon = "🖼", required = false }) => (
  <div>
    <input type="file" id={id} accept={accept} style={{ display: "none" }} onChange={onChange} />
    <label
      htmlFor={id}
      className="id-box"
      style={required && !preview ? { borderColor: "#f5a5a5", borderStyle: "dashed" } : undefined}
    >
      {preview
        ? accept.includes("image")
          ? <img src={preview} alt={label} />
          : (
            <div className="file-preview">
              <span className="file-preview-icon">📄</span>
              <span className="file-preview-name">{preview}</span>
            </div>
          )
        : (
          <div style={{ textAlign: "center" }}>
            <span className="ph">{icon}</span>
            {required && <p style={{ fontSize: 10, color: "#e88", marginTop: 4 }}>Bắt buộc</p>}
          </div>
        )
      }
    </label>
    <p className="id-lbl">
      {label}
      {required && <span style={{ color: "#e53e3e", marginLeft: 2 }}>*</span>}
    </p>
    {sublabel && <p className="id-sublbl">{sublabel}</p>}
  </div>
);

/* ─── Atom: ReferrerPreview (kiểu ngân hàng) ────────────── */
/**
 * Hiển thị thông tin mờ của người giới thiệu
 * status: "idle" | "loading" | "found" | "not_found" | "invalid_level"
 */
function ReferrerPreview({ status, referrer }) {
  if (status === "idle")    return null;

  if (status === "loading") return (
    <div style={previewStyle("#f8fafc", "#e2e8f0", "#64748b")}>
      <span style={{ fontSize: 16 }}>🔍</span>
      <span style={{ fontSize: 13, color: "#64748b" }}>Đang tìm kiếm...</span>
    </div>
  );

  if (status === "not_found") return (
    <div style={previewStyle("#fff5f5", "#fed7d7", "#c53030")}>
      <span style={{ fontSize: 16 }}>❌</span>
      <span style={{ fontSize: 13, color: "#c53030" }}>
        Không tìm thấy link giới thiệu hợp lệ.
      </span>
    </div>
  );

  if (status === "invalid_level") return (
    <div style={previewStyle("#fffbeb", "#fde68a", "#92400e")}>
      <span style={{ fontSize: 16 }}>⚠️</span>
      <span style={{ fontSize: 13, color: "#92400e" }}>
        Đối tác này chưa đủ điều kiện giới thiệu (yêu cầu từ Cấp 2 trở lên).
      </span>
    </div>
  );

  if (status === "found" && referrer) return (
    <div style={previewStyle("#f0fdf4", "#bbf7d0", "#166534")}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "linear-gradient(135deg, #0d9488, #0f766e)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
      }}>
        {referrer.name.trim().split(" ").pop()[0].toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#166534", letterSpacing: "0.05em" }}>
          {maskName(referrer.name)}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#4ade80" }}>
          {referrer.levelLabel || `Cấp ${referrer.level}`} &nbsp;·&nbsp; Mã: {referrer.code}
        </p>
      </div>
      <span style={{ fontSize: 18 }}>✅</span>
    </div>
  );

  return null;
}

const previewStyle = (bg, border, color) => ({
  marginTop: 8,
  padding: "10px 14px",
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  gap: 10,
  transition: "all 0.2s",
});

/* ─── Page ───────────────────────────────────────────────── */
function Register() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  // Nếu vào qua link ?ref=000002 thì tự điền mã
  const refFromUrl = searchParams.get("ref") || "";

  const [form, setForm] = useState({
    fullName:        "",
    gender:          "male",
    dob:             "",
    email:           "",
    phone:           "",
    address:         "",
    referralLink:    refFromUrl ? `sivip.vn/ref/${refFromUrl}` : "",
    // Hình thức hoạt động: "team" (NORMAL) hoặc "individual" (INDEPENDENT).
    // Tự bật "team" nếu vào qua link giới thiệu, vì luồng đó luôn vào hệ thống đội nhóm.
    activityType:    refFromUrl ? "team" : "team",
    password:        "",
    confirmPassword: "",
  });

  const [showPass,    setShowPass   ] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cccdFront,   setCccdFront  ] = useState(null);
  const [cccdBack,    setCccdBack   ] = useState(null);
  const [contractFile,setContractFile] = useState(null);

  const [loading,        setLoading       ] = useState(false);
  const [error,          setError         ] = useState("");

  // Trạng thái lookup người giới thiệu
  const [referrerStatus,  setReferrerStatus ] = useState("idle"); // idle|loading|found|not_found|invalid_level
  const [referrer,        setReferrer       ] = useState(null);
  const debounceRef = useRef(null);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onImage = (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Dùng base64 (data URL) thay cho blob URL để ảnh còn xem được sau khi user đóng tab.
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      side === "front" ? setCccdFront(dataUrl) : setCccdBack(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const onContract = (e) => {
    const file = e.target.files?.[0];
    if (file) setContractFile(file.name);
  };

  /* ── Debounce lookup người giới thiệu khi nhập link ── */
  useEffect(() => {
    const raw = form.referralLink.trim();

    if (!raw) {
      setReferrerStatus("idle");
      setReferrer(null);
      return;
    }

    setReferrerStatus("loading");
    setReferrer(null);

    // Debounce 600ms để tránh gọi API mỗi keystroke
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const code = extractCode(raw);
      if (!code) {
        setReferrerStatus("not_found");
        return;
      }

      try {
        // Lấy tất cả partner approved có code khớp
        const res  = await api.get(`/partners?code=${code}&status=approved`);
        const list = Array.isArray(res.data) ? res.data : [];
        const found = list[0] || null;

        if (!found) {
          setReferrerStatus("not_found");
          return;
        }

        // Mọi đối tác approved đều có quyền giới thiệu (cấp 1, 2, 3 đều được).
        setReferrer(found);
        setReferrerStatus("found");
      } catch {
        setReferrerStatus("not_found");
      }
    }, 600);

    return () => clearTimeout(debounceRef.current);
  }, [form.referralLink]);

  /* ── Validate ── */
  const validate = () => {
    if (!form.fullName)     return "Vui lòng nhập họ và tên.";
    if (!form.email)        return "Vui lòng nhập email.";
    if (!form.phone)        return "Vui lòng nhập số điện thoại.";
    if (!form.dob)          return "Vui lòng nhập ngày sinh.";
    if (!form.address)      return "Vui lòng nhập địa chỉ.";
    if (!form.password)     return "Vui lòng nhập mật khẩu.";
    if (form.password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
    if (form.password !== form.confirmPassword) return "Mật khẩu xác nhận không khớp.";
    if (!cccdFront)         return "Vui lòng tải ảnh mặt trước CCCD/Hộ chiếu.";
    if (!cccdBack)          return "Vui lòng tải ảnh mặt sau CCCD/Hộ chiếu.";
    // Mã giới thiệu KHÔNG bắt buộc — bỏ trống = vào diện "tự do chờ xếp nhánh".
    // Chỉ validate khi user đã gõ thứ gì đó vào ô để bảo đảm hợp lệ.
    if (form.referralLink.trim() && referrerStatus === "loading")       return "Đang kiểm tra link giới thiệu, vui lòng đợi.";
    if (form.referralLink.trim() && referrerStatus === "not_found")     return "Link giới thiệu không hợp lệ.";
    // (Đã bỏ ràng buộc level — mọi đối tác approved đều giới thiệu được.)
    return null;
  };

  /* ── Submit ── */
  const onSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);

    try {
      /* ── 1. Tạo user mới ── */
      const maxUserId = await getMaxId("users");
      // memberType: INDEPENDENT nếu user chọn "Hoạt động cá nhân"; ngược lại NORMAL
      const memberType = form.activityType === "individual" ? "INDEPENDENT" : "NORMAL";

      const newUser = {
        id:         String(maxUserId + 1),
        name:       form.fullName.trim(),
        email:      form.email.trim().toLowerCase(),
        phone:      form.phone.trim(),
        password:   form.password.trim(),
        role:       "Đối tác",
        memberType,
        status:     "pending_approval", // chờ admin duyệt
      };
      await api.post("/users", newUser);

      /* ── 2. Tạo hồ sơ đối tác pending ── */
      const maxPartnerId = await getMaxId("partners");
      const paddedCode   = String(maxPartnerId + 1).padStart(6, "0");

      const newPartner = {
        id:           String(maxPartnerId + 1),
        code:         paddedCode,
        name:         form.fullName,
        email:        form.email,
        phone:        form.phone,
        address:      form.address,
        dob:          form.dob,
        gender:       form.gender === "male" ? "Nam" : "Nữ",
        cccd:         null,
        cccdFront:    cccdFront,
        cccdBack:     cccdBack,
        province:     null,
        ward:         null,
        street:       null,
        status:       "pending",
        joinDate:     null,
        submittedAt:  getNow(),
        userId:       String(maxUserId + 1),             // ← liên kết user
        // Cá nhân (INDEPENDENT) thì không gắn cấp trên dù có gõ link.
        parentId:     memberType === "INDEPENDENT" ? null : (referrer ? referrer.id   : null),
        referralCode: memberType === "INDEPENDENT" ? null : (referrer ? referrer.code : null),
        memberType,
        level:        null,   // sẽ được set thành 1 khi admin duyệt
        levelLabel:   null,
        contracts:    0,
        commission:   0,
        refLink:      null,
        contractFile: contractFile,
        bank:         null,
        bankAccount:  null,
        managedBy:    null,
        transferStatus: null,
      };
      await api.post("/partners", newPartner);

      /* ── 3. Tạo thông báo cho admin ── */
      const maxNotiId = await getMaxId("notifications");
      await api.post("/notifications", {
        id:          String(maxNotiId + 1),
        type:        "new_partner_request",
        title:       "Yêu cầu trở thành đối tác mới",
        message:     `${form.fullName} vừa gửi hồ sơ đăng ký trở thành đối tác.${
          referrer ? ` (Được giới thiệu bởi ${referrer.name} — ${referrer.levelLabel || "Cấp " + referrer.level})` : ""
        }`,
        partnerId:   String(maxPartnerId + 1),
        partnerName: form.fullName,
        read:        false,
        createdAt:   getNow(),
      });

      /* ── 4. Chuyển sang trang chờ duyệt ── */
      navigate("/pending-approval");

    } catch (err) {
      console.error(err);
      setError("Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════════════════════════════
     Render
  ══════════════════════════════════════════════ */
  return (
    <>
      {/* ── Header ── */}
      <header className="auth-hdr">
        <Link to="/">
          <img src={logo} alt="SIVIP" className="auth-hdr-logo" />
        </Link>
      </header>

      {/* ── Page ── */}
      <div className="ps-page">
        <div className="ps-page-title">Đăng ký tài khoản đối tác</div>

        <div style={{ maxWidth: 900, margin: "0 auto 20px" }}>
          <span className="reg-role-badge">
            👤 Đăng ký với tư cách <strong>Đối tác / Thành viên</strong>
          </span>
        </div>

        {/* Banner link giới thiệu từ URL */}
        {refFromUrl && (
          <div className="banner-info" style={{ maxWidth: 900, margin: "0 auto 16px" }}>
            🔗 Bạn đang đăng ký qua link giới thiệu: <strong>sivip.vn/ref/{refFromUrl}</strong>
          </div>
        )}

        {error && (
          <div className="banner-err" style={{ maxWidth: 900, margin: "0 auto 16px" }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="ps-body">

            {/* ══ Cột trái: thông tin cá nhân ══ */}
            <div className="ps-card">
              <h3 className="sec-title">Thông tin cá nhân</h3>
              <div className="pf">

                <Input label="Họ và tên *"        name="fullName"     placeholder="Ví dụ: Nguyễn Văn A"            value={form.fullName}     onChange={onChange} />

                <div className="pf-field">
                  <label>Giới tính *</label>
                  <div className="gender-row">
                    {[["male", "Nam"], ["female", "Nữ"]].map(([v, l]) => (
                      <label key={v} className="gender-opt">
                        <input type="radio" name="gender" value={v} checked={form.gender === v} onChange={onChange} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>

                <Input label="Ngày sinh *"         name="dob"          type="date"                                    value={form.dob}          onChange={onChange} />
                <Input label="Email *"             name="email"        type="email" placeholder="example@gmail.com"  value={form.email}        onChange={onChange} />
                <Input label="Số điện thoại *"     name="phone"        type="tel"   placeholder="Nhập số điện thoại" value={form.phone}        onChange={onChange} />
                <Input label="Địa chỉ hiện tại *"  name="address"      placeholder="Ví dụ: Sơn Trà, Đà Nẵng"       value={form.address}      onChange={onChange} icon="📍" />

                {/* ── Hình thức hoạt động ── */}
                <div className="pf-field">
                  <label>Hình thức hoạt động *</label>
                  <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
                    <label style={{
                      flex: 1, minWidth: 160,
                      padding: "10px 12px",
                      border: `2px solid ${form.activityType === "team" ? "#0d9488" : "#e2e8f0"}`,
                      borderRadius: 10, cursor: "pointer",
                      background: form.activityType === "team" ? "#f0fdfa" : "#fff",
                      transition: "all 0.15s",
                    }}>
                      <input
                        type="radio" name="activityType" value="team"
                        checked={form.activityType === "team"}
                        onChange={onChange}
                        style={{ marginRight: 8 }}
                      />
                      <strong>Đội nhóm</strong>
                      <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0 22px" }}>
                        Có người giới thiệu, hưởng hoa hồng theo cây phân cấp.
                      </p>
                    </label>
                    <label style={{
                      flex: 1, minWidth: 160,
                      padding: "10px 12px",
                      border: `2px solid ${form.activityType === "individual" ? "#0d9488" : "#e2e8f0"}`,
                      borderRadius: 10, cursor: "pointer",
                      background: form.activityType === "individual" ? "#f0fdfa" : "#fff",
                      transition: "all 0.15s",
                    }}>
                      <input
                        type="radio" name="activityType" value="individual"
                        checked={form.activityType === "individual"}
                        onChange={onChange}
                        style={{ marginRight: 8 }}
                      />
                      <strong>Cá nhân</strong>
                      <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0 22px" }}>
                        Hoạt động độc lập, không tham gia hệ thống phân cấp.
                      </p>
                    </label>
                  </div>
                </div>

                {/* ── Link giới thiệu (không bắt buộc) ── */}
                <div className="pf-field" style={{ display: form.activityType === "individual" ? "none" : "" }}>
                  <label>
                    Mã hoặc link người giới thiệu <span style={{ color: "#94a3b8", fontWeight: 400 }}>(không bắt buộc)</span>
                  </label>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 6px" }}>
                    Bỏ trống nếu chưa có. Sau khi admin duyệt, bạn sẽ vào diện
                    <strong> "Tự do chờ xếp nhánh"</strong> và admin sẽ tự gắn cấp trên cho bạn.
                  </p>
                  <div style={{ position: "relative" }}>
                    <input
                      name="referralLink"
                      placeholder="sivip.vn/ref/000002"
                      value={form.referralLink}
                      onChange={onChange}
                      style={{
                        paddingRight: 36,
                        borderColor: referrerStatus === "found"
                          ? "#10b981"
                          : referrerStatus === "not_found" || referrerStatus === "invalid_level"
                          ? "#ef4444"
                          : undefined,
                      }}
                      autoComplete="off"
                    />
                    {/* Icon trạng thái bên phải input */}
                    {referrerStatus === "loading" && (
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>
                        ⏳
                      </span>
                    )}
                    {referrerStatus === "found" && (
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>
                        ✅
                      </span>
                    )}
                    {(referrerStatus === "not_found" || referrerStatus === "invalid_level") && (
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>
                        ❌
                      </span>
                    )}
                  </div>

                  {/* Preview thông tin người giới thiệu */}
                  <ReferrerPreview status={referrerStatus} referrer={referrer} />
                </div>

                {/* Mật khẩu */}
                <Input
                  label="Mật khẩu *"
                  name="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Ít nhất 8 ký tự"
                  value={form.password}
                  onChange={onChange}
                  icon={
                    <span style={{ cursor: "pointer", pointerEvents: "auto" }} onClick={() => setShowPass((s) => !s)}>
                      {showPass ? "🙈" : "👁"}
                    </span>
                  }
                />

                <Input
                  label="Xác nhận mật khẩu *"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={onChange}
                  icon={
                    <span style={{ cursor: "pointer", pointerEvents: "auto" }} onClick={() => setShowConfirm((s) => !s)}>
                      {showConfirm ? "🙈" : "👁"}
                    </span>
                  }
                />

                {form.confirmPassword && (
                  <p style={{ fontSize: 12, marginTop: -8, color: form.password === form.confirmPassword ? "#276749" : "#c53030" }}>
                    {form.password === form.confirmPassword ? "✅ Mật khẩu khớp" : "❌ Mật khẩu chưa khớp"}
                  </p>
                )}
              </div>

              <button
                className="btn btn-teal"
                type="submit"
                disabled={loading || referrerStatus === "loading"}
                style={{ marginTop: 28, borderRadius: 10 }}
              >
                {loading ? <span className="spinner" /> : "Hoàn tất đăng ký"}
              </button>

              <p className="form-foot">
                Đã có tài khoản?{" "}
                <Link to="/login" className="link">Đăng nhập</Link>
              </p>
            </div>

            {/* ══ Cột phải: upload tài liệu ══ */}
            <div className="ps-side" style={{ width: 280 }}>
              <h3 className="sec-title">
                Giấy tờ tùy thân <span style={{ color: "#e53e3e" }}>*</span>
              </h3>
              <p className="id-desc">Vui lòng tải ảnh <strong>CCCD / Hộ chiếu</strong> của bạn:</p>
              <p className="id-note" style={{ marginBottom: 12 }}>Ảnh rõ nét, nguyên gốc, không chỉnh sửa.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                <UploadBox id="cccd-front" label="Mặt trước CCCD" accept="image/*" preview={cccdFront} onChange={(e) => onImage(e, "front")} required />
                <UploadBox id="cccd-back"  label="Mặt sau CCCD"   accept="image/*" preview={cccdBack}  onChange={(e) => onImage(e, "back")}  required />
              </div>

              <div style={{ height: 1, background: "#f0f0f0", margin: "4px 0 20px" }} />

              <h3 className="sec-title">Hợp đồng đối tác</h3>
              <p className="id-desc">Tải lên file hợp đồng đã ký:</p>
              <p className="id-note" style={{ marginBottom: 12 }}>
                Có chữ ký và đóng dấu đầy đủ.{" "}
                <a href="#" className="link">Tải mẫu hợp đồng</a>
              </p>

              <UploadBox
                id="contract"
                label="File hợp đồng"
                sublabel=".pdf  .doc  .docx  .jpg"
                accept=".pdf,.doc,.docx,image/*"
                preview={contractFile}
                onChange={onContract}
                icon="📄"
              />
            </div>

          </div>
        </form>
      </div>
    </>
  );
}

export default Register;