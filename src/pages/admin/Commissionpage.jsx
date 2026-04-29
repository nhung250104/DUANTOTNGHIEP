import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../store/api";
import "./CommissionPage.css";

const fmt    = (n) => new Intl.NumberFormat("vi-VN").format(n || 0) + " đ";
const fmtPct = (n) => `${n || 0}%`;
const PAGE_SIZE = 5;

const DEFAULT_RATES = {
  1: { l1: 20, l2: 10, l3: 3 },
  2: { l1: 25, l2: 12, l3: 5 },
  3: { l1: 30, l2: 15, l3: 7 },
};
// Hoa hồng theo "tier" (hạng nâng cấp 1/2/3); ưu tiên rate đã override trên partner.
const getCommRate = (partner) => {
  if (partner?.commissionRates) return partner.commissionRates;
  return DEFAULT_RATES[partner?.tier] || DEFAULT_RATES[1];
};

function MiniPager({ total, page, onPage }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "...") pages.push("...");
  }
  return (
    <div className="cp-pager">
      <button className="cp-pager-btn" onClick={() => onPage(Math.max(page-1,1))} disabled={page===1}>‹</button>
      {pages.map((p,i) => p==="..." ? <span key={i} className="cp-pager-dots">...</span> : (
        <button key={p} className={`cp-pager-btn ${p===page?"cp-pager-btn--active":""}`} onClick={() => onPage(p)}>{p}</button>
      ))}
      <button className="cp-pager-btn" onClick={() => onPage(Math.min(page+1,totalPages))} disabled={page===totalPages}>›</button>
    </div>
  );
}

function SummaryCard({ title, amount, sub, color="teal" }) {
  return (
    <div className={`cp-summary-card cp-summary-card--${color}`}>
      <p className="cp-summary-title">{title}</p>
      <p className="cp-summary-amount">{fmt(amount)}</p>
      {sub && <p className="cp-summary-sub">{sub}</p>}
    </div>
  );
}

function CommTypeCard({ level, title, desc, rate, rateLabel, total, color }) {
  return (
    <div className={`cp-type-card cp-type-card--${color}`}>
      <div className="cp-type-header">
        <span className={`cp-type-level cp-type-level--${color}`}>Hoa hồng Cấp {level}</span>
      </div>
      <p className="cp-type-title">{title}</p>
      <p className="cp-type-desc">{desc}</p>
      <div className="cp-type-rate">
        <span className="cp-type-pct">{fmtPct(rate)}</span>
        <span className="cp-type-rate-label">{rateLabel}</span>
      </div>
      <div className="cp-type-footer">
        <span className="cp-type-total-label">Tổng đã nhận</span>
        <span className={`cp-type-total cp-type-total--${color}`}>{fmt(total)}</span>
      </div>
    </div>
  );
}

function CommissionPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [partner,    setPartner   ] = useState(null);
  const [level1Data, setLevel1Data] = useState([]);
  const [level2Data, setLevel2Data] = useState([]);
  const [level3Data, setLevel3Data] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [error,      setError     ] = useState("");
  const [page1, setPage1] = useState(1);
  const [page2, setPage2] = useState(1);
  const [page3, setPage3] = useState(1);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        // Gọi song song 3 API cùng lúc — nhanh nhất có thể
        const [pRes, allPartnersRes, allContractsRes] = await Promise.all([
          api.get(`/partners/${id}`),
          api.get("/partners"),
          api.get("/customerContracts"),
        ]);

        const partner      = pRes.data;
        const allPartners  = Array.isArray(allPartnersRes.data)  ? allPartnersRes.data  : [];
        const allContracts = Array.isArray(allContractsRes.data) ? allContractsRes.data : [];

        if (!partner) throw new Error("Không tìm thấy đối tác");
        setPartner(partner);

        const commRate = getCommRate(partner);

        // Cấp 1
        const myContracts = allContracts.filter(
          (c) => String(c.partnerId) === String(id) && c.status === "approved"
        );
        setLevel1Data(myContracts.map((c) => ({
          code: c.code, customerName: c.customerName, value: c.value,
          rate: commRate.l1, commission: Math.round((c.value||0)*commRate.l1/100),
          condition: "Hợp đồng có hiệu lực", contractId: c.id,
        })));

        // Cấp 2
        const directChildren = allPartners.filter(
          (p) => String(p.parentId) === String(id) && p.status === "approved"
        );
        const childIds = directChildren.map((p) => String(p.id));
        const childContracts = allContracts.filter(
          (c) => childIds.includes(String(c.partnerId)) && c.status === "approved"
        );
        setLevel2Data(childContracts.map((c) => {
          const cp = directChildren.find((p) => String(p.id) === String(c.partnerId));
          return {
            code: c.code, customerName: c.customerName, value: c.value,
            partnerName: cp?.name || "—",
            partnerCode: cp ? `#DT${String(cp.code||cp.id).padStart(6,"0")}` : "",
            rate: commRate.l2, commission: Math.round((c.value||0)*commRate.l2/100),
            condition: "Hợp đồng có hiệu lực", contractId: c.id,
          };
        }));

        // Cấp 3
        const grandchildren = allPartners.filter(
          (p) => childIds.includes(String(p.parentId)) && p.status === "approved"
        );
        setLevel3Data(grandchildren.map((gp) => {
          const pp = directChildren.find((p) => String(p.id) === String(gp.parentId));
          const gpC = allContracts.filter((c) => String(c.partnerId)===String(gp.id) && c.status==="approved");
          const totalValue = gpC.reduce((s,c) => s+(c.value||0), 0);
          return {
            name: gp.name, code: `#DT${String(gp.code||gp.id).padStart(6,"0")}`,
            parentName: pp?.name||"—",
            parentCode: pp ? `#DT${String(pp.code||pp.id).padStart(6,"0")}` : "",
            contractCount: gpC.length, totalValue,
            rate: commRate.l3, commission: Math.round(totalValue*commRate.l3/100),
          };
        }));

      } catch (err) {
        console.error(err);
        setError("Không thể tải dữ liệu hoa hồng.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAll();
  }, [id]);

  const totalL1  = level1Data.reduce((s,r) => s+r.commission, 0);
  const totalL2  = level2Data.reduce((s,r) => s+r.commission, 0);
  const totalL3  = level3Data.reduce((s,r) => s+r.commission, 0);
  const total    = totalL1+totalL2+totalL3;
  const commRate = getCommRate(partner);

  const slice1 = level1Data.slice((page1-1)*PAGE_SIZE, page1*PAGE_SIZE);
  const slice2 = level2Data.slice((page2-1)*PAGE_SIZE, page2*PAGE_SIZE);
  const slice3 = level3Data.slice((page3-1)*PAGE_SIZE, page3*PAGE_SIZE);

  if (loading) return <div className="cp-loading"><div className="cp-spinner"/><p>Đang tải dữ liệu hoa hồng...</p></div>;
  if (error)   return <div className="cp-error-wrap"><p>⚠️ {error}</p><button onClick={() => navigate(-1)}>← Quay lại</button></div>;

  return (
    <div className="cp-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Thông tin đối tác</h1>
          <p>{partner?.name}</p>
        </div>
        <div style={{ display:"flex", gap:10, alignSelf:"flex-end" }}>
          <button className="pd-tab-btn" onClick={() => navigate(`/admin/partners-profile/${id}`)}>Thông tin đối tác</button>
          <button className="pd-tab-btn pd-tab-btn--active pd-tab-btn--commission">Hoa hồng</button>
        </div>
      </div>

      <div className="cp-summary-row">
        <SummaryCard title="TỔNG HOA HỒNG ĐÃ NHẬN" amount={total}   sub="Từ 1/2026 đến nay"                          color="dark"/>
        <SummaryCard title="HOA HỒNG CẤP 1"         amount={totalL1} sub={`${level1Data.length} Hợp đồng đã ký`}      color="teal"/>
        <SummaryCard title="HOA HỒNG CẤP 2"         amount={totalL2} sub={`Từ ${level2Data.length} đối tác cấp dưới`} color="teal"/>
        <SummaryCard title="HOA HỒNG CẤP 3"         amount={totalL3} sub={`Từ đội nhóm ${level3Data.length} người`}   color="teal"/>
      </div>

      <div className="cp-type-row">
        <CommTypeCard level={1} title="HĐ Khách hàng cá nhân"    desc="Đối tác tự ký hợp đồng với khách hàng. Nhận % trên giá trị hợp đồng do chính mình ký."            rate={commRate.l1} rateLabel="Giá trị hợp đồng khách hàng"      total={totalL1} color="teal"/>
        <CommTypeCard level={2} title="% HĐ Đối tác cấp dưới ký" desc="Cấp dưới trực tiếp (người bạn giới thiệu) ký HĐ với KH. Bạn nhận % trên giá trị HĐ đó."         rate={commRate.l2} rateLabel="Giá trị hợp đồng do cấp dưới ký" total={totalL2} color="blue"/>
        <CommTypeCard level={3} title="HĐ Khách hàng cá nhân"    desc="Đối tác tự ký hợp đồng với khách hàng. Nhận % trên giá trị hợp đồng do chính mình ký."            rate={commRate.l3} rateLabel="Giá trị hợp đồng khách hàng"      total={totalL3} color="purple"/>
      </div>

      {/* Bảng 1 */}
      <div className="cp-table-section">
        <div className="cp-table-header">
          <span className="cp-table-title cp-table-title--teal">Hoa hồng Cấp 1 – Hợp đồng cá nhân tự ký</span>
          <span className="cp-table-total">{fmt(totalL1)}</span>
        </div>
        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead><tr><th>Mã HĐ</th><th>Khách hàng</th><th>Giá trị</th><th>Tỉ lệ hoa hồng</th><th>Hoa hồng</th><th>Điều kiện nhận</th></tr></thead>
            <tbody>
              {slice1.length===0 ? <tr><td colSpan={6} className="cp-empty">Chưa có hợp đồng nào</td></tr>
              : slice1.map((r) => (
                <tr key={r.contractId} className="cp-row">
                  <td><span className="cp-link">{r.code}</span></td>
                  <td>{r.customerName}</td><td>{fmt(r.value)}</td>
                  <td><span className="cp-pct cp-pct--teal">{fmtPct(r.rate)}</span></td>
                  <td>{fmt(r.commission)}</td>
                  <td><span className="cp-condition">{r.condition}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <MiniPager total={level1Data.length} page={page1} onPage={setPage1}/>
      </div>

      {/* Bảng 2 */}
      <div className="cp-table-section">
        <div className="cp-table-header">
          <span className="cp-table-title cp-table-title--blue">Hoa hồng Cấp 2 – Hợp đồng do cấp dưới của bạn ký</span>
          <span className="cp-table-total">{fmt(totalL2)}</span>
        </div>
        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead><tr><th>Mã HĐ</th><th>Đối tác</th><th>Khách hàng</th><th>Giá trị</th><th>Tỉ lệ hoa hồng</th><th>Hoa hồng</th><th>Điều kiện nhận</th></tr></thead>
            <tbody>
              {slice2.length===0 ? <tr><td colSpan={7} className="cp-empty">Chưa có hợp đồng từ cấp dưới</td></tr>
              : slice2.map((r,i) => (
                <tr key={i} className="cp-row">
                  <td><span className="cp-link">{r.code}</span></td>
                  <td><span>{r.partnerName} </span><span className="cp-partner-code">{r.partnerCode}</span></td>
                  <td>{r.customerName}</td><td>{fmt(r.value)}</td>
                  <td><span className="cp-pct cp-pct--blue">{fmtPct(r.rate)}</span></td>
                  <td>{fmt(r.commission)}</td>
                  <td><span className="cp-condition">{r.condition}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <MiniPager total={level2Data.length} page={page2} onPage={setPage2}/>
      </div>

      {/* Bảng 3 */}
      <div className="cp-table-section">
        <div className="cp-table-header">
          <span className="cp-table-title cp-table-title--purple">Hoa hồng Cấp 3 – Hợp đồng do đội nhóm ký</span>
          <span className="cp-table-total">{fmt(totalL3)}</span>
        </div>
        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead><tr><th>Thành viên đội nhóm</th><th>Vị trí trong cây</th><th>Số HĐ đã ký</th><th>Tổng giá trị hợp đồng</th><th>Tỉ lệ hoa hồng</th><th>Hoa hồng</th></tr></thead>
            <tbody>
              {slice3.length===0 ? <tr><td colSpan={6} className="cp-empty">Chưa có thành viên cấp 3</td></tr>
              : slice3.map((r,i) => (
                <tr key={i} className="cp-row">
                  <td><span className="cp-link">{r.name} </span><span className="cp-partner-code">{r.code}</span></td>
                  <td>
                    <span className="cp-link">{r.parentName} </span>
                    <span className="cp-partner-code">{r.parentCode}</span>
                    <span style={{color:"#64748b",fontSize:12}}> giới thiệu</span>
                  </td>
                  <td>{r.contractCount}</td><td>{fmt(r.totalValue)}</td>
                  <td><span className="cp-pct cp-pct--purple">{fmtPct(r.rate)}</span></td>
                  <td>{fmt(r.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <MiniPager total={level3Data.length} page={page3} onPage={setPage3}/>
      </div>
    </div>
  );
}

export default CommissionPage;