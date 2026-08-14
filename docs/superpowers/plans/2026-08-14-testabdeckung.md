# Testabdeckung starten (Vitest) Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vitest als Test-Runner einrichten und den Berechnungs-/Validierungskern der App (`src/lib/`, `src/schemas/`) mit Unit-Tests absichern.

**Architecture:** Vitest wird über die bestehende `vite.config.ts` konfiguriert (kein separates Config-File). Tests liegen direkt neben dem getesteten Code (`*.test.ts`). Getestet werden ausschließlich reine Funktionen — keine Komponenten, keine Supabase-Mocks nötig.

**Tech Stack:** Vitest (neu), TypeScript, Zod (bestehend). Kein `jsdom`, kein React Testing Library.

**Spec:** [docs/superpowers/specs/2026-08-14-testabdeckung-design.md](../specs/2026-08-14-testabdeckung-design.md)

## Global Constraints

- **Scope**: nur `src/lib/` (Notenberechnung) und `src/schemas/` (Zod-Validierung) — keine Komponenten-/Hook-Tests, kein Supabase-Mocking, keine CI-Pipeline in dieser Stufe.
- **Konvention**: Tests liegen direkt neben dem getesteten Code (`*.test.ts`), kein eigener `tests/`-Ordner.
- **Kein neues Test-Environment nötig**: `environment: "node"` in der Vitest-Config reicht, da keine DOM-APIs getestet werden.
- **Sprache**: Test-Beschreibungen (`describe`/`it`-Strings) auf Deutsch, wie der Rest des Projekts. Umlaute ausgeschrieben.
- **Branch**: `ui-ux-ueberarbeitung` (aktueller Branch).
- **Commit-Nachrichten**: Deutsch, Imperativ, mit `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` als letzte Zeile.
- Diese Tests testen **bereits bestehenden, funktionierenden Code** (kein TDD für neue Funktionalität) — der Zyklus pro Task ist daher "Test schreiben → `npx vitest run` ausführen → muss grün sein", nicht Red-Green, da keine Implementierung neu entsteht.

## Dateistruktur

**Neu:**

| Datei | Verantwortung |
|---|---|
| `src/lib/grades.test.ts` | Tests für `computeSubjectAverage` |
| `src/lib/subjectOverview.test.ts` | Tests für `resolveGradeBoundaries`, `gradeFromPercent`, `calculateSubjectTotals`, `calculateAssessmentPercent` |
| `src/schemas/students.test.ts` | Tests für `studentSchema` |
| `src/schemas/assessments.test.ts` | Tests für `assessmentSchema` |
| `src/schemas/classes.test.ts` | Tests für `classSchema` |
| `src/schemas/subjects.test.ts` | Tests für `subjectSchema` und `parsePointsMapping` |
| `src/schemas/classFund.test.ts` | Tests für `classFundEntrySchema` |
| `src/schemas/auth.test.ts` | Tests für `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `signupSchema` |

**Geändert:** `package.json` (neue Dev-Dependency `vitest`, neue Scripts), `vite.config.ts` (Test-Konfiguration).

---

### Task 1: Vitest-Setup + Tests für `grades.ts`

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/lib/grades.test.ts`

**Interfaces:**
- Consumes: `computeSubjectAverage` aus `src/lib/grades.ts` (bereits vorhanden, Signatur `(subject: Subject, assessments: Assessment[]) => number | null`), Typen `Subject`/`Assessment` aus `src/lib/supabase/types.ts` (bereits vorhanden)
- Produces: `npm test` / `npx vitest run` funktioniert projektweit; dieses Setup wird von Task 2 und Task 3 vorausgesetzt

- [ ] **Step 1: Vitest installieren**

Run: `npm install --save-dev vitest`

Das trägt `vitest` als neue Dev-Dependency in `package.json` ein (Version wird von npm automatisch aufgelöst, keine feste Version im Plan vorgeben).

- [ ] **Step 2: `package.json`-Scripts ergänzen**

In `package.json` im `"scripts"`-Block ergänzen (nach `"preview"`):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Vitest in `vite.config.ts` konfigurieren**

`vite.config.ts` komplett ersetzen:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
  },
});
```

Das `/// <reference types="vitest/config" />` ist nötig, damit TypeScript das `test`-Feld auf der Vite-Config-Typdefinition kennt (Vitest erweitert `UserConfig` von Vite über diese Typreferenz).

- [ ] **Step 4: `src/lib/grades.test.ts` schreiben**

