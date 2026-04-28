/**
 * src/pages/admin/Customercontractcreate.jsx
 *
 * Đối tác tạo HĐ khách hàng mới → admin duyệt.
 * Phase 2: chọn khách hàng từ collection /customers thay vì nhập tay
 *          (vẫn snapshot tên/SĐT/địa chỉ vào contract để các list cũ chạy được).
 */

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../store/api";
import customerService from "../../store/customerService";
import partnerService from "../../store/Partnerservice";
import useAuthStore from "../../store/authStore";
import "./Customercontractpage.css";

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

  const [me,        setMe       ] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [bootError, setBootError] = useState("");

  const [form, setForm] = useState({
    customerId: "",
    signDate:   "",
    expireDate: "",
    value:      "",
  });
  const [file,    setFile   ] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState("");

  /* ── Load partner của user + danh sách KH của họ ── */
  useEffect(() => {
    const boot = async () => {
      if (!currentUser) return;
      try {
        const [pRes, cRes] = await Promise.all([
          partnerService.getAll(),
          customerService.getByUserId(String(currentUser.id)),
        ]);
        const pList = Array.isArray(pRes.data) ? pRes.data : [];
        const found = pList.find(
          (p) => p.userId === String(currentUser.id) || p.email === currentUser.email
        );
        if (!found) {
          setBootError("Không tìm thấy hồ sơ đối tác của bạn. Vui lòng liên hệ admin.");
          return;
        }
        setMe(found);
        setCustomers(Array.isArray(cRes.data) ? cRes.data : []);
      } catch (e) {
        console.error(e);
        setBootError("Không thể tải dữ liệu khởi tạo.");
      }
    };
    boot();
  }, [currentUser]);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.customerId)  return "Vui lòng chọn khách hàng. Nếu chưa có, hãy tạo trước ở mục Khách hàng.";
    if (!form.signDate)    return "Vui lòng chọn ngày ký.";
    if (!form.expireDate)  return "Vui lòng chọn ngày hết hạn.";
    if (!form.value)       return "Vui lòng nhập giá trị hợp đồng.";
    if (!file)             return "Vui lòng tải lên file hợp đồng.";
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(""); setLoading(true);

    try {
      const customer = customers.find((c) => String(c.id) === String(form.customerId));
      if (!customer) { setError("Khách hàng không hợp lệ."); setLoading(false); return; }

      const rawValue   = Number(String(form.value).replace(/\D/g, ""));
      const commission = Math.round(rawValue * 0.1); // 10% personal mặc định, admin có thể chỉnh sau
      const maxId      = await getMaxId("customerContracts");
      const code       = `HDKH${String(maxId + 1).padStart(6, "0")}`;

      const [sy, sm, sd] = form.signDate.split("-");
      const [ey, em, ed] = form.expireDate.split("-");
      const signDateFmt   = `${sd}/${sm}/${sy}`;
      const expireDateFmt = `${ed}/${em}/${ey}`;

      const newContract = {
        id:              String(maxId + 1),
        code,
        partnerId:       me.id,
        partnerCode:     `DT${me.code}`,
        partnerName:     me.name,
        // Reference + snapshot khách hàng
        customerId:      String(customer.id),
        customerName:    customer.name,
        customerTax:     customer.tax || "",
        customerPhone:   customer.phone || "",
        customerAddress: customer.address || "",
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

      // Notification cho admin
      const maxNotiId = await getMaxId("notifications");
      await api.post("/notifications", {
        id:          String(maxNotiId + 1),
        type:        "new_customer_contract",
        title:       "Hợp đồng khách hàng mới chờ duyệt",
        message:     `${me.name} vừa tạo hợp đồng ${code} với ${customer.name}.`,
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

  if (bootError) {
    return (
      <div className="cc-page">
        <div className="cc-error" style={{ marginTop: 24 }}>
          ⚠️ {bootError}
        </div>
      </div>
    );
  }

  const selectedCustomer = customers.find((c) => String(c.id) === String(form.customerId));

  return (
    <div className="cc-page">
      <div className="page-header">
        <div className="page-header-left">
          <button className="cc-btn-back-nav" onClick={() => navigate(-1)}>← Quay lại</button>
          <h1 style={{ marginTop: 8 }}>Tạo hợp đồng khách hàng</h1>
          <p>Chọn khách hàng có sẵn và tải lên file hợp đồng để gửi admin duyệt</p>
        </div>
      </div>

      {error && <div className="cc-banner-err">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="cc-create-body">

          {/* ── Cột trái: thông tin ── */}
          <div className="cc-create-card">
            <h3 className="cc-section-title">Khách hàng</h3>

            {customers.length === 0 ? (
              <div className="cc-empty" style={{ padding: 16, background: "#fff7ed", color: "#9a3412", border: "1px dashed #fed7aa", borderRadius: 8 }}>
                Bạn chưa có khách hàng nào. <Link to="/khach-hang" className="cc-link">Thêm khách hàng tại đây</Link> rồi quay lại tạo hợp đồng.
              </div>
            ) : (
              <div className="cc-form-grid">
                <div className="cc-field cc-field--full">
                  <label>Chọn khách hàng <span className="cc-req">*</span></label>
                  <select className="cc-modal-select" name="customerId" value={form.customerId} onChange={onChange}>
                    <option value="">— Chọn khách hàng —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `· ${c.phone}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="cc-field-hint">
                    Chưa có trong danh sách? <Link to="/khach-hang" className="cc-link">Thêm khách hàng mới</Link>
                  </p>
                </div>

                {selectedCustomer && (
                  <div className="cc-field cc-field--full" style={{
                    background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 8, padding: 12, fontSize: 13, color: "#475569",
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px",
                  }}>
                    <div>📞 {selectedCustomer.phone || "—"}</div>
                    <div>✉️ {selectedCustomer.email || "—"}</div>
                    <div style={{ gridColumn: "1 / -1" }}>📍 {selectedCustomer.address || "—"}</div>
                  </div>
                )}
              </div>
            )}

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
