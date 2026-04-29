/**
 * src/pages/admin/Customercontractpdfmodal.jsx
 *
 * Modal xem trước HĐ Khách hàng dạng PDF — sinh từ contract data.
 * Dùng chung style "pdf-page" với PartnerContractPDFModal.
 */

import "./Partnercontractpage.css";

const fmt     = (n) => new Intl.NumberFormat("vi-VN").format(n || 0);
const fmtDate = (d) => d || "___/___/______";

function Page1({ contract }) {
  return (
    <div className="pdf-page-content">
      <div className="pdf-header-nation">
        <p><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></p>
        <p><em>Độc lập – Tự do – Hạnh phúc</em></p>
        <p>————————</p>
      </div>

      <div className="pdf-title-block">
        <p><strong>HỢP ĐỒNG DỊCH VỤ (ĐỐI TÁC – KHÁCH HÀNG)</strong></p>
        <p>Số: {contract.code}/2026/SIVIP</p>
      </div>

      <p className="pdf-intro">
        Hôm nay, ngày {fmtDate(contract.signDate)}, chúng tôi gồm các bên:
      </p>

      <div className="pdf-party">
        <p><strong>BÊN A (Đối tác):</strong></p>
        <p>Họ tên/Đối tác: {contract.partnerName}</p>
        <p>Mã đối tác: {contract.partnerCode}</p>
        <p>(Sau đây gọi là "Bên A")</p>
      </div>

      <div className="pdf-party">
        <p><strong>BÊN B (Khách hàng):</strong></p>
        <p>Tên khách hàng: {contract.customerName}</p>
        <p>Mã số thuế: {contract.customerTax || "___"}</p>
        <p>Điện thoại: {contract.customerPhone || "___"}</p>
        <p>Địa chỉ: {contract.customerAddress || "___"}</p>
        <p>(Sau đây gọi là "Bên B")</p>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 1. NỘI DUNG HỢP ĐỒNG</strong></p>
        <ul>
          <li>Bên A cung cấp dịch vụ/sản phẩm theo thoả thuận giữa hai bên.</li>
          <li>Bên B thanh toán đầy đủ theo các điều khoản tại Điều 3.</li>
        </ul>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 2. THỜI HẠN HỢP ĐỒNG</strong></p>
        <ul>
          <li>Hiệu lực từ: {fmtDate(contract.signDate)}</li>
          <li>Đến: {fmtDate(contract.expireDate)}</li>
          <li>Hết hạn có thể được gia hạn theo thoả thuận của hai bên.</li>
        </ul>
      </div>
    </div>
  );
}

function Page2({ contract }) {
  return (
    <div className="pdf-page-content">
      <div className="pdf-clause">
        <p><strong>ĐIỀU 3. GIÁ TRỊ HỢP ĐỒNG VÀ THANH TOÁN</strong></p>
        <ul>
          <li>Tổng giá trị hợp đồng: <strong>{fmt(contract.value)} đ</strong></li>
          <li>Hoa hồng đối tác: <strong>{fmt(contract.commission)} đ</strong> (10% giá trị HĐ)</li>
          <li>Thanh toán bằng chuyển khoản hoặc tiền mặt theo thoả thuận.</li>
        </ul>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 4. QUYỀN VÀ NGHĨA VỤ CÁC BÊN</strong></p>
        <ul>
          <li>Bên A đảm bảo cung cấp dịch vụ đúng thoả thuận, hỗ trợ kỹ thuật.</li>
          <li>Bên B sử dụng dịch vụ đúng mục đích, thanh toán đúng hạn.</li>
        </ul>
      </div>

      <div className="pdf-clause">
        <p><strong>ĐIỀU 5. ĐIỀU KHOẢN CHUNG</strong></p>
        <ul>
          <li>Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng.</li>
          <li>Mọi tranh chấp ưu tiên giải quyết bằng thương lượng; nếu không thoả thuận được sẽ đưa ra Toà án có thẩm quyền tại Đà Nẵng.</li>
          <li>Hợp đồng có hiệu lực kể từ ngày ký.</li>
        </ul>
      </div>

      <div className="pdf-signature-row">
        <div className="pdf-signature-block">
          <p><strong>BÊN A</strong></p>
          <p>(Ký, ghi rõ họ tên)</p>
        </div>
        <div className="pdf-signature-block">
          <p><strong>BÊN B</strong></p>
          <p>(Ký, ghi rõ họ tên)</p>
        </div>
      </div>
    </div>
  );
}

function CustomerContractPDFModal({ contract, onClose }) {
  if (!contract) return null;
  return (
    <div className="pdf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pdf-modal">
        <div className="pdf-modal-header">
          <span className="pdf-modal-title">📄 Xem trước hợp đồng — {contract.code}</span>
          <button className="pdf-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="pdf-modal-body">
          <div className="pdf-page-pair">
            <div className="pdf-page">
              <div className="pdf-page-num">Trang 1 / 2</div>
              <Page1 contract={contract} />
            </div>
            <div className="pdf-page">
              <div className="pdf-page-num">Trang 2 / 2</div>
              <Page2 contract={contract} />
            </div>
          </div>
        </div>

        <div className="pdf-modal-footer">
          <button className="pcp-btn-back" onClick={onClose}>Đóng</button>
          {contract.contractFile && (
            <a
              href={`/${contract.contractFile}`}
              download={contract.contractFile}
              className="pcp-btn-download"
              style={{ marginLeft: 8 }}
            >
              ⬇ Tải file gốc
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerContractPDFModal;
