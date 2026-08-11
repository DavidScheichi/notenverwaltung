import { Field } from "./Field";
import { Modal } from "./Modal";
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
}: StudentCreateModalProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Schüler hinzufügen"
    description="Vor- und Nachname sind Pflicht, die Notiz ist optional."
    size="sm"
    footer={
      <>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
          Abbrechen
        </button>
        <button type="submit" form="student-modal-form" className="btn-primary" disabled={isSaving}>
          {isSaving ? "Wird gespeichert..." : "Schüler anlegen"}
        </button>
      </>
    }
  >
    <form
      id="student-modal-form"
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const parsed = studentSchema.safeParse(values);
        if (!parsed.success) {
          return;
        }

        await onSave(parsed.data);
      }}
    >
      <Field label="Vorname" htmlFor="student-modal-first">
        <input
          id="student-modal-first"
          className="field"
          placeholder="Anna"
          value={values.first_name}
          onChange={(event) => onChange({ ...values, first_name: event.target.value })}
        />
      </Field>

      <Field label="Nachname" htmlFor="student-modal-last">
        <input
          id="student-modal-last"
          className="field"
          placeholder="Bauer"
          value={values.last_name}
          onChange={(event) => onChange({ ...values, last_name: event.target.value })}
        />
      </Field>

      <Field
        label="Notiz"
        htmlFor="student-modal-notes"
        hint="Nur für dich sichtbar, zum Beispiel Sitzplatz oder Förderbedarf."
      >
        <textarea
          id="student-modal-notes"
          className="field min-h-24"
          value={values.notes}
          onChange={(event) => onChange({ ...values, notes: event.target.value })}
        />
      </Field>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
    </form>
  </Modal>
);
