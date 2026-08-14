# Passwort-Reset Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nutzer können ein vergessenes Passwort über einen E-Mail-Link selbst zurücksetzen, ohne manuellen Eingriff über die Supabase-Konsole.

**Architecture:** Zwei neue Top-Level-Routen (`/forgot-password`, `/reset-password`) außerhalb von `AppShell`, analog zu `/login`. Beide nutzen `useAuth`-Methoden, die direkt auf Supabase Auth (`resetPasswordForEmail`, `updateUser`) mappen. Kein neuer State-Management-Layer, kein Backend-Code — Supabase Auth übernimmt Token-Erzeugung, Versand und Validierung.

**Tech Stack:** React 19, TypeScript, Vite 6, TailwindCSS 3.4, React Router 7, Zod 3, Supabase Auth (`@supabase/supabase-js` v2, `detectSessionInUrl: true` bereits aktiv in `src/lib/supabase/client.ts`). Keine neuen Abhängigkeiten.

## Global Constraints

- **Anti-Enumeration:** `/forgot-password` zeigt nach dem Absenden immer dieselbe generische Erfolgsmeldung, unabhängig davon, ob die E-Mail existiert. Nur echte Konfigurations-/Netzwerkfehler werden als Fehler angezeigt ([2026-08-14-passwort-reset-design.md](../specs/2026-08-14-passwort-reset-design.md)).
- **Routing:** Beide neuen Seiten sind Top-Level-Routen außerhalb `AppShell` (wie `/login`), da beim Klick auf den E-Mail-Link noch keine reguläre Session besteht.
- **Kein Testframework vorhanden.** Verifikation pro Task: `npm run build` muss fehlerfrei durchlaufen, danach manuelle Prüfung im Dev-Server (`npm run dev`).
- **Sprache:** Alle sichtbaren Texte auf Deutsch, Du-Form (wie bisher), Umlaute ausgeschrieben.
- **Branch:** `ui-ux-ueberarbeitung` (aktueller Branch).
- **Commit-Nachrichten:** Deutsch, Imperativ, mit `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` als letzte Zeile.
- **Passwort-Mindestlänge:** 6 Zeichen, konsistent mit dem bestehenden `loginSchema.password` (`z.string().min(6, "Mindestens 6 Zeichen.")`).

## Dateistruktur

**Neu:**

| Datei | Verantwortung |
|---|---|
| `src/pages/ForgotPasswordPage.tsx` | Seiten-Layout für E-Mail-Eingabe, Submit-/Erfolgs-State |
| `src/components/auth/ForgotPasswordForm.tsx` | E-Mail-Eingabe + Validierung |
| `src/pages/ResetPasswordPage.tsx` | Seiten-Layout für neues Passwort, Submit-State, Weiterleitung nach Erfolg |
| `src/components/auth/ResetPasswordForm.tsx` | Neues-Passwort-/Bestätigen-Eingabe + Validierung |

**Geändert:** `src/hooks/useAuth.ts`, `src/schemas/auth.ts`, `src/router.tsx`, `src/pages/LoginPage.tsx` (bzw. `LoginForm.tsx`).

---

### Task 1: Forgot-Password-Flow (E-Mail-Eingabe, Link auf Login-Seite)

**Files:**
- Modify: `src/schemas/auth.ts`
- Modify: `src/hooks/useAuth.ts`
- Create: `src/components/auth/ForgotPasswordForm.tsx`
- Create: `src/pages/ForgotPasswordPage.tsx`
- Modify: `src/router.tsx`
- Modify: `src/pages/LoginPage.tsx`

**Interfaces:**
- Consumes: nichts Neues aus anderen Tasks
- Produces: `forgotPasswordSchema` (Zod), `useAuth().resetPasswordForEmail(email: string): Promise<void>`, Route `/forgot-password`

- [ ] **Step 1: Schema ergänzen**

In `src/schemas/auth.ts` nach `loginSchema` ergänzen:

```ts
export const forgotPasswordSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail eingeben."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
```

- [ ] **Step 2: `useAuth` um `resetPasswordForEmail` erweitern**

In `src/hooks/useAuth.ts` nach `signOut` (vor dem `return`) ergänzen:

```ts
const resetPasswordForEmail = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) {
    throw error;
  }
};
```

Im Rückgabeobjekt `resetPasswordForEmail` mit ergänzen:

```ts
return {
  isAuthenticated: Boolean(session),
  isLoading,
  session,
  signIn,
  signOut,
  resetPasswordForEmail,
};
```

- [ ] **Step 3: `ForgotPasswordForm` erstellen**

`src/components/auth/ForgotPasswordForm.tsx` neu anlegen, orientiert an `src/components/auth/LoginForm.tsx`:

```tsx
import { useState } from "react";
import { forgotPasswordSchema } from "../../schemas/auth";
import { Field } from "../ui/Field";
import { ErrorState } from "../ui/ErrorState";

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
  isSubmitting: boolean;
  isDisabled?: boolean;
}

export const ForgotPasswordForm = ({
  onSubmit,
  isSubmitting,
  isDisabled = false,
}: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Ungültige Eingabe.");
      return;
    }

    try {
      await onSubmit(result.data.email);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Anfrage fehlgeschlagen.",
      );
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Field label="E-Mail" htmlFor="forgot-password-email">
        <input
          id="forgot-password-email"
          className="field"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="max@schule.at"
        />
      </Field>
      {error ? <ErrorState message={error} /> : null}
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={isSubmitting || isDisabled}
      >
        {isDisabled ? "Konfiguration fehlt" : isSubmitting ? "Wird gesendet..." : "Link anfordern"}
      </button>
    </form>
  );
};
```

- [ ] **Step 4: `ForgotPasswordPage` erstellen**

`src/pages/ForgotPasswordPage.tsx` neu anlegen, Layout orientiert an `src/pages/LoginPage.tsx`. Nach erfolgreichem Absenden wird **immer** die generische Erfolgsmeldung gezeigt (Anti-Enumeration) — auch wenn `resetPasswordForEmail` einen Fehler wirft, außer es handelt sich um `supabaseConfigError` (Konfigurationsfehler, kein Enumeration-Risiko):

```tsx
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
```

- [ ] **Step 5: Route ergänzen**

In `src/router.tsx` den Import ergänzen (`import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";`) und eine neue Top-Level-Route **außerhalb** des `AppShell`-Children-Baums, direkt neben der `/login`-Route:

```tsx
{
  path: "/login",
  element: <LoginPage />,
},
{
  path: "/forgot-password",
  element: <ForgotPasswordPage />,
},
```

- [ ] **Step 6: Link auf der Login-Seite ergänzen**

In `src/pages/LoginPage.tsx` nach dem schließenden `</div>` des `card-raised`-Blocks (nach `<LoginForm .../>`) ergänzen:

```tsx
<p className="mt-4 text-center text-sm text-ink-3">
  <Link to="/forgot-password" className="hover:text-accent-strong hover:underline">
    Passwort vergessen?
  </Link>
</p>
```

Dafür `Link` aus `react-router-dom` importieren (`Navigate` ist dort schon importiert, `Link` ergänzen).

- [ ] **Step 7: Manuell im Dev-Server prüfen**

Run: `npm run dev`. Auf `/login` den Link "Passwort vergessen?" klicken → landet auf `/forgot-password`. Eine beliebige (auch nicht-existierende) gültige E-Mail-Adresse eingeben und absenden → generische Erfolgsmeldung muss erscheinen, kein Fehler, egal ob die Adresse real ist. "Zurück zum Login" muss zurück zu `/login` führen.

- [ ] **Step 8: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 9: Commit**

