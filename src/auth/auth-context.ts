import { createContext, useContext } from "react";
import type { SupabaseUser } from "@/lib/supabase";

export type EmailAuthMode = "email-link" | "connect-existing" | "connect-new";

export type AuthContextValue = {
  authError: string;
  isConfigured: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
  syncVersion: number;
  user: SupabaseUser | null;
  signInWithEmail: (email: string, mode: EmailAuthMode) => Promise<void>;
  updateProfileName: (firstName: string, lastName: string) => Promise<void>;
  startAnonymousSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
