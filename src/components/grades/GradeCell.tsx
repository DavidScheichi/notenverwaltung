import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { AssessmentDefinition, AssessmentResultStatus } from "../../lib/supabase/types";

interface GradeCellProps {
  rowIndex: number;
  columnIndex: number;
  definition: AssessmentDefinition;
  points: number | null;
  grade: number | null;
  onSave: (payload: {
    assessmentDefinitionId: string;
    studentId: string;
    points?: number | null;
    grade?: number | null;
    status?: AssessmentResultStatus;
  }) => Promise<void>;
  showDirectGrades: boolean;
  studentId: string;
  status: AssessmentResultStatus | null;
  registerCell: (rowIndex: number, columnIndex: number, element: HTMLElement | null) => void;
  onCellKeyDown: (
    event: KeyboardEvent<HTMLElement>,
    rowIndex: number,
    columnIndex: number,
  ) => void;
  onActivate: (rowIndex: number, columnIndex: number) => void;
  onPasteColumn: (payload: {
    rowIndex: number;
    columnIndex: number;
    text: string;
    mode: "points" | "grade";
  }) => void;
}

const statusOptions: Array<{ value: AssessmentResultStatus; label: string }> = [
  { value: "filled", label: "Eingetragen" },
  { value: "missing", label: "Fehlt" },
  { value: "excused", label: "Entschuldigt" },
  { value: "absent_unexcused", label: "Unentschuldigt" },
  { value: "makeup_pending", label: "Nachtrag offen" },
  { value: "exempt", label: "Befreit" },
];

const statusSymbols: Record<AssessmentResultStatus, string> = {
  filled: "",
  missing: "—",
  excused: "E",
  absent_unexcused: "U",
  makeup_pending: "N",
  exempt: "B",
};

const parsePoints = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
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

