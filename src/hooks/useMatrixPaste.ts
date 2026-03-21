import { useEffect, useRef, useState } from "react";
import type {
  AssessmentDefinition,
  AssessmentResultStatus,
  StudentWithEnrollment,
} from "../lib/supabase/types";

interface PastePayload {
  rowIndex: number;
  columnIndex: number;
  text: string;
  mode: "points" | "grade";
}

interface MatrixPasteOptions {
  definitions: AssessmentDefinition[];
  students: StudentWithEnrollment[];
  onSave: (payload: {
    assessmentDefinitionId: string;
    studentId: string;
    points?: number | null;
    grade?: number | null;
    status?: AssessmentResultStatus;
  }) => Promise<void>;
}

const statusTokenMap: Record<string, AssessmentResultStatus> = {
  E: "excused",
  N: "makeup_pending",
  U: "absent_unexcused",
  B: "exempt",
};

export const useMatrixPaste = ({
  definitions,
  students,
  onSave,
}: MatrixPasteOptions) => {
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteInfo, setPasteInfo] = useState<string | null>(null);
  const [pastedCellKeys, setPastedCellKeys] = useState<Set<string>>(new Set());
  const [invalidCellKeys, setInvalidCellKeys] = useState<Set<string>>(new Set());
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  const scheduleClear = (fn: () => void, delay: number) => {
    const timer = window.setTimeout(fn, delay);
    timersRef.current.push(timer);
  };

  const handlePasteColumn = async ({
    rowIndex,
    columnIndex,
    text,
    mode,
  }: PastePayload) => {
    const definition = definitions[columnIndex];
    if (!definition) {
      return;
    }

    const lines = text.replace(/\r/g, "").split("\n");
    while (lines.length > 0 && !lines[lines.length - 1]?.trim()) {
      lines.pop();
    }

    const nextInvalid = new Set<string>();
    const nextPasted = new Set<string>();
    const jobs: Array<Promise<void>> = [];
    let acceptedCount = 0;

    lines.forEach((line, index) => {
      const targetRow = rowIndex + index;
      const student = students[targetRow];
      if (!student) {
        return;
      }

      const rawValue = (line.split("\t")[0] ?? "").trim();
      if (!rawValue) {
        return;
      }

      const cellKey = `${targetRow}:${columnIndex}`;
      const upper = rawValue.toUpperCase();
      const status = statusTokenMap[upper];
      const isPointsColumn =
        definition.input_mode === "points" ||
        (definition.input_mode === "either" && mode === "points");

      if (isPointsColumn) {
        if (status) {
          acceptedCount += 1;
          nextPasted.add(cellKey);
          jobs.push(
            onSave({
              assessmentDefinitionId: definition.id,
              studentId: student.id,
              points: null,
              grade: null,
              status,
            }),
          );
          return;
        }

        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed)) {
          nextInvalid.add(cellKey);
          return;
        }

        acceptedCount += 1;
        nextPasted.add(cellKey);
        jobs.push(
          onSave({
            assessmentDefinitionId: definition.id,
            studentId: student.id,
            points: parsed,
            grade: null,
            status: "filled",
          }),
        );
        return;
      }

      // In grade-Spalten sind nur gültige Noten erlaubt.
      const parsedGrade = Number(rawValue);
      if (
        !Number.isFinite(parsedGrade) ||
        !Number.isInteger(parsedGrade) ||
        parsedGrade < 1 ||
        parsedGrade > 5
      ) {
        nextInvalid.add(cellKey);
        return;
      }

      acceptedCount += 1;
      nextPasted.add(cellKey);
      jobs.push(
        onSave({
          assessmentDefinitionId: definition.id,
          studentId: student.id,
          points: null,
          grade: parsedGrade,
          status: "filled",
        }),
      );
    });

    setInvalidCellKeys(nextInvalid);
    setPastedCellKeys(nextPasted);

    const settled = await Promise.allSettled(jobs);
    const failedSaves = settled.filter((result) => result.status === "rejected").length;

    if (acceptedCount > 0) {
      setPasteInfo(`${acceptedCount} Werte eingefügt.`);
      scheduleClear(() => setPasteInfo(null), 2000);
    } else {
      setPasteInfo(null);
    }

    if (nextInvalid.size > 0 || failedSaves > 0) {
      const invalidPart = nextInvalid.size > 0 ? `${nextInvalid.size} ungültig` : "";
      const failedPart = failedSaves > 0 ? `${failedSaves} nicht gespeichert` : "";
      const suffix = [invalidPart, failedPart].filter(Boolean).join(", ");
      setPasteError(`Paste nicht vollständig übernommen (${suffix}).`);
      scheduleClear(() => setPasteError(null), 3000);
    } else {
      setPasteError(null);
    }

    if (nextPasted.size > 0) {
      scheduleClear(() => setPastedCellKeys(new Set()), 1200);
    }
    if (nextInvalid.size > 0) {
      scheduleClear(() => setInvalidCellKeys(new Set()), 2500);
    }
  };

  return {
    pasteError,
    pasteInfo,
    pastedCellKeys,
    invalidCellKeys,
    handlePasteColumn,
  };
};
