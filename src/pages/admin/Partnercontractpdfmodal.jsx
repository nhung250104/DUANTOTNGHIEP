/**
 * PartnerContractPDFModal.jsx
 *
 * Modal xem trước hợp đồng sinh từ data — ảnh 3
 * Hiển thị dạng 2 trang cạnh nhau, có phân trang, zoom, download
 */

import { useState, useRef } from "react";
import "./PartnerContractPage.css";

const fmt     = (n) => new Intl.NumberFormat("vi-VN").format(n || 0);
const fmtDate = (d) => d || "___/___/______";

/* ─── Nội dung từng trang ────────────────────────────────── */
function Page1({ contract }) {
  return (
    <div className="pdf-page-content">
      <div className="pdf-header-nation">
        <p><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></p>
        <p><em>Độc lập – Tự do – Hạnh phúc</em></p>
        <p>————————</p>
      </div>

      <div className="pdf-title-block">
        <p><strong>HỢP ĐỒNG HỢP TÁC KINH DOANH (ĐỐI TÁC PHÂN PHỐI)</strong></p>
        <p>Số: {contract.code}/2026/SIVIP</p>
      </div>

      <p className="pdf-intro">
        Hôm nay, ngày {fmtDate(contract.signDate)}, tại Đà Nẵng, chúng tôi gồm các bên:
      </p>

      <div className="pdf-party">
        <p><strong>BÊN A:</strong></p>
        <p>Thúng tôi: CÔNG TY CP PHẦN MỀM SIVIP</p>
        <p>Địa chỉ: 126 Thúc Kháng, Hải Châu, Đà Nẵng</p>
        <p>Điện thoại: 0945367403</p>
        <p>E-mail: info@sivip.vn</p>
        <p>(Sau đây gọi là "Bên A")</p>
      </div>

      <div className="pdf-party">
        <p><strong>BÊN B:</strong></p>
        <p>Ông/Bà: {contract.partnerName}</p>
        <p>Địa chỉ: {contract.partnerAddress || "___"}</p>
        <p>Điện thoại: {contract.partnerPhone || "___"}</p>
        <p>E-mail: {contract.partnerEmail || "___"}</p>
        <p>CCCD/CMND: {contract.partnerCccd || "___"}</p>
        <p>(Sau đây gọi là "Bên B")</p>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 1. MỤC ĐÍCH HỢP TÁC</strong></p>
        <ul>
          <li>Hợp tác trên cơ sở tự nguyện, cùng có lợi, phát triển hoạt động kinh doanh và mạng lưới phân phối sản phẩm.</li>
          <li>Hợp tác để khai thác thị trường, nâng cao hiệu quả kinh doanh của các bên.</li>
        </ul>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 2. NỘI DUNG HỢP TÁC</strong></p>
        <ul>
          <li>Hai bên phối hợp thực hiện các kế hoạch kinh doanh đã được thống nhất.</li>
          <li>Phân chia các khu vực, thị trường và trách nhiệm cụ thể.</li>
        </ul>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 3. KẾT QUẢ VÀ TRÁCH NHIỆM</strong></p>
        <ul>
          <li>Cam kết đạt được các chỉ tiêu kinh doanh theo từng giai đoạn.</li>
          <li>Chia sẻ thông tin hợp tác và giải quyết kịp thời các vướng mắc.</li>
        </ul>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 4. NGHĨA VỤ VÀ QUYỀN LỢI CỦA CÁC BÊN</strong></p>
        <ul>
          <li>Nêu rõ nghĩa vụ cụ thể của Bên A và Bên B.</li>
        </ul>
      </div>

      <div className="pdf-page-num">Trang 1/2</div>
    </div>
  );
}

