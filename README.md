# Notenverwaltung (MVP)

Cross-platform WebApp fuer Notenverwaltung mit React, TypeScript, Vite, TailwindCSS, TanStack Query und Supabase. Die App laeuft im Browser, ist PWA-faehig vorbereitet und kann spaeter mit Capacitor gewrappt werden.

## Annahmen

- `users` werden direkt ueber `auth.users` von Supabase Auth verwaltet. Es gibt bewusst keine zusaetzliche Profil-Tabelle im MVP.
- Klassenkasse wird als eigene Tabelle `class_fund_entries` umgesetzt, nicht als Spezialfall in `assessments`.
- Jeder Schueler ist im MVP genau einer Klasse zugeordnet (`enrollments.student_id` ist eindeutig). Ein spaeterer Ausbau auf Klassenhistorie ist moeglich.
- Die Punkte-zu-Note-Konfiguration pro Fach wird als JSON (`points_to_grade`) gespeichert. Im UI wird sie bewusst einfach als JSON-Text gepflegt.
- Offline-Sync ist nicht implementiert; es gibt nur einen Platzhalter fuer eine spaetere IndexedDB-Schicht.

## Stack

- Frontend: React + TypeScript + Vite
- UI: TailwindCSS
- Routing: React Router
- State/Data Fetching: TanStack Query
- Backend: Supabase (Postgres, Auth, RLS)
- Validation: Zod

## Projektstruktur

```text
.
├── .env.example
├── .gitignore
├── README.md
├── index.html
├── package.json
├── postcss.config.cjs
├── public
│   └── manifest.webmanifest
├── supabase
│   └── migrations
│       └── 20260228214000_init_notenverwaltung.sql
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src
    ├── components
    │   ├── auth
    │   │   └── LoginForm.tsx
    │   ├── layout
    │   │   └── AppShell.tsx
    │   └── ui
    │       ├── EmptyState.tsx
    │       └── ErrorState.tsx
    ├── hooks
    │   ├── useAssessments.ts
    │   ├── useAuth.ts
    │   ├── useClassFund.ts
    │   ├── useClasses.ts
    │   ├── useStudents.ts
    │   └── useSubjects.ts
    ├── lib
    │   ├── grades.ts
    │   ├── offline
    │   │   └── indexedDb.ts
    │   ├── supabase
    │   │   ├── client.ts
    │   │   └── types.ts
    │   └── utils.ts
    ├── pages
    │   ├── ClassDetailPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── LoginPage.tsx
    │   └── StudentDetailPage.tsx
    ├── schemas
    │   ├── assessments.ts
    │   ├── auth.ts
    │   ├── classFund.ts
    │   ├── classes.ts
    │   ├── students.ts
    │   └── subjects.ts
    ├── index.css
    ├── main.tsx
    └── router.tsx
```

## Supabase Setup

1. Neues Projekt in Supabase anlegen.
2. Unter `Authentication > Users` einen Test-User erstellen.
3. Die SQL-Migration aus [supabase/migrations/20260228214000_init_notenverwaltung.sql](/Users/davidscheichelbauer/Documents/New project/supabase/migrations/20260228214000_init_notenverwaltung.sql) im SQL Editor ausfuehren.
4. In den Projekt-Settings die Werte fuer `Project URL` und `anon public key` kopieren.
5. `.env.example` nach `.env` kopieren und die Werte setzen:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Lokal starten

```bash
npm install
npm run dev
```

Danach ist die App standardmaessig unter `http://localhost:5173` erreichbar.

## MVP-Funktionen

- Login/Logout ueber Supabase Auth
- Dashboard mit Klassenliste und CRUD fuer Klassen
- Klassen-Detail mit Tabs fuer Schueler, Faecher, Bewertungen und Klassenkasse
- Schueler-Detail mit Bewertungserfassung pro Fach
- Fachverwaltung inkl. Bewertungsmodus und Punkte-zu-Note-Mapping
- Bewertungsanlage mit Wert, Datum, Gewicht und Kommentar
- Klassenkasse mit Ein-/Auszahlungen und Saldo
- Durchgaengige Besitztrennung ueber `teacher_id` + RLS

## PWA / Mobile

Das Projekt ist responsive aufgebaut. Fuer einen spaeteren Mobile-Container sind zwei naechste Schritte vorgesehen:

1. Ein Basis-Manifest ist bereits vorhanden; fuer echtes Offline-Caching `vite-plugin-pwa` mit Service Worker ergaenzen.
2. Optional `@capacitor/core` und `@capacitor/cli` hinzufuegen und das `dist`-Build wrappen.


## Hinweise zur Weiterentwicklung

- Fuer eine robustere UX lohnt sich als naechstes ein globales Toast-System.
- Das JSON-Feld fuer Punkte-Mappings sollte spaeter einen kleinen Editor statt Freitext bekommen.
- Falls Schuelerhistorien benoetigt werden, `enrollments` auf mehrere aktive/archivierte Zuweisungen erweitern.