```bash
git add src/schemas/auth.ts src/hooks/useAuth.ts src/components/auth/ForgotPasswordForm.tsx src/pages/ForgotPasswordPage.tsx src/router.tsx src/pages/LoginPage.tsx
git commit -m "$(cat <<'EOF'
Ergänze Passwort-vergessen-Flow mit E-Mail-Versand

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Reset-Password-Flow (neues Passwort setzen)

**Files:**
- Modify: `src/schemas/auth.ts`
- Modify: `src/hooks/useAuth.ts`
- Create: `src/components/auth/ResetPasswordForm.tsx`
- Create: `src/pages/ResetPasswordPage.tsx`
- Modify: `src/router.tsx`

**Interfaces:**
- Consumes: `useAuth()` (aus Task 1 bereits um `resetPasswordForEmail` erweitert, hier zusätzlich um `updatePassword`)
- Produces: `resetPasswordSchema` (Zod), `useAuth().updatePassword(password: string): Promise<void>`, Route `/reset-password`

- [ ] **Step 1: Schema ergänzen**

In `src/schemas/auth.ts` nach `forgotPasswordSchema` ergänzen:

```ts
export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Mindestens 6 Zeichen."),
    confirmPassword: z.string().min(6, "Mindestens 6 Zeichen."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
```

- [ ] **Step 2: `useAuth` um `updatePassword` erweitern**

In `src/hooks/useAuth.ts` nach `resetPasswordForEmail` (vor dem `return`) ergänzen:

```ts
const updatePassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw error;
  }
};
```

Im Rückgabeobjekt `updatePassword` mit ergänzen:

```ts
return {
  isAuthenticated: Boolean(session),
  isLoading,
  session,
  signIn,
  signOut,
  resetPasswordForEmail,
  updatePassword,
};
```

- [ ] **Step 3: `ResetPasswordForm` erstellen**

`src/components/auth/ResetPasswordForm.tsx` neu anlegen:

```tsx
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
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Der Link ist ungültig oder abgelaufen. Fordere einen neuen Reset-Link an.",
      );
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
```

- [ ] **Step 4: `ResetPasswordPage` erstellen**

`src/pages/ResetPasswordPage.tsx` neu anlegen. Bei Erfolg: Toast + Weiterleitung zu `/dashboard`. `useToast` kommt aus `src/components/ui/ToastProvider.tsx` (bereits im Projekt etabliert, siehe `src/pages/ClassDetailPage.tsx` für das Nutzungsmuster `const toast = useToast(); toast.success("...")`):

```tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ResetPasswordForm } from "../components/auth/ResetPasswordForm";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/ui/ToastProvider";
import { supabaseConfigError } from "../lib/supabase/client";

export const ResetPasswordPage = () => {
  const { updatePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (password: string) => {
    setIsSubmitting(true);
    try {
      await updatePassword(password);
      toast.success("Passwort wurde geändert.");
      navigate("/dashboard", { replace: true });
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
          <h1 className="mt-4 text-2xl font-semibold text-ink">Neues Passwort</h1>
          <p className="mt-1.5 text-sm text-ink-3">
            Lege ein neues Passwort für dein Konto fest.
          </p>
        </div>

        <div className="card-raised p-6">
          {supabaseConfigError ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {supabaseConfigError}
            </div>
          ) : (
            <ResetPasswordForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
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

Hinweis: `handleSubmit` fängt den Fehler von `updatePassword` bewusst NICHT selbst ab (kein `catch` um `await updatePassword(password)`) — der Fehler propagiert zu `ResetPasswordForm`s eigenem `try/catch` in dessen `handleSubmit`, das ihn im Formular als `ErrorState` anzeigt (siehe Task 2 Step 3). Nur `finally` wird hier für `setIsSubmitting(false)` gebraucht.

- [ ] **Step 5: Route ergänzen**

In `src/router.tsx` den Import ergänzen (`import { ResetPasswordPage } from "./pages/ResetPasswordPage";`) und die Route direkt neben `/forgot-password` ergänzen:

```tsx
{
  path: "/reset-password",
  element: <ResetPasswordPage />,
},
```

- [ ] **Step 6: Manuell im Dev-Server prüfen**

Run: `npm run dev`. Da ein echter E-Mail-Versand nur mit verbundenem Supabase-Projekt funktioniert, zwei Prüfungen:
1. Ohne aktive Session direkt `/reset-password` aufrufen, ein Passwort eingeben und absenden → `updateUser` schlägt fehl (kein gültiger Recovery-Token), das Formular muss den Fehlertext "Der Link ist ungültig oder abgelaufen..." anzeigen, keine Weiterleitung.
2. Falls ein Supabase-Projekt verbunden ist: den vollständigen Flow einmal end-to-end mit einer echten Test-E-Mail-Adresse durchspielen (Forgot-Password → E-Mail → Reset-Link → neues Passwort setzen → Weiterleitung zu `/dashboard` → mit neuem Passwort einloggen). Falls kein Projekt verbunden ist, diesen Teilschritt überspringen und im Commit vermerken.

- [ ] **Step 7: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 8: Commit**

```bash
git add src/schemas/auth.ts src/hooks/useAuth.ts src/components/auth/ResetPasswordForm.tsx src/pages/ResetPasswordPage.tsx src/router.tsx
git commit -m "$(cat <<'EOF'
Ergänze Formular zum Setzen eines neuen Passworts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
