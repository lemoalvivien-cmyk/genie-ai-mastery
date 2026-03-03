import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Sparkles, BarChart3, MessageSquare, BookOpen, Settings, Users, Flame, Zap } from "lucide-react";
import logoGenie from "@/assets/logo-genie.png";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { PanicButton } from "@/components/PanicButton";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";

// Thin wrapper to avoid importing the full component tree
function LegalLinks() {
  return <LegalFooterLinks className="flex-col items-start gap-y-1" />;
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isManager } = useAuth();
  const { streak, todayLog } = useStreak();

  const missionDone = !!todayLog;
  const currentStreak = streak?.current_streak ?? 0;

  // Welcome page: fullscreen, no chrome
  if (location.pathname === "/app/welcome") {
    return <Outlet />;
  }

  const isChat = location.pathname === "/app/chat" || location.pathname === "/app/jarvis";

  const navItems = [
    {
      to: "/app/today",
      icon: Sparkles,
      label: "Mon Jarvis",
      badge: currentStreak > 0 ? String(currentStreak) : null,
      dot: !missionDone,
    },
    { to: "/app/jarvis", icon: Zap, label: "Cockpit IA" },
    { to: "/app/dashboard", icon: BarChart3, label: "Dashboard" },
    { to: "/app/chat", icon: MessageSquare, label: "Chat IA" },
    { to: "/app/modules", icon: BookOpen, label: "Modules" },
    { to: "/app/settings", icon: Settings, label: "Paramètres" },
  ];

  if (isManager) {
    navItems.push({ to: "/manager", icon: Users, label: "Espace Manager", badge: null, dot: false } as typeof navItems[0]);
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? "G";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-border/40 bg-card/30 backdrop-blur-sm">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-border/40">
          <button
            onClick={() => navigate("/app/dashboard")}
            className="flex items-center gap-2.5"
          >
            <img
              src={logoGenie}
              alt="GENIE IA"
              className="h-9 w-auto"
              style={{ filter: "drop-shadow(0 0 8px hsl(235 62% 63% / 0.45))" }}
            />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`
              }
            >
              <div className="relative">
                <item.icon className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18 }} />
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
            </NavLink>
          ))}
        </nav>

        {/* ── User footer ── */}
        <div className="px-3 py-4 border-t border-border/40">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name ?? profile?.email ?? ""}
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
          {/* Legal footer links */}
          <div className="mt-2 px-1">
            <LegalLinks />
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden shrink-0 border-b border-border/40 px-4 py-3 flex items-center justify-between bg-background/80 backdrop-blur-sm">
          <button
            onClick={() => navigate("/app/dashboard")}
            className="flex items-center gap-2"
          >
            <img
              src={logoGenie}
              alt="GENIE IA"
              className="h-8 w-auto"
              style={{ filter: "drop-shadow(0 0 6px hsl(235 62% 63% / 0.4))" }}
            />
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
        <nav className="lg:hidden shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-sm px-2 py-2 flex items-center justify-around">
          {navItems.slice(0, 4).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-xs relative ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <div className="relative">
                <item.icon style={{ width: 20, height: 20 }} />
                {item.dot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive border border-background" />
                )}
              </div>
              <span>{item.label === "Mon Jarvis" ? "Jarvis" : item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <PanicButton />
    </div>
  );
}