const GradeCellBase = ({
  rowIndex,
  columnIndex,
  definition,
  points,
  grade,
  status,
  onSave,
  showDirectGrades,
  studentId,
  registerCell,
  onCellKeyDown,
  onActivate,
  onPasteColumn,
}: GradeCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [pointsDraft, setPointsDraft] = useState(points !== null ? String(points) : "");
  const [gradeDraft, setGradeDraft] = useState(grade !== null ? String(grade) : "");
  const [statusDraft, setStatusDraft] = useState<AssessmentResultStatus>(status ?? "filled");
  const [mode, setMode] = useState<"points" | "grade">(
    points !== null ? "points" : "grade",
  );
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setPointsDraft(points !== null ? String(points) : "");
      setGradeDraft(grade !== null ? String(grade) : "");
      setStatusDraft(status ?? "filled");
      setMode(points !== null ? "points" : "grade");
      setIsDirty(false);
    }
  }, [grade, isEditing, points, status]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    primaryRef.current?.focus();
  }, [isEditing]);

  const valueLabel = useMemo(() => {
    if (status && status !== "filled") {
      return statusSymbols[status];
    }
    if (points !== null) {
      return String(points);
    }
    if (grade !== null) {
      if (!showDirectGrades) {
        return "—";
      }
      return String(grade);
    }
    return "·";
  }, [grade, points, showDirectGrades, status]);

  const valueClassName = useMemo(() => {
    if (!status && points === null && grade === null) {
      return "text-slate-400";
    }

    if (status === "excused" || status === "exempt") {
      return "font-semibold text-amber-700";
    }

    if (status === "absent_unexcused") {
      return "font-semibold text-rose-700";
    }

    if (status === "makeup_pending") {
      return "font-semibold text-indigo-700";
    }

    if (status === "missing") {
      return "font-semibold text-slate-500";
    }

    return "text-slate-700";
  }, [grade, points, status]);

  const buildPayload = () => {
    if (statusDraft !== "filled") {
      return {
        points: null,
        grade: null,
        status: statusDraft,
      };
    }

    if (definition.input_mode === "points") {
      return {
        points: parsePoints(pointsDraft),
        grade: null,
        status: statusDraft,
      };
    }

    if (definition.input_mode === "grade") {
      return {
        points: null,
        grade: parseGrade(gradeDraft),
        status: statusDraft,
      };
    }

    if (mode === "points") {
      return {
        points: parsePoints(pointsDraft),
        grade: null,
        status: statusDraft,
      };
    }

    return {
      points: null,
      grade: parseGrade(gradeDraft),
      status: statusDraft,
    };
  };

  const commit = async () => {
    const payload = buildPayload();
    try {
      setSaveState("saving");
      await onSave({
        assessmentDefinitionId: definition.id,
        studentId,
        points: payload.points,
        grade: payload.grade,
        status: payload.status,
      });
      setIsDirty(false);
      setSaveError(null);
      setSaveState("saved");
      window.setTimeout(() => {
        setSaveState((current) => (current === "saved" ? "idle" : current));
      }, 900);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
      setSaveState("error");
    }
  };

  useEffect(() => {
    if (!isEditing || !isDirty) {
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      void commit();
    }, 400);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [gradeDraft, isDirty, isEditing, mode, pointsDraft, statusDraft]);

  const handleEscape = () => {
    setPointsDraft(points !== null ? String(points) : "");
    setGradeDraft(grade !== null ? String(grade) : "");
    setStatusDraft(status ?? "filled");
    setMode(points !== null ? "points" : "grade");
    setIsDirty(false);
    setSaveError(null);
    setSaveState("idle");
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        ref={(element) => registerCell(rowIndex, columnIndex, element)}
        className={`h-10 min-w-24 rounded-lg border border-transparent px-2 text-left text-sm outline-none transition hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${valueClassName}`}
        onFocus={() => {
          onActivate(rowIndex, columnIndex);
        }}
        onClick={() => {
          onActivate(rowIndex, columnIndex);
          setIsEditing(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onActivate(rowIndex, columnIndex);
            setIsEditing(true);
            return;
          }

          onCellKeyDown(event, rowIndex, columnIndex);
        }}
      >
        {valueLabel}
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`min-w-28 rounded-lg border p-1 ${
        saveError
          ? "border-rose-300 bg-rose-50/70"
          : "border-brand-200 bg-brand-50/40"
      }`}
      onBlur={(event) => {
        if (containerRef.current?.contains(event.relatedTarget as Node | null)) {
          return;
        }

        if (isDirty) {
          void commit();
        }
        setIsEditing(false);
      }}
      onFocus={() => onActivate(rowIndex, columnIndex)}
    >
      <select
        ref={(element) => {
          primaryRef.current = element;
          registerCell(rowIndex, columnIndex, element);
        }}
        className="field h-8 min-w-28 text-xs"
        value={statusDraft}
        onChange={(event) => {
          const nextStatus = event.target.value as AssessmentResultStatus;
          setStatusDraft(nextStatus);
          if (nextStatus !== "filled") {
            setPointsDraft("");
            setGradeDraft("");
          }
          setIsDirty(true);
          setSaveError(null);
          setSaveState("idle");
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            handleEscape();
            return;
          }
          onCellKeyDown(event, rowIndex, columnIndex);
        }}
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {statusDraft === "filled" && definition.input_mode === "points" ? (
        <input
          ref={(element) => {
            primaryRef.current = element;
            registerCell(rowIndex, columnIndex, element);
          }}
          type="number"
          step="0.1"
          className="field h-9 min-w-24"
          value={pointsDraft}
          onChange={(event) => {
            setPointsDraft(event.target.value);
            setIsDirty(true);
            setSaveError(null);
            setSaveState("idle");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              handleEscape();
              return;
            }

            onCellKeyDown(event, rowIndex, columnIndex);
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (text.includes("\n")) {
              event.preventDefault();
              onPasteColumn({
                rowIndex,
                columnIndex,
                text,
                mode: "points",
              });
            }
          }}
        />
      ) : null}

      {statusDraft === "filled" && definition.input_mode === "grade" ? (
        <input
          ref={(element) => {
            primaryRef.current = element;
            registerCell(rowIndex, columnIndex, element);
          }}
          type="number"
          min={1}
          max={5}
          step={1}
          className="field h-9 min-w-24"
          value={gradeDraft}
          onChange={(event) => {
            setGradeDraft(event.target.value);
            setIsDirty(true);
            setSaveError(null);
            setSaveState("idle");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              handleEscape();
              return;
            }

            onCellKeyDown(event, rowIndex, columnIndex);
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (text.includes("\n")) {
              event.preventDefault();
              onPasteColumn({
                rowIndex,
                columnIndex,
                text,
                mode: "grade",
              });
            }
          }}
        />
      ) : null}

      {statusDraft === "filled" && definition.input_mode === "either" ? (
        <div className="flex min-w-32 flex-col gap-1">
          <select
            className="field h-8 text-xs"
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as "points" | "grade");
              setIsDirty(true);
              setSaveError(null);
              setSaveState("idle");
            }}
          >
            <option value="points">Punkte</option>
            <option value="grade">Note</option>
          </select>
          {mode === "points" ? (
            <input
              ref={(element) => {
                primaryRef.current = element;
                registerCell(rowIndex, columnIndex, element);
              }}
              type="number"
              step="0.1"
              className="field h-9"
              value={pointsDraft}
              onChange={(event) => {
                setPointsDraft(event.target.value);
                setIsDirty(true);
                setSaveError(null);
                setSaveState("idle");
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  handleEscape();
                  return;
                }
                onCellKeyDown(event, rowIndex, columnIndex);
              }}
              onPaste={(event) => {
                const text = event.clipboardData.getData("text");
                if (text.includes("\n")) {
                  event.preventDefault();
                  onPasteColumn({
                    rowIndex,
                    columnIndex,
                    text,
                    mode: "points",
                  });
                }
              }}
            />
          ) : (
            <input
              ref={(element) => {
                primaryRef.current = element;
                registerCell(rowIndex, columnIndex, element);
              }}
              type="number"
              min={1}
              max={5}
              step={1}
              className="field h-9"
              value={gradeDraft}
              onChange={(event) => {
                setGradeDraft(event.target.value);
                setIsDirty(true);
                setSaveError(null);
                setSaveState("idle");
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  handleEscape();
                  return;
                }
                onCellKeyDown(event, rowIndex, columnIndex);
              }}
              onPaste={(event) => {
                const text = event.clipboardData.getData("text");
                if (text.includes("\n")) {
                  event.preventDefault();
                  onPasteColumn({
                    rowIndex,
                    columnIndex,
                    text,
                    mode: "grade",
                  });
                }
              }}
            />
          )}
        </div>
      ) : null}
      {saveError ? (
        <p className="mt-1 text-xs font-medium text-rose-700">Fehler beim Speichern</p>
      ) : saveState === "saving" ? (
        <p className="mt-1 text-xs text-slate-500">Speichert…</p>
      ) : saveState === "saved" ? (
        <p className="mt-1 text-xs text-emerald-700">Gespeichert</p>
      ) : null}
    </div>
  );
};

export const GradeCell = memo(GradeCellBase);
