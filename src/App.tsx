import { HelmetProvider } from "react-helmet-async";
// Passe B — Sonner est le système de notification unique. Toaster (radix toast) supprimé.
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { FEATURES } from "@/config/features";
import { Loader2 } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { CookieBanner } from "@/components/legal/CookieBanner";

// ── Public / Auth ────────────────────────────────────────────────
const Landing        = lazy(() => import("./pages/Index"));
const Login          = lazy(() => import("./pages/auth/Login"));
const Register       = lazy(() => import("./pages/auth/Register"));
const ResetPassword  = lazy(() => import("./pages/auth/ResetPassword"));

// ── App ──────────────────────────────────────────────────────────
const Onboarding        = lazy(() => import("./pages/onboarding/Onboarding"));
const Welcome           = lazy(() => import("./pages/app/Welcome"));
const FirstVictory      = lazy(() => import("./pages/app/FirstVictory"));
// OnboardingQuiz/Result/Unlock supprimés (Passe B) — routes fantômes jamais liées
const Dashboard      = lazy(() => import("./pages/app/Dashboard"));
const PlacementQuiz  = lazy(() => import("./pages/app/PlacementQuiz"));
const Modules        = lazy(() => import("./pages/app/Modules"));
const ModuleDetail   = lazy(() => import("./pages/app/ModuleDetail"));
const Chat           = lazy(() => import("./pages/app/Chat"));
const Settings       = lazy(() => import("./pages/app/Settings"));
const Today          = lazy(() => import("./pages/app/Today"));
const Jarvis         = lazy(() => import("./pages/app/Jarvis"));
const PhishingLab    = lazy(() => import("./pages/app/labs/PhishingLab"));
const CyberLab       = lazy(() => import("./pages/app/labs/CyberLab"));
const PromptLab      = lazy(() => import("./pages/app/labs/PromptLab"));

// ── Admin ────────────────────────────────────────────────────────
const ControlRoom     = lazy(() => import("./pages/admin/ControlRoom"));
const OpsCenter       = lazy(() => import("./pages/admin/OpsCenter"));
const Runbook           = lazy(() => import("./pages/admin/Runbook"));
const GrowthDashboard   = lazy(() => import("./pages/admin/GrowthDashboard"));
const AdminOperations   = lazy(() => import("./pages/admin/GodMode"));

// ── Other protected ──────────────────────────────────────────────
const ManagerDashboard      = lazy(() => import("./pages/manager/ManagerDashboard"));
const ManagerOpenClawPage   = lazy(() => import("./pages/manager/ManagerOpenClawPage"));
const PartnerDashboard      = lazy(() => import("./pages/partner/PartnerDashboard"));

// ── OpenClaw Agent Jobs ───────────────────────────────────────────
const AgentJobsPage         = lazy(() => import("./pages/app/AgentJobsPage"));
const AgentJobDetailPage    = lazy(() => import("./pages/app/AgentJobDetailPage"));
const AgentJobCreatePage    = lazy(() => import("./pages/app/AgentJobCreatePage"));

// ── Public pages ─────────────────────────────────────────────────
const Pricing           = lazy(() => import("./pages/Pricing"));
const VerifyAttestation = lazy(() => import("./pages/VerifyAttestation"));
const GuideList         = lazy(() => import("./pages/guides/GuideList"));
const GuideDetail       = lazy(() => import("./pages/guides/GuideDetail"));
// Legal.tsx supprimé (Passe B) — LegalCenter.tsx est la source unique
const LegalCenter       = lazy(() => import("./pages/legal/LegalCenter"));
const NotFound          = lazy(() => import("./pages/NotFound"));

