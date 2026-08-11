import { memo, useMemo, useState } from "react";
import type {
  AssessmentDefinition,
  AssessmentResult,
  AssessmentResultStatus,
  GradeBoundary,
  StudentWithEnrollment,
} from "../../lib/supabase/types";
import { calculateSubjectTotals, gradeFromPercent } from "../../lib/subjectOverview";
import { formatDate } from "../../lib/utils";
import { Field } from "../ui/Field";
import { GradeBadge } from "../ui/GradeBadge";
import { Modal } from "../ui/Modal";
import { STATUS_META, STATUS_OPTIONS } from "../ui/statusMeta";

interface SubjectMobileListProps {
  students: StudentWithEnrollment[];
  definitions: AssessmentDefinition[];
  results: AssessmentResult[];
  boundaries: GradeBoundary[];
  typeLabel: (typeId: string | null) => string;
  showDirectGrades: boolean;
  onSave: (payload: {
    assessmentDefinitionId: string;
    studentId: string;
    points?: number | null;
    grade?: number | null;
    status?: AssessmentResultStatus;
  }) => Promise<void>;
}

const parsePoints = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseGrade = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }

  return Math.round(parsed);
};

const resultLabel = (
  result: AssessmentResult | undefined,
  showDirectGrades: boolean,
) => {
  if (!result) {
    return "—";
  }

  const status = result.status ?? "filled";
  if (status !== "filled") {
    return STATUS_META[status].symbol;
  }

  if (result.points !== null) {
    return String(result.points);
  }

  if (result.grade !== null) {
    return showDirectGrades ? String(result.grade) : "—";
  }

  return "—";
};

