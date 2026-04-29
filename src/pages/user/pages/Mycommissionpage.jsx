/**
 * src/pages/user/pages/Mycommissionpage.jsx
 *
 * Hoa hồng của tôi — đọc từ /commissionHistory (đã ghi khi admin duyệt HĐ KH).
 * Phân nhóm L1 / L2 / L3 + tổng + lịch sử chi tiết, lọc theo năm/tháng.
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../store/api";
import useAuthStore from "../../../store/authStore";
import "../../admin/Commissionpage.css";

const fmt    = (n) => new Intl.NumberFormat("vi-VN").format(n || 0) + " đ";
const fmtPct = (n) => `${n || 0}%`;

const parseDate = (str = "") => {
  const [d, m, y] = str.split("/").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
};

const TYPE_LABEL = {
  L1: "Cấp 1 — HĐ tự ký",
  L2: "Cấp 2 — F1 ký",
  L3: "Cấp 3 — Đội nhóm",
};
const TYPE_COLOR = { L1: "teal", L2: "blue", L3: "purple" };

function Mycommissionpage() {
  const navigate    = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [partner,  setPartner ] = useState(null);
  const [history,  setHistory ] = useState([]);
  const [loading,  setLoading ] = useState(true);
  const [error,    setError   ] = useState("");

  const [year,  setYear ] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(""); // "" = tất cả

  /* ── Fetch ── */
  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        setError("");
        const [pRes, hRes] = await Promise.all([
          api.get("/partners"),
          api.get("/commissionHistory"),
        ]);
        const pList = Array.isArray(pRes.data) ? pRes.data : [];
        const me = pList.find(
          (p) => String(p.userId) === String(currentUser.id) || p.email === currentUser.email
        );
        setPartner(me || null);
        const hList = Array.isArray(hRes.data) ? hRes.data : [];
        setHistory(me ? hList.filter((h) => String(h.partnerId) === String(me.id)) : []);
      } catch (e) {
        console.error(e);
        setError("Không tải được dữ liệu hoa hồng.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  /* ── Filtered history ── */
  const filtered = useMemo(() => {
    return history.filter((h) => {
      const d = parseDate(h.createdAt);
      if (!d) return false;
      if (year && d.getFullYear() !== Number(year)) return false;
      if (month && d.getMonth() + 1 !== Number(month)) return false;
      return true;
    });
  }, [history, year, month]);

  const totals = useMemo(() => {
    const sum = (type) => filtered.filter((h) => h.commissionType === type).reduce((s, h) => s + (h.commissionAmount || 0), 0);
    return { L1: sum("L1"), L2: sum("L2"), L3: sum("L3"), all: filtered.reduce((s, h) => s + (h.commissionAmount || 0), 0) };
  }, [filtered]);

  const years = [2024, 2025, 2026, 2027];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  if (loading) return (
    <div className="cp-loading"><div className="cp-spinner" /><p>Đang tải dữ liệu hoa hồng...</p></div>
  );
  if (error) return (
    <div className="cp-error-wrap"><p>⚠️ {error}</p></div>
  );

  if (!partner) {
    return (
      <div className="cp-page">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Hoa hồng của tôi</h1>
            <p>Lịch sử hoa hồng theo từng hợp đồng đã được duyệt</p>
          </div>
        </div>
        <div className="cc-empty" style={{ padding: 30 }}>
          Chưa có hồ sơ đối tác cho tài khoản này. Nếu vừa đăng ký, vui lòng chờ admin duyệt.
        </div>
      </div>
    );
  }

  return (
    <div className="cp-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Hoa hồng của tôi</h1>
          <p>Tổng hợp hoa hồng theo từng tầng (L1 / L2 / L3) + lịch sử chi tiết</p>
        </div>
      </div>

      {/* Filter */}
      <div className="cp-summary-row" style={{ alignItems: "stretch", gap: 12, flexWrap: "wrap" }}>
        <div className="cp-summary-card cp-summary-card--dark">
          <p className="cp-summary-title">TỔNG HOA HỒNG (LỌC)</p>
          <p className="cp-summary-amount">{fmt(totals.all)}</p>
          <p className="cp-summary-sub">{filtered.length} bút toán</p>
        </div>
        <div className="cp-summary-card cp-summary-card--teal">
          <p className="cp-summary-title">CẤP 1 — TỰ KÝ</p>
          <p className="cp-summary-amount">{fmt(totals.L1)}</p>
        </div>
        <div className="cp-summary-card cp-summary-card--teal">
          <p className="cp-summary-title">CẤP 2 — F1 KÝ</p>
          <p className="cp-summary-amount">{fmt(totals.L2)}</p>
        </div>
        <div className="cp-summary-card cp-summary-card--teal">
          <p className="cp-summary-title">CẤP 3 — ĐỘI NHÓM</p>
          <p className="cp-summary-amount">{fmt(totals.L3)}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, margin: "16px 0", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 13, color: "#475569", marginRight: 6 }}>Năm:</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} style={{
            padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13,
          }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, color: "#475569", marginRight: 6 }}>Tháng:</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)} style={{
            padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13,
          }}>
            <option value="">Tất cả</option>
            {months.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
        </div>
      </div>

      {/* Banner báo lỗi */}
      <div style={{
        margin: "0 0 14px",
        padding: "12px 16px",
        background: "#fff7ed", border: "1px solid #fed7aa",
        borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12,
      }}>
        <div style={{ fontSize: 13, color: "#9a3412" }}>
          🛡️ Phát hiện hoa hồng <strong>bất thường</strong> (thiếu, sai số tiền, sai nguồn,...)?
          Gửi yêu cầu kiểm tra để admin xem xét và điều chỉnh.
        </div>
        <button
          onClick={() => navigate("/partner-contract")}
          style={{
            padding: "8px 16px", borderRadius: 8,
            background: "#ea580c", color: "#fff",
            border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ⚠️ Báo lỗi hoa hồng
        </button>
      </div>

      <div className="cp-table-section">
        <div className="cp-table-header">
          <span className="cp-table-title cp-table-title--teal">Lịch sử hoa hồng chi tiết</span>
          <span className="cp-table-total">{fmt(totals.all)}</span>
        </div>
        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loại</th>
                <th>HĐ</th>
                <th>Đối tác ký HĐ</th>
                <th>Giá trị HĐ</th>
                <th>%</th>
                <th>Hoa hồng</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="cp-empty">Chưa có hoa hồng phát sinh trong khoảng thời gian đã chọn.</td></tr>
              ) : (
                filtered
                  .slice()
                  .sort((a, b) => Number(b.id) - Number(a.id))
                  .map((h) => (
                    <tr key={h.id} className="cp-row">
                      <td>{h.createdAt}</td>
                      <td>
                        <span className={`cp-pct cp-pct--${TYPE_COLOR[h.commissionType] || "teal"}`}>
                          {TYPE_LABEL[h.commissionType] || h.commissionType}
                        </span>
                      </td>
                      <td><span className="cp-link">{h.contractCode}</span></td>
                      <td>{h.sourcePartnerName}</td>
                      <td>{fmt(h.contractValue)}</td>
                      <td>{fmtPct(h.rate)}</td>
                      <td><strong>{fmt(h.commissionAmount)}</strong></td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Mycommissionpage;
