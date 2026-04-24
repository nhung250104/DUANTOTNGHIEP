/**
 * src/pages/user/pages/Mystatspage.jsx
 *
 * Thống kê dành cho đối tác (user) — kế thừa style từ admin Statspage
 * nhưng chỉ hiển thị dữ liệu của chính user:
 *   - HĐ đã ký (partnerId === me.id)
 *   - Hoa hồng tích luỹ
 *   - Danh sách tuyến dưới (parentId === me.id)
 */

import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { FileText, TrendingUp, Users, Calendar } from "lucide-react";
import api from "../../../store/api";
import useAuthStore from "../../../store/authStore";
import "../../admin/Statspage.css";

/* ── Helpers ──────────────────────────────────────────────── */
const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n || 0);
const fmtMoney = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n || 0);

const parseDate = (str = "") => {
  const [d, m, y] = str.split("/").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0",
      borderRadius: 8, padding: "10px 14px", fontSize: 13,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#0f172a" }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ margin: "2px 0", color: p.color }}>
          {p.name}: <strong>
            {p.name === "Hoa hồng (triệu đ)"
              ? `${fmt(p.value)} tr.đ`
              : fmt(p.value)}
          </strong>
        </p>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Component
══════════════════════════════════════════════════════════ */
function Mystatspage() {
  const currentUser = useAuthStore((s) => s.user);

  const [partners,  setPartners ] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading,   setLoading  ] = useState(true);
  const [year,      setYear     ] = useState(new Date().getFullYear());

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const [pRes, cRes] = await Promise.all([
          api.get("/partners"),
          api.get("/customerContracts"),
        ]);
        setPartners(Array.isArray(pRes.data) ? pRes.data : []);
        setContracts(Array.isArray(cRes.data) ? cRes.data : []);
      } catch (err) {
        console.error("Mystatspage fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  /* Partner của user đang đăng nhập */
  const me = useMemo(() => {
    if (!currentUser) return null;
    return partners.find(
      (p) =>
        String(p.userId) === String(currentUser.id) ||
        p.email === currentUser.email
    );
  }, [partners, currentUser]);

  /* HĐ của tôi */
  const myContracts = useMemo(() => {
    if (!me) return [];
    return contracts.filter((c) => String(c.partnerId) === String(me.id));
  }, [contracts, me]);

  /* Tuyến dưới (người tôi giới thiệu) */
  const downline = useMemo(() => {
    if (!me) return [];
    return partners.filter((p) => String(p.parentId) === String(me.id));
  }, [partners, me]);

  /* KPI */
  const kpi = useMemo(() => ({
    totalContracts: myContracts.length,
    totalCommission: myContracts.reduce((s, c) => s + (c.commission || 0), 0),
    downlineCount: downline.length,
  }), [myContracts, downline]);

  /* Dữ liệu biểu đồ 12 tháng theo năm chọn */
  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const monthContracts = myContracts.filter((c) => {
        const d = parseDate(c.signDate || c.createdAt);
        return d && d.getMonth() + 1 === m && d.getFullYear() === year;
      });
      return {
        month: `T${m}`,
        "Số hợp đồng": monthContracts.length,
        "Hoa hồng (triệu đ)":
          Math.round(monthContracts.reduce((s, c) => s + (c.commission || 0), 0) / 1_000_000 * 10) / 10,
      };
    });
  }, [myContracts, year]);

  const yearOptions = [2024, 2025, 2026, 2027];

  /* ── Render ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="st-page">
        <div className="st-loading">
          <div className="st-spinner" />
          Đang tải dữ liệu thống kê...
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="st-page">
        <div className="st-page-header">
          <div>
            <h1 className="st-page-title">Thống kê</h1>
            <p className="st-page-subtitle">Hiệu suất hoạt động của bạn</p>
          </div>
        </div>
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          Chưa tìm thấy hồ sơ đối tác cho tài khoản này. Nếu vừa đăng ký, vui lòng chờ admin duyệt.
        </div>
      </div>
    );
  }

  return (
    <div className="st-page">
      {/* Header */}
      <div className="st-page-header">
        <div>
          <h1 className="st-page-title">Thống kê</h1>
          <p className="st-page-subtitle">
            Hiệu suất hoạt động của bạn — {me.levelLabel || (me.level ? `Cấp ${me.level}` : "Chưa xếp cấp")}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="st-filter-bar">
        <div className="st-filter-group">
          <span className="st-filter-label">
            <Calendar size={15} />
            Năm:
          </span>
          <select
            className="st-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI */}
      <div className="st-kpi-row">
        <div className="st-kpi-card">
          <span className="st-kpi-label">Hợp đồng của tôi</span>
          <div className="st-kpi-value-row">
            <span className="st-kpi-value">{fmt(kpi.totalContracts)}</span>
            <div className="st-kpi-icon"><FileText size={20} /></div>
          </div>
          <span className="st-kpi-growth">Tổng số HĐ đã ký</span>
        </div>

        <div className="st-kpi-card">
          <span className="st-kpi-label">Hoa hồng tích luỹ</span>
          <div className="st-kpi-value-row">
            <span
              className="st-kpi-value"
              style={{ fontSize: kpi.totalCommission > 999999999 ? 24 : 32 }}
            >
              {fmtMoney(kpi.totalCommission)}
            </span>
            <div className="st-kpi-icon"><TrendingUp size={20} /></div>
          </div>
          <span className="st-kpi-growth">Tổng hoa hồng nhận</span>
        </div>

        <div className="st-kpi-card">
          <span className="st-kpi-label">Đối tác tuyến dưới</span>
          <div className="st-kpi-value-row">
            <span className="st-kpi-value">{fmt(kpi.downlineCount)}</span>
            <div className="st-kpi-icon"><Users size={20} /></div>
          </div>
          <span className="st-kpi-growth">Người do bạn giới thiệu</span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="st-chart-card">
        <div className="st-chart-header">
          <span className="st-chart-title">
            Hợp đồng và hoa hồng theo tháng (năm {year})
          </span>
          <div className="st-chart-legend">
            <div className="st-legend-item">
              <div className="st-legend-dot" style={{ background: "#0f766e" }} />
              Số hợp đồng
            </div>
            <div className="st-legend-item">
              <div className="st-legend-dot" style={{ background: "#2dd4bf" }} />
              Tiền hoa hồng (triệu đồng)
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 30, left: 0, bottom: 0 }}
            barCategoryGap="30%"
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#2dd4bf" }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Bar yAxisId="left"  dataKey="Số hợp đồng"        fill="#0f766e" radius={[4,4,0,0]} maxBarSize={32} />
            <Bar yAxisId="right" dataKey="Hoa hồng (triệu đ)" fill="#2dd4bf" radius={[4,4,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tuyến dưới */}
      {downline.length > 0 && (
        <div className="st-chart-card" style={{ marginTop: 20 }}>
          <div className="st-chart-header">
            <span className="st-chart-title">Đối tác tuyến dưới của bạn</span>
          </div>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569" }}>
                  <th style={{ textAlign: "left",  padding: "10px 12px", fontWeight: 600 }}>Mã</th>
                  <th style={{ textAlign: "left",  padding: "10px 12px", fontWeight: 600 }}>Tên</th>
                  <th style={{ textAlign: "left",  padding: "10px 12px", fontWeight: 600 }}>Cấp</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", fontWeight: 600 }}>HĐ</th>
                  <th style={{ textAlign: "right", padding: "10px 12px", fontWeight: 600 }}>Hoa hồng</th>
                </tr>
              </thead>
              <tbody>
                {downline.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", color: "#0f766e", fontWeight: 600 }}>{p.code}</td>
                    <td style={{ padding: "10px 12px" }}>{p.name}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {p.levelLabel || (p.level ? `Cấp ${p.level}` : "—")}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(p.contracts)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtMoney(p.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Mystatspage;
