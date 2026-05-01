/**
 * src/components/BackButton.jsx
 *
 * Nút "← Quay lại" thống nhất cho mọi trang chi tiết.
 * - Mặc định gọi navigate(-1).
 * - Có thể override bằng prop `to` (string path) hoặc `onClick`.
 */

import { useNavigate } from "react-router-dom";

function BackButton({ to, onClick, label = "Quay lại", style }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (onClick) return onClick(e);
    if (to)      return navigate(to);
    navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px",
        fontSize: 13, fontWeight: 600,
        background: "#fff",
        color: "#0f766e",
        border: "1px solid #0d9488",
        borderRadius: 8,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#0d9488";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#fff";
        e.currentTarget.style.color = "#0f766e";
      }}
    >
      ← {label}
    </button>
  );
}

export default BackButton;
