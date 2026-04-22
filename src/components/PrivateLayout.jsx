import { Outlet, Navigate } from "react-router-dom";
import HeaderLogin from "../components/HeaderLogin";
import Sidebar     from "../components/Sidebar";
import useAuthStore from "../store/authStore";

function PrivateLayout({ adminOnly = false }) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;

  if (adminOnly && user.role?.toLowerCase() !== "admin")
    return <Navigate to="/dashboard" replace />;

  return (
    <div className="private-root">

      {/* Header full width */}
      <HeaderLogin />

      {/* Body: sidebar + content */}
      <div className="private-body">
        <Sidebar />
        <main className="private-content">
          <Outlet />
        </main>
      </div>

    </div>
  );
}

export default PrivateLayout;