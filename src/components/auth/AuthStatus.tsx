import { useState, type FormEvent } from "react";
import { Button, Input, Link } from "@heroui/react";
import { Cloud, CloudOff, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuth, type EmailAuthMode } from "@/auth/auth-context";
import { getUserDisplayName } from "@/auth/user-display";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";

type AuthStatusProps = {
  variant?: "compact" | "full";
};

export function AuthStatus({ variant = "compact" }: AuthStatusProps) {
  const {
    authError,
    isAnonymous,
    isConfigured,
    isLoading,
    user,
    signInWithEmail,
    signOut,
    startAnonymousSession,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [usesExistingAccount, setUsesExistingAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailMode = getEmailMode(isAnonymous, usesExistingAccount);
  const displayName = getUserDisplayName(user);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) return;

    setIsSubmitting(true);
    setMessage("");
    setError("");

    void signInWithEmail(trimmedEmail, emailMode)
      .then(() => {
        setMessage(getSuccessMessage(emailMode));
        setEmail("");
      })
      .catch((signInError: unknown) => {
        setError(getSupabaseErrorMessage(signInError));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleAnonymousStart = () => {
    setIsSubmitting(true);
    setMessage("");
    setError("");

    void startAnonymousSession()
      .catch((anonymousError: unknown) => {
        setError(getSupabaseErrorMessage(anonymousError));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  if (!isConfigured) {
    return (
      <div className="auth-status auth-status-local">
        <CloudOff aria-hidden="true" size={15} strokeWidth={2.1} />
        <span>Sync unavailable</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="auth-status">
        <Cloud aria-hidden="true" size={15} strokeWidth={2.1} />
        <span>Checking sync</span>
      </div>
    );
  }

  if (user && !isAnonymous) {
    return (
      <div className={`auth-status auth-status-signed-in${variant === "full" ? " auth-status-full" : ""}`}>
        <div className="auth-status-identity">
          <Cloud aria-hidden="true" size={15} strokeWidth={2.1} />
          <span title={user.email ?? undefined}>{displayName || "Signed in"}</span>
        </div>
        {variant === "full" ? (
          <Button
            className="auth-sign-out-button"
            onPress={() => {
              void signOut();
            }}
            size="sm"
            variant="ghost"
          >
            <LogOut aria-hidden="true" size={14} strokeWidth={2.1} />
            <span>Sign out</span>
          </Button>
        ) : (
          <Button
            aria-label="Sign out"
            className="auth-icon-button"
            isIconOnly
            onPress={() => {
              void signOut();
            }}
            size="sm"
            variant="ghost"
          >
            <LogOut aria-hidden="true" size={14} strokeWidth={2.1} />
          </Button>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Link className="auth-save-link" href="#/account">
        <ShieldCheck aria-hidden="true" size={15} strokeWidth={2.1} />
        <span>{user && isAnonymous ? "Sign in to save" : "Account"}</span>
      </Link>
    );
  }

  if (!user && authError) {
    return (
      <div className="auth-status auth-status-local">
        <CloudOff aria-hidden="true" size={15} strokeWidth={2.1} />
        <span title={authError}>Guest session unavailable</span>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-heading">
          <h2>{getFormTitle(emailMode)}</h2>
          <p>{getFormDescription(emailMode)}</p>
        </div>
        <label className="auth-email-field">
          <span>Email address</span>
          <div className="auth-email-control">
            <Mail aria-hidden="true" size={15} strokeWidth={2.1} />
            <Input
              aria-label="Email address"
              className="auth-email-input"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
              variant="secondary"
            />
          </div>
        </label>
        <Button
          className="auth-submit-button"
          isDisabled={isSubmitting}
          size="sm"
          type="submit"
          variant="secondary"
        >
          {isSubmitting ? "Sending" : getSubmitLabel(emailMode)}
        </Button>
        {isAnonymous ? (
          <button
            className="auth-switch-button"
            onClick={() => {
              setUsesExistingAccount((current) => !current);
              setMessage("");
              setError("");
            }}
            type="button"
          >
            {usesExistingAccount ? "Use a new account instead" : "Use an existing account instead"}
          </button>
        ) : null}
      </form>

      {!user ? (
        <Button
          className="auth-guest-button"
          isDisabled={isSubmitting}
          onPress={handleAnonymousStart}
          size="sm"
          variant="ghost"
        >
          <UserRound aria-hidden="true" size={14} strokeWidth={2.1} />
          Continue as guest
        </Button>
      ) : null}

      {message || error ? (
        <span className={`auth-message${error ? " error" : ""}`}>
          {error || message}
        </span>
      ) : null}
    </div>
  );
}

function getEmailMode(isAnonymous: boolean, usesExistingAccount: boolean): EmailAuthMode {
  if (!isAnonymous) return "email-link";
  return usesExistingAccount ? "connect-existing" : "connect-new";
}

function getFormTitle(mode: EmailAuthMode) {
  switch (mode) {
    case "connect-new":
      return "Save guest progress";
    case "connect-existing":
      return "Merge into an existing account";
    default:
      return "Continue with email";
  }
}

function getFormDescription(mode: EmailAuthMode) {
  switch (mode) {
    case "connect-new":
      return "We will email a confirmation link and keep this guest session connected to that account.";
    case "connect-existing":
      return "We will email a sign-in link, then merge this guest packing progress after you open it.";
    default:
      return "One email link signs you in or creates your account if this is your first time.";
  }
}

function getSubmitLabel(mode: EmailAuthMode) {
  switch (mode) {
    case "connect-new":
      return "Email save link";
    case "connect-existing":
      return "Email sign-in link";
    default:
      return "Email me a link";
  }
}

function getSuccessMessage(mode: EmailAuthMode) {
  switch (mode) {
    case "connect-new":
      return "Check your email to finish saving this guest progress.";
    case "connect-existing":
      return "Check your email to sign in. This guest progress will merge after the link opens.";
    default:
      return "Check your email for the Packtical sign-in link.";
  }
}
