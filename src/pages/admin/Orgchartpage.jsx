import { useState, useEffect, useRef } from "react";
import partnerService from "../../store/Partnerservice";
import "./Orgchartpage.css";

/* ══════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════ */
const fmt = (n) =>
  n != null ? n.toLocaleString("vi-VN") + " đ" : "—";

/** Build map id → node với children */
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

/** Lấy tất cả descendants kể cả bản thân */
function getAll(node) {
  if (!node) return [];
  return [node, ...(node.children || []).flatMap(getAll)];
}

/** Tính relative level từ root (root = 1) */
function assignRelLevel(node, rel = 1) {
  node._rel = rel;
  (node.children || []).forEach((c) => assignRelLevel(c, rel + 1));
}

/* ══════════════════════════════════════════════
   TreeRow – một dòng trong list
══════════════════════════════════════════════ */
function TreeRow({ node, depth, maxDepth, expandedIds, onToggle, levelFilter }) {
  const hasChildren = node.children?.length > 0;
  const isExpanded  = expandedIds.has(node.id);
  const relLevel    = node._rel ?? 1;

  // Lọc cấp: nếu levelFilter > 0 chỉ hiện đúng cấp đó
  if (levelFilter > 0 && relLevel !== levelFilter) {
    // vẫn render children để không mất nhánh, nhưng bản thân ẩn
    if (!hasChildren) return null;
  }

  // Không render sâu hơn maxDepth
  if (depth > maxDepth) return null;

  const isRoot      = depth === 1;
  const isTransferred = node.transferStatus === "transferred"; // "Đã chuyển qua nhánh khác"
  const isPending     = node.transferStatus === "pending";     // "Yêu cầu chuyển nhánh"

  return (
    <>
      <div
        className={`oc-row ${isRoot ? "oc-row--root" : ""} ${isTransferred ? "oc-row--transferred" : ""}`}
        style={{ paddingLeft: `${(depth - 1) * 24 + 12}px` }}
      >
        {/* Toggle button */}
        <button
          className={`oc-row-toggle ${!hasChildren ? "oc-row-toggle--leaf" : ""}`}
          onClick={() => hasChildren && onToggle(node.id)}
          disabled={!hasChildren}
        >
          {hasChildren ? (isExpanded ? "−" : "+") : "+"}
        </button>

        {/* Name */}
        <span className={`oc-row-name ${isTransferred ? "oc-row-name--muted" : ""}`}>
          {node.name}
        </span>

        {/* Badges */}
        <div className="oc-row-badges">
          <span className="oc-badge oc-badge--code">#{node.code}</span>
          <span className="oc-badge oc-badge--contract">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            {node.contracts ?? 0} HĐ
          </span>
          <span className="oc-badge oc-badge--commission">
            $ {fmt(node.commission)}
          </span>
        </div>

        {/* Warning tags */}
        {isPending && (
          <span className="oc-warn oc-warn--pending">⚠ Yêu cầu chuyển nhánh</span>
        )}
        {isTransferred && (
          <span className="oc-warn oc-warn--transferred">⚠ Đã chuyển qua nhánh khác</span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            maxDepth={maxDepth}
            expandedIds={expandedIds}
            onToggle={onToggle}
            levelFilter={levelFilter}
          />
        ))
      }
    </>
  );
}

/* ══════════════════════════════════════════════
   StatsTable
══════════════════════════════════════════════ */
function StatsTable({ rootNode, rootName }) {
  const all = getAll(rootNode);

  // group by _rel level
  const maxRel = Math.max(...all.map((n) => n._rel ?? 1));
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
        Bảng thống kê cây của <span className="oc-teal">{rootName}</span>
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
function Orgchartpage() {
  const [allPartners, setAllPartners] = useState([]);
  const [loading,     setLoading    ] = useState(true);
  const [error,       setError      ] = useState("");

  const [searchText,   setSearchText  ] = useState("");
  const [showDrop,     setShowDrop    ] = useState(false);
  const [rootNode,     setRootNode    ] = useState(null);
  const [levelFilter,  setLevelFilter ] = useState(0);   // 0 = tất cả
  const [maxDepth,     setMaxDepth    ] = useState(10);  // số cấp nhánh con
  const [expandedIds,  setExpandedIds ] = useState(new Set());

  const searchRef = useRef();

  /* ── Fetch ── */
  useEffect(() => {
    (async () => {
      try {
        const res  = await partnerService.getAll();
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setAllPartners(list.filter((p) => p.status === "approved"));
      } catch {
        setError("Không thể tải dữ liệu đối tác.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Build tree khi root thay đổi ── */
  const buildRoot = (partner) => {
    const map  = buildMap(allPartners);
    const root = map[partner.id];
    if (!root) return;
    assignRelLevel(root, 1);

    // Expand root + cấp 1 con mặc định
    const initialExpanded = new Set([root.id]);
    (root.children || []).forEach((c) => initialExpanded.add(c.id));
    setExpandedIds(initialExpanded);
    setRootNode(root);
  };

  /* ── Toggle expand ── */
  const onToggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Search suggestions ── */
  const suggestions = searchText.trim().length >= 1
    ? allPartners
        .filter((p) =>
          p.name.toLowerCase().includes(searchText.toLowerCase()) ||
          (p.code || "").includes(searchText)
        )
        .slice(0, 8)
    : [];

  const handleSelect = (p) => {
    setSearchText(p.name);
    setShowDrop(false);
    buildRoot(p);
  };

  /* ── Click outside to close dropdown ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Số cấp nhánh con options ── */
  const depthOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="oc-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Sơ đồ đối tác hệ thống</h1>
        </div>
        <button className="oc-btn-request">
          ☰ Danh sách yêu cầu chuyển nhánh
        </button>
      </div>

      {/* ── Filter card ── */}
      <div className="oc-filter-card">
        {/* Search */}
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
                    <span className="oc-dropdown-meta">#{p.code} · Cấp {p.level}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Level + depth filters */}
        <div className="oc-filter-row">
          <label className="oc-filter-label">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Cấp đối tác:
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
            Số lượng cấp nhánh con hiển thị:
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
      {error && <div className="oc-error">⚠️ {error}</div>}

      {/* ── Empty state ── */}
      {!loading && !error && !rootNode && (
        <div className="oc-empty">
          <div className="oc-empty-icon">🔍</div>
          <p>Hãy nhập thông tin đối tác mà bạn muốn xem sơ đồ quan hệ</p>
        </div>
      )}

      {/* ── Tree ── */}
      {!loading && !error && rootNode && (
        <div className="oc-tree-card">
          <h3 className="oc-tree-title">
            Sơ đồ cây Đối tác <span className="oc-teal">{rootNode.name}</span>
          </h3>

          <div className="oc-tree">
            <TreeRow
              node={rootNode}
              depth={1}
              maxDepth={maxDepth}
              expandedIds={expandedIds}
              onToggle={onToggle}
              levelFilter={levelFilter}
            />
          </div>
        </div>
      )}

      {/* ── Stats table ── */}
      {!loading && !error && rootNode && (
        <StatsTable rootNode={rootNode} rootName={rootNode.name} />
      )}
    </div>
  );
}

export default Orgchartpage;