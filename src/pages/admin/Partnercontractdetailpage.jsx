/**
 * src/pages/admin/Partnercontractdetailpage.jsx
 *
 * Trang chi tiết hợp đồng đối tác — theo spec hợp đồng đối tác:
 *   I.   Thông tin hợp đồng (mã, loại, hạng, ngày ký, hiệu lực)
 *   II.  Hai bên ký kết (Bên A — công ty / Bên B — đối tác)
 *   III. Chính sách áp dụng (rates l1/l2/l3 + quyền build team + ví dụ)
 *   IV.  File hợp đồng (xem PDF + upload mới — admin only)
 *   V.   Lịch sử hợp đồng (mọi hợp đồng cùng đối tác)
 *
 * Status spec: PENDING / APPROVED / ACTIVE / EXPIRED / REJECTED.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../store/api";
import useAuthStore from "../../store/authStore";
import {
  getContractsForPartner, CONTRACT_STATUS, commissionExamples,
} from "../../store/partnerContractService";
import PartnerContractPDFModal from "./Partnercontractpdfmodal";
import BackButton from "../../components/BackButton";
import "./PartnerContractPage.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n || 0) + " đ";
const getInitials = (name = "") =>
  name.trim().split(" ").filter(Boolean).slice(-2).map((w) => w[0].toUpperCase()).join("");

/* ─── Sub-components ────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = CONTRACT_STATUS[status] || CONTRACT_STATUS.PENDING;
  return (
    <span style={{
      display: "inline-block",
      padding: "5px 14px", borderRadius: 999,
      fontSize: 12, fontWeight: 700,
      background: cfg.color + "1A",
      color: cfg.color,
      border: `1.5px solid ${cfg.color}66`,
    }}>{cfg.label}</span>
  );
}

function Field({ label, value, mono, highlight }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 11, color: "#64748b", margin: 0, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </p>
      <p style={{
        fontSize: 14, margin: "2px 0 0",
        fontWeight: highlight ? 700 : 500,
        color: highlight ? "#0d9488" : "#0f172a",
        fontFamily: mono ? "monospace" : "inherit",
      }}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function CommCard({ label, value, highlight }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: highlight ? "#f0fdfa" : "#f8fafc",
      border: `1px solid ${highlight ? "#99f6e4" : "#e2e8f0"}`,
      flex: 1, minWidth: 160,
    }}>
      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{label}</p>
      <p style={{
        fontSize: 28, fontWeight: 800, margin: "4px 0 0",
        color: highlight ? "#0d9488" : "#0f172a",
      }}>
        {value}<span style={{ fontSize: 16, color: "#64748b" }}>%</span>
      </p>
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
  const isAdmin     = currentUser?.role?.toLowerCase() === "admin";
  const fileRef     = useRef();

  const [partner,         setPartner       ] = useState(null);
  const [allUpgradeReqs,  setAllUpgradeReqs] = useState([]);
  const [contract,        setContract      ] = useState(null);
  const [allContracts,    setAllContracts  ] = useState([]);
  const [loading,         setLoading       ] = useState(true);
  const [error,           setError         ] = useState("");
  const [showPDF,         setShowPDF       ] = useState(false);
  const [uploading,       setUploading     ] = useState(false);

  /* ── Fetch ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); setError("");

        // Resolve partner từ URL
        let p = null;
        if (source === "partner") {
          p = (await api.get(`/partners/${id}`)).data;
        } else if (source === "upgrade") {
          const up = (await api.get(`/upgradeRequests/${id}`)).data;
          if (up?.partnerId) p = (await api.get(`/partners/${up.partnerId}`)).data;
        }
        if (!p) { setError("Không tìm thấy hồ sơ đối tác."); return; }

        // Toàn bộ upgradeRequests của partner — để dựng lịch sử + status
        const upgRes = await api.get(`/upgradeRequests?partnerId=${p.id}`);
        const upgs   = Array.isArray(upgRes.data) ? upgRes.data : [];

        const contracts = getContractsForPartner(p, upgs);
        const targetId  = source === "partner" ? `partner-${id}` : `upgrade-${id}`;
        const c = contracts.find((x) => x.id === targetId) || contracts[0];
        if (!c) { setError("Không tìm thấy hợp đồng."); return; }

        setPartner(p);
        setAllUpgradeReqs(upgs);
        setAllContracts(contracts);
        setContract(c);
      } catch (err) {
        console.error(err);
        setError("Không tải được dữ liệu hợp đồng.");
      } finally {
        setLoading(false);
      }
    };
    if (id && source) fetchData();
  }, [id, source]);

  /* ── Derived ── */
  const isIndependent = (partner?.memberType || "").toUpperCase() === "INDEPENDENT";
  const examples      = useMemo(() => commissionExamples(contract?.rates), [contract?.rates]);

  // Theo loại hợp đồng
  const isUpgrade        = contract?.source === "upgrade";
  const upgradeReq       = contract?.rawUpgrade;       // chỉ có khi isUpgrade
  // Rates của hạng cũ (trước khi nâng) — để hiển thị so sánh
  const RANK_RATES_REF = {
    "Member":         { l1: 20, l2: 10, l3: 3  },
    "Leader":         { l1: 25, l2: 12, l3: 5  },
    "Partner":        { l1: 30, l2: 15, l3: 7  },
    "Senior Partner": { l1: 35, l2: 18, l3: 10 },
  };
  const oldRates = upgradeReq?.currentRank ? RANK_RATES_REF[upgradeReq.currentRank] : null;

  /* ── Upload mới (admin) ── */
  const handleUpload = async (e) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file || !partner) return;
    setUploading(true);
    try {
      if (source === "partner") {
        await api.patch(`/partners/${partner.id}`, { contractFile: file.name });
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
  if (error || !contract || !partner) return (
    <div className="pc-error-wrap">
      <p>⚠️ {error || "Không tìm thấy hợp đồng."}</p>
      <BackButton />
    </div>
  );

  const sectionStyle = {
    background: "#fff", border: "1px solid #e2e8f0",
    borderRadius: 14, padding: 20, marginBottom: 16,
  };
  const sectionTitleStyle = {
    fontSize: 13, fontWeight: 700, color: "#0d9488",
    textTransform: "uppercase", letterSpacing: 0.6,
    margin: "0 0 14px", paddingBottom: 8, borderBottom: "1px solid #e2e8f0",
  };

  return (
    <div className="pc-page">

      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <BackButton />
          <h1 style={{ marginTop: 8 }}>Chi tiết hợp đồng đối tác</h1>
          <p>Mã: <strong style={{ color: "#0d9488" }}>{contract.code}</strong></p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          {contract.contractFile && (
            <button
              onClick={() => setShowPDF(true)}
              style={{
                padding: "8px 14px", borderRadius: 8,
                background: "#0d9488", color: "#fff",
                border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              👁 Xem PDF
            </button>
          )}
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="pc-hero">
        <div className="pc-hero-left">
          <div className="pc-hero-avatar">{getInitials(partner.name)}</div>
          <div>
            <p className="pc-hero-name">{partner.name}</p>
            <p className="pc-hero-code">#{contract.partnerCode || partner.code}</p>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{
                padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: "#fef3c7", color: "#92400e",
              }}>Hạng {contract.rank}</span>
              {!isIndependent && partner.level != null && (
                <span style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: "#e0f2fe", color: "#075985",
                }}>Cấp {partner.level} {partner.level === 0 ? "(ROOT)" : ""}</span>
              )}
              {isIndependent && (
                <span style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: "#f1f5f9", color: "#64748b",
                }}>Tự do (ngoài cây)</span>
              )}
            </div>
          </div>
        </div>
        <div className="pc-hero-right">
          <div style={{ marginBottom: 10 }}><StatusBadge status={contract.status} /></div>
          <p className="pc-hero-date-label">Ngày ký</p>
          <p className="pc-hero-date-value">{contract.signDate || "—"}</p>
        </div>
      </div>

      {/* ── I. Thông tin hợp đồng ── */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>I. Thông tin hợp đồng</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <Field label="Mã hợp đồng"   value={contract.code} mono highlight />
          <Field label="Loại hợp đồng" value={contract.contractType} highlight />
          <Field label="Hạng áp dụng"  value={contract.rank} highlight />

          {isUpgrade ? (
            <>
              <Field label="Hạng trước"   value={upgradeReq?.currentRank || "—"} />
              <Field label="Hạng sau"     value={upgradeReq?.newRank || contract.rank} highlight />
              <Field label="Ngày yêu cầu" value={upgradeReq?.submittedAt || "—"} />
              <Field label="Ngày duyệt"   value={upgradeReq?.approvedAt || (upgradeReq?.status === "rejected" ? upgradeReq?.rejectedAt : "—")} />
              <Field label="Ngày hiệu lực" value={upgradeReq?.approvedAt || "—"} />
              <Field label="Ngày kết thúc" value="Không thời hạn" />
            </>
          ) : (
            <>
              <Field label="Ngày ký"       value={contract.signDate} />
              <Field label="Ngày hiệu lực" value={contract.signDate} />
              <Field label="Ngày kết thúc" value="Không thời hạn" />
            </>
          )}
        </div>
        <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8, background: "#f8fafc", fontSize: 12, color: "#64748b" }}>
          💡 <strong>Spec:</strong> Hợp đồng này quyết định <strong>tỉ lệ hoa hồng + quyền build team</strong> của đối tác.
          Khi nâng hạng, hợp đồng cũ sẽ chuyển sang <em>Hết hiệu lực</em> và hợp đồng mới <em>Đang hiệu lực</em>.
        </div>
      </div>

      {/* ── II. Hai bên ký kết ── */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>II. Hai bên ký kết</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#f8fafc", padding: 16, borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: 11, color: "#0d9488", fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase" }}>
              Bên A — Công ty
            </p>
            <Field label="Tên công ty"  value="CÔNG TY CP PHẦN MỀM SIVIP" />
            <Field label="Địa chỉ"      value="126 Phan Châu Trinh, Hải Châu, Đà Nẵng" />
            <Field label="Điện thoại"   value="0945 367 403" />
            <Field label="Email"        value="info@sivip.vn" />
            <Field label="MST"          value="0401234567" />
          </div>
          <div style={{ background: "#f0fdfa", padding: 16, borderRadius: 10, border: "1px solid #99f6e4" }}>
            <p style={{ fontSize: 11, color: "#0d9488", fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase" }}>
              Bên B — Đối tác
            </p>
            <Field label="Họ và tên" value={partner.name} highlight />
            <Field label="Mã đối tác" value={contract.partnerCode || partner.code} mono />
            <Field label="CCCD"      value={partner.cccd} />
            <Field label="Điện thoại" value={partner.phone} />
            <Field label="Email"     value={partner.email} />
            <Field label="Địa chỉ"   value={partner.address} />
          </div>
        </div>
      </div>

      {/* ── III. Chính sách áp dụng ── */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>III. Chính sách áp dụng</h3>
        {!isIndependent ? (
          <>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px" }}>
              Tỉ lệ hoa hồng theo <strong>Hạng {contract.rank}</strong>:
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <CommCard label="Cấp 1 — HĐ tự ký"   value={contract.rates.l1} highlight />
              <CommCard label="Cấp 2 — F1 ký"      value={contract.rates.l2} />
              <CommCard label="Cấp 3 — F2 ký"      value={contract.rates.l3} />
            </div>

            {/* Ví dụ tính hoa hồng */}
            <div style={{
              marginTop: 16, padding: "14px 18px", borderRadius: 10,
              background: "#f0fdfa", border: "1px solid #99f6e4",
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", margin: "0 0 10px" }}>
                💡 Ví dụ tính hoa hồng (giả sử mỗi HĐ KH trị giá <strong>10.000.000 đ</strong>)
              </p>
              <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#334155" }}>
                {examples.map((ex, i) => (
                  <div key={i} style={{ paddingLeft: 10, borderLeft: "3px solid #0d9488" }}>
                    <div style={{ fontWeight: 600 }}>{ex.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Công thức: {ex.formula}</div>
                    <div style={{ fontSize: 14, color: "#0f766e", fontWeight: 700 }}>→ {ex.example}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#64748b", margin: "12px 0 0", fontStyle: "italic" }}>
                Hoa hồng chỉ tính trên các HĐ KH có status = approved.
                F1 = con trực tiếp, F2 = cháu trong cây.
              </p>
            </div>

            {/* Quyền build team */}
            <div style={{
              marginTop: 12, padding: "12px 14px", borderRadius: 8,
              background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 13, color: "#1e40af",
            }}>
              ✅ <strong>Quyền build team:</strong> CÓ — đối tác được phát triển tuyến dưới (F1/F2/F3).
            </div>
          </>
        ) : (
          <div style={{
            padding: "14px 16px", borderRadius: 10,
            background: "#fef3c7", border: "1px solid #fde68a",
            color: "#92400e", fontSize: 13, lineHeight: 1.6,
          }}>
            💡 Đối tác này là <strong>Tự do riêng lẻ (INDEPENDENT)</strong>:
            <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
              <li>Chỉ hưởng hoa hồng cá nhân theo từng HĐ KH đã ký.</li>
              <li>Không thuộc cây phân cấp → không có F1/F2/F3.</li>
              <li>Không có quyền build team.</li>
            </ul>
          </div>
        )}

        <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 13, color: "#475569" }}>
          <Field label="Tổng hoa hồng đã nhận" value={fmt(partner.commission || 0)} highlight />
        </div>
      </div>

      {/* ── IV-A. (HĐ NÂNG HẠNG) Thông tin nâng hạng ── */}
      {isUpgrade && upgradeReq && (
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>IV. Thông tin nâng hạng</h3>

          {/* So sánh tỉ lệ hoa hồng cũ ↔ mới */}
          {oldRates && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "#475569", margin: "0 0 8px" }}>
                <strong>So sánh tỉ lệ hoa hồng:</strong>
              </p>
              <div style={{ overflow: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", color: "#475569" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Cấp</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                        Hạng cũ ({upgradeReq.currentRank})
                      </th>
                      <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                        Hạng mới ({upgradeReq.newRank})
                      </th>
                      <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>Tăng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "l1", label: "Cấp 1 — HĐ cá nhân" },
                      { key: "l2", label: "Cấp 2 — HĐ F1 ký" },
                      { key: "l3", label: "Cấp 3 — HĐ F2 ký" },
                    ].map((r) => {
                      const oldV = oldRates[r.key];
                      const newV = contract.rates[r.key];
                      const diff = newV - oldV;
                      return (
                        <tr key={r.key} style={{ borderTop: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "10px 12px", color: "#334155" }}>{r.label}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8" }}>{oldV}%</td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "#0f766e", fontWeight: 700 }}>{newV}%</td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: diff > 0 ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>
                            {diff > 0 ? `+${diff}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lý do nâng hạng */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>
              Lý do đối tác đề xuất
            </p>
            <div style={{
              padding: "12px 14px", borderRadius: 8,
              background: "#fffbeb", border: "1px solid #fde68a",
              fontSize: 13, color: "#78350f", lineHeight: 1.6,
            }}>
              {upgradeReq.reason || "(không có)"}
            </div>
          </div>

          {/* Quy trình duyệt */}
          <div style={{
            padding: "12px 14px", borderRadius: 8,
            background: "#f8fafc", border: "1px solid #e2e8f0",
          }}>
            <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
              Quy trình duyệt
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, fontSize: 13 }}>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Đối tác gửi yêu cầu</div>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>{upgradeReq.submittedAt || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {upgradeReq.status === "rejected" ? "Bị từ chối" : "Admin duyệt"}
                </div>
                <div style={{
                  fontWeight: 600,
                  color: upgradeReq.status === "approved" ? "#16a34a"
                       : upgradeReq.status === "rejected" ? "#dc2626"
                       : "#f59e0b",
                }}>
                  {upgradeReq.approvedAt || upgradeReq.rejectedAt || "Đang chờ"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Trạng thái hiện tại</div>
                <div><StatusBadge status={contract.status} /></div>
              </div>
            </div>
            {upgradeReq.status === "rejected" && upgradeReq.rejectReason && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "#fee2e2", borderRadius: 6, fontSize: 12, color: "#991b1b" }}>
                <strong>Lý do từ chối:</strong> {upgradeReq.rejectReason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── IV-B. (HĐ ĐĂNG KÝ) Quyền lợi & cam kết đối tác mới ── */}
      {!isUpgrade && (
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>IV. Quyền lợi & cam kết đối tác</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Quyền lợi */}
            <div style={{
              padding: 14, borderRadius: 10,
              background: "#f0fdfa", border: "1px solid #99f6e4",
            }}>
              <p style={{ fontSize: 12, color: "#0d9488", fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase" }}>
                Quyền lợi của Bên B
              </p>
              <ul style={{ margin: "0 0 0 18px", padding: 0, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                <li>Hưởng tỉ lệ hoa hồng theo Hạng <strong>{contract.rank}</strong> (xem mục III).</li>
                <li>Được cấp link giới thiệu riêng:{" "}
                  <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>
                    {partner.refLink || `sivip.vn/ref/${partner.code}`}
                  </code>
                </li>
                <li>Hưởng hoa hồng F1/F2 nếu thuộc cây phân cấp.</li>
                <li>Được hỗ trợ đào tạo, tài liệu sản phẩm, công cụ bán hàng.</li>
                <li>Có quyền yêu cầu chỉnh sửa hoa hồng nếu phát hiện sai sót.</li>
              </ul>
            </div>

            {/* Cam kết Bên B */}
            <div style={{
              padding: 14, borderRadius: 10,
              background: "#fffbeb", border: "1px solid #fde68a",
            }}>
              <p style={{ fontSize: 12, color: "#92400e", fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase" }}>
                Cam kết của Bên B
              </p>
              <ul style={{ margin: "0 0 0 18px", padding: 0, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                <li>Thông tin và giấy tờ cung cấp là chính xác và hợp pháp.</li>
                <li>Tuân thủ các điều khoản hợp đồng và pháp luật hiện hành.</li>
                <li>Bảo mật thông tin khách hàng và tài liệu nội bộ.</li>
                <li>Báo cáo hợp đồng khách hàng đúng và đủ qua hệ thống.</li>
                <li>Cập nhật hồ sơ cá nhân khi có thay đổi.</li>
              </ul>
            </div>
          </div>

          {/* Điều khoản hợp đồng đầy đủ */}
          <div style={{ marginTop: 16, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
            <p style={{ fontWeight: 700, color: "#0f172a", margin: "10px 0 4px" }}>Điều 1. Mục đích hợp tác</p>
            <p style={{ margin: 0 }}>
              Hai bên hợp tác trên cơ sở tự nguyện, cùng có lợi để phát triển mạng lưới phân phối sản phẩm/dịch vụ
              của Bên A. Bên B đóng vai trò là <strong>đối tác kinh doanh</strong> được cấp mã định danh và link giới thiệu.
            </p>

            <p style={{ fontWeight: 700, color: "#0f172a", margin: "12px 0 4px" }}>Điều 2. Phương thức thanh toán hoa hồng</p>
            <p style={{ margin: 0 }}>
              Hoa hồng được tính trên các HĐ KH có status <strong>approved</strong>, thanh toán định kỳ hàng tháng
              vào tài khoản ngân hàng đối tác đã đăng ký.
            </p>

            <p style={{ fontWeight: 700, color: "#0f172a", margin: "12px 0 4px" }}>Điều 3. Thời hạn & chấm dứt hợp đồng</p>
            <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
              <li>Hiệu lực kể từ ngày ký <strong>{contract.signDate || "—"}</strong> đến khi một trong hai bên có thông báo chấm dứt.</li>
              <li>Bên A có quyền chấm dứt hợp đồng nếu Bên B vi phạm nghĩa vụ.</li>
              <li>Bên B có quyền chấm dứt hợp đồng bằng văn bản, báo trước 15 ngày.</li>
            </ul>

            <p style={{ fontWeight: 700, color: "#0f172a", margin: "12px 0 4px" }}>Điều 4. Điều kiện nâng hạng</p>
            <p style={{ margin: 0 }}>
              Đối tác có thể yêu cầu nâng hạng (Member → Leader → Partner → Senior Partner) khi đạt đủ KPI:
              số F1 trực tiếp, số HĐ KH đã duyệt, doanh thu — chi tiết tại trang yêu cầu nâng hạng.
            </p>
          </div>
        </div>
      )}

      {/* ── V. File hợp đồng ── */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>V. File hợp đồng</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {contract.contractFile ? (
            <div
              onClick={() => setShowPDF(true)}
              style={{
                flex: 1, minWidth: 280,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", borderRadius: 10,
                background: "#f8fafc", border: "1px solid #e2e8f0",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 26 }}>📄</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: "#0f172a" }}>{contract.contractFile}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Click để xem · 2.4 MB</p>
                </div>
              </div>
              <button
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: "6px 12px", borderRadius: 6,
                  background: "#0d9488", color: "#fff",
                  border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                ⬇ Tải xuống
              </button>
            </div>
          ) : (
            <div style={{
              flex: 1, minWidth: 280,
              padding: "14px 16px", borderRadius: 10,
              background: "#fef3c7", border: "1px solid #fde68a",
              color: "#92400e", fontSize: 13,
            }}>
              ⚠️ Chưa có file hợp đồng nào được tải lên.
            </div>
          )}

          {isAdmin && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: "none" }}
                onChange={handleUpload}
              />
              <div
                onClick={() => !uploading && fileRef.current?.click()}
                style={{
                  flex: 1, minWidth: 280,
                  padding: "14px 16px", borderRadius: 10,
                  background: "#fff", border: "2px dashed #99f6e4",
                  textAlign: "center", cursor: uploading ? "wait" : "pointer",
                }}
              >
                <span style={{ fontSize: 24 }}>⬆</span>
                <p style={{ margin: "4px 0 0", fontWeight: 600, color: "#0d9488", fontSize: 13 }}>
                  {uploading ? "Đang tải lên..." : "Tải lên file mới"}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>.pdf, .doc, .docx</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── V. Lịch sử hợp đồng cùng đối tác ── */}
      {allContracts.length > 1 && (
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>VI. Lịch sử hợp đồng của {partner.name}</h3>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Mã HĐ</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Loại</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Hạng</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Ngày ký</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Trạng thái</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}></th>
                </tr>
              </thead>
              <tbody>
                {allContracts.map((c) => {
                  const isCurrent = c.id === contract.id;
                  return (
                    <tr key={c.id} style={{
                      borderTop: "1px solid #e2e8f0",
                      background: isCurrent ? "#f0fdfa" : "transparent",
                    }}>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#0d9488", fontWeight: 600 }}>
                        {c.code}
                        {isCurrent && <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", background: "#0d9488", color: "#fff", borderRadius: 4 }}>HIỆN TẠI</span>}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#334155" }}>{c.contractType}</td>
                      <td style={{ padding: "10px 12px", color: "#334155" }}>{c.rank}</td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{c.signDate || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <StatusBadge status={c.status} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {!isCurrent && (
                          <button
                            onClick={() => {
                              const [src, idPart] = c.id.split("-");
                              navigate(`/admin/partner-contracts/${src}/${idPart}`);
                            }}
                            style={{
                              padding: "4px 10px", borderRadius: 6, fontSize: 11,
                              background: "#fff", color: "#0d9488",
                              border: "1px solid #0d9488", cursor: "pointer", fontWeight: 600,
                            }}
                          >
                            Xem
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: "#64748b", margin: "10px 0 0", fontStyle: "italic" }}>
            💡 Theo spec: hợp đồng cũ KHÔNG bị sửa — mỗi lần nâng hạng đều tạo bản ghi mới để audit.
          </p>
        </div>
      )}

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
