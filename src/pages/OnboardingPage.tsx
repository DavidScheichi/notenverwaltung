import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useToast } from "../components/ui/ToastProvider";
import { Field } from "../components/ui/Field";
import { ErrorState } from "../components/ui/ErrorState";
import { classSchema } from "../schemas/classes";

export const OnboardingPage = () => {
  const { isAuthenticated, isLoading: isAuthLoading, signOut } = useAuth();
  const { data: classes, isLoading: isClassesLoading, createClass } = useClasses();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isAuthLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthLoading || isClassesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-ink-3">Wird geladen...</p>
      </div>
    );
  }

  if ((classes?.length ?? 0) > 0) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const result = classSchema.safeParse({ name });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Ungültige Eingabe.");
      return;
    }

    try {
      const created = await createClass.mutateAsync(result.data.name);
      toast.success("Klasse wurde erstellt.");
      navigate(`/classes/${created.id}`, { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Klasse konnte nicht angelegt werden.",
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast.error("Abmelden fehlgeschlagen. Bitte versuche es erneut.");
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
          <h1 className="mt-4 text-2xl font-semibold text-ink">Willkommen!</h1>
          <p className="mt-1.5 text-sm text-ink-3">
            Erstelle deine erste Klasse, um loszulegen.
          </p>
        </div>

        <div className="card-raised p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Klassenname" htmlFor="onboarding-class-name">
              <input
                id="onboarding-class-name"
                className="field"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="z. B. 3B"
              />
            </Field>
            {error ? <ErrorState message={error} /> : null}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={createClass.isPending}
            >
              {createClass.isPending ? "Wird gespeichert..." : "Klasse anlegen"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-ink-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="hover:text-accent-strong hover:underline"
          >
            Abmelden
          </button>
        </p>
      </div>
    </div>
  );
};
