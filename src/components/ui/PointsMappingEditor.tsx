import { useEffect, useRef, useState } from "react";

interface PointsMappingEditorProps {
  value: string;
  onChange: (nextJson: string) => void;
}

interface MappingRow {
  id: number;
  minPercent: string;
  grade: string;
}

let nextRowId = 0;

const createRow = (minPercent = "", grade = ""): MappingRow => ({
  id: nextRowId++,
  minPercent,
  grade,
});

const parseRows = (raw: string): MappingRow[] => {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [createRow()];
    }

    const rows = Object.entries(parsed as Record<string, unknown>)
      .map(([percent, grade]) => createRow(percent, String(grade)))
      .sort((left, right) => Number(right.minPercent) - Number(left.minPercent));

    return rows.length > 0 ? rows : [createRow()];
  } catch {
    return [createRow()];
  }
};

const serialise = (rows: MappingRow[]) => {
  const mapping: Record<string, number> = {};

  for (const row of rows) {
    if (!row.minPercent.trim() || !row.grade.trim()) {
      continue;
    }

    const percent = Number(row.minPercent);
    const grade = Number(row.grade);

    if (!Number.isFinite(percent) || !Number.isFinite(grade)) {
      continue;
    }

    mapping[String(percent)] = grade;
  }

  return JSON.stringify(mapping);
};

export const PointsMappingEditor = ({ value, onChange }: PointsMappingEditorProps) => {
  const [rows, setRows] = useState<MappingRow[]>(() => parseRows(value));
  // Tracks the JSON string we last handed to the parent via onChange, so the
  // sync effect below can tell "the parent echoed our own change back to us"
  // apart from "the parent gave us a genuinely new value from outside"
  // (e.g. loading a different subject into an already-mounted form).
  const lastEmitted = useRef<string>(value);

  useEffect(() => {
    if (value === lastEmitted.current) {
      return;
    }

    const nextRows = parseRows(value);
    lastEmitted.current = value;
    setRows(nextRows);
  }, [value]);

  const update = (nextRows: MappingRow[]) => {
    setRows(nextRows);
    const json = serialise(nextRows);
    lastEmitted.current = json;
    onChange(json);
  };

  const isValid = rows.every(
    (row) =>
      (!row.minPercent.trim() && !row.grade.trim()) ||
      (Number.isFinite(Number(row.minPercent)) && Number.isFinite(Number(row.grade))),
  );

  return (
    <div className="space-y-3 rounded-xl border border-line bg-sunken p-4">
      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 text-[13px] font-medium text-ink-3">
        <span>Ab Prozent</span>
        <span>Note</span>
        <span className="sr-only">Aktion</span>
      </div>

      {rows.map((row, index) => (
        <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
          <input
            className="field"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            placeholder="90"
            value={row.minPercent}
            onChange={(event) => {
              const next = rows.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, minPercent: event.target.value } : entry,
              );
              update(next);
            }}
          />
          <input
            className="field"
            type="number"
            min={1}
            max={5}
            step={1}
            inputMode="numeric"
            placeholder="1"
            value={row.grade}
            onChange={(event) => {
              const next = rows.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, grade: event.target.value } : entry,
              );
              update(next);
            }}
          />
          <button
            type="button"
            aria-label={`Zeile ${index + 1} entfernen`}
            className="btn-ghost btn-icon text-lg leading-none text-ink-3 hover:text-rose-700"
            disabled={rows.length === 1}
            onClick={() => update(rows.filter((_, entryIndex) => entryIndex !== index))}
          >
            ×
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => update([...rows, createRow()])}
        >
          Stufe hinzufügen
        </button>
        <p className="hint">
          {isValid
            ? "Ein Ergebnis erhält die Note der höchsten Stufe, die es erreicht."
            : "Bitte nur Zahlen eingeben."}
        </p>
      </div>
    </div>
  );
};
