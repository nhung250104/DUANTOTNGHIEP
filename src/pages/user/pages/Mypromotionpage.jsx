/**
 * src/pages/user/pages/Mypromotionpage.jsx
 *
 * Lịch sử nâng cấp của user — đọc từ /promotionHistory.
 */

import { useState, useEffect } from "react";
import api from "../../../store/api";
import useAuthStore from "../../../store/authStore";
import "../../admin/Customercontractpage.css";

function Mypromotionpage() {
  const currentUser = useAuthStore((s) => s.user);

  const [partner,    setPartner   ] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [error,      setError     ] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        setError("");
        const [pRes, hRes] = await Promise.all([
          api.get("/partners"),
          api.get("/promotionHistory"),
        ]);
        const me = (Array.isArray(pRes.data) ? pRes.data : []).find(
          (p) => String(p.userId) === String(currentUser.id) || p.email === currentUser.email
        );
        setPartner(me || null);
        const hList = Array.isArray(hRes.data) ? hRes.data : [];
        setPromotions(me ? hList.filter((h) => String(h.partnerId) === String(me.id)) : []);
      } catch (e) {
        console.error(e);
        setError("Không tải được lịch sử nâng cấp.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  if (loading) return (
    <div className="cc-loading"><div className="cc-spinner" /><p>Đang tải...</p></div>
  );

  return (
    <div className="cc-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Lịch sử nâng cấp</h1>
          <p>Các lần nâng cấp cấp bậc của bạn</p>
        </div>
      </div>

      {error && <div className="cc-error">⚠️ {error}</div>}

      <div className="cc-card">
        <div className="cc-table-wrap">
          <table className="cc-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Cấp cũ</th>
                <th>Cấp mới</th>
                <th>Lý do</th>
                <th>Người duyệt</th>
              </tr>
            </thead>
            <tbody>
              {!partner || promotions.length === 0 ? (
                <tr><td colSpan={5} className="cc-empty">Chưa có lần nâng cấp nào.</td></tr>
              ) : (
                promotions
                  .slice()
                  .sort((a, b) => Number(b.id) - Number(a.id))
                  .map((p) => (
                    <tr key={p.id} className="cc-row">
                      <td>{p.createdAt}</td>
                      <td>Cấp {p.oldLevel}</td>
                      <td><span className="cc-badge cc-badge--approved">Cấp {p.newLevel}</span></td>
                      <td style={{ maxWidth: 320 }}>
                        <div style={{ whiteSpace: "normal", color: "#475569" }}>{p.reason || "—"}</div>
                      </td>
                      <td>{p.approvedBy || "admin"}</td>
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

export default Mypromotionpage;
