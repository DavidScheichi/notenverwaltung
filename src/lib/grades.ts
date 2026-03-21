import type { Assessment, Subject } from "./supabase/types";

const toGradeFromPoints = (
  score: number,
  mapping: Record<string, number> | null,
): number | null => {
  if (!mapping) {
    return null;
  }

  const thresholds = Object.entries(mapping)
    .map(([minPoints, grade]) => ({ minPoints: Number(minPoints), grade }))
    .sort((a, b) => b.minPoints - a.minPoints);

  const matched = thresholds.find((entry) => score >= entry.minPoints);
  return matched?.grade ?? null;
};

export const computeSubjectAverage = (
  subject: Subject,
  assessments: Assessment[],
): number | null => {
  if (assessments.length === 0) {
    return null;
  }

  const normalized = assessments.map((assessment) => {
    if (subject.grading_kind === "points") {
      return {
        value:
          toGradeFromPoints(assessment.value_number, subject.points_to_grade) ??
          assessment.value_number,
        weight: assessment.weight,
      };
    }

    return {
      value: assessment.value_number,
      weight: assessment.weight,
    };
  });

  if (subject.average_mode === "weighted") {
    const totalWeight = normalized.reduce((sum, item) => sum + item.weight, 0);

    if (totalWeight === 0) {
      return null;
    }

    return (
      normalized.reduce((sum, item) => sum + item.value * item.weight, 0) /
      totalWeight
    );
  }

  return normalized.reduce((sum, item) => sum + item.value, 0) / normalized.length;
};

