# UI/UX-Überarbeitung Notenverwaltung — Design

**Datum:** 2026-08-11
**Status:** Freigegeben

## Ausgangslage

Testpersonen berichten, die App sei schwer verständlich und optisch unbefriedigend. Die Ursachen liegen ausschließlich in der Präsentationsschicht:

1. **Keine visuelle Hierarchie.** Jede Section verwendet dasselbe Muster (`rounded-3xl` + `border-slate-200` + `bg-white` + `shadow-sm`), teils verschachtelt. Nichts tritt hervor, nichts tritt zurück.
2. **Destruktive Aktionen konkurrieren mit Primäraktionen.** „Löschen" steht gleichrangig neben „Details" in Listenzeilen (`ClassDetailPage`, `StudentsPage`, `SubjectsPage`) und sogar in jedem Spaltenkopf der Notenmatrix (`GradeTable`).
3. **Keine Feld-Labels.** Außer im `LoginForm` arbeitet die gesamte App nur mit Placeholdern. Das Fach-Formular besteht aus sechs unbeschrifteten `<select>`-Elementen plus einem rohen JSON-Textfeld.
4. **Navigation liest sich nicht als Navigation.** Sidebar-Links und Tabs sind als gefüllte bzw. umrandete Buttons gerendert; der aktive Zustand ist nicht als Ortsangabe erkennbar.
5. **Fehlende Orientierung in der Tiefe.** Der Pfad Klasse → Fach → Leistungsnachweis hat keine Breadcrumbs. Klassen erscheinen nur im Dashboard, nicht in der Navigation. Zwei Routen führen auf dieselbe Seite (`/subjects/:id` und `/classes/:cid/subjects/:id`), was die Zurück-Links uneinheitlich macht.
6. **`window.confirm` mit `\n`-Text** als Lösch-Bestätigung an fünf Stellen.
7. **Schrift lädt nicht.** `index.css` deklariert `font-family: Inter`, Inter wird nirgends eingebunden. Die App rendert im Systemfallback.
8. **Toter Style.** Der Hintergrund-Gradient auf `:root` wird von `bg-white` im `AppShell` vollständig überdeckt.
9. **Unklare Filterleiste** in der Fachübersicht: sechs unbeschriftete Controls nebeneinander.

## Ziel

Dieselbe Funktionalität, verständlich und ansprechend präsentiert. Visuelle Richtung: **ruhig und professionell** — ein Arbeitswerkzeug für Lehrkräfte, kein Marketing-Template.

## Nicht-Ziele / harte Grenze

Unverändert bleiben:

- `src/hooks/` — sämtliche Queries, Mutations und deren Signaturen
- `src/lib/` — Berechnungslogik, Supabase-Client, Typen
- `src/schemas/` — Zod-Schemas und Feldnamen
- `supabase/` — Migrationen, Datenmodell
- `package.json` — keine neuen Laufzeit-Abhängigkeiten

Geändert wird nur die Präsentationsschicht: `src/pages/`, `src/components/`, `src/index.css`, `tailwind.config.js`, `index.html`, `src/router.tsx` (nur Routenstruktur, keine Datenflüsse).

