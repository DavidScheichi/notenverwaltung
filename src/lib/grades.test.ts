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
