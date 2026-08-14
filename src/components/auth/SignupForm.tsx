import { useState } from "react";
import { signupSchema } from "../../schemas/auth";
import { Field } from "../ui/Field";
import { ErrorState } from "../ui/ErrorState";

interface SignupFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isSubmitting: boolean;
  isDisabled?: boolean;
}

export const SignupForm = ({
  onSubmit,
  isSubmitting,
  isDisabled = false,
}: SignupFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const result = signupSchema.safeParse({ email, password, confirmPassword });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Ungültige Eingabe.");
      return;
    }

    try {
      await onSubmit(result.data.email, result.data.password);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Registrierung fehlgeschlagen.",
      );
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Field label="E-Mail" htmlFor="signup-email">
        <input
          id="signup-email"
          className="field"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="max@schule.at"
        />
      </Field>
      <Field label="Passwort" htmlFor="signup-password">
        <input
          id="signup-password"
          className="field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mindestens 6 Zeichen"
        />
      </Field>
      <Field label="Passwort bestätigen" htmlFor="signup-confirm">
        <input
          id="signup-confirm"
          className="field"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Mindestens 6 Zeichen"
        />
      </Field>
      {error ? <ErrorState message={error} /> : null}
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={isSubmitting || isDisabled}
      >
        {isDisabled ? "Konfiguration fehlt" : isSubmitting ? "Wird registriert..." : "Registrieren"}
      </button>
    </form>
  );
};
