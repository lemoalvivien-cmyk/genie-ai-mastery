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

// Lazy load pages
const Landing = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Onboarding = lazy(() => import("./pages/onboarding/Onboarding"));
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const Modules = lazy(() => import("./pages/app/Modules"));
const ModuleDetail = lazy(() => import("./pages/app/ModuleDetail"));
const Chat = lazy(() => import("./pages/app/Chat"));
const VerifyAttestation = lazy(() => import("./pages/VerifyAttestation"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

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

                {/* App routes — authenticated */}
                <Route
                  path="/app/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/app/modules"
                  element={
                    <ProtectedRoute>
                      <Modules />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/modules/:slug"
                  element={
                    <ProtectedRoute>
                      <ModuleDetail />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/app/chat"
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  }
                />

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
                  path="/manager/*"
                  element={
                    <ProtectedRoute requireRole="manager">
                      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                        <p>Manager Dashboard (à venir)</p>
                      </div>
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
                {/* Public verify page */}
                <Route path="/verify/:id" element={<VerifyAttestation />} />
              </Routes>
            </Suspense>
          </AuthInitializer>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
