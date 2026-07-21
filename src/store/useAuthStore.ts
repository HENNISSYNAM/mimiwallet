import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/env';

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
    let { data: { session } } = await supabase.auth.getSession();

    // Demo mode: if no session and demo credentials are configured, sign in
    // silently so the login form never has to be shown. No-op (and no
    // regression to normal auth) unless both env vars are set.
    if (!session) {
      if (DEMO_EMAIL && DEMO_PASSWORD) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
        if (error) {
          console.warn('Demo auto-login failed:', error.message);
        } else {
          session = data.session;
        }
      }
    }

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
