import { Component } from "react";

/**
 * Bắt mọi lỗi render trong cây con và hiển thị fallback thay vì trắng màn hình.
 * Mục đích chính: khi data lệch / cycle / undefined property → user nhìn thấy
 * thông báo + nút reload thay vì màn hình trắng không debug được.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error?.message || String(this.state.error);
    return (
      <div style={{
        padding: 32, maxWidth: 720, margin: "40px auto",
        background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12,
        color: "#9a3412", fontFamily: "system-ui, sans-serif",
      }}>
        <h2 style={{ margin: 0, marginBottom: 12 }}>⚠️ Trang gặp lỗi</h2>
        <p style={{ margin: "0 0 8px" }}>
          Một lỗi đã xảy ra khi hiển thị trang này. Bạn có thể thử:
        </p>
        <ul style={{ margin: "0 0 16px 20px", padding: 0 }}>
          <li>Tải lại trang (<strong>Ctrl/Cmd + Shift + R</strong>) để xoá cache.</li>
          <li>Đăng xuất rồi đăng nhập lại.</li>
          <li>Báo cho admin với thông tin lỗi bên dưới.</li>
        </ul>
        <pre style={{
          background: "#fff", padding: 12, borderRadius: 6,
          fontSize: 12, color: "#7c2d12", overflowX: "auto",
          border: "1px solid #fed7aa",
        }}>{msg}</pre>
        <button
          onClick={this.reset}
          style={{
            marginTop: 14, padding: "8px 18px", borderRadius: 8,
            background: "#ea580c", color: "#fff", border: "none",
            fontWeight: 600, cursor: "pointer",
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
