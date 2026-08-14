# Zeugnis-Druck pro Schüler Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lehrkräfte können pro Schüler eine druckbare Fach-Endnoten-Übersicht öffnen und über den nativen Browser-Druckdialog ausdrucken oder als PDF speichern.

**Architecture:** Eine neue Top-Level-Route `/students/:studentId/print` außerhalb von `AppShell` (analog zu `/login`, `/onboarding`), mit eigener Auth-Prüfung. Die Seite berechnet pro Fach die Endnote über das bereits etablierte `calculateSubjectTotals`/`gradeFromPercent`-System aus `src/lib/subjectOverview.ts` (dieselbe Berechnung wie in `SubjectOverviewPage`/`GradeRow`), rendert eine Tabelle und triggert `window.print()`. Kein neues Package, kein Backend-Code.

**Tech Stack:** React 19, TypeScript, Vite 6, TailwindCSS 3.4 (inkl. `print:`-Varianten), React Router 7, TanStack Query 5 (bestehende Hooks). Keine neuen Abhängigkeiten.

**Spec:** [docs/superpowers/specs/2026-08-14-zeugnis-druck-design.md](../specs/2026-08-14-zeugnis-druck-design.md)

## Global Constraints

- **Reine Fach-Endnoten-Tabelle**, keine Einzel-Leistungsnachweise, kein Notenspiegel/Bemerkungsfeld.
- **Bewertungssystem**: `calculateSubjectTotals` + `gradeFromPercent` aus `src/lib/subjectOverview.ts` — **nicht** `computeSubjectAverage` aus `src/lib/grades.ts`.
- **Route außerhalb `AppShell`**, eigene Auth-Prüfung (analog `OnboardingPage.tsx`).
- **Kein neues Package**, Druck läuft über `window.print()` + Tailwind `print:`-Varianten.
- **Kein Testframework vorhanden.** Verifikation: `npm run build` muss fehlerfrei durchlaufen, danach manuelle Prüfung im Dev-Server (`npm run dev`).
- **Sprache:** Alle sichtbaren Texte auf Deutsch, Du-Form (wie bisher), Umlaute ausgeschrieben.
- **Branch:** `ui-ux-ueberarbeitung` (aktueller Branch).
- **Commit-Nachrichten:** Deutsch, Imperativ, mit `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` als letzte Zeile.

## Dateistruktur

**Neu:**

| Datei | Verantwortung |
|---|---|
| `src/pages/StudentPrintPage.tsx` | Auth-Guard, Datenaufbereitung (Fach → Endnote), Druckansicht, "Drucken"/"Zurück"-Aktionen |

**Geändert:** `src/router.tsx` (neue Route), `src/pages/StudentDetailPage.tsx` (neuer "Zeugnis drucken"-Link im `PageHeader`).

---

### Task 1: Zeugnis-Druckseite

**Files:**
- Create: `src/pages/StudentPrintPage.tsx`
- Modify: `src/router.tsx`
- Modify: `src/pages/StudentDetailPage.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`isAuthenticated`, `isLoading`), `useStudentById(studentId)`, `useClassById(classId)`, `useSubjects(classId)`, `useStudentAssessmentOverview(subjectIds, studentId)` (alle bereits vorhanden, exakt wie in `StudentDetailPage.tsx` verwendet), `calculateSubjectTotals`/`gradeFromPercent`/`resolveGradeBoundaries` aus `src/lib/subjectOverview.ts`, `formatDate` aus `src/lib/utils.ts`, `GradeBadge` aus `src/components/ui/GradeBadge.tsx`
- Produces: Route `/students/:studentId/print`

- [ ] **Step 1: `StudentPrintPage` erstellen**

`src/pages/StudentPrintPage.tsx` neu anlegen. Auth-Guard-Reihenfolge exakt wie in `OnboardingPage.tsx` (erst Auth-Check, dann Loading-Branch — siehe dortiger Fix aus dem Signup/Onboarding-Review, dieselbe Reihenfolge hier von Anfang an korrekt anlegen). Die Klassen-ID wird wie in `StudentDetailPage.tsx` aus `student.enrollments[0]?.class_id` abgeleitet, da diese Route keinen `:classId`-Parameter hat:

```tsx
import { useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useClassById } from "../hooks/useClasses";
import { useStudentById } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { useStudentAssessmentOverview } from "../hooks/useAssessmentDefinitions";
import { GradeBadge } from "../components/ui/GradeBadge";
import { ErrorState } from "../components/ui/ErrorState";
import {
  calculateSubjectTotals,
  gradeFromPercent,
  resolveGradeBoundaries,
} from "../lib/subjectOverview";
import { formatDate } from "../lib/utils";

