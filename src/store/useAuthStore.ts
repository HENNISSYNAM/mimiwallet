import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string, meta?: { full_name?: string; phone?: string }) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    // Set up listener FIRST
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        isAuthenticated: !!session,
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });
    // Then get current session
    const { data: { session } } = await supabase.auth.getSession();
    set({
      isAuthenticated: !!session,
      user: session?.user ?? null,
      session,
      loading: false,
    });
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  },

  register: async (email, password, meta) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: meta,
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ isAuthenticated: false, user: null, session: null });
  },
}));
