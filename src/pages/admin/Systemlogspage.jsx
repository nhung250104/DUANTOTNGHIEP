/**
 * src/pages/admin/Systemlogspage.jsx
 *
 * Nhật ký hệ thống — đọc /systemLogs (mỗi action quan trọng của admin
 * được ghi vào đây: duyệt/từ chối HĐ KH, duyệt nâng cấp, …).
 */

import { useState, useEffect } from "react";
import api from "../../store/api";
import "./Customercontractpage.css";

const PAGE_SIZE = 20;

const TYPE_BADGE = {
  approve_customer_contract: { label: "Duyệt HĐ KH",    cls: "cc-badge--approved" },
  reject_customer_contract:  { label: "Từ chối HĐ KH",  cls: "cc-badge--rejected" },
  approve_upgrade:           { label: "Duyệt nâng cấp", cls: "cc-badge--approved" },
};

function Systemlogspage() {
  const [logs,    setLogs   ] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState("");
  const [search,  setSearch ] = useState("");
  const [type,    setType   ] = useState("");
  const [page,    setPage   ] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/systemLogs");
        const list = Array.isArray(res.data) ? res.data : [];
        setLogs(list.sort((a, b) => Number(b.id) - Number(a.id)));
      } catch (e) {
        console.error(e);
        setError("Không tải được nhật ký hệ thống.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = logs.filter((l) => {
    if (type && l.type !== type) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = [l.actorName, l.description, l.targetType, l.targetId, l.type].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const types = Array.from(new Set(logs.map((l) => l.type))).filter(Boolean);

  return (
    <div className="cc-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Nhật ký hệ thống</h1>
          <p>Lịch sử các thao tác quan trọng của admin</p>
        </div>
      </div>

      <div className="cc-card">
        <div className="cc-filters">
          <input
            className="cc-search"
            placeholder="Tìm theo người thao tác / mô tả / id..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="cc-select"
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả loại</option>
            {types.map((t) => <option key={t} value={t}>{TYPE_BADGE[t]?.label || t}</option>)}
          </select>
        </div>

        {loading && <div className="cc-loading"><div className="cc-spinner" /><p>Đang tải...</p></div>}
        {!loading && error && (
          <div className="cc-error">⚠️ {error}</div>
        )}

        {!loading && !error && (
          <div className="cc-table-wrap">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người thao tác</th>
                  <th>Loại</th>
                  <th>Đối tượng</th>
                  <th>Mô tả</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr><td colSpan={5} className="cc-empty">Chưa có nhật ký nào.</td></tr>
                ) : (
                  pageData.map((l) => {
                    const badge = TYPE_BADGE[l.type] || { label: l.type, cls: "cc-badge--pending" };
                    return (
                      <tr key={l.id} className="cc-row">
                        <td>{l.createdAt}</td>
                        <td>{l.actorName || "—"}</td>
                        <td><span className={`cc-badge ${badge.cls}`}>{badge.label}</span></td>
                        <td style={{ fontSize: 12, color: "#94a3b8" }}>
                          {l.targetType ? `${l.targetType}#${l.targetId}` : "—"}
                        </td>
                        <td style={{ maxWidth: 400 }}>
                          <div style={{ whiteSpace: "normal", color: "#475569" }}>{l.description}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="cc-footer">
            <span className="cc-count">Hiển thị {pageData.length}/{filtered.length} bút toán</span>
            <div className="cc-pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`cc-page-btn ${p === page ? "cc-page-btn--active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Systemlogspage;
