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
import { Menu } from "../ui/Menu";
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

const DefinitionHeader = ({
  definition,
  classId,
  subjectId,
  typeLabelText,
  showTypeBadge,
  isActive,
  onToggleInclude,
  onDelete,
}: {
  definition: AssessmentDefinition;
  classId: string;
  subjectId: string;
  typeLabelText: string;
  showTypeBadge: boolean;
  isActive: boolean;
  onToggleInclude: (definitionId: string, includeInTotal: boolean) => void;
  onDelete: () => void;
}) => (
  <th
    scope="col"
    className={`border-b border-line px-3 py-3 text-left align-top ${
      isActive ? "bg-accent-soft/60" : "bg-surface"
    }`}
  >
    <div className="flex items-start justify-between gap-1">
      <div className="min-w-0">
        <Link
          to={`/classes/${classId}/subjects/${subjectId}/assessments/${definition.id}`}
          className="block truncate text-sm font-semibold text-ink hover:text-accent-strong"
          title={definition.name}
        >
          {definition.short_label || definition.name}
        </Link>
        <p className="mt-0.5 whitespace-nowrap text-[11px] text-ink-3">
          {showTypeBadge ? `${typeLabelText} · ` : ""}
          {definition.max_points !== null ? `max ${definition.max_points}` : "ohne Max"}
          {definition.weight_multiplier !== 1 ? ` · ×${definition.weight_multiplier}` : ""}
        </p>
        {definition.include_in_total ? null : (
          <span className="badge-neutral mt-1.5">zählt nicht</span>
        )}
      </div>
      <Menu
        align="right"
        label={`Aktionen für ${definition.name}`}
        items={[
          {
            kind: "link",
            label: "Auswertung öffnen",
            to: `/classes/${classId}/subjects/${subjectId}/assessments/${definition.id}`,
          },
          {
            kind: "action",
            label: definition.include_in_total
              ? "Aus Gesamtrechnung nehmen"
              : "In Gesamtrechnung aufnehmen",
            onSelect: () => onToggleInclude(definition.id, !definition.include_in_total),
          },
          { kind: "separator" },
          { kind: "action", label: "Nachweis löschen", tone: "danger", onSelect: onDelete },
        ]}
      />
    </div>
  </th>
);

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
        <div className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {pasteInfo}
        </div>
      ) : null}
      {pasteError ? (
        <div className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {pasteError}
        </div>
      ) : null}

      <div className="overflow-x-auto min-h-[24rem]">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-surface">
            {hasGroupedHeader ? (
              <>
                <tr>
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-30 border-b border-line bg-surface px-4 py-3 text-left"
                  >
                    Schüler
                  </th>
                  {groupedHeaders.map((group) => (
                    <th
                      key={`group-${group.typeId ?? "none"}-${group.label}`}
                      colSpan={group.definitions.length}
                      className="border-b border-line bg-surface px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-ink-3"
                    >
                      {group.label}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="sticky z-30 border-b border-line bg-sunken px-4 py-3 text-left"
                    style={{ right: 224, minWidth: 170 }}
                  >
                    Punkte
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky z-30 border-b border-line bg-sunken px-4 py-3 text-left"
                    style={{ right: 112, minWidth: 112 }}
                  >
                    Prozent
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky right-0 z-30 border-b border-line bg-sunken px-4 py-3 text-left"
                    style={{ minWidth: 112 }}
                  >
                    Note
                  </th>
                </tr>
                <tr>
                  {definitions.map((definition, colIndex) => (
                    <DefinitionHeader
                      key={definition.id}
                      definition={definition}
                      classId={classId}
                      subjectId={subjectId}
                      typeLabelText={typeLabel(definition.type_id)}
                      showTypeBadge={false}
                      isActive={colIndex === activeCell.col}
                      onToggleInclude={onToggleInclude}
                      onDelete={() => void onDeleteDefinition(definition.id)}
                    />
                  ))}
                </tr>
              </>
            ) : (
              <tr>
                <th className="sticky left-0 z-30 border-b border-line bg-surface px-4 py-3 text-left">
                  Schüler
                </th>
                {definitions.map((definition, colIndex) => (
                  <DefinitionHeader
                    key={definition.id}
                    definition={definition}
                    classId={classId}
                    subjectId={subjectId}
                    typeLabelText={typeLabel(definition.type_id)}
                    showTypeBadge
                    isActive={colIndex === activeCell.col}
                    onToggleInclude={onToggleInclude}
                    onDelete={() => void onDeleteDefinition(definition.id)}
                  />
                ))}
                <th
                  className="sticky z-30 border-b border-line bg-sunken px-4 py-3 text-left"
                  style={{ right: 224, minWidth: 170 }}
                >
                  Punkte
                </th>
                <th
                  className="sticky z-30 border-b border-line bg-sunken px-4 py-3 text-left"
                  style={{ right: 112, minWidth: 112 }}
                >
                  Prozent
                </th>
                <th
                  className="sticky right-0 z-30 border-b border-line bg-sunken px-4 py-3 text-left"
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

      <p className="border-t border-line px-5 py-2.5 text-[13px] text-ink-3">
        Enter bearbeiten · Pfeiltasten navigieren · Escape verwirft · Mehrere Werte aus einer
        Tabelle in eine Spalte einfügen
      </p>
    </div>
  );
};

export const GradeTable = GradeMatrix;
