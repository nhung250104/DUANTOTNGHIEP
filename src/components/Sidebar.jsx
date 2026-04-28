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
  Percent,
  Shuffle,
  UserPlus,
  History,
  ScrollText,
} from "lucide-react";

/* ─── Menu theo role ─────────────────────────────────────── */
// Yêu cầu chuyển nhánh & yêu cầu chỉnh sửa HH không nằm trên menu nữa,
// truy cập qua button trong các trang Sơ đồ cây / Hợp đồng đối tác.
const ADMIN_MENU = [
  { path: "/admin/news",                 icon: Newspaper,  label: "Tin tức"                  },
  { path: "/admin/users",                icon: Users,      label: "Quản lý người dùng"       },
  { path: "/admin/stats",                icon: BarChart3,  label: "Thống kê"                 },
  { path: "/admin/partners",             icon: FolderOpen, label: "Hồ sơ đối tác"            },
  { path: "/admin/customers",            icon: UserPlus,   label: "Quản lý khách hàng"       },
  { path: "/admin/orgchart",             icon: GitBranch,  label: "Sơ đồ cây"                },
  { path: "/admin/partner-contracts",    icon: FileCheck,  label: "Hợp đồng đối tác"         },
  { path: "/admin/customer-contracts",   icon: FileText,   label: "Hợp đồng Khách hàng"      },
  { path: "/admin/logs",                 icon: ScrollText, label: "Nhật ký hệ thống"         },
  { path: "/admin/account",              icon: User,       label: "Tài khoản"                },
];

// Sơ đồ cây / Yêu cầu chuyển nhánh truy cập qua nút trong Sơ đồ cây user.
// Hoa hồng truy cập qua nút trong Hồ sơ đối tác.
// Independent (memberType=INDEPENDENT) sẽ tự ẩn mục Sơ đồ cây.
const MEMBER_MENU_BASE = [
  { path: "/dashboard",           icon: LayoutDashboard, label: "Trang chủ"            },
  { path: "/my-profile",          icon: User,            label: "Thông tin cá nhân"    },
  { path: "/partner-contract",    icon: FolderOpen,      label: "Hồ sơ đối tác"        },
  { path: "/khach-hang",          icon: UserPlus,        label: "Khách hàng"           },
  { path: "/my-tree",             icon: GitBranch,       label: "Sơ đồ cây"            },
  { path: "/upgrade-requests",    icon: History,         label: "Nâng cấp đối tác"     },
  { path: "/hop-dong-doi-tac",    icon: FileCheck,       label: "Hợp đồng đối tác"     },
  { path: "/hop-dong-khach-hang", icon: FileText,        label: "Hợp đồng khách hàng"  },
  { path: "/my-promotion",        icon: ScrollText,      label: "Lịch sử nâng cấp"     },
  { path: "/my-stats",            icon: BarChart3,       label: "Thống kê"             },
];

/* ─── Component ──────────────────────────────────────────── */
function Sidebar() {
  const user = useAuthStore((s) => s.user);

  // ✅ So sánh không phân biệt hoa thường
  const isAdmin = user?.role?.toLowerCase() === "admin";

  // INDEPENDENT (thành viên tự do) không có cây phân cấp → ẩn mục Sơ đồ cây.
  const isIndependent = user?.memberType === "INDEPENDENT";
  const memberMenu = isIndependent
    ? MEMBER_MENU_BASE.filter((m) => m.path !== "/my-tree")
    : MEMBER_MENU_BASE;

  const menu = isAdmin ? ADMIN_MENU : memberMenu;

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