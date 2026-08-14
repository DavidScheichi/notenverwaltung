import { useState } from "react";
import { Link } from "react-router-dom";
import { ForgotPasswordForm } from "../components/auth/ForgotPasswordForm";
import { useAuth } from "../hooks/useAuth";
import { supabaseConfigError } from "../lib/supabase/client";

export const ForgotPasswordPage = () => {
  const { resetPasswordForEmail } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (email: string) => {
    setIsSubmitting(true);
    try {
      await resetPasswordForEmail(email);
    } catch {
      // Bewusst kein Fehler-Rethrow: Anti-Enumeration — die Erfolgsmeldung
      // wird unabhängig vom Ergebnis gezeigt, siehe Design-Dokument.
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgb(var(--c-accent)/0.14),transparent_45%),radial-gradient(circle_at_90%_110%,rgb(var(--c-accent)/0.10),transparent_45%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white"
          >
            N
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-ink">Passwort vergessen</h1>
          <p className="mt-1.5 text-sm text-ink-3">
            Wir senden dir einen Link zum Zurücksetzen.
          </p>
        </div>

        <div className="card-raised p-6">
          {supabaseConfigError ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {supabaseConfigError}
            </div>
          ) : isSubmitted ? (
            <p className="text-sm text-ink-2">
              Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum
              Zurücksetzen des Passworts gesendet. Prüfe dein Postfach.
            </p>
          ) : (
            <ForgotPasswordForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isDisabled={Boolean(supabaseConfigError)}
            />
          )}
        </div>

        <p className="mt-4 text-center text-sm text-ink-3">
          <Link to="/login" className="hover:text-accent-strong hover:underline">
            Zurück zum Login
          </Link>
        </p>
      </div>
    </div>
  );
};
