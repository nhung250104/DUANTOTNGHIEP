/**
 * src/pages/user/pages/Branchtransferpage.jsx
 *
 * Yêu cầu chuyển nhánh (đổi đối tác cấp trên).
 * - Hiển thị các yêu cầu của chính user (lọc theo partnerId).
 * - Cho phép tạo yêu cầu mới qua modal: nhập mã/link giới thiệu của
 *   người muốn làm cấp trên mới + lý do; lookup partner để xác nhận.
 * - POST /branchTransferRequests + tạo notification cho admin.
 * - Admin xét duyệt sẽ cập nhật parentId của partner.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import api from "../../../store/api";
import useAuthStore from "../../../store/authStore";
import "../../admin/Customercontractpage.css";

/* ─── Helpers ───────────────────────────────────────────── */
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
  } catch {
    return 0;
  }
};

const extractCode = (input = "") => {
  const t = input.trim();
  const m = t.match(/\/ref\/([^/?#\s]+)/);
  if (m) return m[1];
  if (t.includes("/")) {
    const parts = t.split("/").filter(Boolean);
    return parts[parts.length - 1];
  }
  return t;
};

const STATUS_CFG = {
  pending:  { label: "Chờ duyệt", cls: "cc-badge--pending"  },
  approved: { label: "Đã duyệt",  cls: "cc-badge--approved" },
  rejected: { label: "Từ chối",   cls: "cc-badge--rejected" },
};

/* ═════════════════════════════════════════════════
   Modal: Tạo yêu cầu chuyển nhánh
═════════════════════════════════════════════════ */
function CreateModal({ me, currentParent, onClose, onCreated }) {
  const [newParentInput, setNewParentInput] = useState("");
  const [reason, setReason] = useState("");
  const [foundParent, setFoundParent] = useState(null);
  const [lookup, setLookup] = useState("idle"); // idle|loading|found|not_found|invalid
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef(null);

  /* Lookup new parent — chỉ approved + level >= 2 */
  useEffect(() => {
    const raw = newParentInput.trim();
    if (!raw) { setLookup("idle"); setFoundParent(null); return; }

    setLookup("loading");
    setFoundParent(null);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const code = extractCode(raw);
      if (!code) { setLookup("not_found"); return; }
      try {
        const res = await api.get(`/partners?code=${code}&status=approved`);
        const list = Array.isArray(res.data) ? res.data : [];
        const found = list[0] || null;
        if (!found) { setLookup("not_found"); return; }
        if ((found.level || 1) < 2)            { setLookup("invalid"); setFoundParent(found); return; }
        if (String(found.id) === String(me.id)){ setLookup("invalid"); setFoundParent(found); return; }
        if (currentParent && String(found.id) === String(currentParent.id)) {
          setLookup("invalid"); setFoundParent(found); return;
        }
        setFoundParent(found);
        setLookup("found");
      } catch { setLookup("not_found"); }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [newParentInput, me, currentParent]);

  const handleSubmit = async () => {
    if (!foundParent || lookup !== "found") {
      setErr("Vui lòng nhập đúng mã/link đối tác cấp trên hợp lệ.");
      return;
    }
    if (!reason.trim()) { setErr("Vui lòng nhập lý do chuyển nhánh."); return; }
    setErr("");
    setLoading(true);
    try {
      const maxId = await getMaxId("branchTransferRequests");
      const payload = {
        id:                 String(maxId + 1),
        partnerId:          String(me.id),
        partnerCode:        `DT${String(me.code || me.id).padStart(6, "0")}`,
        partnerName:        me.name,
        currentParentId:    currentParent ? String(currentParent.id) : null,
        currentParentName:  currentParent?.name || null,
        currentParentCode:  currentParent ? `DT${String(currentParent.code || currentParent.id).padStart(6, "0")}` : null,
        newParentId:        String(foundParent.id),
        newParentName:      foundParent.name,
        newParentCode:      `DT${String(foundParent.code || foundParent.id).padStart(6, "0")}`,
        reason:             reason.trim(),
        status:             "pending",
        createdAt:          getNow(),
        processedAt:        null,
        rejectReason:       null,
      };
      await api.post("/branchTransferRequests", payload);

      try {
        const maxNotiId = await getMaxId("notifications");
        await api.post("/notifications", {
          id:          String(maxNotiId + 1),
          type:        "branch_transfer_request",
          title:       "Yêu cầu chuyển nhánh",
          message:     `${me.name} xin chuyển nhánh sang ${foundParent.name}.`,
          partnerId:   String(me.id),
          partnerName: me.name,
          read:        false,
          createdAt:   getNow(),
        });
      } catch {/* bỏ qua noti lỗi */}

      onCreated();
    } catch (e) {
      console.error(e);
      setErr("Gửi yêu cầu thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal" style={{ maxWidth: 540 }}>
        <div className="cc-modal-header cc-modal-header--approve">
          <span className="cc-modal-icon">↪</span>
          <div>
            <h3 className="cc-modal-title">Yêu cầu chuyển nhánh</h3>
            <p className="cc-modal-sub">Đổi đối tác cấp trên trực tiếp</p>
          </div>
        </div>

        <div className="cc-modal-body">
          {err && <p className="cc-modal-err">{err}</p>}

          <label className="cc-modal-label">Cấp trên hiện tại</label>
          <div style={{
            padding: "10px 12px", background: "#f8fafc", borderRadius: 8,
            fontSize: 13, color: "#475569", marginBottom: 14,
          }}>
            {currentParent
              ? <>{currentParent.name} <span style={{ color: "#94a3b8" }}>· DT{String(currentParent.code || currentParent.id).padStart(6,"0")}</span></>
              : "Chưa có cấp trên (Cấp 1 / chưa gắn tuyến)"}
          </div>

          <label className="cc-modal-label">
            Mã hoặc link giới thiệu của cấp trên mới <span style={{ color: "#e53e3e" }}>*</span>
          </label>
          <input
            className="cc-modal-select"
            placeholder="Ví dụ: 000003 hoặc sivip.vn/ref/000003"
            value={newParentInput}
            onChange={(e) => setNewParentInput(e.target.value)}
            autoComplete="off"
          />

          {lookup !== "idle" && (
            <div style={{
              marginTop: 8, padding: "10px 12px", borderRadius: 8, fontSize: 13,
              background:
                lookup === "found"     ? "#f0fdf4" :
                lookup === "loading"   ? "#f8fafc" : "#fff5f5",
              border: `1px solid ${
                lookup === "found"     ? "#bbf7d0" :
                lookup === "loading"   ? "#e2e8f0" : "#fecaca"
              }`,
              color:
                lookup === "found"     ? "#166534" :
                lookup === "loading"   ? "#64748b" : "#b91c1c",
            }}>
              {lookup === "loading"   && "🔍 Đang tìm..."}
              {lookup === "not_found" && "❌ Không tìm thấy đối tác phù hợp."}
              {lookup === "invalid"   && (
                String(foundParent?.id) === String(me.id)
                  ? "❌ Bạn không thể chọn chính mình."
                  : currentParent && String(foundParent?.id) === String(currentParent.id)
                    ? "❌ Đây đang là cấp trên hiện tại của bạn."
                    : "⚠️ Đối tác chưa đủ điều kiện làm cấp trên (yêu cầu Cấp 2 trở lên)."
              )}
              {lookup === "found" && foundParent && (
                <>✅ {foundParent.name} · {foundParent.levelLabel || `Cấp ${foundParent.level}`} · Mã: {foundParent.code}</>
              )}
            </div>
          )}

          <label className="cc-modal-label" style={{ marginTop: 14 }}>
            Lý do chuyển nhánh <span style={{ color: "#e53e3e" }}>*</span>
          </label>
          <textarea
            className="cc-modal-textarea"
            placeholder="Trình bày lý do bạn muốn chuyển nhánh..."
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="cc-modal-footer">
          <button className="cc-btn-cancel" onClick={onClose} disabled={loading}>✕ Hủy</button>
          <button
            className="cc-btn-confirm"
            onClick={handleSubmit}
            disabled={loading || lookup !== "found"}
          >
            {loading ? "Đang gửi..." : "✓ Gửi yêu cầu"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════
   Page
═════════════════════════════════════════════════ */
function Branchtransferpage() {
  const currentUser = useAuthStore((s) => s.user);

  const [partners, setPartners] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading ] = useState(true);
  const [error,    setError   ] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError("");
      const [pRes, rRes] = await Promise.all([
        api.get("/partners"),
        api.get("/branchTransferRequests"),
      ]);
      setPartners(Array.isArray(pRes.data) ? pRes.data : []);
      setRequests(Array.isArray(rRes.data) ? rRes.data : []);
    } catch (e) {
      console.error(e);
      setError("Không tải được dữ liệu. Kiểm tra json-server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [currentUser]);

  const me = useMemo(() => {
    if (!currentUser) return null;
    return partners.find(
      (p) => String(p.userId) === String(currentUser.id) || p.email === currentUser.email
    );
  }, [partners, currentUser]);

  const currentParent = useMemo(() => {
    if (!me?.parentId) return null;
    return partners.find((p) => String(p.id) === String(me.parentId)) || null;
  }, [partners, me]);

  const myRequests = useMemo(() => {
    if (!me) return [];
    return requests
      .filter((r) => String(r.partnerId) === String(me.id))
      .sort((a, b) => Number(b.id) - Number(a.id));
  }, [requests, me]);

  const hasPending = myRequests.some((r) => r.status === "pending");

  return (
    <div className="cc-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Yêu cầu chuyển nhánh</h1>
          <p>Lịch sử và tạo yêu cầu chuyển đổi đối tác cấp trên trực tiếp</p>
        </div>
        <button
          className="cc-btn-create"
          onClick={() => setShowCreate(true)}
          disabled={!me || hasPending}
          title={
            !me ? "Cần có hồ sơ đối tác" :
            hasPending ? "Bạn đang có 1 yêu cầu chờ duyệt" : ""
          }
        >
          + Tạo yêu cầu
        </button>
      </div>

      <div className="cc-card">
        {loading && (
          <div className="cc-loading"><div className="cc-spinner" /><p>Đang tải dữ liệu...</p></div>
        )}

        {!loading && error && (
          <div className="cc-error">⚠️ {error}<button onClick={fetchAll}>Thử lại</button></div>
        )}

        {!loading && !error && !me && (
          <div className="cc-empty" style={{ padding: 30 }}>
            Chưa có hồ sơ đối tác cho tài khoản này. Nếu bạn vừa đăng ký, vui lòng chờ admin duyệt.
          </div>
        )}

        {!loading && !error && me && (
          <div className="cc-table-wrap">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Ngày gửi</th>
                  <th>Cấp trên hiện tại</th>
                  <th>Cấp trên mới (đề xuất)</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  <th>Ngày xử lý</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="cc-empty">
                      Bạn chưa có yêu cầu chuyển nhánh nào.
                    </td>
                  </tr>
                ) : (
                  myRequests.map((r) => {
                    const cfg = STATUS_CFG[r.status] || STATUS_CFG.pending;
                    return (
                      <tr key={r.id} className="cc-row">
                        <td>{r.createdAt}</td>
                        <td>{r.currentParentName || "—"}{r.currentParentCode ? <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.currentParentCode}</div> : null}</td>
                        <td>{r.newParentName}<div style={{ fontSize: 11, color: "#94a3b8" }}>{r.newParentCode}</div></td>
                        <td style={{ maxWidth: 280 }}>
                          <div style={{ whiteSpace: "normal", color: "#475569" }}>{r.reason}</div>
                          {r.status === "rejected" && r.rejectReason && (
                            <div style={{ marginTop: 4, fontSize: 12, color: "#b91c1c" }}>
                              Lý do từ chối: {r.rejectReason}
                            </div>
                          )}
                        </td>
                        <td><span className={`cc-badge ${cfg.cls}`}>{cfg.label}</span></td>
                        <td>{r.processedAt || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && me && (
        <CreateModal
          me={me}
          currentParent={currentParent}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

export default Branchtransferpage;
