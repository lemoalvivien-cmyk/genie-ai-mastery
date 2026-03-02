import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  persona: string | null;
  level: number;
  preferred_mode: string;
  org_id: string | null;
  role: string;
  onboarding_completed: boolean;
  voice_enabled: boolean;
  streak_count: number;
  has_completed_welcome: boolean;
  panic_uses: number;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (v: boolean) => void;
  setInitialized: (v: boolean) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),

  fetchProfile: async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (data) set({ profile: data as Profile });
    } catch {
      // Profile might not exist yet (trigger delay)
    }
  },

  signOut: async () => {
    const userId = get().user?.id;
    if (userId) {
      // Fire-and-forget logout audit log
      supabase.from("audit_logs").insert({
        user_id: userId,
        action: "logout",
        resource_type: "auth",
        details: { method: "explicit" },
      }).then(() => {});
    }
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  reset: () =>
    set({ user: null, session: null, profile: null, isLoading: false }),
}));
