import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { ErrorState } from "../ui/ErrorState";
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

const inputModeHint: Record<AssessmentInputMode, string> = {
  points: "Du trägst Punkte ein.",
  grade: "Du trägst Noten von 1 bis 5 ein.",
  either: "Du kannst pro Schüler zwischen Punkten und Note wechseln.",
};

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
}: AssessmentCreateDrawerProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Neuer Leistungsnachweis"
    size="md"
    footer={
      <>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
          Abbrechen
        </button>
        <button
          type="submit"
          form="assessment-create-form"
          className="btn-primary"
          disabled={isSaving}
        >
          {isSaving ? "Wird gespeichert..." : "Leistungsnachweis anlegen"}
        </button>
      </>
    }
  >
    <form
      id="assessment-create-form"
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave();
      }}
    >
      <Field
        label="Name"
        htmlFor="assessment-create-name"
        hint="Erscheint in der Detailansicht des Leistungsnachweises."
      >
        <input
          id="assessment-create-name"
          className="field"
          value={values.name}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
        />
      </Field>

      <Field
        label="Kurzbezeichnung"
        htmlFor="assessment-create-short-label"
        hint="Wird als Spaltenkopf in der Notentabelle angezeigt, z. B. HÜ1."
      >
        <input
          id="assessment-create-short-label"
          className="field"
          value={values.shortLabel}
          onChange={(event) => onChange({ ...values, shortLabel: event.target.value })}
        />
      </Field>

      <Field
        label="Art"
        htmlFor="assessment-create-type"
        hint="Die Art setzt Vorgaben für Eingabeart, Maximalpunkte und Gewicht."
      >
        <select
          id="assessment-create-type"
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
      </Field>

      <Field label="Datum" htmlFor="assessment-create-date">
        <input
          id="assessment-create-date"
          className="field"
          type="date"
          value={values.assessmentDate}
          onChange={(event) => onChange({ ...values, assessmentDate: event.target.value })}
        />
      </Field>

      <Field
        label="Eingabeart"
        htmlFor="assessment-create-input-mode"
        hint={inputModeHint[values.inputMode]}
      >
        <select
          id="assessment-create-input-mode"
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
      </Field>

      <Field
        label="Maximalpunkte"
        htmlFor="assessment-create-max-points"
        hint="Basis für die Prozentrechnung. Leer lassen, wenn es keine Obergrenze gibt."
      >
        <input
          id="assessment-create-max-points"
          className="field"
          type="number"
          step="0.1"
          value={values.maxPoints}
          onChange={(event) => onChange({ ...values, maxPoints: event.target.value })}
        />
      </Field>

      <Field
        label="Gewicht"
        htmlFor="assessment-create-weight"
        hint="Wie stark dieser Leistungsnachweis in die Endnote einfließt. 1 = normal, 2 = zählt doppelt so stark wie ein normaler Leistungsnachweis (z. B. Schularbeit stärker gewichten als Stundenwiederholung)."
      >
        <input
          id="assessment-create-weight"
          className="field"
          type="number"
          step="0.1"
          value={values.weightMultiplier}
          onChange={(event) => onChange({ ...values, weightMultiplier: event.target.value })}
        />
      </Field>

      <Field
        label="In Gesamtrechnung einbeziehen"
        htmlFor="assessment-create-include-in-total"
        hint="Ausgeschaltet zählt der Nachweis nicht in Summe, Prozent und Note."
      >
        <input
          id="assessment-create-include-in-total"
          type="checkbox"
          checked={values.includeInTotal}
          onChange={(event) => onChange({ ...values, includeInTotal: event.target.checked })}
        />
      </Field>

      {error ? <ErrorState message={error} /> : null}
    </form>
  </Modal>
);