```ts
import { describe, expect, it } from "vitest";
import { computeSubjectAverage } from "./grades";
import type { Assessment, Subject } from "./supabase/types";

const baseSubject: Subject = {
  id: "subject-1",
  teacher_id: "teacher-1",
  class_id: "class-1",
  name: "Mathematik",
  subject_type: "normal",
  grading_kind: "grade",
  average_mode: "mean",
  default_weight: 1,
  points_to_grade: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const baseAssessment: Assessment = {
  id: "assessment-1",
  teacher_id: "teacher-1",
  class_id: "class-1",
  student_id: "student-1",
  subject_id: "subject-1",
  value_number: 1,
  value_text: null,
  weight: 1,
  assessed_on: "2026-01-01",
  comment: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("computeSubjectAverage", () => {
  it("gibt null zurück, wenn keine Bewertungen vorliegen", () => {
    expect(computeSubjectAverage(baseSubject, [])).toBeNull();
  });

  it("berechnet den einfachen Durchschnitt bei average_mode 'mean'", () => {
    const assessments: Assessment[] = [
      { ...baseAssessment, id: "a1", value_number: 2 },
      { ...baseAssessment, id: "a2", value_number: 4 },
    ];

    expect(computeSubjectAverage(baseSubject, assessments)).toBe(3);
  });

  it("berechnet den gewichteten Durchschnitt bei average_mode 'weighted'", () => {
    const subject: Subject = { ...baseSubject, average_mode: "weighted" };
    const assessments: Assessment[] = [
      { ...baseAssessment, id: "a1", value_number: 2, weight: 1 },
      { ...baseAssessment, id: "a2", value_number: 4, weight: 3 },
    ];

    // (2*1 + 4*3) / (1+3) = 14/4 = 3.5
    expect(computeSubjectAverage(subject, assessments)).toBe(3.5);
  });

  it("gibt null zurück, wenn das Gesamtgewicht bei 'weighted' 0 ist", () => {
    const subject: Subject = { ...baseSubject, average_mode: "weighted" };
    const assessments: Assessment[] = [
      { ...baseAssessment, id: "a1", value_number: 2, weight: 0 },
    ];

    expect(computeSubjectAverage(subject, assessments)).toBeNull();
  });

  it("wandelt Punkte über points_to_grade in eine Note um", () => {
    const subject: Subject = {
      ...baseSubject,
      grading_kind: "points",
      points_to_grade: { "90": 1, "80": 2, "65": 3, "50": 4, "0": 5 },
    };
    const assessments: Assessment[] = [
      { ...baseAssessment, id: "a1", value_number: 85 },
    ];

    expect(computeSubjectAverage(subject, assessments)).toBe(2);
  });

  it("fällt auf den Rohwert zurück, wenn points_to_grade fehlt", () => {
    const subject: Subject = {
      ...baseSubject,
      grading_kind: "points",
      points_to_grade: null,
    };
    const assessments: Assessment[] = [
      { ...baseAssessment, id: "a1", value_number: 3 },
    ];

    expect(computeSubjectAverage(subject, assessments)).toBe(3);
  });
});
```

- [ ] **Step 5: Tests ausführen**

Run: `npx vitest run src/lib/grades.test.ts`
Erwartet: Alle 6 Tests grün (PASS).

- [ ] **Step 6: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler (Test-Dateien werden von `tsc -b` mit erfasst, da `vitest`-Globals über `vitest/config`-Typen bzw. `vitest`-Importe aufgelöst werden — es werden hier explizite Imports aus `"vitest"` verwendet, kein globales `describe`/`it`, daher keine zusätzliche `tsconfig`-Anpassung nötig).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/lib/grades.test.ts
git commit -m "$(cat <<'EOF'
Richte Vitest ein und teste computeSubjectAverage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Tests für `subjectOverview.ts`

**Files:**
- Create: `src/lib/subjectOverview.test.ts`

**Interfaces:**
- Consumes: `resolveGradeBoundaries`, `gradeFromPercent`, `calculateSubjectTotals`, `calculateAssessmentPercent` aus `src/lib/subjectOverview.ts` (bereits vorhanden), Typen `AssessmentDefinition`/`AssessmentResult`/`GradeBoundary` aus `src/lib/supabase/types.ts` (bereits vorhanden), Vitest-Setup aus Task 1
- Produces: nichts, das von Task 3 gebraucht wird (unabhängig)

- [ ] **Step 1: `src/lib/subjectOverview.test.ts` schreiben**