export const StudentPrintPage = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { studentId = "" } = useParams();
  const navigate = useNavigate();

  const studentQuery = useStudentById(studentId);
  const derivedClassId = studentQuery.data?.enrollments[0]?.class_id ?? "";
  const classQuery = useClassById(derivedClassId);
  const subjectsQuery = useSubjects(derivedClassId);
  const subjectIds = useMemo(
    () => (subjectsQuery.data ?? []).map((subject) => subject.id),
    [subjectsQuery.data],
  );
  const assessmentOverviewQuery = useStudentAssessmentOverview(subjectIds, studentId);

  const subjectGrades = useMemo(() => {
    return (subjectsQuery.data ?? []).map((subject) => {
      const definitions = (assessmentOverviewQuery.data?.definitions ?? []).filter(
        (definition) => definition.subject_id === subject.id,
      );
      const rowResults = (assessmentOverviewQuery.data?.results ?? []).filter(
        (result) =>
          definitions.some((definition) => definition.id === result.assessment_definition_id) &&
          result.student_id === studentId,
      );
      const totals = calculateSubjectTotals(definitions, rowResults);
      const boundaries = resolveGradeBoundaries(
        assessmentOverviewQuery.data?.boundaries ?? [],
        subject.id,
      );
      const finalGrade = gradeFromPercent(totals.percent, boundaries);

      return { subject, finalGrade };
    });
  }, [
    assessmentOverviewQuery.data?.definitions,
    assessmentOverviewQuery.data?.results,
    assessmentOverviewQuery.data?.boundaries,
    studentId,
    subjectsQuery.data,
  ]);

  if (!isAuthLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (
    isAuthLoading ||
    studentQuery.isLoading ||
    subjectsQuery.isLoading ||
    assessmentOverviewQuery.isLoading
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-ink-3">Wird geladen...</p>
      </div>
    );
  }

  const studentName =
    `${studentQuery.data?.first_name ?? ""} ${studentQuery.data?.last_name ?? ""}`.trim() ||
    "Schüler";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {assessmentOverviewQuery.error ? (
        <ErrorState message={assessmentOverviewQuery.error.message} />
      ) : (
        <>
          <div className="print:hidden mb-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary btn-sm"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-primary btn-sm"
            >
              Drucken
            </button>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-ink">{studentName}</h1>
            <p className="mt-1 text-sm text-ink-3">
              {classQuery.data?.name ?? "Klasse"} · {formatDate(new Date().toISOString())}
            </p>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-3">
                <th className="py-2 font-medium">Fach</th>
                <th className="py-2 text-right font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {subjectGrades.map(({ subject, finalGrade }) => (
                <tr key={subject.id} className="border-b border-line">
                  <td className="py-2.5 text-ink">{subject.name}</td>
                  <td className="py-2.5 text-right">
                    <GradeBadge grade={finalGrade} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Route ergänzen**

In `src/router.tsx` den Import ergänzen (`import { StudentPrintPage } from "./pages/StudentPrintPage";`, alphabetisch vor `StudentsPage` einsortieren) und eine neue Top-Level-Route außerhalb des `AppShell`-Children-Baums ergänzen, z. B. direkt nach `/signup`:

```tsx
{
  path: "/signup",
  element: <SignupPage />,
},
{
  path: "/students/:studentId/print",
  element: <StudentPrintPage />,
},
```

- [ ] **Step 3: "Zeugnis drucken"-Link auf `StudentDetailPage` ergänzen**

In `src/pages/StudentDetailPage.tsx` den Import um `Link` (bereits importiert) ergänzen — kein neuer Import nötig, `Link` ist schon vorhanden. Die `PageHeader`-Instanz (Zeile 72-88) um die `actions`-Prop erweitern:

```tsx
<PageHeader
  breadcrumbs={
    classIdParam
      ? [
          { label: "Klassen", to: "/classes" },
          { label: classQuery.data?.name ?? "Klasse", to: `/classes/${derivedClassId}` },
          { label: `${studentQuery.data?.first_name ?? ""} ${studentQuery.data?.last_name ?? ""}`.trim() || "Schüler" },
        ]
      : [
          { label: "Schüler", to: "/students" },
          { label: `${studentQuery.data?.first_name ?? ""} ${studentQuery.data?.last_name ?? ""}`.trim() || "Schüler" },
        ]
  }
  eyebrow={classQuery.data?.name ?? "Klasse"}
  title={`${studentQuery.data?.first_name ?? ""} ${studentQuery.data?.last_name ?? ""}`.trim() || "Schüler"}
  description={studentQuery.data?.notes || undefined}
  actions={
    <Link to={`/students/${studentId}/print`} className="btn-secondary btn-sm">
      Zeugnis drucken
    </Link>
  }
/>
```

- [ ] **Step 4: Manuell im Dev-Server prüfen**

Run: `npm run dev`. Auf einer Schüler-Detailseite (`/students/:studentId` oder `/classes/:classId/students/:studentId`) den neuen "Zeugnis drucken"-Button prüfen → öffnet `/students/:studentId/print`. Dort:
1. Prüfen, dass Schülername, Klassenname und heutiges Datum korrekt angezeigt werden.
2. Prüfen, dass pro Fach dieselbe Endnote erscheint wie auf `/classes/:classId/subjects/:subjectId` (Notenübersicht) für denselben Schüler — Stichprobe an einem Fach mit vorhandenen Ergebnissen.
3. Ein Fach ganz ohne Ergebnisse muss den `GradeBadge`-Fallback (`—`) zeigen, keinen Fehler.
4. "Zurück"-Button muss zur vorherigen Seite zurückführen.
5. Über die Browser-Druckvorschau (Cmd/Ctrl+P) prüfen, dass "Zurück"/"Drucken"-Buttons in der Vorschau nicht erscheinen (`print:hidden` greift).
6. Direkten Aufruf von `/students/<id>/print` ohne aktive Session prüfen → muss zu `/login` umleiten.

- [ ] **Step 5: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 6: Commit**

```bash
git add src/pages/StudentPrintPage.tsx src/router.tsx src/pages/StudentDetailPage.tsx
git commit -m "$(cat <<'EOF'
Ergänze druckbare Zeugnis-Ansicht pro Schüler

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
