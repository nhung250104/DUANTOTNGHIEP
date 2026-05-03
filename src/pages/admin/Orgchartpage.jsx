/**
 * src/pages/admin/Orgchartpage.jsx
 *
 * Sơ đồ cây đối tác — dùng cho cả admin và user (userMode).
 *
 * Theo spec MLM mới:
 *   - Cây quản lý qua parent_id; ROOT = Cấp 0; con = parent.level + 1; max 3.
 *   - INDEPENDENT đứng ngoài cây (level=null).
 *   - Cả admin và member đều thấy CÂY HOÀN CHỈNH:
 *       + UPLINE: từ ROOT xuống cha trực tiếp.
 *       + Bản thân (highlight).
 *       + DOWNLINE: toàn bộ tuyến dưới.
 *   - Admin: search bất kỳ partner → hiển thị cây từ ROOT của partner đó xuống.
 *   - User: tự khoá vào partner của mình → hiển thị cây từ ROOT xuống.
 *
 * Ghost rendering: branchTransferRequests có status=approved + currentParentId
 *   → ở cha cũ hiện 1 dòng "Đã chuyển qua nhánh khác".
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import partnerService from "../../store/Partnerservice";
import api from "../../store/api";
import useAuthStore from "../../store/authStore";
import {
  computeLevel, findRoot, getTree, countF1, TREE_MAX_DEPTH,
} from "../../store/treeService";
import "./Orgchartpage.css";

const fmt = (n) => (n != null ? n.toLocaleString("vi-VN") + " đ" : "—");

/* ══════════════════════════════════════════════
   TreeRow – một node trong cây
══════════════════════════════════════════════ */
function TreeRow({
  node, depth, maxDepth,
  expandedIds, onToggle,
  highlightId, showMeBadge = false,
  ghostsByOldParent = {},
  allPartners = [],
}) {
  if (!node || depth > maxDepth) return null;

  const hasChildren  = (node.children?.length || 0) > 0;
  const isExpanded   = expandedIds.has(String(node.id));
  const ghosts       = ghostsByOldParent[String(node.id)] || [];
  const showChildren = hasChildren || ghosts.length > 0;
  const isFocused    = String(node.id) === String(highlightId);
  const absLevel     = computeLevel(node.id, allPartners);
  const f1           = countF1(node.id, allPartners);

  return (
    <>
      <div
        className={`oc-row ${depth === 1 ? "oc-row--root" : ""} ${isFocused ? "oc-row--me" : ""}`}
        style={{
          paddingLeft: `${(depth - 1) * 24 + 12}px`,
          ...(isFocused && {
            background: "linear-gradient(90deg, #ecfeff 0%, transparent 80%)",
            borderLeft: "3px solid #0d9488",
          }),
        }}
      >
        <button
          className={`oc-row-toggle ${!showChildren ? "oc-row-toggle--leaf" : ""}`}
          onClick={() => showChildren && onToggle(String(node.id))}
          disabled={!showChildren}
        >
          {showChildren ? (isExpanded ? "−" : "+") : "·"}
        </button>

        <span className="oc-row-name" style={isFocused ? { fontWeight: 700, color: "#0f766e" } : null}>
          {node.name}{isFocused && showMeBadge && <span style={{
            marginLeft: 6, fontSize: 11, padding: "1px 6px",
            background: "#0d9488", color: "#fff", borderRadius: 4,
          }}>BẠN</span>}
        </span>

        <div className="oc-row-badges">
          <span className="oc-badge oc-badge--code">#{node.code}</span>
          {absLevel != null && (
            <span className="oc-badge oc-badge--code" title="Cấp tuyệt đối trong cây">
              {absLevel === 0 ? "Cấp 0 (ROOT)" : `Cấp ${absLevel}`}
            </span>
          )}
          <span className="oc-badge oc-badge--contract" title={`F1: ${f1} con trực tiếp`}>
            F1: {f1}
          </span>
          <span className="oc-badge oc-badge--contract">{node.contracts ?? 0} HĐ</span>
          <span className="oc-badge oc-badge--commission">$ {fmt(node.commission)}</span>
        </div>

        {node.transferStatus === "pending" &&
          <span className="oc-warn oc-warn--pending">⚠ Yêu cầu chuyển nhánh</span>}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && node.children.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          maxDepth={maxDepth}
          expandedIds={expandedIds}
          onToggle={onToggle}
          highlightId={highlightId}
          showMeBadge={showMeBadge}
          ghostsByOldParent={ghostsByOldParent}
          allPartners={allPartners}
        />
      ))}

      {/* Ghost: user đã chuyển khỏi cha cũ */}
      {isExpanded && ghosts.map((g) => (
        <div
          key={`ghost-${g.requestId}`}
          className="oc-row oc-row--transferred"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <button className="oc-row-toggle oc-row-toggle--leaf" disabled>·</button>
          <span className="oc-row-name oc-row-name--muted">{g.partnerName}</span>
          <div className="oc-row-badges">
            <span className="oc-badge oc-badge--code">#{g.partnerCode}</span>
          </div>
          <span className="oc-warn oc-warn--transferred">
            ⚠ Đã chuyển qua nhánh {g.newParentName ? `"${g.newParentName}"` : "khác"}
            {g.processedAt ? ` · ${g.processedAt}` : ""}
          </span>
        </div>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════
   StatsTable – thống kê theo cấp tuyệt đối (0..3)
══════════════════════════════════════════════ */
function StatsTable({ rootNode, allPartners }) {
  if (!rootNode) return null;

  // Flatten subtree
  const flat = [];
  const seen = new Set();
  const walk = (n) => {
    if (!n || seen.has(String(n.id))) return;
    seen.add(String(n.id));
    flat.push(n);
    (n.children || []).forEach(walk);
  };
  walk(rootNode);
  if (flat.length === 0) return null;

  // Group theo cấp tuyệt đối
  const byLevel = {};
  flat.forEach((p) => {
    const lv = computeLevel(p.id, allPartners);
    if (lv == null) return;
    (byLevel[lv] = byLevel[lv] || []).push(p);
  });

  const rows = [0, 1, 2, 3]
    .filter((lv) => byLevel[lv] && byLevel[lv].length > 0)
    .map((lv) => {
      const group = byLevel[lv];
      return {
        label:      lv === 0 ? "Cấp 0 (ROOT)" : `Cấp ${lv}`,
        count:      group.length,
        contracts:  group.reduce((s, n) => s + (n.contracts || 0), 0),
        commission: group.reduce((s, n) => s + (n.commission || 0), 0),
      };
    });

  const total = {
    count:      flat.length,
    contracts:  flat.reduce((s, n) => s + (n.contracts || 0), 0),
    commission: flat.reduce((s, n) => s + (n.commission || 0), 0),
  };

  return (
    <div className="oc-stats">
      <h3 className="oc-stats-title">
        Thống kê cây của <span className="oc-teal">{rootNode.name}</span>
      </h3>
      <div className="oc-stats-wrap">
        <table className="oc-stats-table">
          <thead>
            <tr>
              <th>CẤP</th>
              <th>SỐ ĐỐI TÁC</th>
              <th>TỔNG HỢP ĐỒNG</th>
              <th>TỔNG HOA HỒNG ĐÃ NHẬN</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td><strong>{r.count}</strong></td>
                <td><strong>{r.contracts}</strong></td>
                <td className="oc-teal"><strong>{fmt(r.commission)}</strong></td>
              </tr>
            ))}
            <tr className="oc-stats-total">
              <td>TỔNG CỘNG</td>
              <td><strong>{total.count}</strong></td>
              <td><strong>{total.contracts}</strong></td>
              <td className="oc-teal"><strong>{fmt(total.commission)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Page
══════════════════════════════════════════════ */
function Orgchartpage({ userMode = false } = {}) {
  const navigate    = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  /* Hooks (luôn gọi không điều kiện) */
  const [allPartners,      setAllPartners     ] = useState([]);
  const [transferRequests, setTransferRequests] = useState([]);
  const [loading,          setLoading         ] = useState(true);
  const [error,            setError           ] = useState("");

  const [searchText,  setSearchText ] = useState("");
  const [showDrop,    setShowDrop   ] = useState(false);
  const [focusedId,   setFocusedId  ] = useState(null);   // partner đang focus (admin search hoặc me trong userMode)
  const [maxDepth,    setMaxDepth   ] = useState(10);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const searchRef = useRef();

  /* Fetch */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          partnerService.getAll(),
          api.get("/branchTransferRequests"),
        ]);
        if (cancelled) return;
        const pList = Array.isArray(pRes.data) ? pRes.data : pRes.data?.data || [];
        const tList = Array.isArray(tRes.data) ? tRes.data : [];
        setAllPartners(pList.filter((p) => p.status === "approved"));
        setTransferRequests(tList.filter((t) => t.status === "approved"));
      } catch (e) {
        if (!cancelled) {
          console.error("Orgchart fetch failed:", e);
          setError("Không thể tải dữ liệu đối tác.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* User mode: tự khoá focusedId vào partner của user đang đăng nhập */
  useEffect(() => {
    if (!userMode || !currentUser || allPartners.length === 0) return;
    try {
      const me = allPartners.find(
        (p) => String(p.userId) === String(currentUser.id) || p.email === currentUser.email
      );
      if (me) {
        setFocusedId(String(me.id));
        setSearchText(me.name);
      } else {
        setFocusedId(null);
      }
    } catch (e) {
      console.error("Build user tree failed:", e);
      setError("Lỗi khi xác định hồ sơ của bạn.");
    }
  }, [userMode, currentUser, allPartners]);

  /* Ghost map */
  const ghostsByOldParent = useMemo(() => {
    return (transferRequests || []).reduce((acc, t) => {
      if (!t?.currentParentId) return acc;
      const key = String(t.currentParentId);
      (acc[key] = acc[key] || []).push({
        requestId:     t.id,
        partnerName:   t.partnerName,
        partnerCode:   t.partnerCode,
        newParentName: t.newParentName,
        processedAt:   t.processedAt,
      });
      return acc;
    }, {});
  }, [transferRequests]);

  /* Tree từ ROOT của partner đang focus → hiển thị cây hoàn chỉnh */
  const rootTree = useMemo(() => {
    if (!focusedId) return null;
    const root = findRoot(focusedId, allPartners);
    if (!root) return null;
    return getTree(root.id, allPartners);
  }, [focusedId, allPartners]);

  /* Khi rootTree đổi, expand toàn bộ cây mặc định để dễ nhìn upline+downline */
  useEffect(() => {
    if (!rootTree) { setExpandedIds(new Set()); return; }
    const all = new Set();
    const walk = (n) => {
      if (!n) return;
      all.add(String(n.id));
      (n.children || []).forEach(walk);
    };
    walk(rootTree);
    setExpandedIds(all);
  }, [rootTree]);

  /* Click outside dropdown */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Search suggestions (admin only) */
  const suggestions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (q.length < 1 || userMode) return [];
    return allPartners
      .filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.code || "").toString().includes(q)
      )
      .slice(0, 8);
  }, [searchText, allPartners, userMode]);

  const onToggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelect = (p) => {
    setSearchText(p.name);
    setShowDrop(false);
    setFocusedId(String(p.id));
  };

  const depthOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  /* INDEPENDENT user → không có cây */
  if (userMode && currentUser?.memberType === "INDEPENDENT") {
    return (
      <div className="oc-page">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Sơ đồ cây của tôi</h1>
          </div>
        </div>
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          Bạn đang hoạt động theo hình thức <strong>cá nhân (Independent)</strong>, không có sơ đồ phân cấp.
          Nếu muốn tham gia hệ thống đội nhóm, vui lòng liên hệ admin.
        </div>
      </div>
    );
  }

  return (
    <div className="oc-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>{userMode ? "Sơ đồ cây của tôi" : "Sơ đồ đối tác hệ thống"}</h1>
          <p>
            {userMode
              ? `Cây hoàn chỉnh của tuyến bạn — từ ROOT xuống tối đa ${TREE_MAX_DEPTH} cấp.`
              : `Tìm đối tác → xem cây hoàn chỉnh từ ROOT xuống (max ${TREE_MAX_DEPTH} cấp).`}
          </p>
        </div>
        <button
          className="oc-btn-request"
          onClick={() => navigate(userMode ? "/branch-transfer" : "/admin/branch-transfers")}
        >
          ☰ {userMode ? "Yêu cầu chuyển nhánh" : "Danh sách yêu cầu chuyển nhánh"}
        </button>
      </div>

      {/* Filter card */}
      <div className="oc-filter-card">
        {!userMode && (
          <div className="oc-filter-row">
            <label className="oc-filter-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Tìm kiếm:
            </label>
            <div className="oc-search-wrap" ref={searchRef}>
              <input
                className="oc-search-input"
                placeholder="Tên hoặc mã đối tác..."
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
              />
              {showDrop && suggestions.length > 0 && (
                <div className="oc-dropdown">
                  {suggestions.map((p) => {
                    const lv = computeLevel(p.id, allPartners);
                    return (
                      <div key={p.id} className="oc-dropdown-item" onMouseDown={() => handleSelect(p)}>
                        <div>
                          <span className="oc-dropdown-name">{p.name}</span>
                          <span className="oc-dropdown-addr">{p.address || ""}</span>
                        </div>
                        <span className="oc-dropdown-meta">
                          #{p.code} · {lv == null ? "Tự do" : `Cấp ${lv}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="oc-filter-row">
          <label className="oc-filter-label">Số cấp hiển thị:</label>
          <select
            className="oc-select"
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
          >
            {depthOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: "#64748b", marginLeft: 12 }}>
            (cây tối đa {TREE_MAX_DEPTH} cấp theo spec; chọn 4–10 nếu muốn xem cả ghost rows)
          </span>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="oc-loading">
          <div className="oc-spinner" /><p>Đang tải dữ liệu...</p>
        </div>
      )}
      {error && !loading && <div className="oc-error">⚠️ {error}</div>}

      {/* Empty state */}
      {!loading && !error && !rootTree && (
        <div className="oc-empty">
          <div className="oc-empty-icon">🔍</div>
          <p>
            {userMode
              ? "Bạn chưa có hồ sơ đối tác đã duyệt — chưa thể hiển thị sơ đồ. Vui lòng liên hệ admin nếu hồ sơ đã duyệt nhưng vẫn không thấy."
              : "Hãy nhập tên hoặc mã đối tác bên trên để xem cây."}
          </p>
        </div>
      )}

      {/* Tree + Stats */}
      {!loading && !error && rootTree && (
        <>
          <div className="oc-tree-card">
            <h3 className="oc-tree-title">
              Sơ đồ cây <span className="oc-teal">{rootTree.name}</span>
              <span style={{ fontSize: 12, marginLeft: 10, color: "#64748b", fontWeight: 400 }}>
                (ROOT của nhánh{userMode ? " bạn đang ở trong" : " được chọn"})
              </span>
            </h3>

            <div className="oc-tree">
              <TreeRow
                node={rootTree}
                depth={1}
                maxDepth={maxDepth}
                expandedIds={expandedIds}
                onToggle={onToggle}
                highlightId={focusedId}
                showMeBadge={userMode}
                ghostsByOldParent={ghostsByOldParent}
                allPartners={allPartners}
              />
            </div>
          </div>

          <StatsTable rootNode={rootTree} allPartners={allPartners} />
        </>
      )}
    </div>
  );
}

export default Orgchartpage;
