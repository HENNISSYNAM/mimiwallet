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
    // Subscribing fires the listener immediately with INITIAL_SESSION, which on
    // a cold load carries a null session. Clearing `loading` there let
    // ProtectedRoute see {loading:false, isAuthenticated:false} and bounce
    // straight to /login — before the demo sign-in below had a chance to run.
    // Opening /dashboard directly therefore hit a login wall even though the
    // sign-in went on to succeed. Keep `loading` owned by initialize() until the
    // whole flow settles; the listener only tracks later auth changes.
    let settled = false;
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        isAuthenticated: !!session,
        user: session?.user ?? null,
        session,
        ...(settled ? { loading: false } : {}),
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

    settled = true;
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
