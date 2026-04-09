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
import Newspage           from "./pages/admin/Newspage";
import Newsdetailpage     from "./pages/admin/Newsdetailpage";
import Userspage          from "./pages/admin/Userspage";
import Userdetailpage     from "./pages/admin/Userdetailpage";
import Accountpage        from "./pages/admin/Accountpage";
import Partnerprofilepage from "./pages/admin/Partnerprofilepage";
import Partnerdetailpage  from "./pages/admin/Partnerdetailpage";
import Orgchartpage       from "./pages/admin/Orgchartpage";
import Customercontractpage from "./pages/admin/Customercontractpage";
import Customercontractdetail from "./pages/admin/Customercontractdetail";
import Customercontractcreate from "./pages/admin/Customercontractcreate";
import Partnercontractlistpage from "./pages/admin/Partnercontractlistpage";
import Partnercontractdetailpage from "./pages/admin/Partnercontractdetailpage";
import Partnercontractpdfmodal from "./pages/admin/Partnercontractpdfmodal";

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
      <Route path="/admin" element={<PrivateLayout />}>
        <Route index                         element={<Navigate to="/admin/news" replace />} />
        <Route path="news"                   element={<Newspage />} />
        <Route path="news/:id"               element={<Newsdetailpage />} />
        <Route path="users"                  element={<Userspage />} />
        <Route path="users/:id"              element={<Userdetailpage />} />
        <Route path="account"                element={<Accountpage />} />
        <Route path="partners"               element={<Partnerprofilepage />} />
        <Route path="partners-profile/:id"   element={<Partnerdetailpage />} />
        <Route path="orgchart"               element={<Orgchartpage />} />
        <Route path="/admin/customer-contracts"        element={<Customercontractpage isAdmin />} />
        <Route path="/admin/customer-contracts/:id"    element={<Customercontractdetail isAdmin />} />
        <Route path="/admin/customer-contracts/tao-moi" element={<Customercontractcreate />} />
        <Route path="/admin/partner-contracts"        element={<Partnercontractlistpage />} />
        <Route path="/admin/partner-contracts/:id"    element={<Partnercontractdetailpage />} />
        <Route path="/admin/partner-contracts/pdf" element={<Partnercontractpdfmodal />} />
              </Route>

      {/* ── User (sidebar + header) ── */}
      <Route element={<PrivateLayout />}>
        <Route path="/dashboard" element={<Usernewspage />} />
        <Route path="/news/:id"  element={<Usernewsdetailpage />} />
        <Route path="upgrade-requests" element={<Upgraderequestpage />} />
        <Route path="partner-contract" element={<Partnercontractpage />} />
        <Route path="/hop-dong-khach-hang"             element={<Customercontractpage />} />
        <Route path="/hop-dong-khach-hang/:id"         element={<Customercontractdetail />} />
        <Route path="/hop-dong-khach-hang/tao-moi"     element={<Customercontractcreate />} />
      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}

export default App;