```ts
import { describe, expect, it } from "vitest";
import {
  calculateAssessmentPercent,
  calculateSubjectTotals,
  gradeFromPercent,
  resolveGradeBoundaries,
} from "./subjectOverview";
import type { AssessmentDefinition, AssessmentResult, GradeBoundary } from "./supabase/types";

const baseBoundary: GradeBoundary = {
  id: "boundary-1",
  owner_id: "owner-1",
  subject_id: null,
  grade: 1,
  min_percent: 90,
  created_at: "2026-01-01T00:00:00.000Z",
};

const baseDefinition: AssessmentDefinition = {
  id: "def-1",
  owner_id: "owner-1",
  subject_id: "subject-1",
  type_id: null,
  name: "Testat 1",
  short_label: null,
  assessment_date: "2026-01-01",
  max_points: 10,
  weight_multiplier: 1,
  input_mode: "points",
  include_in_total: true,
  order_index: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const baseResult: AssessmentResult = {
  id: "res-1",
  owner_id: "owner-1",
  assessment_definition_id: "def-1",
  student_id: "student-1",
  status: "filled",
  points: 8,
  grade: null,
  comment: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("resolveGradeBoundaries", () => {
  it("gibt die eingebauten Standardgrenzen zurück, wenn keine Grenzwerte vorhanden sind", () => {
    const result = resolveGradeBoundaries([], "subject-1");
    expect(result).toHaveLength(5);
    expect(result[0]).toMatchObject({ grade: 1, min_percent: 90 });
  });

  it("verwendet fach-spezifische Grenzwerte, wenn vorhanden", () => {
    const boundaries: GradeBoundary[] = [
      { ...baseBoundary, id: "b1", subject_id: "subject-1", grade: 1, min_percent: 85 },
      { ...baseBoundary, id: "b2", subject_id: null, grade: 1, min_percent: 90 },
    ];

    expect(resolveGradeBoundaries(boundaries, "subject-1")).toEqual([boundaries[0]]);
  });

  it("fällt auf Standard-Grenzwerte (subject_id: null) zurück, wenn keine fach-spezifischen existieren", () => {
    const boundaries: GradeBoundary[] = [
      { ...baseBoundary, id: "b1", subject_id: null, grade: 2, min_percent: 80 },
      { ...baseBoundary, id: "b2", subject_id: null, grade: 1, min_percent: 90 },
    ];

    const result = resolveGradeBoundaries(boundaries, "other-subject");
    expect(result.map((entry) => entry.grade)).toEqual([1, 2]);
  });
});

describe("gradeFromPercent", () => {
  const boundaries: GradeBoundary[] = [
    { ...baseBoundary, id: "b1", grade: 1, min_percent: 90 },
    { ...baseBoundary, id: "b2", grade: 2, min_percent: 80 },
    { ...baseBoundary, id: "b3", grade: 3, min_percent: 65 },
    { ...baseBoundary, id: "b4", grade: 4, min_percent: 50 },
    { ...baseBoundary, id: "b5", grade: 5, min_percent: 0 },
  ];

  it("gibt null zurück, wenn kein Prozentsatz vorliegt", () => {
    expect(gradeFromPercent(null, boundaries)).toBeNull();
  });

  it("trifft die Note exakt an der Schwelle", () => {
    expect(gradeFromPercent(80, boundaries)).toBe(2);
  });

  it("wählt die beste passende Note oberhalb der Schwelle", () => {
    expect(gradeFromPercent(95, boundaries)).toBe(1);
  });

  it("fällt auf Note 5 zurück, wenn keine Grenze passt", () => {
    const sparseBoundaries: GradeBoundary[] = [
      { ...baseBoundary, id: "b1", grade: 1, min_percent: 50 },
    ];

    expect(gradeFromPercent(30, sparseBoundaries)).toBe(5);
  });
});

describe("calculateSubjectTotals", () => {
  it("ignoriert Definitionen mit include_in_total: false", () => {
    const definitions: AssessmentDefinition[] = [
      { ...baseDefinition, id: "def-1", include_in_total: false },
    ];
    const results: AssessmentResult[] = [
      { ...baseResult, assessment_definition_id: "def-1", points: 8 },
    ];

    expect(calculateSubjectTotals(definitions, results)).toEqual({
      achievedWeighted: 0,
      maxWeighted: 0,
      percent: null,
    });
  });

  it("ignoriert Definitionen ohne max_points", () => {
    const definitions: AssessmentDefinition[] = [
      { ...baseDefinition, id: "def-1", max_points: null },
    ];
    const results: AssessmentResult[] = [
      { ...baseResult, assessment_definition_id: "def-1", points: 8 },
    ];

    expect(calculateSubjectTotals(definitions, results).percent).toBeNull();
  });

  it("ignoriert Definitionen ohne zugehöriges Ergebnis", () => {
    const definitions: AssessmentDefinition[] = [{ ...baseDefinition, id: "def-1" }];

    expect(calculateSubjectTotals(definitions, []).percent).toBeNull();
  });

  it("ignoriert Ergebnisse, die nicht 'filled' sind", () => {
    const definitions: AssessmentDefinition[] = [{ ...baseDefinition, id: "def-1" }];
    const results: AssessmentResult[] = [
      { ...baseResult, assessment_definition_id: "def-1", status: "missing", points: 8 },
    ];

    expect(calculateSubjectTotals(definitions, results).percent).toBeNull();
  });

  it("behandelt Ergebnisse ohne status-Feld als 'filled' (Alt-Daten-Fallback)", () => {
    const definitions: AssessmentDefinition[] = [
      { ...baseDefinition, id: "def-1", max_points: 10 },
    ];
    const { status, ...resultWithoutStatus } = baseResult;
    const results = [
      { ...resultWithoutStatus, assessment_definition_id: "def-1", points: 8 },
    ] as AssessmentResult[];

    expect(calculateSubjectTotals(definitions, results).percent).toBe(80);
  });

  it("ignoriert Ergebnisse ohne Punkte", () => {
    const definitions: AssessmentDefinition[] = [{ ...baseDefinition, id: "def-1" }];
    const results: AssessmentResult[] = [
      { ...baseResult, assessment_definition_id: "def-1", points: null },
    ];

    expect(calculateSubjectTotals(definitions, results).percent).toBeNull();
  });

  it("berechnet die gewichtete Gesamtsumme über mehrere Definitionen", () => {
    const definitions: AssessmentDefinition[] = [
      { ...baseDefinition, id: "def-1", max_points: 10, weight_multiplier: 1 },
      { ...baseDefinition, id: "def-2", max_points: 20, weight_multiplier: 2 },
    ];
    const results: AssessmentResult[] = [
      { ...baseResult, id: "res-1", assessment_definition_id: "def-1", points: 5 },
      { ...baseResult, id: "res-2", assessment_definition_id: "def-2", points: 20 },
    ];

    // achieved = 5*1 + 20*2 = 45, max = 10*1 + 20*2 = 50 -> 90%
    const totals = calculateSubjectTotals(definitions, results);
    expect(totals.achievedWeighted).toBe(45);
    expect(totals.maxWeighted).toBe(50);
    expect(totals.percent).toBe(90);
  });
});

describe("calculateAssessmentPercent", () => {
  it("gibt null zurück, wenn Punkte fehlen", () => {
    expect(calculateAssessmentPercent(null, 10)).toBeNull();
  });

  it("gibt null zurück, wenn maxPoints fehlt", () => {
    expect(calculateAssessmentPercent(5, null)).toBeNull();
  });

  it("gibt null zurück, wenn maxPoints 0 oder kleiner ist", () => {
    expect(calculateAssessmentPercent(5, 0)).toBeNull();
  });

  it("berechnet den Prozentsatz", () => {
    expect(calculateAssessmentPercent(5, 20)).toBe(25);
  });
});
```

