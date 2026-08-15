import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Field } from "../ui/Field";
import { ErrorState } from "../ui/ErrorState";
import { incrementClassName, incrementSchoolYearLabel } from "../../lib/schoolYear";
import { usePromoteClass } from "../../hooks/usePromoteClass";
import type { SchoolClass, StudentWithEnrollment } from "../../lib/supabase/types";

interface PromoteClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolClass: SchoolClass;
  currentLabel: string;
  students: StudentWithEnrollment[];
  onPromoted: (newClass: SchoolClass) => void;
}

export const PromoteClassModal = ({
  isOpen,
  onClose,
  schoolClass,
  currentLabel,
  students,
  onPromoted,
}: PromoteClassModalProps) => {
  const promoteClass = usePromoteClass();

  const [targetLabel, setTargetLabel] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTargetLabel(incrementSchoolYearLabel(currentLabel));
    setNewClassName(incrementClassName(schoolClass.name));
    setSelectedStudentIds(students.map((student) => student.id));
    setError(null);
  }, [isOpen, currentLabel, schoolClass.name, students]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!newClassName.trim()) {
      setError("Bitte einen Klassennamen angeben.");
      return;
    }

    if (!targetLabel.trim()) {
      setError("Bitte ein Ziel-Schuljahr angeben.");
      return;
    }

    try {
      const newClass = await promoteClass.mutateAsync({
        sourceClassId: schoolClass.id,
        targetSchoolYearLabel: targetLabel.trim(),
        newClassName: newClassName.trim(),
        studentIds: selectedStudentIds,
      });

      onPromoted(newClass);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Schuljahr-Wechsel konnte nicht durchgeführt werden.",
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ins neue Schuljahr übernehmen"
      description="Fächer-Konfiguration und Kassen-Saldo werden mitgenommen, Bewertungen starten leer."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="submit"
            form="promote-class-form"
            className="btn-primary"
            disabled={promoteClass.isPending}
          >
            {promoteClass.isPending ? "Wird übernommen..." : "Übernehmen"}
          </button>
        </>
      }
    >
      <form id="promote-class-form" className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Ziel-Schuljahr" htmlFor="promote-target-year" hint="Zum Beispiel 2026/2027.">
          <input
            id="promote-target-year"
            className="field"
            value={targetLabel}
            onChange={(event) => setTargetLabel(event.target.value)}
          />
        </Field>

        <Field label="Neuer Klassenname" htmlFor="promote-class-name">
          <input
            id="promote-class-name"
            className="field"
            value={newClassName}
            onChange={(event) => setNewClassName(event.target.value)}
          />
        </Field>

        <Field label="Schüler übernehmen" hint="Abwählen, wer nicht mit in die neue Klasse soll.">
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
            {students.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-ink-3">Keine Schüler in dieser Klasse.</p>
            ) : (
              students.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sunken"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  {student.first_name} {student.last_name}
                </label>
              ))
            )}
          </div>
        </Field>

        {error ? <ErrorState message={error} /> : null}
      </form>
    </Modal>
  );
};
