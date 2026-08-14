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
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["student_id"]);
    }
  });

  it("lehnt einen negativen Betrag ab", () => {
    expect(classFundEntrySchema.safeParse({ ...baseInput, amount: -5 }).success).toBe(false);
  });
});
