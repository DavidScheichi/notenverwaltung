import { Field } from "../ui/Field";
import { PointsMappingEditor } from "../ui/PointsMappingEditor";

export interface SubjectFormValues {
  class_id: string;
  name: string;
  subject_type: string;
  grading_kind: string;
  average_mode: string;
  default_weight: string;
  points_to_grade_raw: string;
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

        <Field
          label="Fachart"
          htmlFor={`${idPrefix}-type`}
          hint="Ein Klassenkasse-Fach dient der Geldverwaltung statt der Benotung."
        >
          <select
            id={`${idPrefix}-type`}
            className="field"
            value={values.subject_type}
            onChange={(event) => set("subject_type", event.target.value)}
          >
            <option value="normal">Normales Fach</option>
            <option value="class_fund">Klassenkasse-Fach</option>
          </select>
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Bewertung</legend>

        <Field
          label="Art der Bewertung"
          htmlFor={`${idPrefix}-grading`}
          hint={
            values.grading_kind === "points"
              ? "Du trägst Punkte ein, die Note wird über die Prozentstufen unten berechnet."
              : "Du trägst die Note direkt ein, ohne Punkteumrechnung."
          }
        >
          <select
            id={`${idPrefix}-grading`}
            className="field"
            value={values.grading_kind}
            onChange={(event) => set("grading_kind", event.target.value)}
          >
            <option value="grade">Direkte Note</option>
            <option value="points">Punkte mit Umrechnung</option>
          </select>
        </Field>

        <Field
          label="Durchschnittsberechnung"
          htmlFor={`${idPrefix}-average`}
          hint={
            values.average_mode === "weighted"
              ? "Jeder Leistungsnachweis zählt entsprechend seinem Gewicht."
              : "Alle Leistungsnachweise zählen gleich viel."
          }
        >
          <select
            id={`${idPrefix}-average`}
            className="field"
            value={values.average_mode}
            onChange={(event) => set("average_mode", event.target.value)}
          >
            <option value="mean">Mittelwert</option>
            <option value="weighted">Gewichteter Durchschnitt</option>
          </select>
        </Field>

        <Field
          label="Standardgewicht"
          htmlFor={`${idPrefix}-weight`}
          hint="Vorbelegung für neue Leistungsnachweise. 1 = normale Gewichtung, 2 = zählt doppelt."
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
      </fieldset>

      {values.grading_kind === "points" ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-ink">Punkte-Umrechnung</legend>
          <p className="hint">
            Lege fest, ab welchem Prozentsatz welche Note gilt. Die Stufen gelten für alle
            Leistungsnachweise dieses Fachs.
          </p>
          <PointsMappingEditor
            value={values.points_to_grade_raw}
            onChange={(next) => set("points_to_grade_raw", next)}
          />
        </fieldset>
      ) : null}
    </div>
  );
};
