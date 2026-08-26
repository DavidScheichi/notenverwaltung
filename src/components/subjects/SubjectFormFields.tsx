import { Field } from "../ui/Field";

export interface SubjectFormValues {
  class_id: string;
  name: string;
  default_weight: string;
}

interface SubjectFormFieldsProps {
  values: SubjectFormValues;
  onChange: (next: SubjectFormValues) => void;
  classes: Array<{ id: string; name: string }>;
  idPrefix: string;
  lockClass?: boolean;
}

export const SubjectFormFields = ({
  values,
  onChange,
  classes,
  idPrefix,
  lockClass = false,
}: SubjectFormFieldsProps) => {
  const set = <K extends keyof SubjectFormValues>(key: K, next: SubjectFormValues[K]) =>
    onChange({ ...values, [key]: next });

  return (
    <div className="space-y-7">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Grunddaten</legend>

        {lockClass ? null : (
          <Field
            label="Klasse"
            htmlFor={`${idPrefix}-class`}
            hint="Das Fach gehört zu genau einer Klasse."
          >
            <select
              id={`${idPrefix}-class`}
              className="field"
              value={values.class_id}
              onChange={(event) => set("class_id", event.target.value)}
            >
              <option value="">Klasse wählen</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Fachname" htmlFor={`${idPrefix}-name`}>
          <input
            id={`${idPrefix}-name`}
            className="field"
            placeholder="Mathematik"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
          />
        </Field>
      </fieldset>

      <details className="group rounded-xl border border-line">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-semibold text-ink-2 hover:text-ink">
          Erweiterte Einstellungen
        </summary>
        <div className="border-t border-line p-4">
          <Field
            label="Standardgewicht"
            htmlFor={`${idPrefix}-weight`}
            hint="Vorbelegung für neue Leistungsnachweise. Bestimmt, wie stark ein Leistungsnachweis in die Endnote einfließt (1 = normal, 2 = doppelt so stark) — für einzelne Leistungsnachweise beim Anlegen änderbar."
          >
            <input
              id={`${idPrefix}-weight`}
              className="field"
              type="number"
              step="0.1"
              min="0"
              value={values.default_weight}
              onChange={(event) => set("default_weight", event.target.value)}
            />
          </Field>
        </div>
      </details>
    </div>
  );
};