function Page2({ contract }) {
  return (
    <div className="pdf-page-content">
      <div className="pdf-clause">
        <p><strong>ĐIỀU 5. THỰC HIỆN VÀ BẢO MẬT THÔNG TIN</strong></p>
        <ul>
          <li>Cam kết giữ bí mật các thông tin kinh doanh, kỹ thuật, và đối tác.</li>
          <li>Không cung cấp thông tin cho bên thứ ba khi chưa có sự đồng ý.</li>
        </ul>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 6. HỢP ĐỒNG HỢP TÁC</strong></p>
        <ul>
          <li>Hợp đồng này có hiệu lực từ ngày ký.</li>
          <li>Thời hạn hợp đồng là không xác định (trừ khi có thỏa thuận khác).</li>
        </ul>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 7. QUYỀN VÀ NGHĨA VỤ CỦA ĐỐI TÁC PHÂN PHỐI</strong></p>
        <ul>
          <li>Nêu rõ trách nhiệm và quyền lợi của Bên B trong vai trò phân phối.</li>
          <li>Phân chia khu vực và hạn mức phân phối.</li>
        </ul>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 8. CHÍNH SÁCH VÀ QUY ĐỊNH CHUNG</strong></p>
        <ul>
          <li>Áp dụng các chính sách giá, chính sách đại lý và quy định về sản phẩm.</li>
          <li>Quy định về đổi trả hàng hóa, bảo hành.</li>
        </ul>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 9. HOA HỒNG VÀ THANH TOÁN</strong></p>
        <ul>
          <li>Tỉ lệ hoa hồng Cấp 1: <strong>{contract.commissionL1 ?? 20}%</strong></li>
          <li>Tỉ lệ hoa hồng Cấp 2: <strong>{contract.commissionL2 ?? 10}%</strong></li>
          <li>Tỉ lệ hoa hồng Cấp 3: <strong>{contract.commissionL3 ?? 3}%</strong></li>
          <li>Tổng hoa hồng tích lũy đã nhận: <strong>{fmt(contract.totalCommission)} VNĐ</strong></li>
        </ul>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 10. GIẢI QUYẾT TRANH CHẤP</strong></p>
        <ul>
          <li>Tranh chấp được giải quyết thông qua thương lượng và hòa giải.</li>
          <li>Nếu không thành, tranh chấp sẽ được đưa ra Tòa án có thẩm quyền tại Đà Nẵng giải quyết.</li>
        </ul>
      </div>

      <p style={{ fontSize: 11, marginTop: 12, lineHeight: 1.6 }}>
        Hai bên cam kết thực hiện đầy đủ các điều khoản đã thỏa thuận trong hợp đồng này.
        Mọi thay đổi bổ sung phải được sự đồng ý bằng văn bản của cả hai bên.
        Hợp đồng được lập thành [số lượng] bản có giá trị pháp lý như nhau.
      </p>

      {/* Ký tên */}
      <div className="pdf-sign-row">
        <div className="pdf-sign-block">
          <p><strong>ĐẠI DIỆN CÁC BÊN</strong></p>
          <p><strong>BÊN A</strong></p>
          <p><em>(Ký, ghi rõ họ tên và đóng dấu)</em></p>
          <div className="pdf-sign-stamp">
            <div className="pdf-stamp-circle">
              <span>CÔNG TY CP<br />PHẦN MỀM<br />SIVIP</span>
            </div>
            <div className="pdf-sign-line" />
            <p><strong>Nguyễn Văn Sáng</strong></p>
          </div>
        </div>
        <div className="pdf-sign-block">
          <p><strong>BÊN B</strong></p>
          <p><em>(Ký, ghi rõ họ tên)</em></p>
          <div className="pdf-sign-stamp" style={{ paddingTop: 40 }}>
            <div className="pdf-sign-line" />
            <p><strong>{contract.partnerName}</strong></p>
          </div>
        </div>
      </div>

      <div className="pdf-page-num">Trang 2/2</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Modal
═══════════════════════════════════════════════ */
function Partnercontractpdfmodal({ contract, onClose }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom,        setZoom        ] = useState(1);
  const [layout,      setLayout      ] = useState("double"); // "double" | "single"
  const printRef = useRef();

  const totalPages = 2;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>${contract.code}</title>
          <style>
            body { font-family: "Times New Roman", serif; font-size: 12px; margin: 20mm; }
            .pdf-page-content { page-break-after: always; }
            .pdf-header-nation { text-align: center; margin-bottom: 16px; }
            .pdf-title-block { text-align: center; margin-bottom: 16px; }
            .pdf-party { margin-bottom: 12px; }
            .pdf-clause { margin-bottom: 10px; }
            .pdf-sign-row { display: flex; justify-content: space-between; margin-top: 24px; }
            .pdf-sign-block { text-align: center; width: 45%; }
            .pdf-stamp-circle { display: none; }
            .pdf-page-num { display: none; }
            ul { margin: 4px 0 4px 16px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.print();
    win.close();
  };

  const pages = [<Page1 key={1} contract={contract} />, <Page2 key={2} contract={contract} />];

  return (
    <div className="pdf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pdf-modal">

        {/* ── Header bar ── */}
        <div className="pdf-modal-bar">
          <span className="pdf-modal-code">{contract.code}</span>
          <div className="pdf-modal-tools">
            {/* Layout toggle */}
            <button
              className={`pdf-tool-btn ${layout === "single" ? "pdf-tool-btn--active" : ""}`}
              onClick={() => setLayout("single")}
              title="Xem 1 trang"
            >▪</button>
            <button
              className={`pdf-tool-btn ${layout === "double" ? "pdf-tool-btn--active" : ""}`}
              onClick={() => setLayout("double")}
              title="Xem 2 trang"
            >▪▪</button>

            {/* Zoom */}
            <button
              className="pdf-tool-btn"
              onClick={() => setZoom((z) => Math.min(z + 0.1, 1.5))}
              title="Phóng to"
            >⊕</button>
            <button
              className="pdf-tool-btn"
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.6))}
              title="Thu nhỏ"
            >⊖</button>

            {/* Download / Print */}
            <button className="pdf-tool-btn" onClick={handlePrint} title="In / Tải xuống">
              ⬇
            </button>
          </div>
          <button className="pdf-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Content ── */}
        <div className="pdf-modal-body">

          {layout === "double" ? (
            /* ── 2 trang cạnh nhau ── */
            <div className="pdf-double-view" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
              {/* Trang trái */}
              <div className="pdf-sheet">
                {pages[0]}
              </div>
              {/* Trang phải */}
              <div className="pdf-sheet">
                {pages[1]}
              </div>
            </div>
          ) : (
            /* ── 1 trang ── */
            <div className="pdf-single-view">
              {/* Prev */}
              <button
                className="pdf-nav-btn pdf-nav-btn--left"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>

              <div
                className="pdf-sheet"
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
              >
                {pages[currentPage - 1]}
              </div>

              {/* Next */}
              <button
                className="pdf-nav-btn pdf-nav-btn--right"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* ── Footer bar ── */}
        <div className="pdf-modal-footer">
          <span className="pdf-footer-info">
            {layout === "single"
              ? `Trang ${currentPage}/${totalPages}`
              : `Trang 1-2/${totalPages}`}
          </span>
        </div>

        {/* Hidden content for print */}
        <div ref={printRef} style={{ display: "none" }}>
          <Page1 contract={contract} />
          <Page2 contract={contract} />
        </div>
      </div>
    </div>
  );
}

export default Partnercontractpdfmodal;