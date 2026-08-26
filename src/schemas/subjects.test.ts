import { describe, expect, it } from "vitest";
import { subjectSchema } from "./subjects";

describe("subjectSchema", () => {
  const validInput = {
    name: "Mathematik",
    default_weight: 1,
  };

  it("akzeptiert gültige Eingaben", () => {
    expect(subjectSchema.safeParse(validInput).success).toBe(true);
  });

  it("lehnt ein Gewicht außerhalb von 0.1 bis 20 ab", () => {
    const result = subjectSchema.safeParse({ ...validInput, default_weight: 0 });
    expect(result.success).toBe(false);
  });
});
