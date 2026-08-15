import { describe, expect, it } from "vitest";
import { parseStudentsCsv } from "./csv";

describe("parseStudentsCsv", () => {
  it("parst kommagetrennte Zeilen ohne Kopfzeile", () => {
    const result = parseStudentsCsv("Anna,Bauer\nMax,Mustermann");

    expect(result.rows).toEqual([
      { first_name: "Anna", last_name: "Bauer" },
      { first_name: "Max", last_name: "Mustermann" },
    ]);
    expect(result.errors).toEqual([]);
  });

  it("erkennt Semikolon als Trennzeichen automatisch", () => {
    const result = parseStudentsCsv("Anna;Bauer\nMax;Mustermann");

    expect(result.rows).toEqual([
      { first_name: "Anna", last_name: "Bauer" },
      { first_name: "Max", last_name: "Mustermann" },
    ]);
    expect(result.errors).toEqual([]);
  });

  it("überspringt eine erkennbare Kopfzeile", () => {
    const result = parseStudentsCsv("Vorname,Nachname\nAnna,Bauer");

    expect(result.rows).toEqual([{ first_name: "Anna", last_name: "Bauer" }]);
  });

  it("überspringt eine englische Kopfzeile", () => {
    const result = parseStudentsCsv("first_name,last_name\nAnna,Bauer");

    expect(result.rows).toEqual([{ first_name: "Anna", last_name: "Bauer" }]);
  });

  it("ignoriert leere Zeilen", () => {
    const result = parseStudentsCsv("Anna,Bauer\n\n\nMax,Mustermann\n");

    expect(result.rows).toHaveLength(2);
  });

  it("trimmt Leerzeichen um Zellen", () => {
    const result = parseStudentsCsv(" Anna , Bauer ");

    expect(result.rows).toEqual([{ first_name: "Anna", last_name: "Bauer" }]);
  });

  it("meldet Zeilen mit falscher Spaltenanzahl als Fehler statt sie zu importieren", () => {
    const result = parseStudentsCsv("Anna,Bauer\nNurEinName\nMax,Mustermann,Extra");

    expect(result.rows).toEqual([{ first_name: "Anna", last_name: "Bauer" }]);
    expect(result.errors).toEqual([
      "Zeile 2: erwartet 2 Spalten, gefunden 1.",
      "Zeile 3: erwartet 2 Spalten, gefunden 3.",
    ]);
  });

  it("meldet Zeilen mit leerem Vor- oder Nachnamen als Fehler", () => {
    const result = parseStudentsCsv("Anna,\n,Bauer");

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      "Zeile 1: Vor- und Nachname dürfen nicht leer sein.",
      "Zeile 2: Vor- und Nachname dürfen nicht leer sein.",
    ]);
  });

  it("gibt leere Ergebnisse für leeren Text zurück", () => {
    const result = parseStudentsCsv("");

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
