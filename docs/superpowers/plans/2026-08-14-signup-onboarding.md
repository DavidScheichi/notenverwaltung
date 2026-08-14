# Signup + Onboarding-Flow Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nutzer können sich selbst registrieren (mit E-Mail-Bestätigung) und werden danach durch einen minimalen Onboarding-Schritt (erste Klasse anlegen) geführt, statt auf ein leeres Dashboard zu treffen.

**Architecture:** Zwei neue Top-Level-Routen (`/signup`, `/onboarding`) außerhalb von `AppShell`, analog zu `/login`/`/forgot-password`/`/reset-password`. Der Onboarding-Bedarf wird ohne neue DB-Spalte abgeleitet: ein eingeloggter Nutzer ohne Klassen braucht Onboarding — sowohl `OnboardingPage` selbst als auch `AppShell` prüfen das über die bereits vorhandene `useClasses()`-Query.

**Tech Stack:** React 19, TypeScript, Vite 6, TailwindCSS 3.4, React Router 7, Zod 3, TanStack Query 5, Supabase Auth (`detectSessionInUrl: true` bereits aktiv in `src/lib/supabase/client.ts`). Keine neuen Abhängigkeiten.

**Spec:** [docs/superpowers/specs/2026-08-14-signup-onboarding-design.md](../specs/2026-08-14-signup-onboarding-design.md)

## Global Constraints

- **Offene Registrierung**, kein Einladungscode.
- **E-Mail-Bestätigung erforderlich** — `signUp` liefert keine sofortige Session; die Bestätigung erfolgt außerhalb des Codes in den Supabase-Projekteinstellungen (wird hier vorausgesetzt, nicht verifizierbar über `npm run build`).
- **Anti-Enumeration:** `/signup` zeigt nach dem Absenden immer dieselbe generische Erfolgsmeldung, unabhängig vom genauen Supabase-Ergebnis. Nur `supabaseConfigError` wird als echter Fehler angezeigt.
- **Kein neues DB-Feld für Onboarding-Status** — Ableitung ausschließlich aus `classesQuery.data.length === 0`.
- **Nur "erste Klasse anlegen"** als Onboarding-Schritt, kein mehrstufiger Wizard.
- **Kein Testframework vorhanden.** Verifikation pro Task: `npm run build` muss fehlerfrei durchlaufen, danach manuelle Prüfung im Dev-Server (`npm run dev`).
- **Sprache:** Alle sichtbaren Texte auf Deutsch, Du-Form (wie bisher), Umlaute ausgeschrieben.
- **Branch:** `ui-ux-ueberarbeitung` (aktueller Branch).
- **Commit-Nachrichten:** Deutsch, Imperativ, mit `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` als letzte Zeile.
- **Passwort-Mindestlänge:** 6 Zeichen, konsistent mit `loginSchema`/`resetPasswordSchema`.

## Dateistruktur

**Neu:**

| Datei | Verantwortung |
|---|---|
| `src/components/auth/SignupForm.tsx` | E-Mail-/Passwort-/Bestätigen-Eingabe + Validierung |
| `src/pages/SignupPage.tsx` | Seiten-Layout, Submit-/Erfolgs-State |
| `src/pages/OnboardingPage.tsx` | Auth-Guard, Redirect wenn bereits Klassen vorhanden, "erste Klasse anlegen"-Formular |

**Geändert:** `src/schemas/auth.ts`, `src/hooks/useAuth.ts`, `src/hooks/useClasses.ts`, `src/router.tsx`, `src/pages/LoginPage.tsx`, `src/components/layout/AppShell.tsx`.

---

### Task 1: Signup-Flow (Registrierung, E-Mail-Bestätigung)

**Files:**
- Modify: `src/schemas/auth.ts`
- Modify: `src/hooks/useAuth.ts`
- Create: `src/components/auth/SignupForm.tsx`
- Create: `src/pages/SignupPage.tsx`
- Modify: `src/router.tsx`
- Modify: `src/pages/LoginPage.tsx`

**Interfaces:**
- Consumes: nichts Neues aus anderen Tasks
- Produces: `signupSchema` (Zod), `useAuth().signUp(email: string, password: string): Promise<void>`, Route `/signup`

- [ ] **Step 1: Schema ergänzen**

In `src/schemas/auth.ts` nach `resetPasswordSchema`/`ResetPasswordInput` ergänzen:

```ts
export const signupSchema = z
  .object({
    email: z.string().email("Bitte eine gültige E-Mail eingeben."),
    password: z.string().min(6, "Mindestens 6 Zeichen."),
    confirmPassword: z.string().min(6, "Mindestens 6 Zeichen."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
```

- [ ] **Step 2: `useAuth` um `signUp` erweitern**

In `src/hooks/useAuth.ts` nach `updatePassword` (vor dem `return`) ergänzen:

```ts
const signUp = async (email: string, password: string) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/onboarding`,
    },
  });
  if (error) {
    throw error;
  }
};
```

Im Rückgabeobjekt `signUp` mit ergänzen:

```ts
return {
  isAuthenticated: Boolean(session),
  isLoading,
  session,
  signIn,
  signOut,
  resetPasswordForEmail,
  updatePassword,
  signUp,
};
```

- [ ] **Step 3: `SignupForm` erstellen**

`src/components/auth/SignupForm.tsx` neu anlegen, orientiert an `src/components/auth/ResetPasswordForm.tsx` (Passwort + Bestätigen) plus dem E-Mail-Feld aus `LoginForm.tsx`:

```tsx
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
```

- [ ] **Step 4: `SignupPage` erstellen**

`src/pages/SignupPage.tsx` neu anlegen, Layout orientiert an `src/pages/ForgotPasswordPage.tsx` (generische Erfolgsmeldung nach Absenden, Anti-Enumeration — kein Fehler-Rethrow außer bei `supabaseConfigError`):

```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { SignupForm } from "../components/auth/SignupForm";
import { useAuth } from "../hooks/useAuth";
import { supabaseConfigError } from "../lib/supabase/client";

export const SignupPage = () => {
  const { signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (email: string, password: string) => {
    setIsSubmitting(true);
    try {
      await signUp(email, password);
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
          <h1 className="mt-4 text-2xl font-semibold text-ink">Konto erstellen</h1>
          <p className="mt-1.5 text-sm text-ink-3">
            Noten, Leistungsnachweise und Klassenkasse an einem Ort.
          </p>
        </div>

        <div className="card-raised p-6">
          {supabaseConfigError ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {supabaseConfigError}
            </div>
          ) : isSubmitted ? (
            <p className="text-sm text-ink-2">
              Bestätige deine E-Mail-Adresse, um loszulegen. Prüfe dein
              Postfach und klicke auf den Bestätigungslink.
            </p>
          ) : (
            <SignupForm
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
```

- [ ] **Step 5: Route ergänzen**

In `src/router.tsx` den Import ergänzen (`import { SignupPage } from "./pages/SignupPage";`, alphabetisch nach `ResetPasswordPage` einsortieren) und eine neue Top-Level-Route außerhalb des `AppShell`-Children-Baums ergänzen, direkt nach `/reset-password`:

```tsx
{
  path: "/reset-password",
  element: <ResetPasswordPage />,
},
{
  path: "/signup",
  element: <SignupPage />,
},
```

- [ ] **Step 6: Link auf der Login-Seite ergänzen**

In `src/pages/LoginPage.tsx` den bestehenden Block mit dem "Passwort vergessen?"-Link erweitern:

```tsx
<p className="mt-4 text-center text-sm text-ink-3">
  <Link to="/forgot-password" className="hover:text-accent-strong hover:underline">
    Passwort vergessen?
  </Link>
</p>
<p className="mt-2 text-center text-sm text-ink-3">
  Neu hier?{" "}
  <Link to="/signup" className="font-medium text-accent hover:text-accent-strong hover:underline">
    Jetzt registrieren
  </Link>
</p>
```

- [ ] **Step 7: Manuell im Dev-Server prüfen**

Run: `npm run dev`. Auf `/login` den Link "Jetzt registrieren" klicken → landet auf `/signup`. E-Mail, Passwort und ein abweichendes Bestätigungspasswort eingeben → Client-seitiger Fehler "Die Passwörter stimmen nicht überein." muss erscheinen, kein Submit. Danach übereinstimmende Passwörter eingeben und absenden → generische Erfolgsmeldung muss erscheinen. "Zurück zum Login" muss zu `/login` führen.

- [ ] **Step 8: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 9: Commit**

```bash
git add src/schemas/auth.ts src/hooks/useAuth.ts src/components/auth/SignupForm.tsx src/pages/SignupPage.tsx src/router.tsx src/pages/LoginPage.tsx
git commit -m "$(cat <<'EOF'
Ergänze Signup-Flow mit E-Mail-Bestätigung

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Onboarding-Flow (erste Klasse anlegen, AppShell-Gate)

**Files:**
- Modify: `src/hooks/useClasses.ts`
- Create: `src/pages/OnboardingPage.tsx`
- Modify: `src/router.tsx`
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `useAuth()` aus `src/hooks/useAuth.ts` (`isAuthenticated`, `isLoading`), `useClasses()` aus `src/hooks/useClasses.ts` (bereits vorhanden: `classesQuery`-Felder über Spread, `createClass`), `classSchema` aus `src/schemas/classes.ts` (bereits vorhanden, `{ name: string }`, min. 2 / max. 80 Zeichen)
- Produces: `useClasses().createClass.mutateAsync(name: string): Promise<SchoolClass>` (Rückgabewert neu — bisher `Promise<void>`), Route `/onboarding`

- [ ] **Step 1: `createClass` gibt die neu angelegte Klasse zurück**

In `src/hooks/useClasses.ts` die `createClass`-Mutation anpassen, damit `OnboardingPage` zur neuen Klasse weiterleiten kann. Aktuell (Zeile 26-46):

```ts
const createClass = useMutation({
  mutationFn: async (name: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Nicht eingeloggt.");
    }

    const { error } = await supabase.from("classes").insert({
      name,
      teacher_id: user.id,
    });

    if (error) {
      throw error;
    }
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey }),
});
```

Ersetzen durch (fügt `.select().single()` hinzu und gibt die eingefügte Zeile typisiert zurück; bestehende Aufrufer wie `src/pages/ClassesPage.tsx`, die den Rückgabewert von `mutateAsync` ignorieren, bleiben unverändert funktionsfähig):

```ts
const createClass = useMutation({
  mutationFn: async (name: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Nicht eingeloggt.");
    }

    const { data, error } = await supabase
      .from("classes")
      .insert({
        name,
        teacher_id: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as SchoolClass;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey }),
});
```

- [ ] **Step 2: `OnboardingPage` erstellen**

`src/pages/OnboardingPage.tsx` neu anlegen. Layout orientiert an `src/pages/LoginPage.tsx`, Formular-Stil orientiert an dem Klassen-Anlegen-Formular in `src/pages/ClassesPage.tsx`. Zwei Guards vor dem eigentlichen Formular: (1) nicht eingeloggt → `/login`, (2) bereits Klassen vorhanden → `/dashboard`:

```tsx
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useToast } from "../components/ui/ToastProvider";
import { Field } from "../components/ui/Field";
import { ErrorState } from "../components/ui/ErrorState";
import { classSchema } from "../schemas/classes";

export const OnboardingPage = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: classes, isLoading: isClassesLoading, createClass } = useClasses();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isAuthLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthLoading && !isClassesLoading && (classes?.length ?? 0) > 0) {
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
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Route ergänzen**

In `src/router.tsx` den Import ergänzen (`import { OnboardingPage } from "./pages/OnboardingPage";`, alphabetisch vor `ResetPasswordPage` einsortieren) und die Route außerhalb des `AppShell`-Children-Baums ergänzen, direkt nach `/login`:

```tsx
{
  path: "/login",
  element: <LoginPage />,
},
{
  path: "/onboarding",
  element: <OnboardingPage />,
},
```

- [ ] **Step 4: `AppShell`-Gate ergänzen**

In `src/components/layout/AppShell.tsx` nach dem bestehenden `isAuthenticated`-Check (Zeile 26-28) und vor der Konstruktion von `email`/`classes` (Zeile 30-31) einen weiteren Guard einfügen. Aktuell:

```tsx
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const email = session?.user.email ?? "";
  const classes = classesQuery.data ?? [];
```

Ersetzen durch:

```tsx
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (classesQuery.isSuccess && classesQuery.data.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  const email = session?.user.email ?? "";
  const classes = classesQuery.data ?? [];
```

`classesQuery.isSuccess` stellt sicher, dass der Redirect erst greift, nachdem die Query tatsächlich erfolgreich mit einem leeren Ergebnis geladen hat (nicht während `isLoading` oder bei einem Query-Fehler, wo `classesQuery.data` ebenfalls `undefined`/leer wäre).

- [ ] **Step 5: Manuell im Dev-Server prüfen**

Run: `npm run dev`.
1. Direkten Aufruf von `/onboarding` ohne Session prüfen → muss zu `/login` umleiten.
2. Falls ein Supabase-Projekt mit einem eingeloggten Test-Nutzer verbunden ist, der **keine** Klassen hat: `/dashboard` aufrufen → muss automatisch zu `/onboarding` umleiten; dort eine Klasse anlegen → Erfolgs-Toast, Weiterleitung zu `/classes/<neue-id>`, die neue Klasse muss in der Seitenleiste erscheinen.
3. Für einen Nutzer, der bereits Klassen hat: `/onboarding` direkt aufrufen → muss sofort zu `/dashboard` umleiten, kein Formular sichtbar.
Falls kein Supabase-Projekt mit passenden Testdaten verbunden ist, Schritte 2/3 überspringen und im Commit vermerken; Guard-Logik in Schritt 1 und der Code selbst bleiben trotzdem durch Code-Review zu verifizieren.

- [ ] **Step 6: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useClasses.ts src/pages/OnboardingPage.tsx src/router.tsx src/components/layout/AppShell.tsx
git commit -m "$(cat <<'EOF'
Ergänze Onboarding-Flow zum Anlegen der ersten Klasse

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
