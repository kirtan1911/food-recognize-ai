import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Camera, History, User, FileText, LogOut, Leaf } from "lucide-react";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", id: "nav-dashboard" },
  { to: "/scan", icon: Camera, label: "Scan Food", id: "nav-scan" },
  { to: "/history", icon: History, label: "History", id: "nav-history" },
  { to: "/reports", icon: FileText, label: "Reports", id: "nav-reports" },
  { to: "/profile", icon: User, label: "Profile", id: "nav-profile" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const onLogout = async () => { await logout(); nav("/login"); };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-white/60 backdrop-blur-sm">
        <div className="px-6 py-7 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center text-white">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-none">Nourish</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">AI Food Tracker</p>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label, id }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={id}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-accent/30 grid place-items-center text-primary font-display font-bold">
              {(user?.name || user?.email || "?")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            data-testid="logout-button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center text-white">
              <Leaf className="w-4 h-4" />
            </div>
            <span className="font-display font-bold">Nourish</span>
          </div>
          <button data-testid="mobile-logout" onClick={onLogout} className="text-sm text-muted-foreground">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex overflow-x-auto gap-1 px-3 pb-2">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                  isActive ? "bg-primary text-white" : "bg-secondary text-foreground/70"
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="flex-1 lg:ml-0 mt-24 lg:mt-0 px-5 md:px-8 py-6 md:py-10 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
