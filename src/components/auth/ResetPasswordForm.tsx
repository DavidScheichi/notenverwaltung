import { useState } from "react";
import { resetPasswordSchema } from "../../schemas/auth";
import { Field } from "../ui/Field";
import { ErrorState } from "../ui/ErrorState";

interface ResetPasswordFormProps {
  onSubmit: (password: string) => Promise<void>;
  isSubmitting: boolean;
}

export const ResetPasswordForm = ({ onSubmit, isSubmitting }: ResetPasswordFormProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Ungültige Eingabe.");
      return;
    }

    try {
      await onSubmit(result.data.password);
    } catch {
      // Supabase-Fehler (z. B. "Auth session missing!") sind für Nutzer
      // wenig hilfreich — hier gibt es nur einen realistischen Grund für
      // ein Scheitern: ein fehlender/abgelaufener Recovery-Link.
      setError("Der Link ist ungültig oder abgelaufen. Fordere einen neuen Reset-Link an.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Field label="Neues Passwort" htmlFor="reset-password-password">
        <input
          id="reset-password-password"
          className="field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mindestens 6 Zeichen"
        />
      </Field>
      <Field label="Passwort bestätigen" htmlFor="reset-password-confirm">
        <input
          id="reset-password-confirm"
          className="field"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Mindestens 6 Zeichen"
        />
      </Field>
      {error ? <ErrorState message={error} /> : null}
      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? "Wird gespeichert..." : "Passwort speichern"}
      </button>
    </form>
  );
};
