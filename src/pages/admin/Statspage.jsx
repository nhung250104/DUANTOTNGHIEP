import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  FileText, TrendingUp, Users, Download,
  Calendar, BarChart2, User, Search,
} from "lucide-react";
import api from "../../store/api";
import "./Statspage.css";

/* ── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("vi-VN").format(n);

const fmtMoney = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const parseDate = (str = "") => {
  // "dd/mm/yyyy"
  const [d, m, y] = str.split("/").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
};

/* ── Custom Tooltip ─────────────────────────────────────── */
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
function Statspage() {
  const [partners,  setPartners ] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [users,     setUsers    ] = useState([]);
  const [loading,   setLoading  ] = useState(true);

  // Filters
  const [month,     setMonth    ] = useState(new Date().getMonth() + 1);   // 1-12
  const [year,      setYear     ] = useState(new Date().getFullYear());
  const [levelFilter, setLevel  ] = useState("all");
  const [search,    setSearch   ] = useState("");

  /* ── Fetch ─────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [pRes, cRes, uRes] = await Promise.all([
          api.get("/partners"),
          api.get("/customerContracts"),
          api.get("/users"),
        ]);
        setPartners(Array.isArray(pRes.data) ? pRes.data : []);
        setContracts(Array.isArray(cRes.data) ? cRes.data : []);
        setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      } catch (err) {
        console.error("Statspage fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ── Derived: approved partners only ───────────────────── */
  const approvedPartners = useMemo(
    () => partners.filter((p) => p.status === "approved"),
    [partners]
  );

  /* ── Filtered partners for tops ────────────────────────── */
  const filteredPartners = useMemo(() => {
    let list = approvedPartners;
    if (levelFilter !== "all") list = list.filter((p) => String(p.level) === levelFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q));
    }
    return list;
  }, [approvedPartners, levelFilter, search]);

  /* ── KPI totals ─────────────────────────────────────────── */
  const kpi = useMemo(() => {
    const totalContracts = contracts.length;
    const totalCommission = contracts.reduce((s, c) => s + (c.commission || 0), 0);
    const totalMembers = approvedPartners.length;
    return { totalContracts, totalCommission, totalMembers };
  }, [contracts, approvedPartners]);

  /* ── Chart data: 12 tháng theo năm đã chọn ─────────────── */
  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const monthContracts = contracts.filter((c) => {
        const d = parseDate(c.signDate || c.createdAt);
        return d && d.getMonth() + 1 === m && d.getFullYear() === year;
      });
      const soHD = monthContracts.length;
      const hoaHong = monthContracts.reduce((s, c) => s + (c.commission || 0), 0) / 1_000_000;
      return {
        month: `T${m}`,
        "Số hợp đồng": soHD,
        "Hoa hồng (triệu đ)": Math.round(hoaHong * 10) / 10,
      };
    });
  }, [contracts, year]);

  /* ── Top lists ──────────────────────────────────────────── */
  const topContracts = useMemo(() =>
    [...filteredPartners]
      .filter((p) => (p.contracts || 0) > 0)
      .sort((a, b) => (b.contracts || 0) - (a.contracts || 0))
      .slice(0, 5),
    [filteredPartners]
  );

  const topCommission = useMemo(() =>
    [...filteredPartners]
      .filter((p) => (p.commission || 0) > 0)
      .sort((a, b) => (b.commission || 0) - (a.commission || 0))
      .slice(0, 5),
    [filteredPartners]
  );

  const topLinks = useMemo(() =>
    [...filteredPartners]
      .filter((p) => p.refLink)
      .sort((a, b) => (b.contracts || 0) - (a.contracts || 0))
      .slice(0, 5),
    [filteredPartners]
  );

  /* ── Years options ──────────────────────────────────────── */
  const yearOptions = [2024, 2025, 2026, 2027];
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const levelOptions = [
    { value: "all", label: "Tất cả" },
    { value: "1",   label: "Cấp 1"  },
    { value: "2",   label: "Cấp 2"  },
    { value: "3",   label: "Cấp 3"  },
  ];

  /* ── Render ─────────────────────────────────────────────── */
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

  return (
    <div className="st-page">

      {/* ── Header ── */}
      <div className="st-page-header">
        <div>
          <h1 className="st-page-title">Thống kê</h1>
          <p className="st-page-subtitle">Tổng quan thông tin và hiệu suất</p>
        </div>
        <button className="st-export-btn">
          <Download size={15} />
          Xuất báo cáo
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="st-filter-bar">
        {/* Tháng */}
        <div className="st-filter-group">
          <span className="st-filter-label">
            <Calendar size={15} />
            Tháng:
          </span>
          <select
            className="st-select"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Năm */}
        <div className="st-filter-group">
          <span className="st-filter-label">Năm:</span>
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

        {/* Cấp đối tác */}
        <div className="st-filter-group">
          <span className="st-filter-label">
            <BarChart2 size={15} />
            Cấp đối tác:
          </span>
          <select
            className="st-select"
            value={levelFilter}
            onChange={(e) => setLevel(e.target.value)}
          >
            {levelOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Tên đối tác */}
        <div className="st-filter-group" style={{ flex: 1 }}>
          <span className="st-filter-label">
            <User size={15} />
            Tên đối tác:
          </span>
          <div className="st-search-wrap">
            <Search size={14} className="st-search-icon" />
            <input
              className="st-search-input"
              placeholder="Hãy nhập tên đối tác mà bạn muốn xem bảng thống kê"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="st-kpi-row">
        <div className="st-kpi-card">
          <span className="st-kpi-label">Tổng hợp đồng</span>
          <div className="st-kpi-value-row">
            <span className="st-kpi-value">{fmt(kpi.totalContracts)}</span>
            <div className="st-kpi-icon">
              <FileText size={20} />
            </div>
          </div>
          <span className="st-kpi-growth">+12% so với tháng trước</span>
        </div>

        <div className="st-kpi-card">
          <span className="st-kpi-label">Tổng hoa hồng</span>
          <div className="st-kpi-value-row">
            <span className="st-kpi-value" style={{ fontSize: kpi.totalCommission > 999999999 ? 24 : 32 }}>
              {fmtMoney(kpi.totalCommission)}
            </span>
            <div className="st-kpi-icon">
              <TrendingUp size={20} />
            </div>
          </div>
          <span className="st-kpi-growth">+8% so với tháng trước</span>
        </div>

        <div className="st-kpi-card">
          <span className="st-kpi-label">Tổng thành viên</span>
          <div className="st-kpi-value-row">
            <span className="st-kpi-value">{fmt(users.length)}</span>
            <div className="st-kpi-icon">
              <Users size={20} />
            </div>
          </div>
          <span className="st-kpi-growth">+12% so với tháng trước</span>
        </div>
      </div>

      {/* ── Bar chart ── */}
      <div className="st-chart-card">
        <div className="st-chart-header">
          <span className="st-chart-title">
            Biểu đồ thống kê tổng hợp đồng và hoa hồng
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
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#2dd4bf" }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Bar yAxisId="left"  dataKey="Số hợp đồng"         fill="#0f766e" radius={[4,4,0,0]} maxBarSize={32} />
            <Bar yAxisId="right" dataKey="Hoa hồng (triệu đ)"  fill="#2dd4bf" radius={[4,4,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Top 3 lists ── */}
      <div className="st-tops-row">

        {/* Top hợp đồng */}
        <div className="st-top-card">
          <div className="st-top-card-header">
            <div className="st-top-card-icon yellow">📄</div>
            <span className="st-top-card-title">Top người có nhiều hợp đồng</span>
          </div>
          <div className="st-top-list">
            {topContracts.length === 0 && (
              <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>
                Chưa có dữ liệu
              </p>
            )}
            {topContracts.map((p, i) => (
              <div className="st-top-item" key={p.id}>
                <div className={`st-top-rank rank-${i + 1}`}>{i + 1}</div>
                <span className="st-top-name">{p.name}</span>
                <div className="st-top-value-wrap">
                  <div className="st-top-value">{fmt(p.contracts)}</div>
                  <div className="st-top-sub">hợp đồng</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top hoa hồng */}
        <div className="st-top-card">
          <div className="st-top-card-header">
            <div className="st-top-card-icon green">💰</div>
            <span className="st-top-card-title">Top hoa hồng cao nhất</span>
          </div>
          <div className="st-top-list">
            {topCommission.length === 0 && (
              <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>
                Chưa có dữ liệu
              </p>
            )}
            {topCommission.map((p, i) => (
              <div className="st-top-item" key={p.id}>
                <div className={`st-top-rank rank-${i + 1}`}>{i + 1}</div>
                <span className="st-top-name">{p.name}</span>
                <div className="st-top-value-wrap">
                  <div className="st-top-value">{fmtMoney(p.commission)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top link truy cập */}
        <div className="st-top-card">
          <div className="st-top-card-header">
            <div className="st-top-card-icon blue">🔗</div>
            <span className="st-top-card-title">Top link được truy cập nhiều nhất</span>
          </div>
          <div className="st-top-list">
            {topLinks.length === 0 && (
              <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>
                Chưa có dữ liệu
              </p>
            )}
            {topLinks.map((p, i) => (
              <div className="st-top-item" key={p.id}>
                <div className={`st-top-rank rank-${i + 1}`}>{i + 1}</div>
                <span className="st-top-name">{p.name}</span>
                <div className="st-top-value-wrap">
                  <div className="st-top-value">{fmt((p.contracts || 0) * 342)}</div>
                  <div className="st-top-sub">lượt truy cập</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
export default Statspage;