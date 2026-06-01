import { useState, type FormEvent } from "react";
import { Button, Card, Chip, Input } from "@heroui/react";
import { AuthStatus } from "@/components/auth/AuthStatus";
import { ChecklistBackLink } from "@/components/navigation/ChecklistBackLink";
import { useAuth } from "@/auth/auth-context";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";
import { getUserFirstName, getUserLastName } from "@/auth/user-display";

export function AccountPage() {
  const { isAnonymous, user } = useAuth();
  const canManageProfile = Boolean(user && !isAnonymous);

  return (
    <main className="page-frame account-page">
      <section className="page-shell account-shell">
        <ChecklistBackLink />

        <Card className="account-card" variant="secondary">
          <Card.Content className="account-card-content">
            <Chip className="hero-chip" variant="soft">
              Account
            </Chip>
            <div className="account-copy">
              <h1 className="account-title">
                {user && isAnonymous ? "Save this progress." : "Manage your account."}
              </h1>
              <p className="account-description">
                {user && isAnonymous
                  ? "Add an email to save this guest session, or use an existing account and merge this packing progress after the email link opens."
                  : "Your checklist progress and custom items are synced with Supabase."}
              </p>
            </div>
            {canManageProfile ? (
              <AccountNameForm
                key={`${user?.id ?? "account"}-${getUserFirstName(user)}-${getUserLastName(user)}`}
                firstName={getUserFirstName(user)}
                lastName={getUserLastName(user)}
              />
            ) : null}
            <AuthStatus variant="full" />
          </Card.Content>
        </Card>
      </section>
    </main>
  );
}

function AccountNameForm({
  firstName: initialFirstName,
  lastName: initialLastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const { updateProfileName } = useAuth();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const handleNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSavingName(true);

    void updateProfileName(firstName, lastName)
      .then(() => {
        setMessage(firstName.trim() || lastName.trim() ? "Name saved." : "Name cleared.");
      })
      .catch((profileError: unknown) => {
        setError(getSupabaseErrorMessage(profileError));
      })
      .finally(() => setIsSavingName(false));
  };

  return (
    <form className="account-name-form" onSubmit={handleNameSubmit}>
      <div className="account-name-form-heading">
        <h2>Name</h2>
        <p>Optional. If you add a name, Packtical will show it instead of your email.</p>
      </div>
      <div className="account-name-fields">
        <Input
          aria-label="First name"
          className="account-name-input"
          label="First name"
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="First"
          value={firstName}
        />
        <Input
          aria-label="Last name"
          className="account-name-input"
          label="Last name"
          onChange={(event) => setLastName(event.target.value)}
          placeholder="Last"
          value={lastName}
        />
      </div>
      <div className="account-name-actions">
        <Button className="account-name-save-button" isLoading={isSavingName} type="submit">
          Save name
        </Button>
      </div>
      {message || error ? (
        <span className={`account-name-message${error ? " error" : ""}`}>
          {error || message}
        </span>
      ) : null}
    </form>
  );
}