// ── GENIE OS ─────────────────────────────────────────────────────
// GenieOSDashboard SUPPRIMÉ (Passe B) — redondant avec CommandCenter
const GenieOSLayout      = lazy(() => import("./pages/genieos/GenieOSLayout"));
const GenieOSChat        = lazy(() => import("./pages/genieos/GenieOSChat"));
const AgentBuilder       = lazy(() => import("./pages/genieos/AgentBuilder"));
const AutomationModule   = lazy(() => import("./pages/genieos/AutomationModule"));
const AppBuilder         = lazy(() => import("./pages/genieos/AppBuilder"));
const AIToolsExplorer    = lazy(() => import("./pages/genieos/AIToolsExplorer"));
const Marketplace        = lazy(() => import("./pages/genieos/Marketplace"));
const BusinessAnalysis   = lazy(() => import("./pages/genieos/BusinessAnalysis"));
const MultiAgentRunner   = lazy(() => import("./pages/genieos/MultiAgentRunner"));
const KnowledgeBase      = lazy(() => import("./pages/genieos/KnowledgeBase"));
const ActionsPage        = lazy(() => import("./pages/genieos/ActionsPage"));
const VoiceAssistant     = lazy(() => import("./pages/genieos/VoiceAssistant"));
const AgentsRuntime      = lazy(() => import("./pages/genieos/AgentsRuntime"));
const AIWatch            = lazy(() => import("./pages/genieos/AIWatch"));
const Opportunities      = lazy(() => import("./pages/genieos/Opportunities"));
const AIStore            = lazy(() => import("./pages/genieos/AIStore"));
const PersonalBrain      = lazy(() => import("./pages/genieos/PersonalBrain"));
const AutoBuilder        = lazy(() => import("./pages/genieos/AutoBuilder"));
const SkillGraph         = lazy(() => import("./pages/genieos/SkillGraph"));
const CoFounder          = lazy(() => import("./pages/genieos/CoFounder"));
const AgentEconomy       = lazy(() => import("./pages/genieos/AgentEconomy"));
const Autopilot          = lazy(() => import("./pages/genieos/Autopilot"));
const MemoryTimeline     = lazy(() => import("./pages/genieos/MemoryTimeline"));
const CommandCenter      = lazy(() => import("./pages/genieos/CommandCenter"));
const RevenueEngine      = lazy(() => import("./pages/genieos/RevenueEngine"));
const SmartOnboarding    = lazy(() => import("./pages/genieos/SmartOnboarding"));
const EnterpriseDashboard = lazy(() => import("./pages/genieos/EnterpriseDashboard"));
const RevenueAnalytics   = lazy(() => import("./pages/genieos/RevenueAnalytics"));
const SystemHealth       = lazy(() => import("./pages/genieos/SystemHealth"));
const LogsViewer         = lazy(() => import("./pages/genieos/LogsViewer"));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

/** Initialise l'état auth global — appelé UNE seule fois via le ref guard dans useAuth */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  useAuth();
  return <>{children}</>;
}

/** Capture le paramètre ?ref= et le persiste en sessionStorage (max 20 chars) */
function RefCapture() {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) sessionStorage.setItem("genie_ref", ref.toUpperCase().slice(0, 20));
  }, [searchParams]);
  return null;
}

