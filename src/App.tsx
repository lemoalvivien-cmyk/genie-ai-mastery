import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { CookieBanner } from "@/components/legal/CookieBanner";

// Lazy load pages
const Landing = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Onboarding = lazy(() => import("./pages/onboarding/Onboarding"));
const Welcome = lazy(() => import("./pages/app/Welcome"));
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const Modules = lazy(() => import("./pages/app/Modules"));
const ModuleDetail = lazy(() => import("./pages/app/ModuleDetail"));
const Chat = lazy(() => import("./pages/app/Chat"));
const VerifyAttestation = lazy(() => import("./pages/VerifyAttestation"));
const ManagerDashboard = lazy(() => import("./pages/manager/ManagerDashboard"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Settings = lazy(() => import("./pages/app/Settings"));
const Today = lazy(() => import("./pages/app/Today"));
const Jarvis = lazy(() => import("./pages/app/Jarvis"));
const PhishingLab = lazy(() => import("./pages/app/labs/PhishingLab"));
const ControlRoom = lazy(() => import("./pages/admin/ControlRoom"));
const OpsCenter = lazy(() => import("./pages/admin/OpsCenter"));
const Runbook = lazy(() => import("./pages/admin/Runbook"));
const GuideList = lazy(() => import("./pages/guides/GuideList"));
const GuideDetail = lazy(() => import("./pages/guides/GuideDetail"));
const GrowthDashboard = lazy(() => import("./pages/admin/GrowthDashboard"));
const GodMode = lazy(() => import("./pages/admin/GodMode"));
const Legal = lazy(() => import("./pages/Legal"));
const LegalCenter = lazy(() => import("./pages/legal/LegalCenter"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PartnerDashboard = lazy(() => import("./pages/partner/PartnerDashboard"));

// GENIE OS
const GenieOSLayout = lazy(() => import("./pages/genieos/GenieOSLayout"));
const GenieOSDashboard = lazy(() => import("./pages/genieos/GenieOSDashboard"));
const GenieOSChat = lazy(() => import("./pages/genieos/GenieOSChat"));
const AgentBuilder = lazy(() => import("./pages/genieos/AgentBuilder"));
const AutomationModule = lazy(() => import("./pages/genieos/AutomationModule"));
const AppBuilder = lazy(() => import("./pages/genieos/AppBuilder"));
const AIToolsExplorer = lazy(() => import("./pages/genieos/AIToolsExplorer"));
const Marketplace = lazy(() => import("./pages/genieos/Marketplace"));
const BusinessAnalysis = lazy(() => import("./pages/genieos/BusinessAnalysis"));
const MultiAgentRunner = lazy(() => import("./pages/genieos/MultiAgentRunner"));
const KnowledgeBase = lazy(() => import("./pages/genieos/KnowledgeBase"));
const ActionsPage = lazy(() => import("./pages/genieos/ActionsPage"));
const VoiceAssistant = lazy(() => import("./pages/genieos/VoiceAssistant"));
const AgentsRuntime = lazy(() => import("./pages/genieos/AgentsRuntime"));
const AIWatch = lazy(() => import("./pages/genieos/AIWatch"));
const Opportunities = lazy(() => import("./pages/genieos/Opportunities"));
const AIStore = lazy(() => import("./pages/genieos/AIStore"));
const PersonalBrain = lazy(() => import("./pages/genieos/PersonalBrain"));
const AutoBuilder = lazy(() => import("./pages/genieos/AutoBuilder"));
// GENIE OS — New modules
const SkillGraph = lazy(() => import("./pages/genieos/SkillGraph"));
const CoFounder = lazy(() => import("./pages/genieos/CoFounder"));
const AgentEconomy = lazy(() => import("./pages/genieos/AgentEconomy"));
const Autopilot = lazy(() => import("./pages/genieos/Autopilot"));
const MemoryTimeline = lazy(() => import("./pages/genieos/MemoryTimeline"));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Auth initializer: subscribes to Supabase auth
function AuthInitializer({ children }: { children: React.ReactNode }) {
  useAuth(); // Initializes auth state globally
  return <>{children}</>;
}

// Captures ?ref= query param globally and persists to sessionStorage
function RefCapture() {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) sessionStorage.setItem("genie_ref", ref.toUpperCase().slice(0, 20));
  }, [searchParams]);
  return null;
}

// Tracks page views on every route change
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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthInitializer>
            <RefCapture />
            <PageViewTracker />
            <CookieBanner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Onboarding — authenticated but before full app */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />

                {/* App routes — shared layout */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="welcome" element={<Welcome />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="modules" element={<Modules />} />
                  <Route path="modules/:slug" element={<ModuleDetail />} />
                  <Route path="chat" element={<Chat />} />
                  {/* PASSE A · #3 — requirePro sur toutes les routes premium */}
                  <Route
                    path="today"
                    element={
                      <ProtectedRoute requirePro>
                        <Today />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="jarvis"
                    element={
                      <ProtectedRoute requirePro>
                        <Jarvis />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="settings" element={<Settings />} />
                  <Route
                    path="labs/phishing"
                    element={
                      <ProtectedRoute requirePro>
                        <PhishingLab />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Admin routes */}
                <Route
                  path="/admin/growth"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <GrowthDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/control-room"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <ControlRoom />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ops"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <OpsCenter />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/runbook"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <Runbook />
                    </ProtectedRoute>
                  }
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

                {/* Manager routes */}
                <Route
                  path="/manager"
                  element={
                    <ProtectedRoute requireRole="manager" requirePro>
                      <ManagerDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route path="/pricing" element={<Pricing />} />
                <Route path="/verify/:id" element={<VerifyAttestation />} />
                <Route
                  path="/partner"
                  element={
                    <ProtectedRoute>
                      <PartnerDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Hidden God Mode — email-gated */}
                <Route
                  path="/admin-god-mode"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <GodMode />
                    </ProtectedRoute>
                  }
                />
                <Route path="/guides" element={<GuideList />} />
                <Route path="/guides/:slug" element={<GuideDetail />} />

                {/* Legal centre */}
                <Route path="/legal" element={<LegalCenter />} />
                <Route path="/legal/:slug" element={<LegalCenter />} />

                {/* Legacy legal redirects */}
                <Route path="/cgu" element={<Legal />} />
                <Route path="/confidentialite" element={<Legal />} />
                <Route path="/mentions-legales" element={<Legal />} />
                <Route path="/rgpd" element={<Legal />} />
                <Route path="/security" element={<Legal />} />

                {/* GENIE OS */}
                <Route path="/os" element={<GenieOSLayout />}>
                  <Route index element={<GenieOSChat />} />
                  <Route path="dashboard" element={<GenieOSDashboard />} />
                  <Route path="agents" element={<AgentBuilder />} />
                  <Route path="multi-agent" element={<MultiAgentRunner />} />
                  <Route path="automation" element={<AutomationModule />} />
                  <Route path="app-builder" element={<AppBuilder />} />
                  <Route path="ai-tools" element={<AIToolsExplorer />} />
                  <Route path="marketplace" element={<Marketplace />} />
                  <Route path="business" element={<BusinessAnalysis />} />
                  <Route path="knowledge" element={<KnowledgeBase />} />
                  <Route path="actions" element={<ActionsPage />} />
                  <Route path="voice" element={<VoiceAssistant />} />
                  <Route path="agents-runtime" element={<AgentsRuntime />} />
                  <Route path="ai-watch" element={<AIWatch />} />
                  <Route path="opportunities" element={<Opportunities />} />
                  <Route path="store" element={<AIStore />} />
                  <Route path="brain" element={<PersonalBrain />} />
                  <Route path="builder" element={<AutoBuilder />} />
                  {/* New GENIE OS modules */}
                  <Route path="skills" element={<SkillGraph />} />
                  <Route path="cofounder" element={<CoFounder />} />
                  <Route path="economy" element={<AgentEconomy />} />
                  <Route path="autopilot" element={<Autopilot />} />
                  <Route path="timeline" element={<MemoryTimeline />} />
                </Route>

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
