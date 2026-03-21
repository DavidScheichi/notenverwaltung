import { useEffect, useRef } from "react";
import { studentSchema } from "../../schemas/students";

interface StudentCreateModalProps {
  isOpen: boolean;
  isSaving: boolean;
  values: {
    first_name: string;
    last_name: string;
    notes: string;
  };
  error: string | null;
  onChange: (values: { first_name: string; last_name: string; notes: string }) => void;
  onClose: () => void;
  onSave: (values: { first_name: string; last_name: string; notes?: string }) => Promise<void>;
}

export const StudentCreateModal = ({
  isOpen,
  isSaving,
  values,
  error,
  onChange,
  onClose,
  onSave,
}: StudentCreateModalProps) => {
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      firstInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40"
      onClick={onClose}
    >
      <div
        className="absolute right-0 top-0 h-full w-full overflow-y-auto bg-white p-5 shadow-2xl sm:w-[480px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-slate-900">Schüler hinzufügen</h3>
          <button type="button" className="button-secondary" onClick={onClose}>
            Schließen
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Vorname, Nachname und optional eine Notiz erfassen.
        </p>

        <form
          className="mt-6 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const parsed = studentSchema.safeParse(values);
            if (!parsed.success) {
              return;
            }

            await onSave(parsed.data);
          }}
        >
          <input
            ref={firstInputRef}
            className="field"
            placeholder="Vorname"
            value={values.first_name}
            onChange={(event) =>
              onChange({ ...values, first_name: event.target.value })
            }
          />
          <input
            className="field"
            placeholder="Nachname"
            value={values.last_name}
            onChange={(event) =>
              onChange({ ...values, last_name: event.target.value })
            }
          />
          <textarea
            className="field min-h-24"
            placeholder="Notiz (optional)"
            value={values.notes}
            onChange={(event) =>
              onChange({ ...values, notes: event.target.value })
            }
          />
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <button type="submit" className="button-primary w-full min-w-[180px]" disabled={isSaving}>
            {isSaving ? "Wird gespeichert..." : "Speichern"}
          </button>
        </form>
      </div>
    </div>
  );
};
