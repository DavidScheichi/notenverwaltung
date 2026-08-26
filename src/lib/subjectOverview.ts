import type {
  AssessmentDefinition,
  AssessmentResult,
  GradeBoundary,
} from "./supabase/types";

const fallbackBoundaries: GradeBoundary[] = [
  { id: "fallback-1", owner_id: "", subject_id: null, grade: 1, min_percent: 90, created_at: "" },
  { id: "fallback-2", owner_id: "", subject_id: null, grade: 2, min_percent: 80, created_at: "" },
  { id: "fallback-3", owner_id: "", subject_id: null, grade: 3, min_percent: 65, created_at: "" },
  { id: "fallback-4", owner_id: "", subject_id: null, grade: 4, min_percent: 50, created_at: "" },
  { id: "fallback-5", owner_id: "", subject_id: null, grade: 5, min_percent: 0, created_at: "" },
];

export const resolveGradeBoundaries = (
  boundaries: GradeBoundary[],
  subjectId: string,
) => {
  const subjectSpecific = boundaries.filter((entry) => entry.subject_id === subjectId);
  const defaults = boundaries.filter((entry) => entry.subject_id === null);
  const active = (subjectSpecific.length > 0 ? subjectSpecific : defaults).sort(
    (a, b) => b.min_percent - a.min_percent,
  );

  return active.length > 0 ? active : fallbackBoundaries;
};

export const gradeFromPercent = (
  percent: number | null,
  boundaries: GradeBoundary[],
): number | null => {
  if (percent === null) {
    return null;
  }

  const match = boundaries.find((entry) => percent >= entry.min_percent);
  return match?.grade ?? 5;
};

export const calculateSubjectTotals = (
  definitions: AssessmentDefinition[],
  results: AssessmentResult[],
) => {
  let achievedWeighted = 0;
  let maxWeighted = 0;
  let achievedRaw = 0;
  let maxRaw = 0;
  const resultByDefinition = new Map(
    results.map((result) => [result.assessment_definition_id, result]),
  );

  for (const definition of definitions) {
    if (!definition.include_in_total) {
      continue;
    }

    if (definition.max_points === null) {
      continue;
    }

    const result = resultByDefinition.get(definition.id);
    if (!result) {
      continue;
    }

    // Fallback für Alt-Daten ohne Status-Spalte: als "filled" behandeln.
    const status = (result as { status?: string | null }).status ?? "filled";
    if (status !== "filled") {
      continue;
    }

    if (result.points === null) {
      continue;
    }

    const weight = Number(definition.weight_multiplier);
    const maxPoints = Number(definition.max_points);
    const points = Number(result.points);
    if (!Number.isFinite(weight) || !Number.isFinite(maxPoints) || !Number.isFinite(points)) {
      continue;
    }

    achievedWeighted += points * weight;
    maxWeighted += maxPoints * weight;
    achievedRaw += points;
    maxRaw += maxPoints;
  }

  const percent = maxWeighted > 0 ? (achievedWeighted / maxWeighted) * 100 : null;

  return {
    achievedWeighted,
    maxWeighted,
    achievedRaw,
    maxRaw,
    percent,
  };
};

export const calculateAssessmentPercent = (
  points: number | null,
  maxPoints: number | null,
) => {
  if (points === null || maxPoints === null || maxPoints <= 0) {
    return null;
  }

  return (Number(points) / Number(maxPoints)) * 100;
};
