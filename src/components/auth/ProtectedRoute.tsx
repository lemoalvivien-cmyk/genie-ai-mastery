import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const WELCOME_EXEMPT_PATHS = ["/app/welcome", "/onboarding", "/login", "/register", "/reset-password"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "admin" | "manager";
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isInitialized, isAdmin, isManager, profile } = useAuth();
  const location = useLocation();

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Chargement..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to welcome experience if not completed yet
  if (
    profile &&
    !profile.has_completed_welcome &&
    !WELCOME_EXEMPT_PATHS.some((p) => location.pathname.startsWith(p))
  ) {
    return <Navigate to="/app/welcome" replace />;
  }

  if (requireRole === "admin" && !isAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (requireRole === "manager" && !isManager) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
