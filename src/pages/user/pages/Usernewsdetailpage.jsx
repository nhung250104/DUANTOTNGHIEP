import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import newsService from "../../../store/newsService";
import "./Usernewsdetailpage.css";

function Usernewsdetailpage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [post,    setPost   ] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await newsService.getById(id);
        setPost(data);
      } catch (err) {
        console.error("Lỗi lấy bài viết:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) return <p style={{ padding: 20 }}>Đang tải bài viết...</p>;
  if (!post)   return <p style={{ padding: 20 }}>Không tìm thấy bài viết.</p>;

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn-back" onClick={() => navigate("/news")}>
            ← Quay lại
          </button>
          <div style={{ marginTop: 8 }}>
            <h1>Tin tức</h1>
            <p>Cập nhật tin tức mới nhất</p>
          </div>
        </div>
        {/* Không có nút tạo bài viết */}
      </div>

      {/* ── Body ── */}
      <div className="detail-body">

        {/* LEFT — nội dung bài viết */}
        <div className="detail-main">
          <img
            src={post.image || "https://picsum.photos/900/400"}
            alt={post.title}
            className="detail-cover"
          />

          <div className="detail-content">
            <span className="detail-badge">{post.category}</span>
            <h2 className="detail-title">{post.title}</h2>

            <div className="detail-meta">
              <span>👤 {post.author}</span>
              <span>📅 {post.date}</span>
              <span>👁 {post.views?.toLocaleString()}</span>
            </div>

            <div
              className="detail-html"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </div>

        {/* RIGHT — thông tin bài viết, không có nút sửa/xóa */}
        <div className="detail-sidebar">
          <div className="detail-info-card">
            <h3 className="detail-info-title">Thông tin bài viết</h3>

            <div className="detail-info-row">
              <span className="detail-info-label">Danh mục</span>
              <span className="detail-info-value detail-info-cat">
                {post.category}
              </span>
            </div>

            <div className="detail-info-row">
              <span className="detail-info-label">Tác giả</span>
              <span className="detail-info-value">{post.author}</span>
            </div>

            <div className="detail-info-row">
              <span className="detail-info-label">Ngày đăng</span>
              <span className="detail-info-value">{post.date}</span>
            </div>

            <div className="detail-info-row">
              <span className="detail-info-label">Ngày cập nhật</span>
              <span className="detail-info-value">{post.updatedAt || "—"}</span>
            </div>

            {/* Không có detail-actions (nút sửa/xóa) */}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Usernewsdetailpage;