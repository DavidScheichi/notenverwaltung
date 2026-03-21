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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel hidden flex-col justify-between bg-slate-900 text-white lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-100">
              Browser + PWA
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Noten, Bewertungen und Klassenkasse an einem Ort.
            </h1>
          </div>
          <div className="grid gap-3 text-sm text-slate-300">
            <p>Klassen verwalten, Schüler zuordnen und Noten je Fach sauber erfassen.</p>
            <p>Das MVP ist für Supabase Auth, Postgres und strikte Besitzrechte ausgelegt.</p>
          </div>
        </section>
        <section className="panel mx-auto w-full max-w-md">
          <h2 className="text-2xl font-semibold text-slate-900">Login</h2>
          <p className="mt-2 text-sm text-slate-500">
            Nutze einen Benutzer aus Supabase Auth.
          </p>
          {supabaseConfigError ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {supabaseConfigError}
            </div>
          ) : null}
          <div className="mt-6">
            <LoginForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isDisabled={Boolean(supabaseConfigError)}
            />
          </div>
        </section>
      </div>
    </div>
  );
};
