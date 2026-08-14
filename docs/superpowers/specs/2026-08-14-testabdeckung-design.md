# Testabdeckung starten (Vitest) – Design

## Kontext

Die App hat aktuell keinerlei automatisierte Tests. Verifikation lief bisher
ausschließlich über `npm run build` (Typprüfung) und manuelle Durchsicht.
Mehrfach fielen Bugs (z. B. beim Zeugnis-Druck: fehlende Fehlerbehandlung,
fehlender Empty State) erst in einem finalen Code-Review auf, nicht durch
eine automatisierte Prüfung. Ziel: eine erste, fokussierte Testabdeckung
für den Berechnungs- und Validierungskern der App.

## Entscheidungen (aus Brainstorming)

- **Scope dieser ersten Stufe: reine Logik-Funktionen** — `src/lib/`
  (Notenberechnung) und `src/schemas/` (Zod-Validierung). Keine
  Komponenten-/Hook-Tests, kein Supabase-Mocking, keine CI-Pipeline in
  dieser Stufe (es existiert noch kein `.github/workflows`) — das sind
  eigene, spätere Schritte.
- **Tooling: Vitest.** Passt nahtlos zu Vite (bereits im Stack), teilt sich
  TypeScript-Konfiguration, kein zusätzliches Build-Tool. Einzige neue
  Dev-Dependency: `vitest`. Kein `jsdom`, kein React Testing Library nötig,
  da keine Komponenten getestet werden.
- **Konfiguration**: `test`-Block direkt in der bestehenden `vite.config.ts`
  ergänzen, kein separates `vitest.config.ts`. `environment: "node"` reicht.
- **Konvention**: Tests liegen direkt neben dem getesteten Code
  (`src/lib/grades.test.ts` statt eigenem `tests/`-Ordner) — Standard-
  Vitest-Muster.

## Was getestet wird

### `src/lib/grades.ts`

- `computeSubjectAverage(subject, assessments)` — der Berechnungskern für
  die (ältere, aber weiterhin in `ClassDetailPage` genutzte) einfache
  Fach-Durchschnittsberechnung. Testfälle: leere Assessment-Liste (`null`
  erwartet), `average_mode: "mean"` vs. `"weighted"`, `grading_kind:
  "points"` mit `points_to_grade`-Mapping vs. ohne Mapping (Fallback auf
  Rohwert), Gewichtung mit `weight`.

### `src/lib/subjectOverview.ts`

Das aktuelle, dominante Bewertungssystem (genutzt in
`SubjectOverviewPage`, `GradeRow`, `StudentsPage`, `StudentDetailPage`,
`StudentPrintPage`):

- `resolveGradeBoundaries(boundaries, subjectId)` — fach-spezifische
  Grenzwerte vs. Standard-Grenzwerte (`subject_id: null`) vs. eingebauter
  Fallback, wenn gar keine Grenzwerte vorhanden sind.
- `gradeFromPercent(percent, boundaries)` — `null`-Prozentsatz →
  `null`-Note; Grenzwert-Treffer exakt an der Schwelle; kein Treffer →
  schlechteste Note (Fallback `5`).
- `calculateSubjectTotals(definitions, results)` — die Stelle mit der
  höchsten Fehlerwirkung im gesamten Datenmodell (bestimmt die im
  Zeugnis-Druck und in der Notenübersicht gezeigte Endnote). Testfälle:
  `include_in_total: false` wird ignoriert, `max_points: null` wird
  ignoriert, fehlendes Ergebnis für eine Definition wird ignoriert,
  `status !== "filled"` wird ignoriert (inkl. Alt-Daten-Fallback ohne
  Status-Feld), `points: null` wird ignoriert, gewichtete Summe über
  mehrere Definitionen, `maxWeighted === 0` → `percent: null`.
- `calculateAssessmentPercent(points, maxPoints)` — `null`-Werte,
  `maxPoints <= 0`.

### `src/schemas/*.ts`

Für jedes Schema: mindestens ein gültiger Fall und die Grenzfälle, die das
Schema explizit prüft (Mindest-/Maximallängen, `.refine()`-Regeln,
Enum-Werte). Konkret:

- `students.ts` (`studentSchema`): leerer Vorname/Nachname, Notes optional.
- `assessments.ts` (`assessmentSchema`): UUID-Validierung, Gewichts-Grenzen
  (0.1–20).
- `classes.ts` (`classSchema`): Namenslänge 2–80 Zeichen.
- `subjects.ts` (`subjectSchema` + `parsePointsMapping`): Enum-Werte,
  `parsePointsMapping` mit gültigem/ungültigem JSON, Nicht-Objekt-JSON,
  nicht-numerischen Werten.
- `classFund.ts` (`classFundEntrySchema`): die `.refine()`-Regel
  "Auszahlungen können keinem Schüler zugeordnet werden" — alle vier
  Kombinationen aus `entry_type`/`student_id`.
- `auth.ts` (`loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`,
  `signupSchema`): E-Mail-Format, Passwort-Mindestlänge, die
  "Passwörter stimmen nicht überein"-Regel bei `resetPasswordSchema` und
  `signupSchema`.

## Konfiguration im Detail

`vite.config.ts` bekommt einen `test`-Block:

```ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
  },
});
```

`package.json` bekommt zwei neue Scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

## Out of Scope

- Komponenten-/Hook-Tests (React Testing Library, Supabase-Mocking).
- CI-Pipeline (`.github/workflows`) — es existiert noch keine.
- Integrationstests gegen eine echte/gemockte Supabase-Instanz.
- Coverage-Reporting/-Schwellenwerte.
