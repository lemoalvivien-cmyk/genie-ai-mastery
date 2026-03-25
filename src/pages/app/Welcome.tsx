/**
 * Welcome.tsx — Page de transition ultra-rapide post-onboarding
 *
 * Remplace l'ancienne version avec KITT + voice + setTimeout bloquants.
 * Objectif : afficher immédiatement la première mission personnalisée
 * et lancer l'action en 1 clic.
 *
 * Redirection directe si has_completed_welcome déjà true.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Welcome() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Si l'onboarding n'est pas terminé → retour onboarding
    if (profile && profile.onboarding_completed === false) {
      navigate("/onboarding", { replace: true });
      return;
    }
    // Welcome est maintenant une simple passe-plat vers first-victory
    // has_completed_welcome est setté true dans Onboarding.tsx dès la fin
    navigate("/app/first-victory", { replace: true });
  }, [profile, navigate]);

  return (
    <>
      <Helmet><title>Bienvenue – Formetoialia</title></Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </>
  );
}
