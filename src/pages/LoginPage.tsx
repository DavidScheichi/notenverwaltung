import { useState } from "react";
import { Navigate } from "react-router-dom";
import { LoginForm } from "../components/auth/LoginForm";
import { useAuth } from "../hooks/useAuth";
import { supabaseConfigError } from "../lib/supabase/client";

export const LoginPage = () => {
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (values: { email: string; password: string }) => {
    setIsSubmitting(true);
    try {
      await signIn(values.email, values.password);
    } finally {
      setIsSubmitting(false);
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
          <h1 className="mt-4 text-2xl font-semibold text-ink">Notenverwaltung</h1>
          <p className="mt-1.5 text-sm text-ink-3">
            Noten, Leistungsnachweise und Klassenkasse an einem Ort.
          </p>
        </div>

        <div className="card-raised p-6">
          {supabaseConfigError ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {supabaseConfigError}
            </div>
          ) : null}

          <LoginForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isDisabled={Boolean(supabaseConfigError)}
          />
        </div>
      </div>
    </div>
  );
};
