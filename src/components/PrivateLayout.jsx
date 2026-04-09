import { Outlet } from "react-router-dom";
import HeaderLogin from "../components/HeaderLogin";
import Sidebar     from "../components/Sidebar";

function PrivateLayout() {
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