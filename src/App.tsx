import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,      // 2 min default — avoids redundant refetches
      gcTime: 10 * 60 * 1000,        // 10 min cache retention
      retry: 1,                       // one retry on error, not 3
      refetchOnWindowFocus: false,    // no background refetch on tab switch
    },
  },
});

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

// Captures ?ref= query param globally and persists to localStorage
function RefCapture() {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem("genie_ref", ref.toUpperCase().slice(0, 20));
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
                   <Route path="today" element={<Today />} />
                   <Route path="jarvis" element={<Jarvis />} />
                   <Route path="settings" element={<Settings />} />
                   <Route path="labs/phishing" element={<PhishingLab />} />
                </Route>

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
                <Route path="/partner" element={<ProtectedRoute><PartnerDashboard /></ProtectedRoute>} />

                {/* Hidden God Mode — email-gated */}
                <Route path="/admin-god-mode" element={<ProtectedRoute><GodMode /></ProtectedRoute>} />
                <Route path="/guides" element={<GuideList />} />
                <Route path="/guides/:slug" element={<GuideDetail />} />

                {/* Legal centre — new routes */}
                <Route path="/legal" element={<LegalCenter />} />
                <Route path="/legal/:slug" element={<LegalCenter />} />

                {/* Legacy legal redirects */}
                <Route path="/cgu" element={<Legal />} />
                <Route path="/confidentialite" element={<Legal />} />
                <Route path="/mentions-legales" element={<Legal />} />
                <Route path="/rgpd" element={<Legal />} />
                <Route path="/security" element={<Legal />} />

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
