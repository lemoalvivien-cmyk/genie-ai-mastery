import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bot, Zap, Code2, Cpu, Store, BarChart2, MessageSquare,
  ChevronLeft, ChevronRight, Menu, Sparkles, Network, Database, Play, Mic, Radio,
  Brain, Wand2, Handshake, Clock, Plane, TrendingUp, Activity, DollarSign,
  Command, Building2, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CopilotPanel } from "@/components/genieos/CopilotPanel";
import { CommandPalette, useCommandPalette } from "@/components/genieos/CommandPalette";
import { ContextualAI } from "@/components/genieos/ContextualAI";

const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { to: "/os", icon: MessageSquare, label: "Chat IA", color: "text-primary" },
      { to: "/os/control", icon: Activity, label: "Command Center", color: "text-primary" },
      { to: "/os/voice", icon: Mic, label: "Voice OS", color: "text-pink-400" },
      { to: "/os/start", icon: Sparkles, label: "Démarrage rapide", color: "text-amber-400" },
    ],
  },
  {
    label: "Revenue",
    items: [
      { to: "/os/revenue", icon: DollarSign, label: "Revenue Engine", color: "text-green-400" },
      { to: "/os/revenue-analytics", icon: BarChart2, label: "Analytics", color: "text-emerald-400" },
      { to: "/os/opportunities", icon: TrendingUp, label: "Opportunités", color: "text-emerald-400" },
      { to: "/os/cofounder", icon: Handshake, label: "Co-Founder IA", color: "text-emerald-400" },
      { to: "/os/enterprise", icon: Building2, label: "Enterprise", color: "text-amber-400" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/os/skills", icon: Brain, label: "Skill Graph", color: "text-purple-400" },
      { to: "/os/ai-watch", icon: Sparkles, label: "AI Watch", color: "text-amber-400" },
      { to: "/os/brain", icon: Database, label: "AI Brain", color: "text-rose-400" },
      { to: "/os/timeline", icon: Clock, label: "Memory", color: "text-indigo-400" },
      { to: "/os/autopilot", icon: Plane, label: "Autopilot", color: "text-sky-400" },
    ],
  },
  {
    label: "Agents",
    items: [
      { to: "/os/agents", icon: Bot, label: "Agent Builder", color: "text-emerald-400" },
      { to: "/os/agents-runtime", icon: Radio, label: "Runtime", color: "text-cyan-400" },
      { to: "/os/multi-agent", icon: Network, label: "Multi-Agents", color: "text-sky-400" },
      { to: "/os/economy", icon: Store, label: "Agent Economy", color: "text-violet-400" },
    ],
  },
  {
    label: "Build",
    items: [
      { to: "/os/automation", icon: Zap, label: "Automation", color: "text-yellow-400" },
      { to: "/os/app-builder", icon: Code2, label: "App Builder", color: "text-blue-400" },
      { to: "/os/builder", icon: Wand2, label: "Auto Builder", color: "text-orange-400" },
      { to: "/os/business", icon: BarChart2, label: "Business", color: "text-pink-400" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { to: "/os/knowledge", icon: Database, label: "Knowledge Base", color: "text-indigo-400" },
      { to: "/os/ai-tools", icon: Cpu, label: "AI Tools", color: "text-purple-400" },
      { to: "/os/store", icon: Store, label: "AI Store", color: "text-violet-400" },
      { to: "/os/actions", icon: Play, label: "Actions", color: "text-rose-400" },
    ],
  },
  {
    label: "Ops",
    items: [
      { to: "/os/system", icon: Activity, label: "System Health", color: "text-emerald-400" },
      { to: "/os/logs", icon: FileText, label: "Logs Central", color: "text-sky-400" },
    ],
  },
];

export default function GenieOSLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-4 border-b border-border", collapsed && "justify-center px-2")}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-foreground tracking-tight text-sm">GENIE</span>
            <span className="font-bold text-primary tracking-tight text-sm"> OS</span>
          </div>
        )}
      </div>

      {/* CMD+K search trigger */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-border">
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all text-xs"
          >
            <Command className="w-3 h-3 flex-shrink-0" />
            <span className="flex-1 text-left">Rechercher…</span>
            <kbd className="text-[10px] border border-border rounded px-1 bg-background">K</kbd>
          </button>
        </div>
      )}
      {collapsed && (
        <div className="px-2 py-2 border-b border-border">
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center justify-center p-1.5 rounded-lg border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all"
          >
            <Command className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-1">
        {NAV_SECTIONS.map(({ label, items }) => (
          <div key={label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 py-1.5">
                {label}
              </p>
            )}
            {items.map(({ to, icon: Icon, label: itemLabel, color }) => {
              const isActive = to === "/os"
                ? location.pathname === "/os"
                : location.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-primary/10 text-foreground border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? color : "group-hover:text-foreground")} />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{itemLabel}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle (desktop) */}
      <div className="hidden md:flex border-t border-border p-2 justify-end">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col flex-shrink-0 border-r border-border bg-card transition-all duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-56 border-r border-border bg-card transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 h-12 border-b border-border bg-card flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 flex-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">GENIE <span className="text-primary">OS</span></span>
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Command className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Global overlays */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ContextualAI />
      <CopilotPanel />
    </div>
  );
}
