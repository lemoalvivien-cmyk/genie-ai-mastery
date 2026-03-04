import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { updateActivity, isSessionExpired, clearActivity } from "@/lib/security";
import { toast } from "@/hooks/use-toast";

export function useAuth() {
  const store = useAuthStore();
  // PASSE A · #16 — flag pour éviter le double-fetch en StrictMode React 18
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // PASSE A · #16 — Check session expiry on mount
    if (isSessionExpired()) {
      store.signOut();
      clearActivity();
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      store.setSession(session);
      store.setUser(session?.user ?? null);
      if (session?.user) {
        store.fetchProfile(session.user.id);
        updateActivity();
      }
      store.setInitialized(true);
      store.setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // PASSE A · #16 — Gestion expiration token : TOKEN_REFRESHED échoue → redirect
        if (event === "TOKEN_REFRESHED" && !session) {
          toast({
            title: "Session expirée",
            description: "Votre session a expiré, veuillez vous reconnecter.",
            variant: "destructive",
          });
          store.signOut();
          clearActivity();
          // Redirection gérée par ProtectedRoute via isAuthenticated = false
          return;
        }

        if (event === "SIGNED_OUT") {
          store.setSession(null);
          store.setUser(null);
          store.setProfile(null);
          clearActivity();
          store.setInitialized(true);
          store.setLoading(false);
          return;
        }

        store.setSession(session);
        store.setUser(session?.user ?? null);
        if (session?.user) {
          await store.fetchProfile(session.user.id);
          updateActivity();
        } else {
          store.setProfile(null);
          clearActivity();
        }
        store.setInitialized(true);
        store.setLoading(false);
      }
    );

    // Activity tracking on user interaction
    const handleActivity = () => {
      if (isSessionExpired()) {
        toast({
          title: "Session expirée",
          description: "Votre session a expiré, veuillez vous reconnecter.",
          variant: "destructive",
        });
        store.signOut();
        clearActivity();
      } else {
        updateActivity();
      }
    };

    window.addEventListener("click", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, []);

  return {
    user: store.user,
    session: store.session,
    profile: store.profile,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    isAuthenticated: !!store.user,
    isAdmin: store.serverRoles.includes("admin"),
    isManager: store.serverRoles.includes("manager") || store.serverRoles.includes("admin"),
    signOut: store.signOut,
    refetchProfile: () => store.user ? store.fetchProfile(store.user.id) : Promise.resolve(),
  };
}
