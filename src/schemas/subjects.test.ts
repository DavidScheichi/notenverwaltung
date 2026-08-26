import { describe, expect, it } from "vitest";
import { parsePointsMapping, subjectSchema } from "./subjects";

describe("subjectSchema", () => {
  const validInput = {
    name: "Mathematik",
    grading_kind: "points" as const,
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
