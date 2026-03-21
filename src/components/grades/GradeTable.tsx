import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  AssessmentDefinition,
  AssessmentResult,
  AssessmentResultStatus,
  GradeBoundary,
  StudentWithEnrollment,
} from "../../lib/supabase/types";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import { useMatrixPaste } from "../../hooks/useMatrixPaste";
import { GradeRow } from "./GradeRow";

interface GradeMatrixProps {
  classId: string;
  subjectId: string;
  students: StudentWithEnrollment[];
  definitions: AssessmentDefinition[];
  boundaries: GradeBoundary[];
  typeLabel: (typeId: string | null) => string;
  results: AssessmentResult[];
  showDirectGrades: boolean;
  onSave: (payload: {
    assessmentDefinitionId: string;
    studentId: string;
    points?: number | null;
    grade?: number | null;
    status?: AssessmentResultStatus;
  }) => Promise<void>;
  onToggleInclude: (definitionId: string, includeInTotal: boolean) => void;
  onDeleteDefinition: (definitionId: string) => Promise<void>;
}

export const GradeMatrix = ({
  classId,
  subjectId,
  students,
  definitions,
  boundaries,
  typeLabel,
  results,
  showDirectGrades,
  onSave,
  onToggleInclude,
  onDeleteDefinition,
}: GradeMatrixProps) => {
  const navigation = useKeyboardNavigation({
    rowCount: students.length,
    columnCount: definitions.length,
  });
  const [activeCell, setActiveCell] = useState<{ row: number; col: number }>({
    row: -1,
    col: -1,
  });
  const {
    pasteError,
    pasteInfo,
    pastedCellKeys,
    invalidCellKeys,
    handlePasteColumn,
  } = useMatrixPaste({
    definitions,
    students,
    onSave,
  });

  const rowResultsMap = useMemo(() => {
    const map = new Map<string, AssessmentResult[]>();
    for (const result of results) {
      const list = map.get(result.student_id) ?? [];
      list.push(result);
      map.set(result.student_id, list);
    }
    return map;
  }, [results]);

  const groupedHeaders = useMemo(() => {
    const groups: Array<{ typeId: string | null; label: string; definitions: AssessmentDefinition[] }> =
      [];

    for (const definition of definitions) {
      const currentGroup = groups[groups.length - 1];
      if (currentGroup && currentGroup.typeId === definition.type_id) {
        currentGroup.definitions.push(definition);
        continue;
      }

      groups.push({
        typeId: definition.type_id,
        label: typeLabel(definition.type_id),
        definitions: [definition],
      });
    }

    return groups;
  }, [definitions, typeLabel]);

  const hasGroupedHeader = groupedHeaders.some((group) => group.typeId !== null);

  return (
    <div className="space-y-2">
      {pasteInfo ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {pasteInfo}
        </div>
      ) : null}
      {pasteError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {pasteError}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            {hasGroupedHeader ? (
              <>
                <tr>
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-30 border-b border-slate-200 bg-white px-4 py-3 text-left"
                  >
                    Schüler
                  </th>
                  {groupedHeaders.map((group) => (
                    <th
                      key={`group-${group.typeId ?? "none"}-${group.label}`}
                      colSpan={group.definitions.length}
                      className="border-b border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
                    >
                      {group.label}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="sticky z-30 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left"
                    style={{ right: 224, minWidth: 170 }}
                  >
                    Punkte
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky z-30 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left"
                    style={{ right: 112, minWidth: 112 }}
                  >
                    Prozent
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky right-0 z-30 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left"
                    style={{ minWidth: 112 }}
                  >
                    Note
                  </th>
                </tr>
                <tr>
                  {definitions.map((definition, colIndex) => (
                    <th
                      key={definition.id}
                      className={`border-b border-slate-200 bg-white px-4 py-3 text-left align-top ${
                        colIndex === activeCell.col ? "bg-brand-50/40" : ""
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <input
                            type="checkbox"
                            checked={definition.include_in_total}
                            onChange={(event) =>
                              onToggleInclude(definition.id, event.target.checked)
                            }
                          />
                          In Summe
                        </label>
                        <button
                          type="button"
                          className="rounded border border-rose-200 px-1.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              "Diesen Leistungsnachweis wirklich löschen?\nAlle zugehörigen Ergebnisse werden entfernt.\nDu kannst die Aktion danach über „Rückgängig“ wiederherstellen.",
                            );
                            if (!confirmed) {
                              return;
                            }
                            try {
                              await onDeleteDefinition(definition.id);
                            } catch {
                              // Fehlerfeedback wird im Parent gesetzt.
                            }
                          }}
                        >
                          Löschen
                        </button>
                      </div>
                      <Link
                        to={`/classes/${classId}/subjects/${subjectId}/assessments/${definition.id}`}
                        className="font-semibold text-brand-700"
                      >
                        {definition.short_label || definition.name}
                      </Link>
                      <div className="mt-1 text-xs text-slate-500">
                        {definition.short_label ? `${definition.name} · ` : ""}
                        {definition.max_points !== null ? `Max ${definition.max_points}` : "Ohne Max"} ·
                        x{definition.weight_multiplier}
                        {definition.include_in_total ? "" : " · exkl."}
                      </div>
                    </th>
                  ))}
                </tr>
              </>
            ) : (
              <tr>
                <th className="sticky left-0 z-30 border-b border-slate-200 bg-white px-4 py-3 text-left">
                  Schüler
                </th>
                {definitions.map((definition, colIndex) => (
                  <th
                    key={definition.id}
                    className={`border-b border-slate-200 bg-white px-4 py-3 text-left align-top ${
                      colIndex === activeCell.col ? "bg-brand-50/40" : ""
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {typeLabel(definition.type_id)}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <input
                            type="checkbox"
                            checked={definition.include_in_total}
                            onChange={(event) =>
                              onToggleInclude(definition.id, event.target.checked)
                            }
                          />
                          In Summe
                        </label>
                        <button
                          type="button"
                          className="rounded border border-rose-200 px-1.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              "Diesen Leistungsnachweis wirklich löschen?\nAlle zugehörigen Ergebnisse werden entfernt.\nDu kannst die Aktion danach über „Rückgängig“ wiederherstellen.",
                            );
                            if (!confirmed) {
                              return;
                            }
                            try {
                              await onDeleteDefinition(definition.id);
                            } catch {
                              // Fehlerfeedback wird im Parent gesetzt.
                            }
                          }}
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                    <Link
                      to={`/classes/${classId}/subjects/${subjectId}/assessments/${definition.id}`}
                      className="font-semibold text-brand-700"
                    >
                      {definition.short_label || definition.name}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">
                      {definition.short_label ? `${definition.name} · ` : ""}
                      {definition.max_points !== null ? `Max ${definition.max_points}` : "Ohne Max"} ·
                      x{definition.weight_multiplier}
                      {definition.include_in_total ? "" : " · exkl."}
                    </div>
                  </th>
                ))}
                <th
                  className="sticky z-30 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left"
                  style={{ right: 224, minWidth: 170 }}
                >
                  Punkte
                </th>
                <th
                  className="sticky z-30 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left"
                  style={{ right: 112, minWidth: 112 }}
                >
                  Prozent
                </th>
                <th
                  className="sticky right-0 z-30 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left"
                  style={{ minWidth: 112 }}
                >
                  Note
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {students.map((student, rowIndex) => (
              <GradeRow
                key={student.id}
                rowIndex={rowIndex}
                student={student}
                definitions={definitions}
                rowResults={rowResultsMap.get(student.id) ?? []}
                boundaries={boundaries}
                onSave={onSave}
                showDirectGrades={showDirectGrades}
                registerCell={navigation.registerCell}
                onCellKeyDown={navigation.handleCellKeyDown}
                onActivateCell={(row, col) => setActiveCell({ row, col })}
                onPasteColumn={(payload) => void handlePasteColumn(payload)}
                pastedCellKeys={pastedCellKeys}
                invalidCellKeys={invalidCellKeys}
                activeRowIndex={activeCell.row}
                activeColumnIndex={activeCell.col}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const GradeTable = GradeMatrix;
