/**
 * src/pages/admin/Orgchartpage.jsx
 *
 * Sơ đồ cây đối tác (org chart) — tái sử dụng cho cả admin và user (userMode).
 *
 * QUY TẮC CÂY (theo spec MLM):
 *   - ROOT: parent_id = null, level = 0
 *   - Con:  level = level(parent) + 1
 *   - Tối đa 3 cấp (level ≤ 3)
 *   - INDEPENDENT đứng ngoài cây phân cấp
 *   - Phần `level` ở data đã được service tính sẵn khi gắn / chuyển nhánh
 *
 * GHOST RENDERING:
 *   Khi 1 user đã chuyển nhánh, ở vị trí cũ vẫn hiển thị 1 dòng "ghost"
 *   nhãn "Đã chuyển qua nhánh khác", lấy từ /branchTransferRequests có
 *   status=approved + currentParentId.
 *
 * USER MODE:
 *   - Tự khoá root vào partner của user đang đăng nhập.
 *   - Chỉ hiển thị: cấp trên trực tiếp + bản thân (không tuyến dưới, không siblings).
 *   - INDEPENDENT: hiển thị thông báo riêng (không có cây).
 *   - User chưa được duyệt / không có hồ sơ partner: empty state riêng.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import partnerService from "../../store/Partnerservice";
import api from "../../store/api";
import useAuthStore from "../../store/authStore";
import "./Orgchartpage.css";

const MAX_TREE_DEPTH = 3;

/* ══════════════════════════════════════════════
   Helpers (pure, không đụng React)
══════════════════════════════════════════════ */
const fmt = (n) => (n != null ? n.toLocaleString("vi-VN") + " đ" : "—");

/** Build map id → node với mảng children. Bỏ qua entry không hợp lệ + self-loop. */
function buildMap(list) {
  const map = {};
  (list || []).forEach((p) => {
    if (p?.id != null) map[p.id] = { ...p, children: [] };
  });
  (list || []).forEach((p) => {
    if (
      p?.parentId &&
      p.id !== p.parentId &&        // không self-loop
      map[p.parentId] &&
      map[p.id]
    ) {
      map[p.parentId].children.push(map[p.id]);
    }
  });
  return map;
}

/** Lấy toàn bộ node trong subtree (kể cả root). Có cycle-guard. */
function flattenTree(root) {
  const out = [];
  const seen = new Set();
  const walk = (n) => {
    if (!n || seen.has(n.id)) return;
    seen.add(n.id);
    out.push(n);
    (n.children || []).forEach(walk);
  };
  walk(root);
  return out;
}

/** Gán _rel = độ sâu tương đối từ root được hiển thị (root = 1). Cycle-guard. */
function assignRelLevel(root) {
  const seen = new Set();
  const walk = (n, rel) => {
    if (!n || seen.has(n.id)) return;
    seen.add(n.id);
    n._rel = rel;
    (n.children || []).forEach((c) => walk(c, rel + 1));
  };
  walk(root, 1);
}