- [ ] **Step 2: Tests ausführen**

Run: `npx vitest run src/lib/subjectOverview.test.ts`
Erwartet: Alle Tests grün (PASS).

- [ ] **Step 3: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 4: Commit**

```bash
git add src/lib/subjectOverview.test.ts
git commit -m "$(cat <<'EOF'
Ergänze Tests für die Notenberechnung in subjectOverview.ts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Tests für alle Zod-Schemas

**Files:**
- Create: `src/schemas/students.test.ts`
- Create: `src/schemas/assessments.test.ts`
- Create: `src/schemas/classes.test.ts`
- Create: `src/schemas/subjects.test.ts`
- Create: `src/schemas/classFund.test.ts`
- Create: `src/schemas/auth.test.ts`

**Interfaces:**
- Consumes: `studentSchema` (`students.ts`), `assessmentSchema` (`assessments.ts`), `classSchema` (`classes.ts`), `subjectSchema`/`parsePointsMapping` (`subjects.ts`), `classFundEntrySchema` (`classFund.ts`), `loginSchema`/`forgotPasswordSchema`/`resetPasswordSchema`/`signupSchema` (`auth.ts`) — alle bereits vorhanden; Vitest-Setup aus Task 1
- Produces: nichts, das von anderen Tasks gebraucht wird

- [ ] **Step 1: `src/schemas/students.test.ts` schreiben**

```ts
import { describe, expect, it } from "vitest";
import { studentSchema } from "./students";

