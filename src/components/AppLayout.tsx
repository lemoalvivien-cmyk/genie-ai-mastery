import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Calendar, MessageCircle, Bot, BookOpen, Settings, Users, Flame, Lock } from "lucide-react";
import logoGenie from "@/assets/logo-genie.png";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { PanicButton } from "@/components/PanicButton";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { useSubscription } from "@/hooks/useSubscription";

function LegalLinks() {
  return <LegalFooterLinks className="flex-col items-start gap-y-1" />;
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isManager } = useAuth();
  const { streak, todayLog } = useStreak();
  const { data: sub } = useSubscription();
  const isPro = sub?.plan === "pro";

  const missionDone = !!todayLog;
  const currentStreak = streak?.current_streak ?? 0;

  if (location.pathname === "/app/welcome") {
    return <Outlet />;
  }

  const isChat = location.pathname === "/app/chat" || location.pathname === "/app/jarvis";

  const navItems = [
    {
      to: "/app/today",
      icon: Calendar,
      label: "Aujourd'hui",
      badge: currentStreak > 0 ? String(currentStreak) : null,
      dot: !missionDone,
    },
    { to: "/app/chat", icon: MessageCircle, label: "Chat IA" },
    { to: "/app/jarvis", icon: Bot, label: "KITT IA", showProBadge: !isPro },
    { to: "/app/modules", icon: BookOpen, label: "Modules" },
    { to: "/app/settings", icon: Settings, label: "Paramètres" },
  ];

  if (isManager) {
    navItems.push({ to: "/manager", icon: Users, label: "Manager" } as typeof navItems[0]);
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? "G";

  const planLabel = isPro ? "Pro" : "Free";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0C1014" }}>
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col w-[240px] shrink-0"
        style={{ background: "#13151E", borderRight: "1px solid #2A2D3A" }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid #2A2D3A" }}>
          <button
            onClick={() => navigate("/app/today")}
            className="flex items-center gap-2.5"
          >
            <img src={logoGenie} alt="GENIE IA" className="h-8 w-auto" />
            <span className="text-lg font-bold tracking-tight">
              <span style={{ color: "#5257D8" }}>GENIE</span>
              <span style={{ color: "#FE2C40" }}>IA</span>
            </span>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                  isActive
                    ? "text-[#E8E9F0]"
                    : "text-muted-foreground hover:text-[#E8E9F0] hover:bg-white/5"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      background: "rgba(82,87,216,0.15)",
                      borderLeft: "3px solid #5257D8",
                      paddingLeft: "calc(0.75rem - 3px)",
                    }
                  : {}
              }
            >
              <div className="relative">
                <item.icon className="shrink-0" style={{ width: 18, height: 18 }} />
                {item.dot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive border border-background" />
                )}
              </div>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Flame className="w-3 h-3" />
                  {item.badge}
                </span>
              )}
              {item.showProBadge && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ background: "rgba(254,44,64,0.1)", color: "#FE2C40", borderColor: "rgba(254,44,64,0.3)" }}>
                  <Lock className="w-2.5 h-2.5" />
                  PRO
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── User footer ── */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid #2A2D3A" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #5257D8, #FE2C40)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#E8E9F0] truncate">
                {profile?.full_name ?? profile?.email ?? ""}
              </p>
              <p className="text-[10px] font-semibold" style={{ color: isPro ? "#5257D8" : "hsl(var(--muted-foreground))" }}>
                Plan {planLabel}
              </p>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 px-1">
            <LegalLinks />
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header
          className="lg:hidden shrink-0 px-4 py-3 flex items-center justify-between backdrop-blur-sm"
          style={{ borderBottom: "1px solid #2A2D3A", background: "#13151E" }}
        >
          <button onClick={() => navigate("/app/today")} className="flex items-center gap-2">
            <img src={logoGenie} alt="GENIE IA" className="h-7 w-auto" />
            <span className="text-base font-bold">
              <span style={{ color: "#5257D8" }}>GENIE</span>
              <span style={{ color: "#FE2C40" }}>IA</span>
            </span>
          </button>
          <button
            onClick={signOut}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-hidden ${isChat ? "flex flex-col" : "overflow-y-auto"}`}>
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="lg:hidden shrink-0 px-2 py-2 flex items-center justify-around"
          style={{ borderTop: "1px solid #2A2D3A", background: "#13151E" }}
        >
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all text-xs relative ${
                  isActive ? "" : "text-muted-foreground"
                }`
              }
              style={({ isActive }) =>
                isActive ? { color: "#5257D8" } : {}
              }
            >
              <div className="relative">
                <item.icon style={{ width: 20, height: 20 }} />
                {item.dot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive border border-background" />
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <PanicButton />
    </div>
  );
}
