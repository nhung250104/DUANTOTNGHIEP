import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NewsFormModal from "./NewsFormModal";
import newsService from "../../store/newsService"; 
import "./Newspage.css";

const CATEGORIES = ["Tất cả","Sản phẩm","Bảo mật","Hướng dẫn","Marketing","Văn hóa","Công cụ","Kinh doanh","Công nghệ","Tài chính"];

function NewsPage() {
  const navigate = useNavigate();

  const [category, setCategory] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPost, setEditPost] = useState(null);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await newsService.getAll();
        setPosts(data); // ⚠️ nếu backend trả {data: []} thì sửa thành data.data
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Lọc + sort id giảm dần (mới nhất lên đầu)
  const filtered = posts
    .filter(p => {
      const matchCat = category === "Tất cả" || p.category === category;
      const matchSearch = p.title?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => Number(b.id) - Number(a.id));

  const openCreate = () => {
    setEditPost(null);
    setModalOpen(true);
  };

  const openEdit = (post) => {
    setEditPost(post);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (editPost) {
        await newsService.update(editPost.id, data);
      } else {
        const user = JSON.parse(localStorage.getItem("user"));

        const newPost = {
          ...data,
          author: user?.name || "Admin",
          date: new Date().toLocaleString("vi-VN"),
          views: 0,
          image: data.image || "https://picsum.photos/400/240",
        };

        await newsService.create(newPost);
      }
      const newData = await newsService.getAll();
      setPosts(newData);

      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ DELETE
  const handleDelete = async (id) => {
    if (!window.confirm("Xác nhận xóa bài viết này?")) return;

    try {
      await newsService.delete(id);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ BƯỚC 3: LOADING
  if (loading) {
    return <p style={{ padding: 20 }}>Đang tải tin tức...</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Tin tức</h1>
          <p>Cập nhật tin tức mới nhất</p>
        </div>
        <button className="btn-create" onClick={openCreate}>
          + Tạo bài viết mới
        </button>
      </div>

      {/* Search */}
      <div className="news-search-wrap">
        <span className="news-search-icon">🔍</span>
        <input
          className="news-search"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="news-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`news-tab ${category === cat ? "news-tab--active" : ""}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="news-grid">
        {filtered.map(post => (
          <div
            key={post.id}
            className="news-card"
            onClick={() => navigate(`/admin/news/${post.id}`)}
          >
            <div className="news-card-img">
              <img src={post.image} alt={post.title} />
              <span className="news-card-badge">{post.category}</span>
            </div>

            <div className="news-card-body">
              <h3 className="news-card-title">{post.title}</h3>
              <p className="news-card-desc">{post.desc}</p>

              <div className="news-card-meta">
                <span>👤 {post.author}</span>
                <span>📅 {post.date}</span>
                <span>👁 {post.views?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <NewsFormModal
          post={editPost}
          onSave={handleSave}
          onDelete={editPost ? () => { handleDelete(editPost.id); setModalOpen(false); } : null}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export default NewsPage;