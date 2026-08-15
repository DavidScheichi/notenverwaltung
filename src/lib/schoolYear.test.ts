import { describe, expect, it } from "vitest";
import {
  computeCarryoverFundEntry,
  deriveDefaultSchoolYearLabel,
  incrementClassName,
  incrementSchoolYearLabel,
} from "./schoolYear";

describe("deriveDefaultSchoolYearLabel", () => {
  it("verwendet das laufende und das folgende Jahr ab August", () => {
    expect(deriveDefaultSchoolYearLabel(new Date(2026, 7, 15))).toBe("2026/2027");
  });

  it("verwendet das vorherige und das laufende Jahr vor August", () => {
    expect(deriveDefaultSchoolYearLabel(new Date(2026, 2, 1))).toBe("2025/2026");
  });

  it("behandelt Juli noch als altes Schuljahr", () => {
    expect(deriveDefaultSchoolYearLabel(new Date(2026, 6, 31))).toBe("2025/2026");
  });
});

describe("incrementSchoolYearLabel", () => {
  it("zählt beide Jahreszahlen im Format YYYY/YYYY hoch", () => {
    expect(incrementSchoolYearLabel("2025/2026")).toBe("2026/2027");
  });

  it("gibt unbekannte Formate unverändert zurück", () => {
    expect(incrementSchoolYearLabel("Schuljahr A")).toBe("Schuljahr A");
  });
});

describe("incrementClassName", () => {
  it("zählt eine führende Ziffer hoch und behält den Rest", () => {
    expect(incrementClassName("3B")).toBe("4B");
  });

  it("zählt mehrstellige führende Zahlen hoch", () => {
    expect(incrementClassName("10A")).toBe("11A");
  });

  it("gibt Namen ohne führende Zahl unverändert zurück", () => {
    expect(incrementClassName("Musikklasse")).toBe("Musikklasse");
  });
});

describe("computeCarryoverFundEntry", () => {
  it("gibt null zurück bei einem Saldo von 0", () => {
    expect(computeCarryoverFundEntry(0)).toBeNull();
  });

  it("gibt eine Einzahlung zurück bei positivem Saldo", () => {
    expect(computeCarryoverFundEntry(42.5)).toEqual({ entry_type: "deposit", amount: 42.5 });
  });

  it("gibt eine Auszahlung mit positivem Betrag zurück bei negativem Saldo", () => {
    expect(computeCarryoverFundEntry(-15)).toEqual({ entry_type: "withdrawal", amount: 15 });
  });
});
