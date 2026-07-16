import {
  createContext,
  use,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type PropsWithChildren,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────────────

export type ProfileRole = 'admin' | 'teacher' | 'student';
export type ProfileStatus = 'active' | 'pending_approval' | 'rejected';

export interface Profile {
  id: string;
  display_name: string;
  role: ProfileRole;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  /** True when user has an active profile (session + approved). */
  isAuthorized: boolean;
  /** True while initial auth state is being determined. */
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    role: 'teacher' | 'student',
    displayName: string,
  ) => Promise<{ error?: string; profile?: Profile }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function useSession(): AuthContextType {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }
  return value;
}

// ── Helpers ────────────────────────────────────────────────────────

async function fetchProfileById(
  userId: string,
): Promise<{ profile: Profile | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!error && data) {
    return { profile: data as Profile };
  }
  return { profile: null };
}

// ── Provider ───────────────────────────────────────────────────────

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthorized = useMemo(
    () => !!session && profile?.status === 'active',
    [session, profile],
  );

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      const { profile: p } = await fetchProfileById(session.user.id);
      setProfile(p);
    }
  }, [session?.user]);

  // ── Initial load ──────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      if (s?.user) {
        const { profile: p } = await fetchProfileById(s.user.id);
        if (mounted) {
          setSession(s);
          setProfile(p);
        }
      }
      if (mounted) setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      // Only set session immediately. Profile is fetched by signIn/signUp.
      // For sign-out or session expiry, clear both.
      if (!s) {
        setSession(null);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Context value ─────────────────────────────────────────────────

  const value: AuthContextType = {
    session,
    profile,
    isAuthorized,
    isLoading,

    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };

      if (data.user && data.session) {
        const { profile: p } = await fetchProfileById(data.user.id);
        setSession(data.session);
        setProfile(p);

        if (p && p.status !== 'active') {
          if (p.status === 'pending_approval') {
            return {
              error:
                'Your account is pending approval. Please try again later.',
            };
          }
          if (p.status === 'rejected') {
            return {
              error:
                'Your registration was rejected. Please contact support.',
            };
          }
        }
      }

      return {};
    },

    signUp: async (email, password, role, displayName) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, role },
        },
      });
      if (error) return { error: error.message };

      if (data?.user && data.session) {
        const { profile: p } = await fetchProfileById(data.user.id);
        setSession(data.session);
        setProfile(p);
        return { profile: p ?? undefined };
      }

      return {};
    },

    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    },

    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
