import { z } from "zod";

export const subjectSchema = z.object({
  name: z.string().min(2, "Mindestens 2 Zeichen.").max(80),
  subject_type: z.enum(["normal", "class_fund"]),
  grading_kind: z.enum(["points", "grade"]),
  average_mode: z.enum(["mean", "weighted"]),
  default_weight: z.coerce.number().min(0.1).max(20),
  points_to_grade_raw: z.string().optional(),
});

export type SubjectInput = z.infer<typeof subjectSchema>;

export const parsePointsMapping = (raw?: string) => {
  if (!raw?.trim()) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Punkte-zu-Note Mapping ist kein gueltiges JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Punkte-zu-Note Mapping muss ein JSON-Objekt sein.");
  }

  const entries = Object.entries(parsed);
  const normalized: Record<string, number> = {};

  for (const [key, value] of entries) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      throw new Error("Alle Mapping-Werte muessen Zahlen sein.");
    }

    normalized[key] = numericValue;
  }

  return normalized;
};
