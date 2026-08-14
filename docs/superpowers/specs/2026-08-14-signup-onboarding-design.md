# Signup + Onboarding-Flow – Design

## Kontext

Die App hat aktuell keine Selbstregistrierung. Laut README ist das
bewusst so für das MVP: Nutzer werden manuell über die Supabase-Konsole
angelegt, es gibt keine zusätzliche Profil-Tabelle. Ziel dieses Features:
ein Signup-Flow mit E-Mail-Bestätigung, gefolgt von einem minimalen
Onboarding-Schritt (erste Klasse anlegen), damit ein neuer Nutzer sich
selbst registrieren und direkt loslegen kann, ohne auf ein leeres
Dashboard zu treffen.

## Entscheidungen (aus Brainstorming)

- **Offene Registrierung**: jeder kann sich mit E-Mail + Passwort
  registrieren, kein Einladungscode. Datentrennung ist bereits
  vollständig über RLS/`owner_id` pro Lehrkraft gewährleistet, keine
  zusätzliche Zugriffskontrolle nötig.
- **E-Mail-Bestätigung erforderlich**: nach dem Signup muss der
  Bestätigungslink in der Mail angeklickt werden, bevor eine Session
  entsteht. Dies muss zusätzlich in den Supabase-Auth-Projekteinstellungen
  aktiviert sein (außerhalb des Codes, wird hier vorausgesetzt).
- **Onboarding = nur "erste Klasse anlegen"**, ein einzelner Schritt,
  kein mehrstufiger Wizard.
- **Keine neue DB-Spalte/Profiltabelle** für den Onboarding-Status —
  der Zustand "braucht Onboarding" wird abgeleitet: ein eingeloggter
  Teacher ohne eine einzige Klasse braucht Onboarding. Das passt zum
  bestehenden MVP-Prinzip ("keine zusätzliche Profiltabelle", siehe
  README) und vermeidet eine neue Migration nur für diesen Zweck.

## Gesamtflow

1. `/login` zeigt einen Link "Neu hier? Jetzt registrieren" zu `/signup`.
2. `/signup`: Formular mit E-Mail, Passwort, Passwort bestätigen. Bei
   gültiger Eingabe wird `supabase.auth.signUp({ email, password,
   options: { emailRedirectTo: "<origin>/onboarding" } })` aufgerufen.
