import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { useToast } from "../components/ui/ToastProvider";
import { useClasses } from "../hooks/useClasses";
import { useAllStudents } from "../hooks/useStudents";
import { useAllSubjects, useSubjects } from "../hooks/useSubjects";
import { supabase } from "../lib/supabase/client";
import type { AssessmentDefinition } from "../lib/supabase/types";
import { parsePointsMapping, subjectSchema } from "../schemas/subjects";

export const SubjectsPage = () => {
  const toast = useToast();
  const classesQuery = useClasses();
  const studentsQuery = useAllStudents();
  const subjectsQuery = useAllSubjects();
  const subjectActions = useSubjects();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    class_id: "",
    name: "",
    subject_type: "normal",
    grading_kind: "grade",
    average_mode: "mean",
    default_weight: "1",
    points_to_grade_raw: '{ "90": 1, "80": 2, "65": 3, "50": 4, "0": 5 }',
  });

  const subjectIds = useMemo(
    () => (subjectsQuery.data ?? []).map((subject) => subject.id),
    [subjectsQuery.data],
  );

  const definitionsQuery = useQuery({
    queryKey: ["subjects", "definitions", subjectIds.join(",")],
    enabled: subjectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_definitions")
        .select("*")
        .in("subject_id", subjectIds);

      if (error) {
        throw error;
      }

      return (data ?? []) as AssessmentDefinition[];
    },
  });

  const getClassName = (classId: string) =>
    classesQuery.data?.find((entry) => entry.id === classId)?.name ?? "Keine Klasse";

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Fächerverwaltung</p>
          <h2 className="text-2xl font-semibold text-slate-900">Fächer</h2>
        </div>
        <button
          type="button"
          className="button-primary"
          onClick={() => setIsCreateOpen((value) => !value)}
        >
          + Fach hinzufügen
        </button>
      </section>

      {isCreateOpen ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Fach hinzufügen</h3>
          <p className="mt-1 text-sm text-slate-500">
            Klasse wählen und das Fach direkt anlegen.
          </p>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setCreateError(null);

              if (!subjectForm.class_id) {
                setCreateError("Bitte zuerst eine Klasse auswählen.");
                return;
              }

              const result = subjectSchema.safeParse({
                name: subjectForm.name,
                subject_type: subjectForm.subject_type,
                grading_kind: subjectForm.grading_kind,
                average_mode: subjectForm.average_mode,
                default_weight: subjectForm.default_weight,
                points_to_grade_raw: subjectForm.points_to_grade_raw,
              });

              if (!result.success) {
                setCreateError(result.error.issues[0]?.message ?? "Bitte Eingaben prüfen.");
                return;
              }

              try {
                const {
                  data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                  throw new Error("Nicht eingeloggt.");
                }

                await subjectActions.createSubject.mutateAsync({
                  teacher_id: user.id,
                  class_id: subjectForm.class_id,
                  name: result.data.name,
                  subject_type: result.data.subject_type,
                  grading_kind: result.data.grading_kind,
                  average_mode: result.data.average_mode,
                  default_weight: result.data.default_weight,
                  points_to_grade:
                    result.data.grading_kind === "points"
                      ? parsePointsMapping(result.data.points_to_grade_raw)
                      : null,
                });
                toast.success("Fach wurde erstellt.");

                setSubjectForm({
                  class_id: "",
                  name: "",
                  subject_type: "normal",
                  grading_kind: "grade",
                  average_mode: "mean",
                  default_weight: "1",
                  points_to_grade_raw: '{ "90": 1, "80": 2, "65": 3, "50": 4, "0": 5 }',
                });
                setIsCreateOpen(false);
              } catch (error) {
                toast.error("Fach konnte nicht angelegt werden.");
                setCreateError(
                  error instanceof Error ? error.message : "Fach konnte nicht angelegt werden.",
                );
              }
            }}
          >
            <select
              className="field"
              value={subjectForm.class_id}
              onChange={(event) =>
                setSubjectForm((prev) => ({ ...prev, class_id: event.target.value }))
              }
            >
              <option value="">Klasse wählen</option>
              {classesQuery.data?.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
            <input
              className="field"
              placeholder="Fachname"
              value={subjectForm.name}
              onChange={(event) =>
                setSubjectForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <select
              className="field"
              value={subjectForm.subject_type}
              onChange={(event) =>
                setSubjectForm((prev) => ({ ...prev, subject_type: event.target.value }))
              }
            >
              <option value="normal">Normales Fach</option>
              <option value="class_fund">Klassenkasse-Fach</option>
            </select>
            <button type="submit" className="button-primary" disabled={subjectActions.createSubject.isPending}>
              {subjectActions.createSubject.isPending ? "Wird gespeichert..." : "Speichern"}
            </button>
            <select
              className="field"
              value={subjectForm.grading_kind}
              onChange={(event) =>
                setSubjectForm((prev) => ({ ...prev, grading_kind: event.target.value }))
              }
            >
              <option value="grade">Direkte Note</option>
              <option value="points">Punkte mit Mapping</option>
            </select>
            <select
              className="field"
              value={subjectForm.average_mode}
              onChange={(event) =>
                setSubjectForm((prev) => ({ ...prev, average_mode: event.target.value }))
              }
            >
              <option value="mean">Mittelwert</option>
              <option value="weighted">Gewichteter Durchschnitt</option>
            </select>
            <input
              className="field"
              type="number"
              step="0.1"
              value={subjectForm.default_weight}
              onChange={(event) =>
                setSubjectForm((prev) => ({ ...prev, default_weight: event.target.value }))
              }
              placeholder="Gewicht"
            />
            {subjectForm.grading_kind === "points" ? (
              <textarea
                className="field min-h-24 md:col-span-2 xl:col-span-4"
                value={subjectForm.points_to_grade_raw}
                onChange={(event) =>
                  setSubjectForm((prev) => ({
                    ...prev,
                    points_to_grade_raw: event.target.value,
                  }))
                }
              />
            ) : null}
          </form>
          {createError ? <div className="mt-3"><ErrorState message={createError} /></div> : null}
        </section>
      ) : null}

      {subjectsQuery.error ? <ErrorState message={subjectsQuery.error.message} /> : null}
      {definitionsQuery.error ? <ErrorState message={definitionsQuery.error.message} /> : null}
      {deleteError ? <ErrorState message={deleteError} /> : null}

      {(subjectsQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Keine Fächer vorhanden"
          description="Lege das erste Fach an, um Leistungsnachweise und Noten zu verwalten."
          actionLabel="+ Fach hinzufügen"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjectsQuery.data?.map((subject) => {
            const studentCount = (studentsQuery.data ?? []).filter((student) =>
              student.enrollments.some((enrollment) => enrollment.class_id === subject.class_id),
            ).length;
            const assessmentCount = (definitionsQuery.data ?? []).filter(
              (entry) => entry.subject_id === subject.id,
            ).length;

            return (
              <Link
                key={subject.id}
                to={`/subjects/${subject.id}`}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-lg font-semibold text-brand-700">
                    {subject.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                      Klasse {getClassName(subject.class_id)}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      onClick={async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDeleteError(null);
                        const confirmed = window.confirm(
                          "Dieses Fach wirklich löschen?\nAlle zugehörigen Leistungsnachweise und Ergebnisse werden entfernt.\nDu kannst die Aktion danach über „Rückgängig“ wiederherstellen.",
                        );
                        if (!confirmed) {
                          return;
                        }

                        try {
                          const snapshot = await subjectActions.deleteSubject.mutateAsync(subject.id);
                          toast.undoable("Fach gelöscht.", async () => {
                            await subjectActions.restoreDeletedSubject.mutateAsync(snapshot);
                            toast.success("Fach wurde wiederhergestellt.");
                          });
                        } catch (error) {
                          toast.error("Fach konnte nicht gelöscht werden.");
                          setDeleteError(
                            error instanceof Error
                              ? error.message
                              : "Fach konnte nicht gelöscht werden.",
                          );
                        }
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{subject.name}</h3>
                <div className="mt-4 grid gap-2 text-sm text-slate-500">
                  <p>{studentCount} Schüler</p>
                  <p>{assessmentCount} Leistungsnachweise</p>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
};
