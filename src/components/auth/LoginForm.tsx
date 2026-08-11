import { useState } from "react";
import { loginSchema } from "../../schemas/auth";
import { Field } from "../ui/Field";
import { ErrorState } from "../ui/ErrorState";

interface LoginFormProps {
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
  isSubmitting: boolean;
  isDisabled?: boolean;
}

export const LoginForm = ({
  onSubmit,
  isSubmitting,
  isDisabled = false,
}: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Ungültige Eingabe.");
      return;
    }

    try {
      await onSubmit(result.data);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Login fehlgeschlagen.",
      );
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Field label="E-Mail" htmlFor="login-email">
        <input
          id="login-email"
          className="field"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="max@schule.at"
        />
      </Field>
      <Field label="Passwort" htmlFor="login-password">
        <input
          id="login-password"
          className="field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mindestens 6 Zeichen"
        />
      </Field>
      {error ? <ErrorState message={error} /> : null}
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={isSubmitting || isDisabled}
      >
        {isDisabled ? "Konfiguration fehlt" : isSubmitting ? "Prüfe Zugang..." : "Einloggen"}
      </button>
    </form>
  );
};