**Ausdrücklich abgestimmte Ausnahme:** Der Punkte-zu-Note-Editor (Abschnitt „Fach anlegen") ersetzt das rohe JSON-Textfeld durch eine Zeilen-UI. Er erzeugt exakt dieselbe Datenstruktur und übergibt weiterhin einen JSON-String an `points_to_grade_raw`, damit `subjectSchema` und `parsePointsMapping` unverändert bleiben.

## Architektur der Änderung

### Schicht 1 — Design-Tokens und Basisklassen

Ort: `src/index.css` (CSS-Variablen + `@layer components`), `tailwind.config.js` (Farb-/Schatten-Erweiterung), `index.html` (Font-Einbindung).

**Farbrollen** als CSS-Variablen, in Tailwind als benannte Farben gespiegelt:

| Rolle | Verwendung |
|---|---|
| `surface` | Kartenflächen |
| `surface-sunken` | Seitenhintergrund, Tabellen-Zebra |
| `border-subtle` / `border-strong` | Trennlinien vs. Rahmen interaktiver Elemente |
| `text-primary` / `text-secondary` / `text-muted` | drei Textstufen statt beliebiger `slate-*`-Werte |
| `accent` | eine Akzentfarbe für Navigation, Links, Primäraktion |
| `grade-1` … `grade-5` | semantische Notenfarben (1–2 grün, 3 gelb, 4 orange, 5 rot) |
| `status-*` | Statusfarben für `excused`, `absent_unexcused`, `makeup_pending`, `exempt`, `missing` |

Die bestehende `brand`-Palette bleibt erhalten, damit kein bestehendes Utility bricht; der Akzent wird darauf abgebildet.

**Typografie:** Inter via `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html`, mit vollständigem System-Fallback in der `font-family`-Deklaration. Vier Textstufen: Seitentitel, Abschnittstitel, Fließtext, Metatext.

**Komponentenklassen** (`@layer components`):
- `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger` / `.btn-sm`
- `.card` (flach) und `.card-raised` (erhoben)
- `.field`, `.label`, `.hint`, `.field-error`
- `.badge` + Tonvarianten
- `.tab` / `.tab-active`

Die alten Klassen `.panel`, `.button-primary`, `.button-secondary`, `.button-danger` bleiben als Aliase auf die neuen Definitionen bestehen, damit die Umstellung schrittweise und ohne Bruch erfolgen kann.

**Dichte-Regel:** Erhebung (Schatten + kräftiger Rahmen) nur auf der Hauptfläche einer Seite. Untergeordnete Elemente sind flach und werden durch Trennlinien oder Zebra-Flächen gegliedert. Das ersetzt das heutige „Karte in Karte in Karte".

### Schicht 2 — Neue UI-Bausteine

Neue Dateien in `src/components/ui/`:

| Komponente | Zweck |
|---|---|
| `Modal.tsx` | Basis-Dialog: Backdrop, ESC, Fokusfalle, Autofokus, Größenvarianten. `StudentCreateModal` und `AssessmentCreateDrawer` werden darauf umgestellt, ihre Props bleiben unverändert. |
| `ConfirmDialog.tsx` | Bestätigung destruktiver Aktionen: Titel, Konsequenzbeschreibung, Abbrechen + roter Bestätigen-Button. Ersetzt alle fünf `window.confirm`-Aufrufe. |
| `useConfirm.ts` | Kleiner Hook, der `ConfirmDialog` promise-basiert nutzbar macht, damit die bestehenden `async`-Handler ihre Struktur behalten. Enthält keine Datenlogik. |
| `Menu.tsx` | Zugängliches „⋯"-Overflow-Menü (Klick-außerhalb, ESC, Pfeiltasten). Nimmt Löschen und Nebenaktionen aus den Listenzeilen und Spaltenköpfen auf. |
| `Field.tsx` | Label + Control + Hilfetext + Fehlertext als einheitliche Hülle. |
| `PageHeader.tsx` | Breadcrumbs, Titel, Untertitel, Kennzahlen, Primäraktion — einheitlicher Seitenkopf. |
| `Breadcrumbs.tsx` | Pfadanzeige, von `PageHeader` genutzt. |
| `GradeBadge.tsx` | Note als farbcodiertes Badge, gespeist aus den `grade-*`-Tokens. |
| `StatusLegend.tsx` | Erklärt die Kürzel E / U / N / B / — unter der Notenmatrix. |
| `PointsMappingEditor.tsx` | Zeilen-UI (Ab-Prozent → Note) mit Vorschau. Serialisiert nach JSON-String; die aufrufende Seite reicht ihn unverändert an `subjectSchema` weiter. |

Bestehende `EmptyState` und `ErrorState` werden gestalterisch überarbeitet, ihre Props bleiben identisch.

### Schicht 3 — Navigation

`AppShell.tsx` wird neu aufgebaut:

- **Topbar** (alle Breiten): Produktname, rechts Konto-Menü mit E-Mail und „Abmelden". Der heutige rote Logout-Button am Sidebar-Ende entfällt.
- **Sidebar** (ab `lg`): `Übersicht` · `Klassen` (aufklappbar, listet die Klassen des Lehrers) · `Schüler` · `Fächer`. Aktiver Eintrag: dezente Flächenfüllung plus linker Akzentbalken.
- **Bottom-Bar** (unter `lg`): vier feste Ziele mit Icon und Label, `safe-area`-tauglich. Ersetzt die heutige umbrechende Button-Reihe im mobilen Header.
- Die Klassenliste in der Sidebar nutzt den bestehenden `useClasses`-Hook ohne Änderung.

`router.tsx` erhält zusätzlich `/classes` als eigene Übersichtsseite (`ClassesPage`). Alle bestehenden Pfade bleiben unverändert gültig.

### Schicht 4 — Seiten

| Seite | Änderung |
|---|---|
| **DashboardPage** → „Übersicht" | Kennzahlen als schlanke Zeile statt vier großer Karten. Klassen als Liste mit Kennzahlen und Öffnen-Zeile. „Neue Klasse" öffnet ein `Modal` statt einer aufklappenden Section. „Zuletzt eingetragen" als Liste mit `GradeBadge`. |
| **ClassesPage** (neu) | Reine Präsentationsseite: alle Klassen als Liste, Kennzahlen aus `useAllStudents` / `useAllSubjects`, Anlegen über dasselbe Modal wie in der Übersicht. |
| **ClassDetailPage** | `PageHeader` mit Breadcrumbs und Kennzahlen. Echte Tabs (Unterstrich-Stil) für Schüler / Fächer / Klassenkasse. Schülerzeilen mit `Menu` (Details · Klasse wechseln · Löschen) statt drei konkurrierender Controls. Fach-Formular wandert in ein `Modal` mit beschrifteten, gruppierten Feldern. |
| **Fach-Formular** (in `ClassDetailPage` und `SubjectsPage`) | Gruppen: „Grunddaten" (Klasse, Name, Fachart), „Bewertung" (Notenart, Durchschnittsberechnung, Standardgewicht), „Punkte-Mapping" (nur bei Notenart „Punkte"). Jedes Feld mit Label und erklärendem Hilfetext. JSON-Textfeld → `PointsMappingEditor`. |
| **StudentsPage** | `PageHeader`, Filterleiste mit Labels, Trefferzahl und „Zurücksetzen". Anlegen im `Modal` statt Inline-Section. Löschen im `Menu`. Karten mit klarer Hierarchie und `GradeBadge` für den Schnitt. |
| **SubjectsPage** | Analog zu `StudentsPage`. |
| **SubjectOverviewPage** | `PageHeader` mit Breadcrumbs und Kennzahlen. Filterleiste neu: Suchfeld, Typ-Chips, Sortierung, Status, zwei Toggle-Chips — jeweils beschriftet, mit Zähler aktiver Filter und „Zurücksetzen". Der mobile Filter-Sheet spiegelt dieselbe Struktur. |
| **GradeTable / GradeRow / GradeCell** | Spaltenkopf zeigt nur Kürzel, Typ und Meta; „In Summe" und „Löschen" wandern in ein `Menu` pro Spalte. Zebra-Zeilen, Kreuz-Highlight für aktive Zeile und Spalte, `GradeBadge` in der Notenspalte, `StatusLegend` unter der Tabelle, dezente Tastatur-Hilfe (Enter · Pfeile · Spalten-Paste). Die Zell-Bearbeitung behält Debounce, Speicherzustände und Paste-Verhalten unverändert; nur die Darstellung der Zustände wird klarer. |
| **SubjectMobileList** | Übernimmt Tokens, `GradeBadge` und den neuen `Modal`-Baustein für den Editor-Sheet. |
| **AssessmentOverviewPage** | `PageHeader` mit Breadcrumbs, Kennzahlen als Zeile, Tabelle mit Zebra und Rang-Hervorhebung. |
| **StudentDetailPage** | Kopfkarte mit Initialen, Klasse und Schnitt. Pro Fach eine Karte, Einträge mit `GradeBadge` statt der langen `·`-getrennten Textzeile. |
| **LoginPage / LoginForm** | Zentrierte Karte, Produktname, ruhigere Seitenfläche, verständliche Fehlermeldung. Der Panel-Hintergrund wird zum tatsächlich sichtbaren Gradient. |
| **ToastProvider** | Icon je Ton, „Rückgängig" als deutlicher Button, X-Icon statt des Wortes „Schließen", Einblend-Animation. Die `useToast`-API bleibt unverändert. |

