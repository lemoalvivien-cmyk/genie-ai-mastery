import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "admin" | "manager";
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isInitialized, isAdmin, isManager } = useAuth();
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

  if (requireRole === "admin" && !isAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (requireRole === "manager" && !isManager) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
