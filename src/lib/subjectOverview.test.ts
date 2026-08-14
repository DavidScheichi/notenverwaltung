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