## Offene Entscheidungen — festgelegt

- **Punkte-Mapping-Editor:** freigegeben. Er lebt in der Präsentationsschicht und erzeugt dieselbe Datenform.
- **Klassenkasse:** bleibt als Tab im Klassen-Detail, kein eigener Navigationspunkt.

## Fehlerbehandlung

Die bestehenden Fehlerpfade bleiben erhalten. `ErrorState` erscheint künftig konsistent direkt oberhalb des betroffenen Bereichs statt verstreut am Seitenanfang. Formularfehler erscheinen am jeweiligen Feld, sobald die vorhandene Zod-Fehlermeldung ein Feld benennt, sonst als Formularfehler oberhalb der Aktionen.

## Verifikation

Kein Testframework im Projekt. Verifiziert wird über:

1. `npm run build` (`tsc -b && vite build`) muss fehlerfrei durchlaufen.
2. `npm run dev` und manueller Durchgang: Login → Übersicht → Klasse anlegen → Schüler anlegen → Fach anlegen (inkl. Punkte-Mapping) → Leistungsnachweis anlegen → Note in der Matrix eintragen → Löschen mit Rückgängig → Logout.
3. Mobile Breite (375 px) und Desktop (1440 px) prüfen: Bottom-Bar, horizontales Scrollen der Matrix, kein Überlauf der Seite.
4. Tastaturdurchgang durch die Notenmatrix: Pfeile, Enter, Escape, Spalten-Paste.

## Reihenfolge der Umsetzung

Tokens und Basisklassen zuerst (alles baut darauf auf), dann die UI-Bausteine, dann die Navigation, dann die Seiten von außen nach innen. Nach jeder Stufe muss der Build grün sein.
