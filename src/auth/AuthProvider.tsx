import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  consumePendingAnonymousProgress,
  storePendingAnonymousProgress,
} from "@/auth/anonymous-migration";
import {
  AuthContext,
  type AuthContextValue,
  type EmailAuthMode,
} from "@/auth/auth-context";
import { createLocalDevUser } from "@/auth/local-dev-user";
import { useToast } from "@/components/toast/toast-context";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";
import {
  isLocalSupabaseMockEnabled,
  isSupabaseConfigured,
  supabase,
  type SupabaseUser,
} from "@/lib/supabase";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(() =>
    isLocalSupabaseMockEnabled ? createLocalDevUser() : null,
  );
  const [isLoading, setIsLoading] = useState(
    () => isSupabaseConfigured && !isLocalSupabaseMockEnabled,
  );
  const [authError, setAuthError] = useState("");
  const [syncVersion, setSyncVersion] = useState(0);
  const anonymousSignInPromiseRef = useRef<Promise<void> | null>(null);

  const finishUserSession = useCallback((nextUser: SupabaseUser) => {
    setUser(nextUser);
    setAuthError("");
    setIsLoading(false);

    if (nextUser.is_anonymous) return;

    void consumePendingAnonymousProgress(nextUser.id)
      .then((didMigrate) => {
        if (!didMigrate) return;
        setSyncVersion((current) => current + 1);
      })
      .catch((error: unknown) => {
        const message = getSupabaseErrorMessage(error);
        setAuthError(message);
        showToast({
          title: "We couldn't move your guest progress",
          description: message,
        });
      });
  }, [showToast]);

  const startAnonymousSession = useCallback(async () => {
    if (isLocalSupabaseMockEnabled) {
      finishUserSession(createLocalDevUser());
      return;
    }

    if (!supabase) {
      return;
    }

    if (anonymousSignInPromiseRef.current) {
      return anonymousSignInPromiseRef.current;
    }

    const signInPromise = (async () => {
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) throw error;

      const nextUser = data.user ?? data.session?.user;
      if (nextUser) {
        finishUserSession(nextUser);
      }
    })().finally(() => {
      anonymousSignInPromiseRef.current = null;
    });

    anonymousSignInPromiseRef.current = signInPromise;
    return signInPromise;
  }, [finishUserSession]);

  useEffect(() => {
    if (isLocalSupabaseMockEnabled) {
      return;
    }

    if (!supabase) {
      return;
    }

    let isMounted = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;

        if (data.session?.user) {
          finishUserSession(data.session.user);
          return;
        }

        setUser(null);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        const message = getSupabaseErrorMessage(error);
        setAuthError(message);
        showToast({
          title: "We couldn't check your saved session",
          description: message,
        });
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        finishUserSession(session.user);
        return;
      }

      setUser(null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [finishUserSession, showToast, startAnonymousSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authError,
      isConfigured: isSupabaseConfigured,
      isAnonymous: isLocalSupabaseMockEnabled ? false : Boolean(user?.is_anonymous),
      isLoading,
      syncVersion,
      user,
      signInWithEmail: async (email: string, mode: EmailAuthMode) => {
        if (isLocalSupabaseMockEnabled) {
          finishUserSession({
            ...createLocalDevUser(),
            email: email.trim() || "local-dev@packtical.test",
          });
          return;
        }

        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        if (mode === "connect-new" && user?.is_anonymous) {
          const { error } = await supabase.auth.updateUser(
            { email },
            {
              emailRedirectTo: window.location.origin + window.location.pathname,
            },
          );

          if (error) {
            showToast({
              title: "We couldn't connect your guest progress",
              description: getSupabaseErrorMessage(error),
            });
            throw error;
          }
          return;
        }

        if (mode === "connect-existing" && user?.is_anonymous) {
          try {
            await storePendingAnonymousProgress();
          } catch (error) {
            showToast({
              title: "We couldn't prepare your guest progress",
              description: getSupabaseErrorMessage(error),
            });
            throw error;
          }
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin + window.location.pathname,
            shouldCreateUser: mode !== "connect-existing",
          },
        });

        if (error) {
          showToast({
            title: "We couldn't send the email link",
            description: getSupabaseErrorMessage(error),
          });
          throw error;
        }
      },
      startAnonymousSession: async () => {
        if (isLocalSupabaseMockEnabled) {
          finishUserSession(createLocalDevUser());
          return;
        }

        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        setIsLoading(true);
        try {
          await startAnonymousSession();
        } catch (error) {
          showToast({
            title: "We couldn't start guest mode",
            description: getSupabaseErrorMessage(error),
          });
          throw error;
        } finally {
          setIsLoading(false);
        }
      },
      updateProfileName: async (firstName: string, lastName: string) => {
        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        const fullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(" ");

        if (!user) {
          throw new Error("Sign in before updating your name.");
        }

        if (isLocalSupabaseMockEnabled) {
          finishUserSession({
            ...user,
            user_metadata: {
              ...user.user_metadata,
              first_name: trimmedFirstName,
              last_name: trimmedLastName,
              full_name: fullName,
            },
          });
          return;
        }

        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const { data, error } = await supabase.auth.updateUser({
          data: {
            first_name: trimmedFirstName,
            last_name: trimmedLastName,
            full_name: fullName,
          },
        });

        if (error) {
          showToast({
            title: "We couldn't save your name",
            description: getSupabaseErrorMessage(error),
          });
          throw error;
        }

        if (data.user) {
          finishUserSession(data.user);
        }
      },
      signOut: async () => {
        if (isLocalSupabaseMockEnabled) {
          setUser(null);
          return;
        }

        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
          showToast({
            title: "We couldn't sign you out",
            description: getSupabaseErrorMessage(error),
          });
          throw error;
        }
      },
    }),
    [authError, finishUserSession, isLoading, showToast, startAnonymousSession, syncVersion, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
