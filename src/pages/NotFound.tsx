import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 px-6">
        <div className="text-8xl font-black text-primary/20">404</div>
        <h1 className="text-2xl font-bold text-foreground">Page introuvable</h1>
        <p className="text-muted-foreground max-w-xs">
          La page <code className="text-primary text-sm">{location.pathname}</code> n'existe pas ou a été déplacée.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-glow hover:opacity-90 transition-opacity"
          >
            Retour à l'accueil
          </Link>
          <Link
            to="/app/dashboard"
            className="px-5 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted/50 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
