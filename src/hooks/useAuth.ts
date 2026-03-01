import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { updateActivity, isSessionExpired, clearActivity } from "@/lib/security";

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    // Check session expiry on mount
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
    isAdmin: store.profile?.role === "admin",
    isManager: store.profile?.role === "manager" || store.profile?.role === "admin",
    signOut: store.signOut,
    refetchProfile: () => store.user ? store.fetchProfile(store.user.id) : Promise.resolve(),
  };
}
