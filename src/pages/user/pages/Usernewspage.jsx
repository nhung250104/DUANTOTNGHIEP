import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import newsService from "../../../store/newsService";
import "./Usernewspage.css";

const CATEGORIES = ["Tất cả","Sản phẩm","Bảo mật","Hướng dẫn","Marketing","Văn hóa","Công cụ","Kinh doanh","Công nghệ","Tài chính"];

function Usernewspage() {
  const navigate = useNavigate();

  const [category, setCategory] = useState("Tất cả");
  const [search,   setSearch  ] = useState("");
  const [posts,    setPosts   ] = useState([]);
  const [loading,  setLoading ] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await newsService.getAll();
        setPosts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const filtered = posts.filter((p) => {
    const matchCat    = category === "Tất cả" || p.category === category;
    const matchSearch = p.title?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) return <p style={{ padding: 20 }}>Đang tải tin tức...</p>;

  return (
    <div>
      {/* ── Header — không có nút tạo ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Tin tức</h1>
          <p>Cập nhật tin tức mới nhất</p>
        </div>
      </div>

      {/* Search */}
      <div className="news-search-wrap">
        <span className="news-search-icon">🔍</span>
        <input
          className="news-search"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="news-tabs">
        {CATEGORIES.map((cat) => (
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
      {filtered.length === 0 ? (
        <div className="un-empty">
          <p>Không tìm thấy bài viết nào.</p>
        </div>
      ) : (
        <div className="news-grid">
          {filtered.map((post) => (
            <div
              key={post.id}
              className="news-card"
              onClick={() => navigate(`/news/${post.id}`)}
            >
              <div className="news-card-img">
                <img src={post.image || "https://picsum.photos/400/240"} alt={post.title} />
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
      )}
    </div>
  );
}

export default Usernewspage;