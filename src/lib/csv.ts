export interface ParsedStudentRow {
  first_name: string;
  last_name: string;
}

export interface ParseStudentsCsvResult {
  rows: ParsedStudentRow[];
  errors: string[];
}

const HEADER_ALIASES = new Set([
  "vorname,nachname",
  "first_name,last_name",
  "first name,last name",
]);

const detectDelimiter = (firstLine: string): string => {
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
};

export const parseStudentsCsv = (text: string): ParseStudentsCsvResult => {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: [] };
  }

  const delimiter = detectDelimiter(lines[0]);

  const firstCells = lines[0].split(delimiter).map((cell) => cell.trim().toLowerCase());
  const dataLines =
    firstCells.length === 2 && HEADER_ALIASES.has(firstCells.join(","))
      ? lines.slice(1)
      : lines;

  const rows: ParsedStudentRow[] = [];
  const errors: string[] = [];

  dataLines.forEach((line, index) => {
    const lineNumber = index + 1;
    const cells = line.split(delimiter).map((cell) => cell.trim());

    if (cells.length !== 2) {
      errors.push(`Zeile ${lineNumber}: erwartet 2 Spalten, gefunden ${cells.length}.`);
      return;
    }

    const [first_name, last_name] = cells;

    if (!first_name || !last_name) {
      errors.push(`Zeile ${lineNumber}: Vor- und Nachname dürfen nicht leer sein.`);
      return;
    }

    rows.push({ first_name, last_name });
  });

  return { rows, errors };
};
