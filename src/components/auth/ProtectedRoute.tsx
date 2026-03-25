import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";

// Ces routes ne doivent PAS déclencher la redirection vers /app/welcome
// (elles font partie du flux d'activation ou sont des pages auth)
const WELCOME_EXEMPT_PATHS = [
  "/app/welcome",
  "/app/first-victory",
  "/onboarding",
  "/login",
  "/register",
  "/reset-password",
];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "admin" | "manager";
  requirePro?: boolean;
}

export function ProtectedRoute({ children, requireRole, requirePro }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isInitialized, isAdmin, isManager, profile } = useAuth();
  const { data: sub, isLoading: subLoading } = useSubscription();
  const location = useLocation();

  if (!isInitialized || isLoading || (requirePro && subLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Chargement..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Passe F : guard race condition — profile null peut arriver avant le trigger DB
  // On attend que le profile soit chargé avant de décider si onboarding est nécessaire
  // Évite le bypass de has_completed_welcome lors d'une race condition au signup
  if (
    isAuthenticated &&
    profile === null &&
    !WELCOME_EXEMPT_PATHS.some((p) => location.pathname.startsWith(p))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Chargement du profil..." />
      </div>
    );
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

  // Pro-only routes: redirect to pricing if not subscribed
  if (requirePro && !sub?.isActive) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
}
