/**
 * src/store/partnerContractService.js
 *
 * Helpers cho luồng hợp đồng đối tác (theo spec).
 *
 * Luồng status:
 *   PENDING   → đối tác/admin tạo hợp đồng nhưng chưa duyệt
 *   APPROVED  → admin đã duyệt nhưng chưa kích hoạt (hiếm dùng — thường nhảy thẳng sang ACTIVE)
 *   ACTIVE    → hợp đồng đang hiệu lực, chính sách áp dụng cho user
 *   EXPIRED   → bị hợp đồng mới ghi đè (sau khi nâng hạng) hoặc hết hạn
 *   REJECTED  → admin từ chối
 *
 * Quy tắc:
 *   - 1 user chỉ có TỐI ĐA 1 hợp đồng ACTIVE.
 *   - Nâng hạng → tạo hợp đồng mới ACTIVE; hợp đồng cũ → EXPIRED.
 *   - Hợp đồng quyết định hoa hồng. Tỷ lệ hoa hồng theo HẠNG (rank) ghi trong hợp đồng.
 *
 * Hệ thống hiện tại lưu hợp đồng dưới 2 dạng "ảo":
 *   - Hợp đồng đăng ký ban đầu: ghép từ partner record (HDDT + partner.id).
 *   - Hợp đồng nâng hạng: ghép từ /upgradeRequests đã approved (HDDT + 1000 + req.id).
 *
 * Service này tổng hợp 2 nguồn → list contracts cho 1 partner, có status đúng.
 */

const RANK_RATES = {
  "Member":         { l1: 20, l2: 10, l3: 3  },
  "Leader":         { l1: 25, l2: 12, l3: 5  },
  "Partner":        { l1: 30, l2: 15, l3: 7  },
  "Senior Partner": { l1: 35, l2: 18, l3: 10 },
};

export const CONTRACT_STATUS = {
  PENDING:  { key: "PENDING",  label: "Chờ duyệt",     color: "#f59e0b" },
  APPROVED: { key: "APPROVED", label: "Đã duyệt",      color: "#0284c7" },
  ACTIVE:   { key: "ACTIVE",   label: "Đang hiệu lực", color: "#16a34a" },
  EXPIRED:  { key: "EXPIRED",  label: "Hết hiệu lực",  color: "#94a3b8" },
  REJECTED: { key: "REJECTED", label: "Bị từ chối",    color: "#dc2626" },
};

export function ratesForRank(rank) {
  return RANK_RATES[rank] || RANK_RATES["Member"];
}

/**
 * Tổng hợp danh sách hợp đồng của 1 partner từ:
 *   - partner record (hợp đồng đăng ký ban đầu)
 *   - upgradeRequests đã liên kết với partner
 *
 * Trả về mảng contract đã sort theo signDate (mới nhất trước), có:
 *   - status: PENDING/ACTIVE/EXPIRED/REJECTED (theo quy tắc spec)
 *   - rank, rates, code, contractFile, signDate, source ("partner"|"upgrade")
 */
export function getContractsForPartner(partner, allUpgradeRequests = []) {
  if (!partner) return [];

  const upgrades = (allUpgradeRequests || [])
    .filter((r) => String(r.partnerId) === String(partner.id));

  const list = [];

  // 1. Hợp đồng đăng ký ban đầu (rank ban đầu = "Member" mặc định)
  const initialRank = "Member";
  const initialContract = {
    id:           `partner-${partner.id}`,
    code:         `HDDT${String(partner.id).padStart(6, "0")}`,
    source:       "partner",
    partnerId:    partner.id,
    partnerCode:  partner.code,
    partnerName:  partner.name,
    contractType: "Đăng ký làm đối tác",
    contractFile: partner.contractFile || null,
    signDate:     partner.joinDate || partner.submittedAt || null,
    rank:         initialRank,
    rates:        ratesForRank(initialRank),
    canBuildTeam: partner.memberType !== "INDEPENDENT",
    rawPartner:   partner,
    // status sẽ điền sau khi xác định contract nào ACTIVE
    status:       partner.status === "approved" ? "ACTIVE"
                : partner.status === "rejected" ? "REJECTED"
                : "PENDING",
  };
  list.push(initialContract);

  // 2. Mỗi upgrade request → 1 contract
  upgrades.forEach((req) => {
    const newRank = req.newRank || "Leader";
    list.push({
      id:           `upgrade-${req.id}`,
      code:         `HDDT${String(1000 + Number(req.id)).padStart(6, "0")}`,
      source:       "upgrade",
      partnerId:    partner.id,
      partnerCode:  partner.code,
      partnerName:  partner.name,
      contractType: `Nâng hạng lên ${newRank}`,
      contractFile: req.contractFile || null,
      signDate:     req.approvedAt || req.submittedAt || null,
      rank:         newRank,
      rates:        ratesForRank(newRank),
      canBuildTeam: true,
      rawUpgrade:   req,
      status:       req.status === "approved" ? "ACTIVE"
                  : req.status === "rejected" ? "REJECTED"
                  : "PENDING",
    });
  });

  // 3. Áp dụng quy tắc 1 ACTIVE: nếu có nhiều ACTIVE, chỉ giữ ACTIVE cho hợp đồng MỚI nhất.
  //    Các ACTIVE cũ hơn → EXPIRED (đã bị ghi đè).
  const sortedByDate = [...list].sort((a, b) =>
    parseDate(b.signDate) - parseDate(a.signDate)
  );

  let foundActive = false;
  for (const c of sortedByDate) {
    if (c.status === "ACTIVE") {
      if (foundActive) c.status = "EXPIRED"; // có ACTIVE mới hơn rồi
      else foundActive = true;
    }
  }

  return sortedByDate;
}

/** Lấy hợp đồng ACTIVE hiện tại của partner. Trả về null nếu không có. */
export function getActiveContract(partner, allUpgradeRequests = []) {
  return getContractsForPartner(partner, allUpgradeRequests)
    .find((c) => c.status === "ACTIVE") || null;
}

/**
 * Tạo các ví dụ tính hoa hồng dễ hiểu cho rank.
 * Trả về mảng { title, formula, result } để render UI.
 */
export function commissionExamples(rates) {
  if (!rates) return [];
  const sample = 10_000_000; // 10 triệu VND
  const fmt    = (n) => n.toLocaleString("vi-VN") + " đ";
  return [
    {
      title: "HĐ cá nhân ký được",
      formula: `Doanh thu HĐ × ${rates.l1}% (cấp 1)`,
      example: `${fmt(sample)} × ${rates.l1}% = ${fmt(sample * rates.l1 / 100)}`,
    },
    {
      title: "HĐ do F1 (con trực tiếp) ký",
      formula: `Doanh thu HĐ × ${rates.l2}% (cấp 2)`,
      example: `${fmt(sample)} × ${rates.l2}% = ${fmt(sample * rates.l2 / 100)}`,
    },
    {
      title: "HĐ do F2 (cháu) ký",
      formula: `Doanh thu HĐ × ${rates.l3}% (cấp 3)`,
      example: `${fmt(sample)} × ${rates.l3}% = ${fmt(sample * rates.l3 / 100)}`,
    },
  ];
}

/* ─── Helpers ─────────────────────────────────────────── */
function parseDate(s) {
  if (!s) return 0;
  // Hỗ trợ "dd/mm/yyyy" (vi-VN) hoặc ISO.
  const vi = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (vi) {
    const [, dd, mm, yyyy] = vi;
    return new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`).getTime();
  }
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}
