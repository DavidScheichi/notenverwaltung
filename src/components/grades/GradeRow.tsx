import { memo } from "react";
import type { KeyboardEvent } from "react";
import { calculateSubjectTotals, gradeFromPercent } from "../../lib/subjectOverview";
import type {
  AssessmentDefinition,
  AssessmentResult,
  AssessmentResultStatus,
  GradeBoundary,
  StudentWithEnrollment,
} from "../../lib/supabase/types";
import { GradeCell } from "./GradeCell";
import { GradeBadge } from "../ui/GradeBadge";

interface GradeRowProps {
  rowIndex: number;
  student: StudentWithEnrollment;
  definitions: AssessmentDefinition[];
  rowResults: AssessmentResult[];
  boundaries: GradeBoundary[];
  onSave: (payload: {
    assessmentDefinitionId: string;
    studentId: string;
    points?: number | null;
    grade?: number | null;
    status?: AssessmentResultStatus;
  }) => Promise<void>;
  showDirectGrades: boolean;
  registerCell: (rowIndex: number, columnIndex: number, element: HTMLElement | null) => void;
  onCellKeyDown: (
    event: KeyboardEvent<HTMLElement>,
    rowIndex: number,
    columnIndex: number,
  ) => void;
  onActivateCell: (rowIndex: number, columnIndex: number) => void;
  onPasteColumn: (payload: {
    rowIndex: number;
    columnIndex: number;
    text: string;
    mode: "points" | "grade";
  }) => void;
  pastedCellKeys: ReadonlySet<string>;
  invalidCellKeys: ReadonlySet<string>;
  activeRowIndex: number;
  activeColumnIndex: number;
}

const GradeRowBase = ({
  rowIndex,
  student,
  definitions,
  rowResults,
  boundaries,
  onSave,
  showDirectGrades,
  registerCell,
  onCellKeyDown,
  onActivateCell,
  onPasteColumn,
  pastedCellKeys,
  invalidCellKeys,
  activeRowIndex,
  activeColumnIndex,
}: GradeRowProps) => {
  const totals = calculateSubjectTotals(definitions, rowResults);
  const finalGrade = gradeFromPercent(totals.percent, boundaries);

  const rowResultMap = new Map(
    rowResults.map((result) => [result.assessment_definition_id, result]),
  );

  return (
    <tr
      className={`group ${rowIndex % 2 === 1 ? "bg-sunken/50" : ""} hover:bg-accent-soft/40 ${
        activeRowIndex === rowIndex ? "bg-accent-soft/60" : ""
      }`}
    >
      <td
        className={`sticky left-0 z-10 border-b border-line px-4 py-2.5 font-medium text-ink ${
          activeRowIndex === rowIndex
            ? "bg-accent-soft"
            : rowIndex % 2 === 1
              ? "bg-sunken"
              : "bg-surface"
        }`}
      >
        {student.first_name} {student.last_name}
      </td>
      {definitions.map((definition, columnIndex) => {
        const result = rowResultMap.get(definition.id);
        const cellKey = `${rowIndex}:${columnIndex}`;
        const isPasted = pastedCellKeys.has(cellKey);
        const isInvalidPaste = invalidCellKeys.has(cellKey);

        return (
          <td
            key={`${definition.id}-${student.id}`}
            className={`border-b border-line px-2 py-2 align-top ${
              activeColumnIndex === columnIndex ? "bg-accent-soft/20" : ""
            } ${
              isPasted ? "bg-emerald-50/60" : ""
            } ${
              isInvalidPaste ? "bg-rose-50/70" : ""
            }`}
          >
            <GradeCell
              rowIndex={rowIndex}
              columnIndex={columnIndex}
              definition={definition}
              points={result?.points ?? null}
              grade={result?.grade ?? null}
              status={result?.status ?? null}
              onSave={onSave}
              showDirectGrades={showDirectGrades}
              studentId={student.id}
              registerCell={registerCell}
              onCellKeyDown={onCellKeyDown}
              onActivate={onActivateCell}
              onPasteColumn={onPasteColumn}
            />
          </td>
        );
      })}
      <td
        className="sticky z-10 border-b border-line bg-sunken px-4 py-2.5 tabular-nums"
        style={{ right: 224, minWidth: 170 }}
      >
        {totals.maxRaw > 0
          ? `${totals.achievedRaw.toFixed(1)} / ${totals.maxRaw.toFixed(1)}`
          : "—"}
      </td>
      <td
        className="sticky z-10 border-b border-line bg-sunken px-4 py-2.5 tabular-nums"
        style={{ right: 112, minWidth: 112 }}
      >
        {totals.percent === null ? "—" : `${totals.percent.toFixed(1)} %`}
      </td>
      <td
        className="sticky right-0 z-10 border-b border-line bg-sunken px-4 py-2.5"
        style={{ minWidth: 112 }}
      >
        <GradeBadge grade={finalGrade} />
      </td>
    </tr>
  );
};

export const GradeRow = memo(GradeRowBase);
