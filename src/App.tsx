import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { lazy, Suspense, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
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
const Dashboard      = lazy(() => import("./pages/app/Dashboard"));
const PlacementQuiz  = lazy(() => import("./pages/app/PlacementQuiz"));
const Modules        = lazy(() => import("./pages/app/Modules"));
const ModuleDetail   = lazy(() => import("./pages/app/ModuleDetail"));
const Chat           = lazy(() => import("./pages/app/Chat"));
const Settings       = lazy(() => import("./pages/app/Settings"));
const Today          = lazy(() => import("./pages/app/Today"));
const LibraryPage = lazy(() => import("./pages/app/Library"));
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
const ManagerDashboard          = lazy(() => import("./pages/manager/ManagerDashboard"));
const ManagerOpenClawPage       = lazy(() => import("./pages/manager/ManagerOpenClawPage"));
const RevenueOpsDashboard       = lazy(() => import("./pages/manager/RevenueOpsDashboard"));
const ManagerOnboarding         = lazy(() => import("./pages/manager/ManagerOnboarding"));
const EnterpriseAttackSimulation = lazy(() => import("./pages/manager/EnterpriseAttackSimulation"));
const PartnerDashboard          = lazy(() => import("./pages/partner/PartnerDashboard"));

// ── OpenClaw Agent Jobs ───────────────────────────────────────────
const AgentJobsPage         = lazy(() => import("./pages/app/AgentJobsPage"));
const CyberPath48h          = lazy(() => import("./pages/app/CyberPath48h"));
const AttestationNFT        = lazy(() => import("./pages/app/AttestationNFT"));
const AgentJobDetailPage    = lazy(() => import("./pages/app/AgentJobDetailPage"));
const AgentJobCreatePage    = lazy(() => import("./pages/app/AgentJobCreatePage"));

// ── Public pages ─────────────────────────────────────────────────
const Demo              = lazy(() => import("./pages/Demo"));
const Pricing           = lazy(() => import("./pages/Pricing"));
const VerifyAttestation = lazy(() => import("./pages/VerifyAttestation"));
const GuideList         = lazy(() => import("./pages/guides/GuideList"));
const GuideDetail       = lazy(() => import("./pages/guides/GuideDetail"));
const LegalCenter       = lazy(() => import("./pages/legal/LegalCenter"));
const NotFound          = lazy(() => import("./pages/NotFound"));

const PageLoader = React.forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Chargement..." />
  </div>
));
PageLoader.displayName = "PageLoader";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  useAuth();
  return <>{children}</>;
}

function RefCapture() {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) sessionStorage.setItem("formetoialia_ref", ref.toUpperCase().slice(0, 20));
  }, [searchParams]);
  return null;
}

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
                <Route path="/demo"          element={<Demo />} />
                <Route path="/verify/:id"    element={<VerifyAttestation />} />
                <Route path="/guides"        element={<GuideList />} />
                <Route path="/guides/:slug"  element={<GuideDetail />} />
                <Route path="/legal"         element={<LegalCenter />} />
                <Route path="/legal/:slug"   element={<LegalCenter />} />
                {/* Legacy legal redirects */}
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
                  <Route path="library"       element={<LibraryPage />} />
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
                  <Route
                    path="cyberpath"
                    element={<ProtectedRoute><CyberPath48h /></ProtectedRoute>}
                  />
                  <Route
                    path="attestation-nft"
                    element={<ProtectedRoute><AttestationNFT /></ProtectedRoute>}
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
                <Route
                  path="/manager"
                  element={<ProtectedRoute requireRole="manager"><ManagerDashboard /></ProtectedRoute>}
                />
                <Route
                  path="/manager/openclaw"
                  element={<ProtectedRoute requireRole="manager"><ManagerOpenClawPage /></ProtectedRoute>}
                />
                <Route
                  path="/manager/revenue-ops"
                  element={<ProtectedRoute requireRole="manager"><RevenueOpsDashboard /></ProtectedRoute>}
                />
                <Route
                  path="/manager/onboarding"
                  element={<ProtectedRoute><ManagerOnboarding /></ProtectedRoute>}
                />
                <Route
                  path="/manager/attack-simulation"
                  element={<ProtectedRoute requireRole="manager"><EnterpriseAttackSimulation /></ProtectedRoute>}
                />

                {/* ── Partner ──────────────────────────────────────────── */}
                <Route
                  path="/partner"
                  element={<ProtectedRoute><PartnerDashboard /></ProtectedRoute>}
                />

                {/* /os/* → redirect to dashboard */}
                <Route path="/os/*" element={<Navigate to="/app/dashboard" replace />} />

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