/* ══════════════════════════════════════════════
   TreeRow – một node trong cây
══════════════════════════════════════════════ */
function TreeRow({ node, depth, maxDepth, expandedIds, onToggle, levelFilter, ghostsByOldParent = {} }) {
  if (!node) return null;
  if (depth > maxDepth) return null;

  const hasChildren = (node.children?.length || 0) > 0;
  const isExpanded  = expandedIds.has(node.id);
  const relLevel    = node._rel ?? 1;
  const ghosts      = ghostsByOldParent[String(node.id)] || [];
  const showChildren = hasChildren || ghosts.length > 0;

  // Lọc theo cấp tương đối: chỉ ẩn dòng hiện tại, vẫn render con để có thể "lọt"
  // qua các cấp sâu hơn.
  const matchLevel = levelFilter === 0 || relLevel === levelFilter;
  if (!matchLevel && !showChildren) return null;

  const isRoot    = depth === 1;
  const isPending = node.transferStatus === "pending";

  return (
    <>
      {matchLevel && (
        <div
          className={`oc-row ${isRoot ? "oc-row--root" : ""}`}
          style={{ paddingLeft: `${(depth - 1) * 24 + 12}px` }}
        >
          <button
            className={`oc-row-toggle ${!showChildren ? "oc-row-toggle--leaf" : ""}`}
            onClick={() => showChildren && onToggle(node.id)}
            disabled={!showChildren}
          >
            {showChildren ? (isExpanded ? "−" : "+") : "+"}
          </button>

          <span className="oc-row-name">{node.name}</span>

          <div className="oc-row-badges">
            <span className="oc-badge oc-badge--code">#{node.code}</span>
            <span className="oc-badge oc-badge--contract">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {node.contracts ?? 0} HĐ
            </span>
            <span className="oc-badge oc-badge--commission">$ {fmt(node.commission)}</span>
            {node.level != null && (
              <span className="oc-badge oc-badge--code" title="Cấp trong cây (tree depth)">
                Cấp {node.level}
              </span>
            )}
          </div>

          {isPending && <span className="oc-warn oc-warn--pending">⚠ Yêu cầu chuyển nhánh</span>}
        </div>
      )}

      {/* Children thật */}
      {hasChildren && isExpanded && node.children.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          maxDepth={maxDepth}
          expandedIds={expandedIds}
          onToggle={onToggle}
          levelFilter={levelFilter}
          ghostsByOldParent={ghostsByOldParent}
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
   StatsTable – thống kê cây theo cấp tương đối
══════════════════════════════════════════════ */
function StatsTable({ rootNode }) {
  const all = flattenTree(rootNode);
  if (all.length === 0) return null;

  const maxRel = Math.max(1, ...all.map((n) => n._rel ?? 1));
  const rows = Array.from({ length: maxRel }, (_, i) => {
    const lvl   = i + 1;
    const group = all.filter((n) => n._rel === lvl);
    return {
      label:      lvl === 1 ? "Cấp 1 (Gốc)" : `Cấp ${lvl}`,
      count:      group.length,
      contracts:  group.reduce((s, n) => s + (n.contracts || 0), 0),
      commission: group.reduce((s, n) => s + (n.commission || 0), 0),
    };
  });
  const total = {
    count:      all.length,
    contracts:  all.reduce((s, n) => s + (n.contracts || 0), 0),
    commission: all.reduce((s, n) => s + (n.commission || 0), 0),
  };

  return (
    <div className="oc-stats">
      <h3 className="oc-stats-title">
        Bảng thống kê cây của <span className="oc-teal">{rootNode.name}</span>
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

  /* ── State (LƯU Ý: hooks luôn phải gọi không điều kiện) ── */
  const [allPartners,      setAllPartners     ] = useState([]);
  const [transferRequests, setTransferRequests] = useState([]);
  const [loading,          setLoading         ] = useState(true);
  const [error,            setError           ] = useState("");

  const [searchText,  setSearchText ] = useState("");
  const [showDrop,    setShowDrop   ] = useState(false);
  const [rootNode,    setRootNode   ] = useState(null);
  const [levelFilter, setLevelFilter] = useState(0);
  const [maxDepth,    setMaxDepth   ] = useState(10);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const searchRef = useRef();

  /* ── Fetch data lần đầu ── */
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

  /* ── Ghost map: oldParentId → [transfer entries…] ── */
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

  /* ── User mode: tự dựng root = parent + me (không tuyến dưới) ── */
  useEffect(() => {
    if (!userMode || !currentUser || allPartners.length === 0) return;
    try {
      const me = allPartners.find(
        (p) => String(p.userId) === String(currentUser.id) || p.email === currentUser.email
      );
      if (!me) {
        setRootNode(null);
        return;
      }
      setSearchText(me.name);

      // Strip toàn bộ descendants của me — user chỉ thấy bản thân + cha trực tiếp.
      const meStripped = { ...me, children: [] };
      let root;
      if (me.parentId) {
        const parent = allPartners.find((p) => String(p.id) === String(me.parentId));
        root = parent
          ? { ...parent, children: [meStripped] }
          : meStripped;
      } else {
        root = meStripped;
      }
      assignRelLevel(root);
      setExpandedIds(new Set([root.id, meStripped.id]));
      setRootNode(root);
    } catch (e) {
      console.error("Build user tree failed:", e);
      setError("Lỗi khi dựng sơ đồ cây của bạn.");
    }
  }, [userMode, currentUser, allPartners]);

  /* ── Admin: search → chọn 1 partner làm root ── */
  const buildRoot = (partner) => {
    try {
      const map  = buildMap(allPartners);
      const root = map[partner.id];
      if (!root) return;
      assignRelLevel(root);
      const initial = new Set([root.id]);
      (root.children || []).forEach((c) => initial.add(c.id));
      setExpandedIds(initial);
      setRootNode(root);
    } catch (e) {
      console.error("Build admin tree failed:", e);
      setError("Lỗi khi dựng sơ đồ cây.");
    }
  };

  const onToggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Click outside → close dropdown ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Search suggestions ── */
  const suggestions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (q.length < 1) return [];
    return allPartners
      .filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.code || "").toString().includes(q)
      )
      .slice(0, 8);
  }, [searchText, allPartners]);

  const handleSelect = (p) => {
    setSearchText(p.name);
    setShowDrop(false);
    buildRoot(p);
  };

  const depthOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  /* ── Early return: INDEPENDENT user → không có cây ── */
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
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>{userMode ? "Sơ đồ cây của tôi" : "Sơ đồ đối tác hệ thống"}</h1>
          {userMode && <p>Bạn và cấp trên trực tiếp (tối đa {MAX_TREE_DEPTH} cấp)</p>}
        </div>
        <button
          className="oc-btn-request"
          onClick={() => navigate(userMode ? "/branch-transfer" : "/admin/branch-transfers")}
        >
          ☰ {userMode ? "Yêu cầu chuyển nhánh" : "Danh sách yêu cầu chuyển nhánh"}
        </button>
      </div>

      {/* ── Filter card ── */}
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
                placeholder="Tìm kiếm theo tên hoặc mã đối tác..."
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
              />
              {showDrop && suggestions.length > 0 && (
                <div className="oc-dropdown">
                  {suggestions.map((p) => (
                    <div key={p.id} className="oc-dropdown-item" onMouseDown={() => handleSelect(p)}>
                      <div>
                        <span className="oc-dropdown-name">{p.name}</span>
                        <span className="oc-dropdown-addr">{p.address || ""}</span>
                      </div>
                      <span className="oc-dropdown-meta">
                        #{p.code} · {p.level != null ? `Cấp ${p.level}` : "Chưa có cấp"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="oc-filter-row">
          <label className="oc-filter-label">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Cấp tương đối:
          </label>
          <select
            className="oc-select"
            value={levelFilter}
            onChange={(e) => setLevelFilter(Number(e.target.value))}
          >
            <option value={0}>Tất cả</option>
            {[1, 2, 3].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <label className="oc-filter-label" style={{ marginLeft: 20 }}>
            Số cấp nhánh con hiển thị:
          </label>
          <select
            className="oc-select"
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
          >
            {depthOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="oc-loading">
          <div className="oc-spinner" /><p>Đang tải dữ liệu...</p>
        </div>
      )}
      {error && !loading && (
        <div className="oc-error">⚠️ {error}</div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && !rootNode && (
        <div className="oc-empty">
          <div className="oc-empty-icon">🔍</div>
          <p>
            {userMode
              ? "Bạn chưa có hồ sơ đối tác đã duyệt — chưa thể hiển thị sơ đồ cây. Vui lòng liên hệ admin nếu hồ sơ đã được duyệt nhưng vẫn không thấy."
              : "Hãy nhập tên hoặc mã đối tác bên trên để xem sơ đồ phân cấp."}
          </p>
        </div>
      )}

      {/* ── Tree + Stats ── */}
      {!loading && !error && rootNode && (
        <>
          <div className="oc-tree-card">
            <h3 className="oc-tree-title">
              Sơ đồ cây Đối tác <span className="oc-teal">{rootNode.name}</span>
              {rootNode.level != null && (
                <span style={{ fontSize: 13, marginLeft: 10, color: "#64748b" }}>
                  (Cấp tuyệt đối trong hệ thống: {rootNode.level})
                </span>
              )}
            </h3>

            <div className="oc-tree">
              <TreeRow
                node={rootNode}
                depth={1}
                maxDepth={maxDepth}
                expandedIds={expandedIds}
                onToggle={onToggle}
                levelFilter={levelFilter}
                ghostsByOldParent={ghostsByOldParent}
              />
            </div>
          </div>

          <StatsTable rootNode={rootNode} />
        </>
      )}
    </div>
  );
}

export default Orgchartpage;
