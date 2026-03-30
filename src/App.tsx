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
import { features } from "@/config/features";
import { FeatureUnavailable } from "@/components/FeatureGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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


// ── Admin ────────────────────────────────────────────────────────
const ControlRoom     = lazy(() => import("./pages/admin/ControlRoom"));
const OpsCenter       = lazy(() => import("./pages/admin/OpsCenter"));
const Runbook           = lazy(() => import("./pages/admin/Runbook"));
const GrowthDashboard   = lazy(() => import("./pages/admin/GrowthDashboard"));
const AdminOperations   = lazy(() => import("./pages/admin/GodMode"));
const GoLiveChecklist   = lazy(() => import("./pages/admin/GoLiveChecklist"));

// ── Other protected ──────────────────────────────────────────────
const ManagerDashboard          = lazy(() => import("./pages/manager/ManagerDashboard"));
const ManagerOpenClawPage       = lazy(() => import("./pages/manager/ManagerOpenClawPage"));
const RevenueOpsDashboard       = lazy(() => import("./pages/manager/RevenueOpsDashboard"));
const ManagerOnboarding         = lazy(() => import("./pages/manager/ManagerOnboarding"));
const EnterpriseAttackSimulation = lazy(() => import("./pages/manager/EnterpriseAttackSimulation"));
const PartnerDashboard          = lazy(() => import("./pages/partner/PartnerDashboard"));


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
              <ErrorBoundary name="app-root">
              <Routes>
                {/* ── Public ──────────────────────────────────────────── */}
                <Route path="/"              element={<ErrorBoundary name="landing"><Landing /></ErrorBoundary>} />
                <Route path="/login"         element={<ErrorBoundary name="login"><Login /></ErrorBoundary>} />
                <Route path="/register"      element={<ErrorBoundary name="register"><Register /></ErrorBoundary>} />
                <Route path="/reset-password" element={<ErrorBoundary name="reset-password"><ResetPassword /></ErrorBoundary>} />
                <Route path="/pricing"       element={<ErrorBoundary name="pricing"><Pricing /></ErrorBoundary>} />
                <Route path="/demo"          element={<ErrorBoundary name="demo"><Demo /></ErrorBoundary>} />
                <Route path="/verify/:id"    element={<ErrorBoundary name="verify"><VerifyAttestation /></ErrorBoundary>} />
                <Route path="/guides"        element={<ErrorBoundary name="guides"><GuideList /></ErrorBoundary>} />
                <Route path="/guides/:slug"  element={<ErrorBoundary name="guide-detail"><GuideDetail /></ErrorBoundary>} />
                <Route path="/legal"         element={<ErrorBoundary name="legal"><LegalCenter /></ErrorBoundary>} />
                <Route path="/legal/:slug"   element={<ErrorBoundary name="legal-detail"><LegalCenter /></ErrorBoundary>} />
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
                  <Route path="welcome"         element={<ErrorBoundary name="welcome"><Welcome /></ErrorBoundary>} />
                  <Route path="first-victory"   element={<ErrorBoundary name="first-victory"><FirstVictory /></ErrorBoundary>} />
                  <Route path="dashboard"     element={<ErrorBoundary name="dashboard"><Dashboard /></ErrorBoundary>} />
                  <Route path="placement"     element={<ErrorBoundary name="placement"><PlacementQuiz /></ErrorBoundary>} />
                  <Route path="modules"       element={<ErrorBoundary name="modules"><Modules /></ErrorBoundary>} />
                  <Route path="modules/:slug" element={<ErrorBoundary name="module-detail"><ModuleDetail /></ErrorBoundary>} />
                  <Route path="chat"          element={<ErrorBoundary name="chat"><Chat /></ErrorBoundary>} />
                  <Route path="settings"      element={<ErrorBoundary name="settings"><Settings /></ErrorBoundary>} />
                  <Route path="library"       element={<ErrorBoundary name="library"><LibraryPage /></ErrorBoundary>} />
                  <Route
                    path="today"
                    element={<Today />}
                  />
                  {/* /app/jarvis or /app/kitt → redirect to chat (single entry point) */}
                  <Route
                    path="jarvis"
                    element={<Navigate to="/app/chat" replace />}
                  />
                  <Route
                    path="kitt"
                    element={<Navigate to="/app/chat" replace />}
                  />
                  {/* Legacy routes → redirect to dashboard */}
                  <Route path="labs/*" element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="agent-jobs/*" element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="cyberpath" element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="attestation-nft" element={<Navigate to="/app/settings" replace />} />
                </Route>

                {/* ── Admin (feature-flagged) ───────────────────────────── */}
                {features.adminDashboard ? (
                  <>
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
                      path="/admin/go-live"
                      element={<ProtectedRoute requireRole="admin"><GoLiveChecklist /></ProtectedRoute>}
                    />
                    <Route
                      path="/admin-operations"
                      element={<ProtectedRoute requireRole="admin"><AdminOperations /></ProtectedRoute>}
                    />
                  </>
                ) : null}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <FeatureUnavailable name="Administration" />
                    </ProtectedRoute>
                  }
                />

                {/* ── Manager ──────────────────────────────────────────── */}
                <Route
                  path="/manager"
                  element={<ProtectedRoute requireRole="manager"><ManagerDashboard /></ProtectedRoute>}
                />
                {features.openclawRuntime && (
                  <Route
                    path="/manager/openclaw"
                    element={<ProtectedRoute requireRole="manager"><ManagerOpenClawPage /></ProtectedRoute>}
                  />
                )}
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

                <Route path="*" element={<ErrorBoundary name="not-found"><NotFound /></ErrorBoundary>} />
              </Routes>
              </ErrorBoundary>
            </Suspense>
          </AuthInitializer>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
