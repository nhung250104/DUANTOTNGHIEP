import "./NewsFormModal.css";
import { useState, useRef, useEffect } from "react";

const CATEGORIES = ["Sản phẩm","Bảo mật","Hướng dẫn","Marketing","Văn hóa","Công cụ","Kinh doanh","Công nghệ","Tài chính"];

/* ─── Mini rich text toolbar ────────────────────────────── */
const ToolbarBtn = ({ label, onClick }) => (
  <button type="button" className="toolbar-btn" onClick={onClick}>{label}</button>
);

/* ─── Helper: file → base64 ─────────────────────────────── */
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result); // "data:image/png;base64,..."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function NewsFormModal({ post, onSave, onDelete, onClose }) {
  const isEdit = Boolean(post);

  const [form, setForm] = useState({
    title:    post?.title    || "",
    category: post?.category || "",
    desc:     post?.desc     || "",
    content:  post?.content  || "",
  });

  const [imagePreview, setImagePreview] = useState(post?.image || null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    if (post) {
      setForm({
        title:    post.title    || "",
        category: post.category || "",
        desc:     post.desc     || "",
        content:  post.content  || "",
      });
      setImagePreview(post.image || null);
    } else {
      setForm({ title: "", category: "", desc: "", content: "" });
      setImagePreview(null);
    }
  }, [post]);

  const imageRef = useRef();
  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  /* ── Convert ảnh sang base64 thay vì blob URL ── */
  const onImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra kích thước (giới hạn 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 2MB.");
      return;
    }

    try {
      setImageLoading(true);
      const base64 = await toBase64(file);
      setImagePreview(base64); // lưu base64, không phải blob URL
    } catch {
      alert("Không thể đọc file ảnh. Vui lòng thử lại.");
    } finally {
      setImageLoading(false);
    }
  };

  const exec = (cmd, value = null) => document.execCommand(cmd, false, value);

  const handleSubmit = () => {
    if (!form.title.trim()) { alert("Vui lòng nhập tiêu đề."); return; }
    if (!form.category)     { alert("Vui lòng chọn danh mục."); return; }
    // imagePreview là base64 string → lưu thẳng vào db
    onSave({ ...form, image: imagePreview });
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {isEdit ? "✏️ Chỉnh sửa bài viết" : "📋 Tạo bài viết mới"}
            </h2>
            <p className="modal-subtitle">
              {isEdit ? "Chỉnh sửa bài viết đã đăng" : "Đăng bài viết mới lên trang tin tức"}
            </p>
          </div>
        </div>

        <div className="modal-body">

          {/* Tiêu đề */}
          <div className="mf-field">
            <label>Tiêu đề bài viết</label>
            <input
              name="title"
              className="mf-input"
              placeholder="Nhập tiêu đề cho bài viết..."
              value={form.title}
              onChange={onChange}
            />
          </div>

          {/* Danh mục */}
          <div className="mf-field">
            <label>Danh mục</label>
            <select name="category" className="mf-select" value={form.category} onChange={onChange}>
              <option value="">Chọn danh mục</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Mô tả ngắn */}
          <div className="mf-field">
            <label>Mô tả ngắn</label>
            <input
              name="desc"
              className="mf-input"
              placeholder="Tóm tắt nội dung bài viết..."
              value={form.desc}
              onChange={onChange}
            />
          </div>

          {/* Nội dung */}
          <div className="mf-field">
            <label>Nội dung bài viết</label>
            <div className="editor-wrap">
              <div className="editor-toolbar">
                <ToolbarBtn label="B"  onClick={() => exec("bold")} />
                <ToolbarBtn label="I"  onClick={() => exec("italic")} />
                <ToolbarBtn label="U"  onClick={() => exec("underline")} />
                <span className="toolbar-sep" />
                <ToolbarBtn label="H1" onClick={() => exec("formatBlock", "h1")} />
                <ToolbarBtn label="H2" onClick={() => exec("formatBlock", "h2")} />
                <ToolbarBtn label="H3" onClick={() => exec("formatBlock", "h3")} />
                <span className="toolbar-sep" />
                <ToolbarBtn label="≡"  onClick={() => exec("insertUnorderedList")} />
                <ToolbarBtn label="≣"  onClick={() => exec("insertOrderedList")} />
                <span className="toolbar-sep" />
                <ToolbarBtn label="⬛" onClick={() => exec("justifyLeft")} />
                <ToolbarBtn label="▬"  onClick={() => exec("justifyFull")} />
              </div>
              <div
                className="editor-area"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => {
                  const html = e.currentTarget.innerHTML;
                  setForm((prev) => ({ ...prev, content: html }));
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData("text/plain");
                  document.execCommand("insertText", false, text);
                }}
                ref={(el) => {
                  if (el && el.innerHTML !== form.content) {
                    el.innerHTML = form.content || "";
                  }
                }}
              />
            </div>
          </div>

          {/* Ảnh đại diện */}
          <div className="mf-field">
            <label>Ảnh đại diện (Tỉ lệ 16:9, tối đa 2MB)</label>
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onImage}
            />
            <div
              onClick={() => !imageLoading && imageRef.current?.click()}
              style={{
                position:     "relative",
                width:        "100%",
                aspectRatio:  "16/9",
                border:       "2px dashed #cbd5e1",
                borderRadius: 10,
                overflow:     "hidden",
                cursor:       imageLoading ? "wait" : "pointer",
                background:   "#f8fafc",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
              }}
            >
              {imageLoading ? (
                <span style={{ color: "#94a3b8", fontSize: 14 }}>⏳ Đang xử lý...</span>
              ) : imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {/* Overlay khi hover */}
                  <div style={{
                    position:        "absolute",
                    inset:           0,
                    background:      "rgba(0,0,0,0.45)",
                    display:         "flex",
                    alignItems:      "center",
                    justifyContent:  "center",
                    color:           "#fff",
                    fontSize:        14,
                    fontWeight:      600,
                    opacity:         0,
                    transition:      "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                  >
                    📷 Click để đổi ảnh
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: 32 }}>📷</div>
                  <p style={{ fontSize: 13, marginTop: 8 }}>Click để chọn ảnh</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="mf-btn-cancel" type="button" onClick={onClose}>
            ✕ Hủy
          </button>
          {isEdit && onDelete && (
            <button className="mf-btn-delete" type="button" onClick={onDelete}>
              🗑 Xóa bài viết
            </button>
          )}
          <button className="mf-btn-save" type="button" onClick={handleSubmit} disabled={imageLoading}>
            ✓ {isEdit ? "Lưu" : "Đăng"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default NewsFormModal;