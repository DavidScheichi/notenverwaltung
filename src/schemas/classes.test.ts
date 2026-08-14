import { describe, expect, it } from "vitest";
import { classSchema } from "./classes";

describe("classSchema", () => {
  it("akzeptiert einen gültigen Klassennamen", () => {
    expect(classSchema.safeParse({ name: "3B" }).success).toBe(true);
  });

  it("lehnt einen zu kurzen Namen ab", () => {
    expect(classSchema.safeParse({ name: "A" }).success).toBe(false);
  });

  it("lehnt einen zu langen Namen ab", () => {
    expect(classSchema.safeParse({ name: "A".repeat(81) }).success).toBe(false);
  });
});
