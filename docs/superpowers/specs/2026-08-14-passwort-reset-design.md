# Passwort-Reset – Design

## Kontext

Die App hat aktuell nur Login/Logout über Supabase Auth (`src/hooks/useAuth.ts`).
Es gibt keinen Weg, ein vergessenes Passwort zurückzusetzen — Nutzer, die
sich aussperren, brauchen manuellen Eingriff über die Supabase-Konsole.
Ziel: ein Standard-Passwort-Reset-Flow über Supabase Auth.

## Flow

1. Login-Seite (`/login`) zeigt einen Link "Passwort vergessen?".
2. Link führt zu einer neuen Route `/forgot-password`. Dort wird eine
   E-Mail-Adresse eingegeben und per
   `supabase.auth.resetPasswordForEmail(email, { redirectTo: "<origin>/reset-password" })`
   ein Reset-Link versendet.
3. Nach dem Absenden zeigt die Seite immer dieselbe generische
   Erfolgsmeldung ("Falls ein Konto mit dieser E-Mail existiert, wurde ein
   Link gesendet."), unabhängig davon, ob `resetPasswordForEmail` einen
   Fehler zurückgibt oder nicht — verhindert E-Mail-Enumeration. Nur echte
   Netzwerk-/Konfigurationsfehler (z. B. `supabaseConfigError`, analog zu
   `LoginPage`) werden als Fehler angezeigt.
4. Der Nutzer klickt den Link in der E-Mail. Supabase-JS (v2,
   `detectSessionInUrl` ist standardmäßig aktiv) erkennt das Recovery-Token
   in der URL beim Laden der App automatisch, tauscht es gegen eine
   temporäre Session und feuert `onAuthStateChange` mit einer gültigen
   Session. Der Link führt auf die neue Route `/reset-password`.
5. `/reset-password` zeigt ein Formular mit "Neues Passwort" und
   "Passwort bestätigen". Bei Übereinstimmung und gültiger Länge wird
   `supabase.auth.updateUser({ password })` aufgerufen.
6. Bei Erfolg: Erfolgsmeldung (Toast) und Weiterleitung zu `/dashboard`
   (die Recovery-Session ist zu diesem Zeitpunkt eine normale, gültige
   Session — `AppShell` lässt den Zugriff zu).
7. Ruft jemand `/reset-password` direkt auf, ohne über einen gültigen
   Recovery-Link gekommen zu sein (keine Session), schlägt
   `updateUser` mit einem Supabase-Fehler fehl; dieser wird im Formular
   angezeigt (z. B. "Der Link ist ungültig oder abgelaufen. Fordere einen
   neuen Reset-Link an."), keine Weiterleitung.

## Routing

`/forgot-password` und `/reset-password` werden als Top-Level-Routen in
`src/router.tsx` angelegt, **außerhalb** von `AppShell` (analog zu
`/login`) — beim Klick auf den E-Mail-Link besteht noch keine reguläre
Session, `AppShell` würde sonst vorher schon prüfen/umleiten und mit der
kurzzeitig fehlenden Session flackern.

```
{ path: "/forgot-password", element: <ForgotPasswordPage /> },
{ path: "/reset-password", element: <ResetPasswordPage /> },
```

## Neue Dateien

| Datei | Verantwortung |
|---|---|
| `src/pages/ForgotPasswordPage.tsx` | Seiten-Layout (wiederverwendet das Login-Seiten-Layout-Muster), hält Submit-/Erfolgs-State |
| `src/components/auth/ForgotPasswordForm.tsx` | E-Mail-Eingabe + Validierung, analog zu `LoginForm` |
| `src/pages/ResetPasswordPage.tsx` | Seiten-Layout, Submit-State, Weiterleitung nach Erfolg |
| `src/components/auth/ResetPasswordForm.tsx` | Neues-Passwort-/Bestätigen-Eingabe + Validierung |

## Geänderte Dateien

- `src/hooks/useAuth.ts`: zwei neue Methoden auf dem Rückgabeobjekt:
  - `resetPasswordForEmail(email: string): Promise<void>` — ruft
    `supabase.auth.resetPasswordForEmail` auf, wirft bei Fehler (der
    Aufrufer entscheidet, ob der Fehler dem Nutzer gezeigt oder wegen der
    Anti-Enumeration-Regel verschluckt wird).
  - `updatePassword(password: string): Promise<void>` — ruft
    `supabase.auth.updateUser({ password })` auf, wirft bei Fehler.
- `src/schemas/auth.ts`: zwei neue Schemas:
  - `forgotPasswordSchema = z.object({ email: z.string().email(...) })`
  - `resetPasswordSchema` mit `password`/`confirmPassword` (beide
    min. 6 Zeichen wie `loginSchema.password`), `.refine()` prüft
    `password === confirmPassword`.
- `src/pages/LoginPage.tsx` bzw. `src/components/auth/LoginForm.tsx`:
  Link "Passwort vergessen?" (React-Router `Link` zu `/forgot-password`)
  unterhalb des Formulars.
- `src/router.tsx`: die zwei neuen Top-Level-Routen (siehe oben).

## Out of Scope

- Keine Rate-Limiting-Logik auf App-Seite (Supabase Auth hat eigenes
  Rate-Limiting für `resetPasswordForEmail`).
- Keine Anpassung des Supabase-E-Mail-Templates (Standardtemplate wird
  genutzt; Anpassung erfolgt bei Bedarf separat in der Supabase-Konsole).
- Kein Self-Signup/Registrierung — bleibt wie bisher außerhalb des Scopes.
- Keine Passwort-Stärke-Anzeige/Meter, nur die bestehende
  Mindestlängen-Regel (6 Zeichen, konsistent mit `loginSchema`).
