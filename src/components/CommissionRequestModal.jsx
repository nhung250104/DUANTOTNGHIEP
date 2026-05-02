/**
 * src/components/CommissionRequestModal.jsx
 *
 * Modal "Yêu cầu kiểm tra hoa hồng" — dùng chung Partnercontractpage và
 * Mycommissionpage. Lưu vào /commissionRequests + notify admin.
 */

import { useState } from "react";
import api from "../store/api";
import "../pages/user/pages/PartnerContractPage.css";

const getNow = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const getMaxId = async (collection) => {
  try {
    const res = await api.get(`/${collection}`);
    const list = Array.isArray(res.data) ? res.data : [];
    const ids = list.map((x) => Number(x.id)).filter((n) => !isNaN(n));
    return ids.length > 0 ? Math.max(...ids) : 0;
  } catch { return 0; }
};

export const ERROR_TYPES = [
  { value: "missing",      label: "Thiếu hoa hồng" },
  { value: "wrong_amount", label: "Sai số tiền" },
  { value: "wrong_source", label: "Sai nguồn commission" },
  { value: "wrong_upline", label: "Sai tuyến trên" },
  { value: "other",        label: "Khác" },
];

const fmtBytes = (n) =>
  n < 1024 ? `${n} B`
  : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB`
  : `${(n / 1024 / 1024).toFixed(1)} MB`;

function CommissionRequestModal({ partner, defaultContractCode = "", onClose, onSubmitted }) {
  const [form, setForm] = useState({
    errorType:           "",
    description:         "",
    relatedContractCode: defaultContractCode,
  });
  const [files,   setFiles  ] = useState([]);
  const [err,     setErr    ] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onPickFiles = async (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    const picked = await Promise.all(list.map((f) => new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve({ name: f.name, dataUrl: r.result, size: f.size });
      r.readAsDataURL(f);
    })));
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  };

  const removeFile = (idx) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!form.errorType)              return setErr("Vui lòng chọn loại lỗi.");
    if (!form.description.trim())     return setErr("Vui lòng mô tả chi tiết tình huống.");
    if (form.description.trim().length < 10) return setErr("Mô tả quá ngắn — vui lòng nêu rõ vấn đề.");
    setErr("");
    setLoading(true);
    try {
      const maxId    = await getMaxId("commissionRequests");
      const errLabel = ERROR_TYPES.find((t) => t.value === form.errorType)?.label || form.errorType;

      const newRequest = {
        id:                  String(maxId + 1),
        partnerId:           String(partner.id),
        partnerCode:         `${String(partner.code || partner.id).padStart(6, "0")}`,
        partnerName:         partner.name,
        errorType:           form.errorType,
        errorTypeLabel:      errLabel,
        description:         form.description.trim(),
        evidenceFiles:       files.map((f) => ({ name: f.name, dataUrl: f.dataUrl, size: f.size })),
        relatedContractCode: form.relatedContractCode.trim() || null,
        adjustmentAmount:    null,
        adminNote:           null,
        currentL1: null, currentL2: null, currentL3: null,
        requestedL1: null, requestedL2: null, requestedL3: null,
        requestDetail: form.description.trim(),
        status:       "pending",
        createdAt:    getNow(),
        processedAt:  null,
        rejectReason: null,
      };
      await api.post("/commissionRequests", newRequest);

      try {
        const maxNotiId = await getMaxId("notifications");
        await api.post("/notifications", {
          id:          String(maxNotiId + 1),
          type:        "commission_request",
          title:       "Yêu cầu kiểm tra hoa hồng",
          message:     `${partner.name} báo lỗi: ${errLabel}.`,
          partnerId:   String(partner.id),
          partnerName: partner.name,
          read:        false,
          createdAt:   getNow(),
        });
      } catch { /* không chặn flow */ }

      onSubmitted();
    } catch (e) {
      console.error(e);
      setErr("Gửi yêu cầu thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pcp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pcp-modal" style={{ maxWidth: 600 }}>
        <div className="pcp-modal-header">
          <span className="pcp-modal-icon">⚠️</span>
          <div>
            <h3 className="pcp-modal-title">Yêu cầu kiểm tra hoa hồng</h3>
            <p className="pcp-modal-sub">Báo lỗi cụ thể để admin xem xét và điều chỉnh</p>
          </div>
        </div>

        <div className="pcp-modal-body">
          {err && <p className="pcp-modal-err">{err}</p>}

          <label className="pcp-modal-label">Loại lỗi <span style={{ color: "#e53e3e" }}>*</span></label>
          <select
            className="pcp-modal-input"
            name="errorType"
            value={form.errorType}
            onChange={onChange}
            style={{ maxWidth: "none", width: "100%", boxSizing: "border-box" }}
          >
            <option value="">— Chọn loại lỗi —</option>
            {ERROR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <label className="pcp-modal-label" style={{ marginTop: 14 }}>
            Mã HĐ liên quan <span style={{ color: "#94a3b8", fontWeight: 400 }}>(tuỳ chọn)</span>
          </label>
          <input
            className="pcp-modal-input"
            style={{ maxWidth: "none", width: "100%", boxSizing: "border-box" }}
            name="relatedContractCode"
            value={form.relatedContractCode}
            onChange={onChange}
            placeholder="VD: HDKH000001"
          />

          <label className="pcp-modal-label" style={{ marginTop: 14 }}>
            Mô tả chi tiết <span style={{ color: "#e53e3e" }}>*</span>
          </label>
          <textarea
            className="pcp-modal-textarea"
            placeholder='VD: "Tôi ký hợp đồng 100 triệu nhưng chỉ nhận 5 triệu thay vì 10 triệu (10%)..."'
            rows={4}
            name="description"
            value={form.description}
            onChange={onChange}
          />

          <label className="pcp-modal-label" style={{ marginTop: 14 }}>
            File minh chứng <span style={{ color: "#94a3b8", fontWeight: 400 }}>(hợp đồng, ảnh, tài liệu liên quan)</span>
          </label>
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xlsx"
            onChange={onPickFiles}
            style={{ fontSize: 13, display: "block", padding: "6px 0" }}
          />
          {files.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {files.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 10px", borderRadius: 6,
                  background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12,
                }}>
                  <span>📎</span>
                  <span style={{ flex: 1, color: "#334155" }}>{f.name}</span>
                  <span style={{ color: "#94a3b8" }}>{fmtBytes(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer" }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pcp-modal-footer">
          <button className="pcp-modal-btn-cancel" onClick={onClose} disabled={loading}>✕ Hủy</button>
          <button className="pcp-modal-btn-send" onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang gửi..." : "✓ Gửi yêu cầu kiểm tra"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommissionRequestModal;
