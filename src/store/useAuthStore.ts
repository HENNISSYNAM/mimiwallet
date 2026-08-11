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
  /** Signs into the shared demo account. Only ever called from a button. */
  signInAsDemo: () => Promise<{ error: string | null }>;
  /** Whether a demo account is configured at all, so the UI can hide the button. */
  demoAvailable: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  session: null,
  loading: true,

  demoAvailable: !!(DEMO_EMAIL && DEMO_PASSWORD),

  initialize: async () => {
    // There is deliberately no automatic sign-in here any more.
    //
    // This function used to sign every visitor into the shared demo account
    // whenever they arrived without a session. The guard was
    // `if (DEMO_EMAIL && DEMO_PASSWORD)`, which reads as "only in demo builds"
    // — but src/lib/env.ts supplied hardcoded fallbacks for both, so the
    // condition was always true in every build. The effect was that anyone
    // opening the site landed inside one account: the second real user would
    // have seen the first one's transactions, and that account is now the one
    // that holds live bank credentials. Demo access is a button
    // (`signInAsDemo`), never an ambient default.
    let settled = false;
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        isAuthenticated: !!session,
        user: session?.user ?? null,
        session,
        ...(settled ? { loading: false } : {}),
      });
    });
    const { data: { session } } = await supabase.auth.getSession();

    settled = true;
    set({
      isAuthenticated: !!session,
      user: session?.user ?? null,
      session,
      loading: false,
    });
  },

  signInAsDemo: async () => {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) {
      return { error: 'Tài khoản demo chưa được cấu hình' };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    return { error: error?.message ?? null };
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
