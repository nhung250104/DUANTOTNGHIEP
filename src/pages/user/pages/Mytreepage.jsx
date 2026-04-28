/**
 * src/pages/user/pages/Mytreepage.jsx
 *
 * Sơ đồ cây của user — hiển thị user + tuyến dưới (F1, F2, ...) trực tiếp.
 * Member type INDEPENDENT không có cây phân cấp → trang này tự ẩn ở Sidebar.
 * Trang đặt nút "Yêu cầu chuyển nhánh" → /branch-transfer.
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../store/api";
import useAuthStore from "../../../store/authStore";
import { Shuffle } from "lucide-react";
import "../../admin/Orgchartpage.css";

const fmt = (n) => (n != null ? n.toLocaleString("vi-VN") + " đ" : "—");

function buildMap(list) {
  const map = {};
  list.forEach((p) => { map[p.id] = { ...p, children: [] }; });
  list.forEach((p) => {
    if (p.parentId && map[p.parentId]) {
      map[p.parentId].children.push(map[p.id]);
    }
  });
  return map;
}

function TreeRow({ node, depth, expanded, onToggle }) {
  const hasChildren = node.children?.length > 0;
  const isOpen = expanded.has(node.id);

  return (
    <>
      <div
        className={`oc-row ${depth === 1 ? "oc-row--root" : ""}`}
        style={{ paddingLeft: `${(depth - 1) * 24 + 12}px` }}
      >
        <button
          className={`oc-row-toggle ${!hasChildren ? "oc-row-toggle--leaf" : ""}`}
          onClick={() => hasChildren && onToggle(node.id)}
          disabled={!hasChildren}
        >
          {hasChildren ? (isOpen ? "−" : "+") : "·"}
        </button>

        <span className="oc-row-name">{node.name}</span>

        <div className="oc-row-badges">
          <span className="oc-badge oc-badge--code">#{node.code}</span>
          <span className="oc-badge oc-badge--contract">{node.contracts ?? 0} HĐ</span>
          <span className="oc-badge oc-badge--commission">{fmt(node.commission)}</span>
          {node.levelLabel && (
            <span className="oc-badge oc-badge--code" style={{ background: "#0d9488", color: "#fff" }}>
              {node.levelLabel}
            </span>
          )}
        </div>
      </div>

      {hasChildren && isOpen && node.children.map((c) => (
        <TreeRow key={c.id} node={c} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  );
}

function Mytreepage() {
  const navigate    = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [partners, setPartners] = useState([]);
  const [loading,  setLoading ] = useState(true);
  const [error,    setError   ] = useState("");
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/partners");
        setPartners(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error(e);
        setError("Không tải được dữ liệu sơ đồ cây.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const me = useMemo(() => {
    if (!currentUser) return null;
    return partners.find(
      (p) => String(p.userId) === String(currentUser.id) || p.email === currentUser.email
    );
  }, [partners, currentUser]);

  const myTree = useMemo(() => {
    if (!me) return null;
    const map = buildMap(partners);
    return map[me.id] || null;
  }, [partners, me]);

  // Mặc định mở root để user thấy luôn F1
  useEffect(() => {
    if (myTree?.id) setExpanded(new Set([myTree.id]));
  }, [myTree]);

  const onToggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Đếm tổng F1, F2, F3
  const stats = useMemo(() => {
    if (!myTree) return { f1: 0, f2: 0, f3: 0 };
    const f1 = myTree.children?.length || 0;
    const f2 = (myTree.children || []).reduce((s, c) => s + (c.children?.length || 0), 0);
    const f3 = (myTree.children || []).reduce(
      (s, c) => s + (c.children || []).reduce((s2, gc) => s2 + (gc.children?.length || 0), 0),
      0
    );
    return { f1, f2, f3 };
  }, [myTree]);

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center" }}>Đang tải sơ đồ cây...</div>
  );

  if (currentUser?.memberType === "INDEPENDENT") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        Bạn đang hoạt động theo hình thức <strong>cá nhân (Independent)</strong>, không có sơ đồ phân cấp.
        Nếu muốn tham gia hệ thống đội nhóm, vui lòng liên hệ admin.
      </div>
    );
  }

  if (error) return <div className="oc-error">⚠️ {error}</div>;

  if (!me || !myTree) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        Chưa có hồ sơ đối tác cho tài khoản này.
      </div>
    );
  }

  return (
    <div className="oc-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Sơ đồ cây của tôi</h1>
          <p>Bạn và tuyến dưới trực tiếp (F1, F2, F3...)</p>
        </div>
        <button
          onClick={() => navigate("/branch-transfer")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8,
            background: "#fff", color: "#0d9488",
            border: "1px solid #0d9488", fontWeight: 600, cursor: "pointer",
            alignSelf: "flex-end",
          }}
        >
          <Shuffle size={15} /> Yêu cầu chuyển nhánh
        </button>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
        margin: "0 0 16px",
      }}>
        {[
          { label: "F1 trực tiếp", value: stats.f1 },
          { label: "F2",            value: stats.f2 },
          { label: "F3",            value: stats.f3 },
        ].map((s) => (
          <div key={s.label} style={{
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 10, padding: "14px 16px",
          }}>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{s.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="oc-tree-card">
        <TreeRow node={myTree} depth={1} expanded={expanded} onToggle={onToggle} />
      </div>
    </div>
  );
}

export default Mytreepage;
