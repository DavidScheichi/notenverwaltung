import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { AssessmentDefinition, AssessmentResultStatus } from "../../lib/supabase/types";
import { STATUS_META, STATUS_OPTIONS } from "../ui/statusMeta";

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
      return STATUS_META[status].symbol;
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
    if (status && status !== "filled") {
      return STATUS_META[status].textClass;
    }

    if (points === null && grade === null) {
      return "text-ink-3";
    }

    return "text-ink";
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
        className={`h-9 w-full rounded-md border border-transparent px-2 text-left text-sm tabular-nums outline-none transition hover:border-line-strong hover:bg-surface focus:border-accent focus:ring-2 focus:ring-accent-ring ${valueClassName}`}
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
      className={`min-w-32 space-y-1 rounded-md border p-1.5 ${
        saveError ? "border-rose-300 bg-rose-50" : "border-accent bg-accent-soft"
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
        {STATUS_OPTIONS.map((option) => (
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
      <p className="min-h-4 text-[11px] leading-4">
        {saveError ? (
          <span className="font-medium text-rose-700">Nicht gespeichert</span>
        ) : saveState === "saving" ? (
          <span className="text-ink-3">Speichert…</span>
        ) : saveState === "saved" ? (
          <span className="text-emerald-700">✓ Gespeichert</span>
        ) : null}
      </p>
    </div>
  );
};

export const GradeCell = memo(GradeCellBase);
