import { useState } from "react";
import { Modal } from "./Modal";
import { parseStudentsCsv } from "../../lib/csv";
import type { ParsedStudentRow } from "../../lib/csv";

const rowKey = (row: ParsedStudentRow) =>
  `${row.first_name.trim().toLowerCase()}|${row.last_name.trim().toLowerCase()}`;

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingNames: Set<string>;
  onImport: (rows: ParsedStudentRow[]) => Promise<{ succeeded: number; failed: number }>;
}

export const ImportStudentsModal = ({
  isOpen,
  onClose,
  existingNames,
  onImport,
}: ImportStudentsModalProps) => {
  const [rows, setRows] = useState<ParsedStudentRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ succeeded: number; failed: number } | null>(null);

  const reset = () => {
    setRows([]);
    setParseErrors([]);
    setSelected(new Set());
    setFileName("");
    setResult(null);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseStudentsCsv(text);
    setFileName(file.name);
    setRows(parsed.rows);
    setParseErrors(parsed.errors);
    setSelected(new Set(parsed.rows.map((_, index) => index)));
    setResult(null);
  };

  const toggleRow = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleImport = async () => {
    const selectedRows = rows.filter((_, index) => selected.has(index));
    if (selectedRows.length === 0) {
      return;
    }

    setIsImporting(true);
    try {
      const outcome = await onImport(selectedRows);
      setResult(outcome);
      if (outcome.failed === 0) {
        reset();
        onClose();
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Schüler aus CSV importieren"
      description="Zwei Spalten: Vorname, Nachname. Komma oder Semikolon werden automatisch erkannt."
      size="md"
      footer={
        <>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={isImporting}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleImport()}
            disabled={isImporting || selected.size === 0}
          >
            {isImporting
              ? "Wird importiert..."
              : `${selected.size} Schüler importieren`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="field flex cursor-pointer items-center justify-center border-dashed py-6 text-sm text-ink-2">
          {fileName || "CSV-Datei auswählen..."}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
        </label>

        {parseErrors.length > 0 ? (
          <div className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            <p className="font-semibold">
              {parseErrors.length} Zeile{parseErrors.length === 1 ? "" : "n"} konnte
              {parseErrors.length === 1 ? "" : "n"} nicht gelesen werden:
            </p>
            <ul className="list-inside list-disc">
              {parseErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {result ? (
          <p className="rounded-xl border border-line px-3 py-2 text-sm text-ink-2">
            {result.succeeded} von {result.succeeded + result.failed} Schülern importiert.
            {result.failed > 0
              ? ` ${result.failed} fehlgeschlagen — bitte erneut versuchen.`
              : ""}
          </p>
        ) : null}

        {rows.length > 0 ? (
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
            {rows.map((row, index) => {
              const isDuplicate = existingNames.has(rowKey(row));
              return (
                <label
                  key={`${rowKey(row)}-${index}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sunken"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(index)}
                    onChange={() => toggleRow(index)}
                  />
                  <span className="flex-1">
                    {row.first_name} {row.last_name}
                  </span>
                  {isDuplicate ? (
                    <span className="badge-neutral text-[11px]">bereits vorhanden</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
