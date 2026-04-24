import { NavLink } from "react-router-dom";
import "./PrivateLayout.css";
import useAuthStore from "../store/authStore";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  GitBranch,
  FileCheck,
  User,
  Newspaper,
  FolderOpen,
  Users,
} from "lucide-react";

/* ─── Menu theo role ─────────────────────────────────────── */
const ADMIN_MENU = [
  { path: "/admin/news",               icon: Newspaper,  label: "Tin tức"              },
  { path: "/admin/users",              icon: Users,      label: "Quản lý người dùng"   },
  { path: "/admin/stats",              icon: BarChart3,  label: "Thống kê"             },
  { path: "/admin/partners",           icon: FolderOpen, label: "Hồ sơ đối tác"       },
  { path: "/admin/orgchart",           icon: GitBranch,  label: "Sơ đồ cây"           },
  { path: "/admin/partner-contracts",  icon: FileCheck,  label: "Hợp đồng đối tác"    },
  { path: "/admin/customer-contracts", icon: FileText,   label: "Hợp đồng Khách hàng" },
  { path: "/admin/account",            icon: User,       label: "Tài khoản"            },
];

const MEMBER_MENU = [
  { path: "/dashboard",           icon: LayoutDashboard, label: "Trang chủ"           },
  { path: "/my-profile",          icon: User,            label: "Thông tin cá nhân"   },
  { path: "/partner-contract",    icon: FolderOpen,      label: "Hồ sơ đối tác"       },
  { path: "/upgrade-requests",    icon: GitBranch,       label: "Nâng cấp đối tác"    },
  { path: "/hop-dong-doi-tac",    icon: FileCheck,       label: "Hợp đồng đối tác"    },
  { path: "/hop-dong-khach-hang", icon: FileText,        label: "Hợp đồng khách hàng" },
  { path: "/my-stats",            icon: BarChart3,       label: "Thống kê"            },
];

/* ─── Component ──────────────────────────────────────────── */
function Sidebar() {
  const user = useAuthStore((s) => s.user);

  // ✅ So sánh không phân biệt hoa thường
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const menu    = isAdmin ? ADMIN_MENU : MEMBER_MENU;

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "sidebar-item--active" : ""}`
              }
            >
              <span className="sidebar-icon">
                <Icon size={18} />
              </span>
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;