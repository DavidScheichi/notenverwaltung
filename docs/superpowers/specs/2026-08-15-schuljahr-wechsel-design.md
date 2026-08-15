# Schuljahr-Wechsel mit Klassenhistorie

## Ziel

Lehrkräfte können am Ende eines Schuljahres bestehende Klassen ins neue
Schuljahr "fortführen", ohne alte Noten, Fächer-Konfiguration oder den
Klassenkassen-Saldo zu verlieren. Vergangene Schuljahre bleiben über einen
Umschalter einsehbar (read-only). Kernproblem, das gelöst wird: aktuell ist
jeder Schüler über `enrollments.student_id unique` für immer genau einer
Klasse zugeordnet — ein Jahreswechsel oder Klassenwechsel ist damit
unmöglich, ohne Daten zu verlieren oder zu verfälschen.

## Annahmen / Scope

- Fokus liegt auf dem **jährlichen Rollover mit Historie** — nicht auf
  unterjährigem Wechsel einzelner Schüler zwischen Klassen (out of scope,
  siehe unten).
- Eine Klasse "lebt" konzeptionell über Jahre fort (z. B. "3B" → "4B"),
  wird aber technisch pro Schuljahr als eigene Zeile abgebildet, verkettet
  über `predecessor_class_id`.
- Schüler-Stammdaten (Name, Notizen) sind weiterhin global und nicht
  jahresgebunden — nur Klassen-/Fach-/Noten-/Kassendaten sind es.

## Datenmodell

### Neue Tabelle `school_years`

| Spalte | Typ | Hinweis |
|---|---|---|
| `id` | uuid PK | |
| `teacher_id` | uuid FK → `auth.users` | RLS wie bestehende Tabellen |
| `label` | text | z. B. "2025/2026" |
| `is_current` | boolean | genau eine `true`-Zeile pro `teacher_id` |
| `created_at` | timestamptz | |

Constraint: partial unique index auf `(teacher_id)` where `is_current`,
damit pro Lehrkraft nur ein aktuelles Schuljahr existieren kann.

### Änderungen an `classes`

- neue Spalte `school_year_id` (uuid, not null, FK → `school_years`)
- neue Spalte `predecessor_class_id` (uuid, nullable, FK → `classes`,
  `on delete set null`) — Verweis auf die Vorjahres-Klasse bei Fortführung

### Änderungen an `enrollments`

- neue Spalte `school_year_id` (uuid, not null, FK → `school_years`,
  denormalisiert von der Klasse zum Zeitpunkt der Einschreibung)
- Constraint `unique (student_id)` **entfernen**
- Neuer Constraint `unique (student_id, school_year_id)` — ein Schüler kann
  pro Schuljahr nur in einer Klasse aktiv eingeschrieben sein, aber über
  mehrere Jahre hinweg in unterschiedlichen.

`subjects` und `class_fund_entries` bleiben unverändert (weiterhin an
`class_id` gehängt); jede Jahres-Klasse hat ihre eigene Fach- und
Kassenkasse-Historie.

### Onboarding

Beim Anlegen der allerersten Klasse eines neuen Nutzers wird automatisch
eine `school_years`-Zeile mit `is_current = true` erzeugt. Das Label wird
aus dem aktuellen Datum abgeleitet (z. B. "2026/2027" für ein Datum im
zweiten Kalenderjahrhälfte, "2025/2026" für eines in der ersten). Der
Nutzer muss das Konzept "Schuljahr" nicht verstehen, um loszulegen.

### Migration bestehender Daten

Für Lehrkräfte, die bereits Klassen haben, legt die Migration pro
`teacher_id` eine `school_years`-Zeile (`is_current = true`, Label wie
oben geschätzt) an und setzt `school_year_id` auf allen bestehenden
`classes`- und `enrollments`-Zeilen entsprechend.

## "Neues Schuljahr starten"-Flow

Aktionspunkt **"Ins neue Schuljahr übernehmen"** auf der
Klassen-Detailseite. Dialog-Schritte:

1. **Ziel-Schuljahr wählen**: bestehendes zukünftiges `school_years`
   oder neu anlegen (Label-Vorschlag durch Hochzählen des aktuellen
   Labels, editierbar).