3. Da E-Mail-Bestätigung aktiv ist, liefert `signUp` bei Erfolg noch
   **keine** aktive Session. Die Seite zeigt danach immer dieselbe
   generische Erfolgsmeldung ("Bestätige deine E-Mail-Adresse, um
   loszulegen. Prüfe dein Postfach."), unabhängig vom genauen Ergebnis
   (Anti-Enumeration, analog zu `/forgot-password`) — außer bei echten
   Konfigurationsfehlern (`supabaseConfigError`).
4. Nutzer klickt den Bestätigungslink in der Mail. Supabase-JS
   (`detectSessionInUrl: true`, bereits aktiv) erkennt das Token aus der
   URL, stellt eine reguläre Session her und der Link führt direkt zu
   `/onboarding` (dank `emailRedirectTo`).
5. `/onboarding` prüft selbst die Auth (nicht eingeloggt → Redirect zu
   `/login`) und lädt die Klassenliste des Nutzers
   (`useClasses().classesQuery`). Hat der Nutzer bereits mindestens eine
   Klasse, wird sofort zu `/dashboard` weitergeleitet (verhindert eine
   verwirrende "erste Klasse"-Seite für jemanden, der schon Klassen hat
   — z. B. bei direktem Aufruf der URL). Andernfalls zeigt die Seite ein
   einzelnes Formular "Erstelle deine erste Klasse" (Klassenname), das
   `useClasses().createClass` (bereits vorhanden, `mutateAsync(name:
   string)`) aufruft.
6. Nach erfolgreichem Anlegen: Toast-Erfolgsmeldung, Weiterleitung zur
   neu angelegten Klasse (`/classes/:id`).
7. Zusätzlich zu Schritt 5 (Guard direkt auf `/onboarding`): `AppShell`
   — der Gate-Keeper für alle eingeloggten In-App-Routen (`/dashboard`,
   `/classes`, `/students`, `/subjects`, …) — leitet einen eingeloggten
   Nutzer, dessen Klassenliste (`classesQuery.data`) nach dem Laden leer
   ist, automatisch zu `/onboarding` um, statt die normale
   Navigation/Inhalte zu zeigen. So landet ein Nutzer, der direkt nach
   der E-Mail-Bestätigung z. B. `/dashboard` manuell aufruft (oder aus
   irgendeinem Grund nicht über `emailRedirectTo` dorthin kam), trotzdem
   zuverlässig im Onboarding.

## Routing

`/signup` und `/onboarding` werden als Top-Level-Routen in
`src/router.tsx` angelegt, **außerhalb** von `AppShell` (analog zu
`/login`, `/forgot-password`, `/reset-password`):

```
{ path: "/signup", element: <SignupPage /> },
{ path: "/onboarding", element: <OnboardingPage /> },
```

`OnboardingPage` macht ihre eigene Auth-Prüfung (wie `LoginPage` es für
den umgekehrten Fall tut), da sie zwingend erreichbar sein muss, sobald
eine Session existiert — auch bevor `AppShell` `classesQuery` geladen
hat.

## Neue Dateien

| Datei | Verantwortung |
|---|---|
| `src/components/auth/SignupForm.tsx` | E-Mail-/Passwort-/Bestätigen-Eingabe + Validierung, analog zu `LoginForm`/`ResetPasswordForm` |
| `src/pages/SignupPage.tsx` | Seiten-Layout (Login-Seiten-Muster), Submit-/Erfolgs-State analog zu `ForgotPasswordPage` |
| `src/pages/OnboardingPage.tsx` | Auth-Guard, Redirect wenn schon Klassen vorhanden, "erste Klasse anlegen"-Formular |

## Geänderte Dateien

- `src/schemas/auth.ts`: neues `signupSchema`:
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
  ```
- `src/hooks/useAuth.ts`: neue Methode
  `signUp(email: string, password: string): Promise<void>`, ruft
  `supabase.auth.signUp({ email, password, options: { emailRedirectTo:
  \`${window.location.origin}/onboarding\` } })` auf, wirft bei Fehler.
- `src/pages/LoginPage.tsx`: zusätzlicher Link "Neu hier? Jetzt
  registrieren" zu `/signup`, neben dem bestehenden
  "Passwort vergessen?"-Link.
- `src/router.tsx`: die zwei neuen Top-Level-Routen.
- `src/components/layout/AppShell.tsx`: nach dem bestehenden
  `isAuthenticated`-Check zusätzlich prüfen, ob `classesQuery` erfolgreich
  geladen hat und `classesQuery.data?.length === 0` ist → `<Navigate
  to="/onboarding" replace />` statt der normalen Seite.

## Fehlerbehandlung

- **Doppelte Registrierung** (E-Mail existiert bereits): Supabase
  verhält sich hier je nach Projekteinstellung unterschiedlich (Fehler
  vs. stille "Bestätigungs-Mail" ohne neuen Account, aus
  Sicherheitsgründen oft bevorzugt). `SignupPage` zeigt in beiden Fällen
  dieselbe generische Erfolgsmeldung — Anti-Enumeration, gleiches Prinzip
  wie beim Passwort-Reset. Nur `supabaseConfigError` (fehlende
  ENV-Variablen) wird als echter Fehler angezeigt.
- **Onboarding-Formular**: Fehler beim Klassenanlegen wird inline im
  Formular angezeigt (bestehendes Muster, z. B. wie
  `handleCreateFundEntry` in `ClassDetailPage.tsx`).

## Out of Scope

- Keine Rate-Limiting-Logik auf App-Seite (Supabase Auth hat eigenes
  Rate-Limiting für `signUp`).
- Keine Anpassung des Supabase-E-Mail-Bestätigungs-Templates.
- Kein mehrstufiger Onboarding-Wizard (Fächer, Schüler) — nur die erste
  Klasse.
- Keine Passwort-Stärke-Anzeige, nur die bestehende Mindestlängen-Regel
  (6 Zeichen, konsistent mit `loginSchema`/`resetPasswordSchema`).
- Kein Einladungssystem/Zugangsbeschränkung — offene Registrierung.
