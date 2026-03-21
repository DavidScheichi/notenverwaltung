import { useEffect, useRef } from "react";
import type { AssessmentType, AssessmentInputMode } from "../../lib/supabase/types";

interface AssessmentCreateValues {
  name: string;
  shortLabel: string;
  typeId: string;
  assessmentDate: string;
  inputMode: AssessmentInputMode;
  maxPoints: string;
  weightMultiplier: string;
  includeInTotal: boolean;
}

interface AssessmentCreateDrawerProps {
  isOpen: boolean;
  isSaving: boolean;
  values: AssessmentCreateValues;
  types: AssessmentType[];
  error: string | null;
  onClose: () => void;
  onChange: (next: AssessmentCreateValues) => void;
  onApplyTypeDefaults: (typeId: string) => void;
  onSave: () => Promise<void>;
}

export const AssessmentCreateDrawer = ({
  isOpen,
  isSaving,
  values,
  types,
  error,
  onClose,
  onChange,
  onApplyTypeDefaults,
  onSave,
}: AssessmentCreateDrawerProps) => {
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
        className="absolute right-0 top-0 h-full w-full overflow-y-auto bg-white p-5 shadow-2xl sm:w-[520px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Neuer Leistungsnachweis</h3>
          <button type="button" className="button-secondary" onClick={onClose}>
            Schließen
          </button>
        </div>
        <form
          className="mt-6 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSave();
          }}
        >
          <input
            ref={firstInputRef}
            className="field"
            placeholder="Name"
            value={values.name}
            onChange={(event) => onChange({ ...values, name: event.target.value })}
          />
          <input
            className="field"
            placeholder="Kurzlabel (z. B. HÜ1)"
            value={values.shortLabel}
            onChange={(event) => onChange({ ...values, shortLabel: event.target.value })}
          />
          <select
            className="field"
            value={values.typeId}
            onChange={(event) => onApplyTypeDefaults(event.target.value)}
          >
            <option value="">Sonstiges</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <input
            className="field"
            type="date"
            value={values.assessmentDate}
            onChange={(event) =>
              onChange({ ...values, assessmentDate: event.target.value })
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="field"
              value={values.inputMode}
              onChange={(event) =>
                onChange({
                  ...values,
                  inputMode: event.target.value as AssessmentInputMode,
                })
              }
            >
              <option value="points">Punkte</option>
              <option value="grade">Note</option>
              <option value="either">Beides</option>
            </select>
            <input
              className="field"
              type="number"
              step="0.1"
              placeholder="Max Punkte"
              value={values.maxPoints}
              onChange={(event) => onChange({ ...values, maxPoints: event.target.value })}
            />
          </div>
          <input
            className="field"
            type="number"
            step="0.1"
            placeholder="Gewicht"
            value={values.weightMultiplier}
            onChange={(event) =>
              onChange({ ...values, weightMultiplier: event.target.value })
            }
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={values.includeInTotal}
              onChange={(event) =>
                onChange({ ...values, includeInTotal: event.target.checked })
              }
            />
            In Gesamtrechnung einbeziehen
          </label>
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