2. **Neuer Klassenname**: vorbelegt mit einfachem Ziffern-Inkrement (z. B.
   "3B" → "4B"), frei editierbar.
3. **Schüler-Vorauswahl**: aktuell eingeschriebene Schüler sind
   vorangehakt, einzeln abwählbar.
4. **Bestätigen** löst eine Transaktion aus:
   - neue `classes`-Zeile: `school_year_id` = Zieljahr,
     `predecessor_class_id` = alte Klasse
   - für jeden ausgewählten Schüler eine neue `enrollments`-Zeile in der
     neuen Klasse (mit `school_year_id` = Zieljahr)
   - alle `subjects` der alten Klasse werden als neue Zeilen unter der
     neuen Klasse kopiert (Name, `grading_kind`, `average_mode`,
     `default_weight`, `points_to_grade` — frische IDs, keine
     Bewertungen/Definitionen übernommen)
   - ist der Kassen-Saldo der alten Klasse ≠ 0: eine
     `class_fund_entries`-Eröffnungsbuchung in der neuen Klasse
     (`entry_type` passend zum Vorzeichen, Notiz "Übertrag aus Vorjahr")
5. Die alte Klasse bleibt unverändert im alten Schuljahr bestehen.
6. Das Zieljahr wird beim ersten Mal, wenn es als Ziel einer Fortführung
   gewählt wird, automatisch `is_current = true` (das bisherige Jahr
   verliert das Flag). Kein separater "Jahr umschalten"-Schritt.

## Schuljahr-Umschalter & Archiv-Verhalten

- Selector in der App-Navigation, zeigt alle `school_years` einer
  Lehrkraft (neueste zuerst), `is_current` vorausgewählt.
- Die Auswahl filtert Dashboard/Klassenliste auf
  `school_year_id = ausgewähltes Jahr`.
- Ist ein **vergangenes** Jahr ausgewählt: alle Schreib-Aktionen (Noten,
  Fächer, Kassenbuchungen, Klassen-Schüler-Zuordnung) sind deaktiviert.
  Durchsetzung auf Hook-Ebene (Mutations prüfen `isCurrentYear` und
  brechen früh ab) plus UI (Aktionen ausgeblendet/disabled) — **keine**
  zusätzliche RLS-Regel dafür; RLS bleibt wie bisher nur für
  Besitzrechte zuständig.
- Schüler-Stammdaten bleiben unabhängig vom gewählten Jahr editierbar.

## Edge Cases

- **Löschen einer Klasse**: unverändert möglich; `predecessor_class_id`
  aus Folgejahren wird via `on delete set null` entkoppelt statt zu
  blockieren.
- **Leeres Schuljahr** (keine Klassen fortgeführt): einfacher leerer
  Zustand, kein Sonderfall.
- **Namensgleiche Parallelklassen im selben Jahr** (z. B. zwei "4B" durch
  Zufall): erlaubt, es gab ohnehin keinen globalen Namens-Constraint.

## Out of Scope (bewusst nicht Teil dieser Version)

- Unterjähriger Klassenwechsel eines einzelnen Schülers
- Bearbeitung/Korrektur vergangener Schuljahre
- Mehrere Lehrkräfte pro Klasse/Jahr (Team-Teaching)

## Betroffene Bereiche (grober Überblick, Details in der Implementierungsplanung)

- Migration: `school_years`-Tabelle, Spalten-Ergänzungen, Backfill,
  RLS-Policies analog zu bestehenden Tabellen
- `src/lib/supabase/types.ts`: `SchoolYear`-Typ, `SchoolClass`/`Enrollment`
  um neue Felder erweitern
- Neuer Hook `useSchoolYears` (Liste, aktuelles Jahr, Fortführungs-Mutation)
- Neue UI: Schuljahr-Umschalter (Navigation), Fortführungs-Dialog
  (Klassen-Detailseite)
- Bestehende Hooks (`useClasses`, `useStudents`, `useAssessments`,
  `useClassFund`) um Jahres-Filter bzw. Schreibsperre für Vergangenheit
  erweitern
- Onboarding-Flow: implizite Erstanlage des ersten Schuljahres
