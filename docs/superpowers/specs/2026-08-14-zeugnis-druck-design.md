# Zeugnis-Druck pro Schüler – Design

## Kontext

Die App hat aktuell keine Möglichkeit, Noten als PDF zu exportieren oder
auszudrucken. Für Elterngespräche und Zeugnisse müssen Lehrkräfte die
Werte manuell aus der App abtippen. Ziel dieses Features: eine
druckbare/als-PDF-speicherbare Zeugnis-Ansicht pro Schüler.

## Entscheidungen (aus Brainstorming)

- **Umfang: Zeugnis pro Schüler**, nicht eine klassenweite CSV-Tabelle.
  Klassiches Zeugnis-Layout, direkt von der Schüler-Detailseite aus
  erreichbar.
- **Technik: Druckansicht im Browser** (`window.print()` +
  `@media print`/Tailwind `print:`-Varianten), kein PDF-generierendes
  Package (kein `jsPDF` o. ä.). Der Nutzer speichert über den nativen
  Druckdialog des Browsers als PDF oder druckt direkt. Keine neue
  Abhängigkeit, funktioniert offline, volles CSS-Layout-Werkzeug.
- **Inhalt: reine Fach-Endnoten-Tabelle** (Fach → Endnote), kein
  Notenspiegel/Bemerkungsfeld — dafür existiert kein Datenfeld im
  aktuellen Modell, bewusst außerhalb des Scopes für diese erste Version.
- **Bewertungssystem**: die Endnote pro Fach wird über
  `calculateSubjectTotals` + `gradeFromPercent` aus
  `src/lib/subjectOverview.ts` berechnet — das ist das aktuelle,
  `assessment_definitions`/`assessment_results`-basierte System, das
  bereits in `SubjectOverviewPage`, `GradeRow`, `SubjectMobileList`,
  `StudentsPage` und `StudentDetailPage` verwendet wird. **Nicht**
  `computeSubjectAverage` aus `src/lib/grades.ts` (älteres System, nur
  noch an einer Stelle in `ClassDetailPage` für die einfache
  Fächerliste genutzt).

## Routing

Neue Route `/students/:studentId/print`, als **Top-Level-Route außerhalb
von `AppShell`** in `src/router.tsx` (analog zu `/login`,
`/onboarding`) — beim Drucken soll nur der Zeugnis-Inhalt sichtbar sein,
nicht Header/Sidebar/BottomNav. Die Seite macht ihre eigene, schlanke
Auth-Prüfung (nicht eingeloggt → Redirect zu `/login`), analog zum
Muster in `OnboardingPage.tsx`.

## Datengrundlage

Dieselben Hooks wie auf `StudentDetailPage.tsx`:

- `useStudentById(studentId)` — Schülerdaten (Name).
- `useClassById(classId)` — Klassenname (Klassen-ID wird wie auf
  `StudentDetailPage` aus `student.enrollments[0]?.class_id` abgeleitet,
  falls nicht direkt als Routen-Param vorhanden — diese neue Route hat
  keinen `:classId`-Param, daher immer über die Enrollment-Ableitung).
- `useSubjects(classId)` — Fächer der Klasse.
- `useStudentAssessmentOverview(subjectIds, studentId)` — liefert
  `definitions`, `results`, `boundaries` für die
  `calculateSubjectTotals`/`gradeFromPercent`-Berechnung pro Fach.

Pro Fach wird berechnet:

```ts
const definitions = allDefinitions.filter((d) => d.subject_id === subject.id);
const rowResults = allResults.filter(
  (r) => definitions.some((d) => d.id === r.assessment_definition_id) && r.student_id === studentId,
);
const totals = calculateSubjectTotals(definitions, rowResults);
const boundaries = resolveGradeBoundaries(allBoundaries, subject.id);
const finalGrade = gradeFromPercent(totals.percent, boundaries);
```

(Exaktes Muster wie in `SubjectOverviewPage.tsx`/`GradeRow.tsx`.)

## Inhalt der Druckseite

- Kopfbereich: Schülername, Klassenname, aktuelles Datum
  (`formatDate(new Date().toISOString())` oder äquivalent, bestehendes
  Datumsformat aus `src/lib/utils.ts` verwenden).
- Tabelle: eine Zeile pro Fach, Spalten "Fach" und "Note"
  (`GradeBadge` für die Notenanzeige, bereits vorhandene Komponente).
- Fächer ohne Endnote (kein Ergebnis vorhanden) zeigen `GradeBadge`s
  Fallback (`—`), keine eigene Sonderbehandlung nötig.
- "Drucken"-Button (`onClick={() => window.print()}`) und "Zurück"-Link
  (zurück zur `StudentDetailPage`), beide mit der Tailwind-Klasse
  `print:hidden`, damit sie im tatsächlichen Ausdruck nicht erscheinen.
- Kein Notenspiegel, keine Einzel-Leistungsnachweise, kein
  Bemerkungsfeld — nur die Fach/Endnote-Tabelle (siehe Entscheidungen).

## Einstieg

`StudentDetailPage.tsx` bekommt einen neuen "Zeugnis drucken"-Button
(bzw. Link) im `PageHeader`-Bereich, der zu
`/students/:studentId/print` verlinkt.

## Out of Scope

- Kein PDF-generierendes Package, keine serverseitige PDF-Erzeugung.
- Kein klassenweiter CSV/Tabellen-Export.
- Kein Notenspiegel, keine Bemerkungen/Kommentarfeld im Zeugnis.
- Keine Anpassung des Zeugnis-Layouts durch den Nutzer (z. B. Schullogo,
  eigene Kopfzeile) — festes, einfaches Layout für diese erste Version.
- Keine Mehrsprachigkeit — wie der Rest der App nur Deutsch.
