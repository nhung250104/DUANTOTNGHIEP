import React from "react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import "./App.css";

// ===== Public Pages =====
import Home from "./pages/Home";

// ===== Auth Pages =====
import Login           from "./pages/user/auth/Login";
import Fogotpass       from "./pages/user/auth/Fogotpass";
import Register        from "./pages/user/auth/Register";
import PendingApproval from "./pages/user/auth/PendingApproval";

// ===== Admin Pages =====
import Newspage                  from "./pages/admin/Newspage";
import Newsdetailpage            from "./pages/admin/Newsdetailpage";
import Userspage                 from "./pages/admin/Userspage";
import Userdetailpage            from "./pages/admin/Userdetailpage";
import Accountpage               from "./pages/admin/Accountpage";
import Partnerprofilepage        from "./pages/admin/Partnerprofilepage";
import Partnerdetailpage         from "./pages/admin/Partnerdetailpage";
import Orgchartpage              from "./pages/admin/Orgchartpage";
import Customercontractpage      from "./pages/admin/Customercontractpage";
import Customercontractdetail    from "./pages/admin/Customercontractdetail";
import Customercontractcreate    from "./pages/admin/Customercontractcreate";
import Partnercontractlistpage   from "./pages/admin/Partnercontractlistpage";
import Partnercontractdetailpage from "./pages/admin/Partnercontractdetailpage";
import Statspage                 from "./pages/admin/Statspage";
import Commissionpage            from "./pages/admin/Commissionpage";

// ===== User Pages =====
import Usernewspage       from "./pages/user/pages/Usernewspage";
import Usernewsdetailpage from "./pages/user/pages/Usernewsdetailpage";
import Upgraderequestpage from "./pages/user/pages/Upgraderequestpage";
import Partnercontractpage from "./pages/user/pages/Partnercontractpage";

// ===== Components =====
import Header        from "./components/Header";
import Footer        from "./components/Footer";
import PrivateLayout from "./components/PrivateLayout";

// ===== Layouts =====
const MainLayout = () => (
  <div className="main-wrapper">
    <Header />
    <main className="content-area"><Outlet /></main>
    <Footer />
  </div>
);

const AuthLayout = () => <Outlet />;

function App() {
  return (
    <Routes>

      {/* ── Public (Header + Footer) ── */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
      </Route>

      {/* ── Auth (không có Header/Footer) ── */}
      <Route element={<AuthLayout />}>
        <Route path="/login"            element={<Login />} />
        <Route path="/forgot-password"  element={<Fogotpass />} />
        <Route path="/register"         element={<Register />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
      </Route>

      {/* ── Admin (sidebar + header) ── */}
      <Route path="/admin" element={<PrivateLayout adminOnly />}>
        <Route index element={<Navigate to="/admin/news" replace />} />

        {/* Tin tức */}
        <Route path="news"     element={<Newspage />} />
        <Route path="news/:id" element={<Newsdetailpage />} />

        {/* Quản lý người dùng */}
        <Route path="users"     element={<Userspage />} />
        <Route path="users/:id" element={<Userdetailpage />} />

        {/* Tài khoản */}
        <Route path="account" element={<Accountpage />} />

        {/* Hồ sơ đối tác */}
        <Route path="partners"                             element={<Partnerprofilepage />} />
        <Route path="partners-profile/:id"                element={<Partnerdetailpage />} />
        {/* ✅ FIX: thêm route hoa hồng */}
        <Route path="partners-profile/:id/commission"     element={<Commissionpage />} />

        {/* Sơ đồ đối tác */}
        <Route path="orgchart" element={<Orgchartpage />} />

        {/* Hợp đồng đối tác */}
        <Route path="partner-contracts"                   element={<Partnercontractlistpage />} />
        {/* ✅ FIX: đổi :type → :source cho đúng với useParams().source */}
        <Route path="partner-contracts/:source/:id"       element={<Partnercontractdetailpage />} />

        {/* Hợp đồng khách hàng (admin) */}
        {/* ✅ FIX: bỏ /admin/ ở đầu vì đã lồng trong /admin */}
        <Route path="customer-contracts"                  element={<Customercontractpage isAdmin />} />
        <Route path="customer-contracts/:id"              element={<Customercontractdetail isAdmin />} />
        <Route path="customer-contracts/tao-moi"          element={<Customercontractcreate />} />

        {/* Thống kê */}
        <Route path="stats" element={<Statspage />} />
      </Route>

      {/* ── User (sidebar + header) ── */}
      <Route element={<PrivateLayout />}>
        <Route path="/dashboard" element={<Usernewspage />} />
        <Route path="/news/:id"  element={<Usernewsdetailpage />} />

        {/* Nâng cấp */}
        <Route path="/upgrade-requests"                   element={<Upgraderequestpage />} />

        {/* Hợp đồng đối tác (user) */}
        <Route path="/partner-contract"                   element={<Partnercontractpage />} />
        <Route path="/hop-dong-doi-tac"                   element={<Partnercontractlistpage />} />
        <Route path="/hop-dong-doi-tac/:source/:id"       element={<Partnercontractdetailpage />} />
        {/* ✅ Hoa hồng cho user tự xem */}
        <Route path="/hop-doi-tac/:id/commission"         element={<Commissionpage />} />

        {/* Hợp đồng khách hàng (user) */}
        <Route path="/hop-dong-khach-hang"                element={<Customercontractpage />} />
        {/* ✅ FIX: tao-moi phải đặt TRƯỚC :id để không bị match nhầm */}
        <Route path="/hop-dong-khach-hang/tao-moi"        element={<Customercontractcreate />} />
        <Route path="/hop-dong-khach-hang/:id"            element={<Customercontractdetail />} />
      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}

export default App;