/** Envoie un événement page_view à chaque changement de route */
function PageViewTracker() {
  const location = useLocation();
  const { track } = useAnalytics();
  useEffect(() => {
    track("page_view", { path: location.pathname });
  }, [location.pathname]);
  return null;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthInitializer>
            <RefCapture />
            <PageViewTracker />
            <CookieBanner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* ── Public ──────────────────────────────────────────── */}
                <Route path="/"              element={<Landing />} />
                <Route path="/login"         element={<Login />} />
                <Route path="/register"      element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/pricing"       element={<Pricing />} />
                <Route path="/verify/:id"    element={<VerifyAttestation />} />
                <Route path="/guides"        element={<GuideList />} />
                <Route path="/guides/:slug"  element={<GuideDetail />} />
                <Route path="/legal"         element={<LegalCenter />} />
                <Route path="/legal/:slug"   element={<LegalCenter />} />
                {/* Legacy legal redirects → LegalCenter (Legal.tsx supprimé Passe B) */}
                <Route path="/cgu"              element={<Navigate to="/legal/cgu" replace />} />
                <Route path="/confidentialite"  element={<Navigate to="/legal/confidentialite" replace />} />
                <Route path="/mentions-legales" element={<Navigate to="/legal/mentions-legales" replace />} />
                <Route path="/rgpd"             element={<Navigate to="/legal/rgpd" replace />} />
                <Route path="/security"         element={<Navigate to="/legal/security" replace />} />

                {/* ── Onboarding ──────────────────────────────────────── */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />

                {/* ── App (layout partagé) ─────────────────────────────── */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="welcome"         element={<Welcome />} />
                  <Route path="first-victory"   element={<FirstVictory />} />
                  <Route path="dashboard"     element={<Dashboard />} />
                  <Route path="placement"     element={<PlacementQuiz />} />
                  <Route path="modules"       element={<Modules />} />
                  <Route path="modules/:slug" element={<ModuleDetail />} />
                  <Route path="chat"          element={<Chat />} />
                  <Route path="settings"      element={<Settings />} />
                  {/* Routes Pro-only */}
                  <Route
                    path="today"
                    element={<ProtectedRoute requirePro><Today /></ProtectedRoute>}
                  />
                  <Route
                    path="jarvis"
                    element={<ProtectedRoute requirePro><Jarvis /></ProtectedRoute>}
                  />
                  <Route
                    path="labs/phishing"
                    element={<ProtectedRoute requirePro><PhishingLab /></ProtectedRoute>}
                  />
                  <Route
                    path="labs/cyber"
                    element={<ProtectedRoute requirePro><CyberLab /></ProtectedRoute>}
                  />
                  <Route
                    path="labs/prompt"
                    element={<ProtectedRoute requirePro><PromptLab /></ProtectedRoute>}
                  />
                  {/* ── OpenClaw Agent Jobs ─────────────────────────────── */}
                  <Route
                    path="agent-jobs"
                    element={<ProtectedRoute requirePro><AgentJobsPage /></ProtectedRoute>}
                  />
                  <Route
                    path="agent-jobs/new"
                    element={<ProtectedRoute requirePro><AgentJobCreatePage /></ProtectedRoute>}
                  />
                  <Route
                    path="agent-jobs/:id"
                    element={<ProtectedRoute requirePro><AgentJobDetailPage /></ProtectedRoute>}
                  />
                </Route>

                {/* ── Admin ────────────────────────────────────────────── */}
                <Route
                  path="/admin/growth"
                  element={<ProtectedRoute requireRole="admin"><GrowthDashboard /></ProtectedRoute>}
                />
                <Route
                  path="/admin/control-room"
                  element={<ProtectedRoute requireRole="admin"><ControlRoom /></ProtectedRoute>}
                />
                <Route
                  path="/admin/ops"
                  element={<ProtectedRoute requireRole="admin"><OpsCenter /></ProtectedRoute>}
                />
                <Route
                  path="/admin/runbook"
                  element={<ProtectedRoute requireRole="admin"><Runbook /></ProtectedRoute>}
                />
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                        <p>Admin Dashboard (à venir)</p>
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin-operations"
                  element={<ProtectedRoute requireRole="admin"><AdminOperations /></ProtectedRoute>}
                />

                {/* ── Manager ──────────────────────────────────────────── */}
                {/* requirePro retiré : les managers B2B accèdent via plan org, pas via abonnement perso */}
                <Route
                  path="/manager"
                  element={<ProtectedRoute requireRole="manager"><ManagerDashboard /></ProtectedRoute>}
                />
                <Route
                  path="/manager/openclaw"
                  element={<ProtectedRoute requireRole="manager"><ManagerOpenClawPage /></ProtectedRoute>}
                />

                {/* ── Partner ──────────────────────────────────────────── */}
                <Route
                  path="/partner"
                  element={<ProtectedRoute><PartnerDashboard /></ProtectedRoute>}
                />

                {/* ── GENIE OS — feature-flagged via VITE_GENIEOS_ENABLED ── */}
                {FEATURES.genieOS ? (
                  <Route
                    path="/os"
                    element={
                      <ProtectedRoute>
                        <GenieOSLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index                 element={<GenieOSChat />} />
                    <Route path="agents"         element={<AgentBuilder />} />
                    <Route path="multi-agent"    element={<MultiAgentRunner />} />
                    <Route path="automation"     element={<AutomationModule />} />
                    <Route path="app-builder"    element={<AppBuilder />} />
                    <Route path="ai-tools"       element={<AIToolsExplorer />} />
                    <Route path="marketplace"    element={<Marketplace />} />
                    <Route path="business"       element={<BusinessAnalysis />} />
                    <Route path="knowledge"      element={<KnowledgeBase />} />
                    <Route path="actions"        element={<ActionsPage />} />
                    <Route path="voice"          element={<VoiceAssistant />} />
                    <Route path="agents-runtime" element={<AgentsRuntime />} />
                    <Route path="ai-watch"       element={<AIWatch />} />
                    <Route path="opportunities"  element={<Opportunities />} />
                    <Route path="store"          element={<AIStore />} />
                    <Route path="brain"          element={<PersonalBrain />} />
                    <Route path="builder"        element={<AutoBuilder />} />
                    <Route path="skills"         element={<SkillGraph />} />
                    <Route path="cofounder"      element={<CoFounder />} />
                    <Route path="economy"        element={<AgentEconomy />} />
                    <Route path="autopilot"      element={<Autopilot />} />
                    <Route path="timeline"       element={<MemoryTimeline />} />
                    <Route path="control"        element={<CommandCenter />} />
                    <Route path="revenue"        element={<RevenueEngine />} />
                    <Route path="enterprise"     element={<EnterpriseDashboard />} />
                    <Route path="revenue-analytics" element={<RevenueAnalytics />} />
                    <Route path="system"         element={<SystemHealth />} />
                    <Route path="logs"           element={<LogsViewer />} />
                    <Route path="start"          element={<SmartOnboarding />} />
                  </Route>
                ) : (
                  <Route path="/os/*" element={<Navigate to="/app/dashboard" replace />} />
                )}

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthInitializer>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
