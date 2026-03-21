import { useState } from "react";
import { loginSchema } from "../../schemas/auth";

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
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">E-Mail</label>
        <input
          className="field"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="max@schule.at"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Passwort</label>
        <input
          className="field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mindestens 6 Zeichen"
        />
      </div>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="button-primary w-full"
        disabled={isSubmitting || isDisabled}
      >
        {isDisabled ? "Konfiguration fehlt" : isSubmitting ? "Prüfe Zugang..." : "Einloggen"}
      </button>
    </form>
  );
};
