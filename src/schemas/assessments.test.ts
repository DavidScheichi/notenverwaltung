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
