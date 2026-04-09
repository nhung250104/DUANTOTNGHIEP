/**
 * src/pages/user/CustomerContractCreate.jsx
 *
 * Đối tác tạo HĐ khách hàng mới → admin duyệt
 */

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../store/api";
import useAuthStore from "../../store/authStore";
import partnerService from "../../store/Partnerservice";
import "./CustomerContractPage.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n || 0);

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
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

function Customercontractcreate() {
  const navigate    = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const fileRef     = useRef();

  const [form, setForm] = useState({
    customerName:    "",
    customerTax:     "",
    customerPhone:   "",
    customerAddress: "",
    signDate:        "",
    expireDate:      "",
    value:           "",
  });

  const [file,     setFile    ] = useState(null);
  const [loading,  setLoading ] = useState(false);
  const [error,    setError   ] = useState("");

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.customerName)    return "Vui lòng nhập tên khách hàng.";
    if (!form.customerTax)     return "Vui lòng nhập mã số thuế.";
    if (!form.customerPhone)   return "Vui lòng nhập số điện thoại khách hàng.";
    if (!form.signDate)        return "Vui lòng chọn ngày ký.";
    if (!form.expireDate)      return "Vui lòng chọn ngày hết hạn.";
    if (!form.value || isNaN(Number(form.value.replace(/\D/g, "")))) return "Vui lòng nhập giá trị hợp đồng hợp lệ.";
    if (!file)                 return "Vui lòng tải lên file hợp đồng.";
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(""); setLoading(true);

    try {
      // Lấy thông tin partner của user đang đăng nhập
      const pRes  = await partnerService.getAll();
      const pList = Array.isArray(pRes.data) ? pRes.data : [];
      const me    = pList.find(
        (p) => p.userId === String(currentUser?.id) || p.email === currentUser?.email
      );
      if (!me) { setError("Không tìm thấy hồ sơ đối tác của bạn."); setLoading(false); return; }

      const rawValue      = Number(form.value.replace(/\D/g, ""));
      const commission    = Math.round(rawValue * 0.1); // 10% mặc định
      const maxId         = await getMaxId("customerContracts");
      const code          = `HDKH${String(maxId + 1).padStart(6, "0")}`;

      const [sy, sm, sd]  = form.signDate.split("-");
      const [ey, em, ed]  = form.expireDate.split("-");
      const signDateFmt   = `${sd}/${sm}/${sy}`;
      const expireDateFmt = `${ed}/${em}/${ey}`;

      const newContract = {
        id:              String(maxId + 1),
        code,
        partnerId:       me.id,
        partnerCode:     `DT${me.code}`,
        partnerName:     me.name,
        customerName:    form.customerName,
        customerTax:     form.customerTax,
        customerPhone:   form.customerPhone,
        customerAddress: form.customerAddress,
        signDate:        signDateFmt,
        expireDate:      expireDateFmt,
        value:           rawValue,
        commission,
        status:          "pending",
        contractFile:    file.name,
        rejectReason:    null,
        rejectDetail:    null,
        createdAt:       getNow(),
      };

      await api.post("/customerContracts", newContract);

      // Thông báo cho admin
      const maxNotiId = await getMaxId("notifications");
      await api.post("/notifications", {
        id:          String(maxNotiId + 1),
        type:        "new_customer_contract",
        title:       "Hợp đồng khách hàng mới chờ duyệt",
        message:     `${me.name} vừa tạo hợp đồng ${code} với ${form.customerName}.`,
        partnerId:   me.id,
        partnerName: me.name,
        read:        false,
        createdAt:   getNow(),
      });

      navigate("/hop-dong-khach-hang");
    } catch (err) {
      console.error(err);
      setError("Tạo hợp đồng thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cc-page">
      <div className="page-header">
        <div className="page-header-left">
          <button className="cc-btn-back-nav" onClick={() => navigate(-1)}>← Quay lại</button>
          <h1 style={{ marginTop: 8 }}>Tạo hợp đồng khách hàng</h1>
          <p>Điền thông tin hợp đồng và tải lên file để gửi admin duyệt</p>
        </div>
      </div>

      {error && <div className="cc-banner-err">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="cc-create-body">

          {/* ── Cột trái: thông tin ── */}
          <div className="cc-create-card">
            <h3 className="cc-section-title">Thông tin khách hàng</h3>

            <div className="cc-form-grid">
              <div className="cc-field cc-field--full">
                <label>Tên khách hàng / Công ty <span className="cc-req">*</span></label>
                <input name="customerName" placeholder="VD: Công ty TNHH ABC" value={form.customerName} onChange={onChange} />
              </div>
              <div className="cc-field">
                <label>Mã số thuế <span className="cc-req">*</span></label>
                <input name="customerTax" placeholder="012345678901" value={form.customerTax} onChange={onChange} />
              </div>
              <div className="cc-field">
                <label>Số điện thoại <span className="cc-req">*</span></label>
                <input name="customerPhone" type="tel" placeholder="0123456789" value={form.customerPhone} onChange={onChange} />
              </div>
              <div className="cc-field cc-field--full">
                <label>Địa chỉ</label>
                <input name="customerAddress" placeholder="Địa chỉ khách hàng" value={form.customerAddress} onChange={onChange} />
              </div>
            </div>

            <h3 className="cc-section-title" style={{ marginTop: 24 }}>Thông tin hợp đồng</h3>

            <div className="cc-form-grid">
              <div className="cc-field">
                <label>Ngày ký <span className="cc-req">*</span></label>
                <input name="signDate" type="date" value={form.signDate} onChange={onChange} />
              </div>
              <div className="cc-field">
                <label>Ngày hết hạn <span className="cc-req">*</span></label>
                <input name="expireDate" type="date" value={form.expireDate} onChange={onChange} />
              </div>
              <div className="cc-field cc-field--full">
                <label>Giá trị hợp đồng (VNĐ) <span className="cc-req">*</span></label>
                <input
                  name="value"
                  placeholder="VD: 50000000"
                  value={form.value}
                  onChange={(e) => {
                    // Chỉ nhận số
                    const raw = e.target.value.replace(/\D/g, "");
                    setForm((p) => ({ ...p, value: raw }));
                  }}
                />
                {form.value && (
                  <p className="cc-field-hint">= {fmt(Number(form.value))} đ</p>
                )}
              </div>
            </div>

            <button className="cc-btn-submit" type="submit" disabled={loading}>
              {loading ? "Đang gửi..." : "✓ Gửi yêu cầu duyệt"}
            </button>
          </div>

          {/* ── Cột phải: upload ── */}
          <div className="cc-create-side">
            <h3 className="cc-section-title">File hợp đồng <span className="cc-req">*</span></h3>
            <p className="cc-upload-desc">Tải lên file hợp đồng đã ký và đóng dấu đầy đủ</p>

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div
              className={`cc-upload-box ${file ? "cc-upload-box--filled" : ""}`}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <>
                  <span style={{ fontSize: 32 }}>📄</span>
                  <div>
                    <p className="cc-upload-filename">{file.name}</p>
                    <p className="cc-upload-sub">Click để đổi file</p>
                  </div>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 32, color: "#94a3b8" }}>⬆</span>
                  <div>
                    <p className="cc-upload-text">Click để tải lên hợp đồng</p>
                    <p className="cc-upload-sub">.pdf · .doc · .docx</p>
                  </div>
                </>
              )}
            </div>

            <div className="cc-note-box">
              <p className="cc-note-title">📋 Lưu ý</p>
              <ul className="cc-note-list">
                <li>File hợp đồng phải có chữ ký và đóng dấu của cả 2 bên.</li>
                <li>Định dạng hợp lệ: .pdf, .doc, .docx</li>
                <li>Sau khi gửi, admin sẽ xem xét và phản hồi trong 1-3 ngày làm việc.</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Customercontractcreate;