import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";
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
  serverRoles: string[];
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setServerRoles: (roles: string[]) => void;
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
  serverRoles: [],
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setServerRoles: (serverRoles) => set({ serverRoles }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),

  fetchProfile: async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, persona, level, preferred_mode, org_id, role, onboarding_completed, voice_enabled, streak_count, has_completed_welcome, panic_uses")
        .eq("id", userId)
        .single();

      const { data: roles } = await supabase.rpc("get_my_roles");
      const userRoles = (roles ?? []).map((r: { role: string }) => r.role);

      if (data) set({ profile: data as Profile, serverRoles: userRoles });
    } catch (_e) {
      // Profile might not exist yet (trigger delay)
    }
  },

  signOut: async () => {
    const userId = get().user?.id;
    if (userId) {
      // Fire-and-forget logout audit log via RPC
      supabase.rpc("log_event", {
        _user_id: userId,
        _event_type: "logout",
        _resource_type: "auth",
        _details: { method: "explicit" },
      }).then(() => {});
    }

    await supabase.auth.signOut();

    // Purge totale : state + React Query cache + localStorage + sessionStorage tokens
    set({ user: null, session: null, profile: null, serverRoles: [] });
    queryClient.clear();

    // Supprimer les artefacts localStorage Supabase pour bloquer le bouton retour
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") || key === "genie_last_activity") {
        localStorage.removeItem(key);
      }
    });

    // Purger sessionStorage (brute-force tracking, ref codes, etc.)
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("genie_") || key.startsWith("sb-")) {
        sessionStorage.removeItem(key);
      }
    });
  },

  reset: () =>
    set({ user: null, session: null, profile: null, serverRoles: [], isLoading: false }),
}));
