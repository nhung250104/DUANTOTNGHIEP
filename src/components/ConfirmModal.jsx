import "./ConfirmModal.css";

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="cm-overlay">
      <div className="cm-modal">

        {/* Header */}
        <div className="cm-header">
          <h3>{title}</h3>
        </div>

        {/* Body */}
        <div className="cm-body">
          <p>{message}</p>
        </div>

        {/* Footer */}
        <div className="cm-footer">
          <button className="cm-btn cm-btn-cancel" onClick={onCancel}>
            Hủy
          </button>
          <button className="cm-btn cm-btn-danger" onClick={onConfirm}>
            Xóa
          </button>
        </div>

      </div>
    </div>
  );
}

export default ConfirmModal;