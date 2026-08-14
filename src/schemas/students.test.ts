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