describe("studentSchema", () => {
  it("akzeptiert gültige Eingaben", () => {
    const result = studentSchema.safeParse({
      first_name: "Max",
      last_name: "Mustermann",
      notes: "",
    });

    expect(result.success).toBe(true);
  });

  it("lehnt leeren Vornamen ab", () => {
    const result = studentSchema.safeParse({
      first_name: "",
      last_name: "Mustermann",
    });

    expect(result.success).toBe(false);
  });

  it("lehnt leeren Nachnamen ab", () => {
    const result = studentSchema.safeParse({
      first_name: "Max",
      last_name: "",
    });

    expect(result.success).toBe(false);
  });

  it("erlaubt fehlende Notes", () => {
    const result = studentSchema.safeParse({
      first_name: "Max",
      last_name: "Mustermann",
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: `src/schemas/assessments.test.ts` schreiben**

```ts
import { describe, expect, it } from "vitest";
import { assessmentSchema } from "./assessments";

const validInput = {
  student_id: "11111111-1111-4111-8111-111111111111",
  subject_id: "22222222-2222-4222-8222-222222222222",
  value_number: 3,
  assessed_on: "2026-01-01",
  weight: 1,
};

describe("assessmentSchema", () => {
  it("akzeptiert gültige Eingaben", () => {
    expect(assessmentSchema.safeParse(validInput).success).toBe(true);
  });

  it("lehnt ungültige UUIDs ab", () => {
    const result = assessmentSchema.safeParse({ ...validInput, student_id: "nicht-uuid" });
    expect(result.success).toBe(false);
  });

  it("lehnt ein Gewicht unter 0.1 ab", () => {
    const result = assessmentSchema.safeParse({ ...validInput, weight: 0.05 });
    expect(result.success).toBe(false);
  });

  it("lehnt ein Gewicht über 20 ab", () => {
    const result = assessmentSchema.safeParse({ ...validInput, weight: 20.5 });
    expect(result.success).toBe(false);
  });

  it("lehnt fehlendes Datum ab", () => {
    const result = assessmentSchema.safeParse({ ...validInput, assessed_on: "" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: `src/schemas/classes.test.ts` schreiben**

```ts
import { describe, expect, it } from "vitest";
import { classSchema } from "./classes";

describe("classSchema", () => {
  it("akzeptiert einen gültigen Klassennamen", () => {
    expect(classSchema.safeParse({ name: "3B" }).success).toBe(true);
  });

  it("lehnt einen zu kurzen Namen ab", () => {
    expect(classSchema.safeParse({ name: "A" }).success).toBe(false);
  });

  it("lehnt einen zu langen Namen ab", () => {
    expect(classSchema.safeParse({ name: "A".repeat(81) }).success).toBe(false);
  });
});
```

- [ ] **Step 4: `src/schemas/subjects.test.ts` schreiben**

```ts
import { describe, expect, it } from "vitest";
import { parsePointsMapping, subjectSchema } from "./subjects";

describe("subjectSchema", () => {
  const validInput = {
    name: "Mathematik",
    subject_type: "normal" as const,
    grading_kind: "points" as const,
    average_mode: "mean" as const,
    default_weight: 1,
  };

  it("akzeptiert gültige Eingaben", () => {
    expect(subjectSchema.safeParse(validInput).success).toBe(true);
  });

  it("lehnt einen ungültigen subject_type ab", () => {
    const result = subjectSchema.safeParse({ ...validInput, subject_type: "sonstiges" });
    expect(result.success).toBe(false);
  });

  it("lehnt ein Gewicht außerhalb von 0.1 bis 20 ab", () => {
    const result = subjectSchema.safeParse({ ...validInput, default_weight: 0 });
    expect(result.success).toBe(false);
  });
});

describe("parsePointsMapping", () => {
  it("gibt null zurück, wenn kein Wert übergeben wird", () => {
    expect(parsePointsMapping(undefined)).toBeNull();
    expect(parsePointsMapping("")).toBeNull();
    expect(parsePointsMapping("   ")).toBeNull();
  });

  it("parst ein gültiges JSON-Mapping", () => {
    expect(parsePointsMapping('{"90":1,"50":4}')).toEqual({ "90": 1, "50": 4 });
  });

  it("wirft bei ungültigem JSON", () => {
    expect(() => parsePointsMapping("{ungültig")).toThrow();
  });

  it("wirft, wenn das JSON kein Objekt ist", () => {
    expect(() => parsePointsMapping("[1,2,3]")).toThrow();
  });

  it("wirft, wenn ein Mapping-Wert keine Zahl ist", () => {
    expect(() => parsePointsMapping('{"90":"eins"}')).toThrow();
  });
});
```

- [ ] **Step 5: `src/schemas/classFund.test.ts` schreiben**

```ts
import { describe, expect, it } from "vitest";
import { classFundEntrySchema } from "./classFund";

const baseInput = {
  entry_type: "deposit" as const,
  amount: 10,
  entry_date: "2026-01-01",
};

describe("classFundEntrySchema", () => {
  it("akzeptiert eine Einzahlung ohne Schüler", () => {
    expect(classFundEntrySchema.safeParse(baseInput).success).toBe(true);
  });

  it("akzeptiert eine Einzahlung mit Schüler", () => {
    const result = classFundEntrySchema.safeParse({
      ...baseInput,
      student_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("akzeptiert eine Auszahlung ohne Schüler", () => {
    const result = classFundEntrySchema.safeParse({ ...baseInput, entry_type: "withdrawal" });
    expect(result.success).toBe(true);
  });

  it("lehnt eine Auszahlung mit Schüler ab", () => {
    const result = classFundEntrySchema.safeParse({
      ...baseInput,
      entry_type: "withdrawal",
      student_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(false);
  });

  it("lehnt einen negativen Betrag ab", () => {
    expect(classFundEntrySchema.safeParse({ ...baseInput, amount: -5 }).success).toBe(false);
  });
});
```

- [ ] **Step 6: `src/schemas/auth.test.ts` schreiben**

```ts
import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "./auth";

describe("loginSchema", () => {
  it("akzeptiert gültige Eingaben", () => {
    expect(loginSchema.safeParse({ email: "a@b.de", password: "geheim1" }).success).toBe(true);
  });

  it("lehnt ein ungültiges E-Mail-Format ab", () => {
    expect(loginSchema.safeParse({ email: "keine-email", password: "geheim1" }).success).toBe(
      false,
    );
  });

  it("lehnt ein zu kurzes Passwort ab", () => {
    expect(loginSchema.safeParse({ email: "a@b.de", password: "123" }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("akzeptiert eine gültige E-Mail", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.de" }).success).toBe(true);
  });

  it("lehnt eine ungültige E-Mail ab", () => {
    expect(forgotPasswordSchema.safeParse({ email: "keine-email" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("akzeptiert übereinstimmende Passwörter", () => {
    const result = resetPasswordSchema.safeParse({
      password: "geheim1",
      confirmPassword: "geheim1",
    });
    expect(result.success).toBe(true);
  });

  it("lehnt nicht übereinstimmende Passwörter ab", () => {
    const result = resetPasswordSchema.safeParse({
      password: "geheim1",
      confirmPassword: "anders1",
    });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("akzeptiert gültige, übereinstimmende Eingaben", () => {
    const result = signupSchema.safeParse({
      email: "a@b.de",
      password: "geheim1",
      confirmPassword: "geheim1",
    });
    expect(result.success).toBe(true);
  });

  it("lehnt nicht übereinstimmende Passwörter ab", () => {
    const result = signupSchema.safeParse({
      email: "a@b.de",
      password: "geheim1",
      confirmPassword: "anders1",
    });
    expect(result.success).toBe(false);
  });

  it("lehnt eine ungültige E-Mail ab", () => {
    const result = signupSchema.safeParse({
      email: "keine-email",
      password: "geheim1",
      confirmPassword: "geheim1",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 7: Alle Tests ausführen**

Run: `npm test`
Erwartet: Alle Tests aus Task 1, 2 und 3 zusammen grün (PASS), keine Fehlschläge.

- [ ] **Step 8: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 9: Commit**

```bash
git add src/schemas/students.test.ts src/schemas/assessments.test.ts src/schemas/classes.test.ts src/schemas/subjects.test.ts src/schemas/classFund.test.ts src/schemas/auth.test.ts
git commit -m "$(cat <<'EOF'
Ergänze Tests für alle Zod-Schemas

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
