import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";

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
const NotFound = lazy(() => import("./pages/NotFound"));

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

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthInitializer>
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
                </Route>

                {/* Admin routes */}
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
                     <ProtectedRoute requireRole="manager">
                       <ManagerDashboard />
                     </ProtectedRoute>
                   }
                 />

                <Route path="/pricing" element={<Pricing />} />
                <Route path="/verify/:id" element={<VerifyAttestation />} />

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