export const SubjectMobileList = memo(({
  students,
  definitions,
  results,
  boundaries,
  typeLabel,
  showDirectGrades,
  onSave,
}: SubjectMobileListProps) => {
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    student: StudentWithEnrollment;
    definition: AssessmentDefinition;
    result?: AssessmentResult;
  } | null>(null);
  const [pointsDraft, setPointsDraft] = useState("");
  const [gradeDraft, setGradeDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<AssessmentResultStatus>("filled");
  const [modeDraft, setModeDraft] = useState<"points" | "grade">("points");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const rows = useMemo(() => {
    return students.map((student) => {
      const rowResults = results.filter((entry) => entry.student_id === student.id);
      const resultMap = new Map(rowResults.map((entry) => [entry.assessment_definition_id, entry]));
      const totals = calculateSubjectTotals(definitions, rowResults);
      const finalGrade = gradeFromPercent(totals.percent, boundaries);
      const incompleteCount = definitions.filter((definition) => {
        const hit = resultMap.get(definition.id);
        return !hit || (hit.status ?? "filled") !== "filled";
      }).length;

      const entries = definitions.map((definition) => ({
        definition,
        result: resultMap.get(definition.id),
      }));

      return {
        student,
        entries,
        previewEntries: entries.slice(0, 4),
        totals,
        finalGrade,
        incompleteCount,
      };
    });
  }, [boundaries, definitions, results, students]);

  const openEditor = (
    student: StudentWithEnrollment,
    definition: AssessmentDefinition,
    result?: AssessmentResult,
  ) => {
    setEditor({ student, definition, result });
    setPointsDraft(result?.points !== null && result?.points !== undefined ? String(result.points) : "");
    setGradeDraft(result?.grade !== null && result?.grade !== undefined ? String(result.grade) : "");
    setStatusDraft(result?.status ?? "filled");
    setModeDraft(result?.points !== null ? "points" : "grade");
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editor) {
      return;
    }

    let points: number | null = null;
    let grade: number | null = null;
    if (statusDraft === "filled") {
      if (editor.definition.input_mode === "points") {
        points = parsePoints(pointsDraft);
      } else if (editor.definition.input_mode === "grade") {
        grade = parseGrade(gradeDraft);
      } else if (modeDraft === "points") {
        points = parsePoints(pointsDraft);
      } else {
        grade = parseGrade(gradeDraft);
      }
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({
        assessmentDefinitionId: editor.definition.id,
        studentId: editor.student.id,
        points,
        grade,
        status: statusDraft,
      });
      setEditor(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 lg:hidden">
      {rows.map((row) => {
        const isExpanded = expandedStudentId === row.student.id;
        const entriesToRender = isExpanded ? row.entries : row.previewEntries;

        return (
          <article key={row.student.id} className="card-raised p-4">
            <button
              type="button"
              className="w-full text-left"
              onClick={() =>
                setExpandedStudentId((current) =>
                  current === row.student.id ? null : row.student.id,
                )
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-ink">
                    {row.student.first_name} {row.student.last_name}
                  </h3>
                  {row.incompleteCount > 0 ? (
                    <p className="mt-1 text-[13px] text-amber-700">
                      {row.incompleteCount} offene Einträge
                    </p>
                  ) : (
                    <p className="mt-1 text-[13px] text-ink-3">Alle Einträge erfasst</p>
                  )}
                </div>
                <span className="badge-neutral shrink-0">{isExpanded ? "Weniger" : "Mehr"}</span>
              </div>

              <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-[13px]">
                <span className="text-ink-3">
                  Punkte{" "}
                  <span className="font-semibold tabular-nums text-ink">
                    {row.totals.maxWeighted > 0
                      ? `${row.totals.achievedWeighted.toFixed(1)} / ${row.totals.maxWeighted.toFixed(1)}`
                      : "—"}
                  </span>
                </span>
                <span className="text-ink-3">
                  Prozent{" "}
                  <span className="font-semibold tabular-nums text-ink">
                    {row.totals.percent === null ? "—" : `${row.totals.percent.toFixed(1)} %`}
                  </span>
                </span>
                <span className="ml-auto">
                  <GradeBadge grade={row.finalGrade} />
                </span>
              </div>
            </button>

            <div className="mt-4 space-y-2">
              {entriesToRender.map(({ definition, result }) => {
                const status = result?.status ?? "filled";
                const valueClass =
                  status !== "filled" ? STATUS_META[status].textClass : "text-ink";

                return (
                  <button
                    key={`${row.student.id}-${definition.id}`}
                    type="button"
                    className="flex w-full items-start justify-between gap-3 rounded-2xl border border-line px-3 py-3 text-left transition hover:border-accent hover:bg-sunken"
                    onClick={() => openEditor(row.student, definition, result)}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {definition.short_label || definition.name}
                      </p>
                      <p className="mt-1 text-xs text-ink-3">
                        {typeLabel(definition.type_id)}
                        {definition.assessment_date
                          ? ` · ${formatDate(definition.assessment_date)}`
                          : ""}
                      </p>
                    </div>
                    <span className={`badge-neutral shrink-0 tabular-nums ${valueClass}`}>
                      {resultLabel(result, showDirectGrades)}
                    </span>
                  </button>
                );
              })}
            </div>

            {!isExpanded && row.entries.length > row.previewEntries.length ? (
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-accent-strong"
                onClick={() => setExpandedStudentId(row.student.id)}
              >
                Alle Einträge anzeigen
              </button>
            ) : null}
          </article>
        );
      })}

      <Modal
        isOpen={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor?.definition.name ?? ""}
        description={
          editor ? `${editor.student.first_name} ${editor.student.last_name}` : undefined
        }
        footer={
          <button
            type="button"
            className="btn-primary"
            disabled={isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Wird gespeichert..." : "Speichern"}
          </button>
        }
      >
        {editor ? (
          <div className="space-y-3">
            <Field label="Status">
              <select
                className="field"
                value={statusDraft}
                onChange={(event) => setStatusDraft(event.target.value as AssessmentResultStatus)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            {statusDraft === "filled" && editor.definition.input_mode === "either" ? (
              <Field label="Eingabeart">
                <select
                  className="field"
                  value={modeDraft}
                  onChange={(event) => setModeDraft(event.target.value as "points" | "grade")}
                >
                  <option value="points">Punkte</option>
                  <option value="grade">Note</option>
                </select>
              </Field>
            ) : null}

            {statusDraft === "filled" &&
            (editor.definition.input_mode === "points" ||
              (editor.definition.input_mode === "either" && modeDraft === "points")) ? (
              <Field label="Punkte">
                <input
                  className="field"
                  type="number"
                  step="0.1"
                  placeholder="Punkte"
                  value={pointsDraft}
                  onChange={(event) => setPointsDraft(event.target.value)}
                />
              </Field>
            ) : null}

            {statusDraft === "filled" &&
            (editor.definition.input_mode === "grade" ||
              (editor.definition.input_mode === "either" && modeDraft === "grade")) ? (
              <Field label="Note">
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={5}
                  step={1}
                  placeholder="Note"
                  value={gradeDraft}
                  onChange={(event) => setGradeDraft(event.target.value)}
                />
              </Field>
            ) : null}

            {saveError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {saveError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
});
