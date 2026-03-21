import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { useToast } from "../components/ui/ToastProvider";
import { useClasses } from "../hooks/useClasses";
import { useAllStudents, useStudents } from "../hooks/useStudents";
import { useAllSubjects } from "../hooks/useSubjects";
import {
  calculateAssessmentPercent,
  gradeFromPercent,
  resolveGradeBoundaries,
} from "../lib/subjectOverview";
import { supabase } from "../lib/supabase/client";
import type { AssessmentDefinition, AssessmentResult, GradeBoundary } from "../lib/supabase/types";
import { studentSchema } from "../schemas/students";

export const StudentsPage = () => {
  const toast = useToast();
  const classesQuery = useClasses();
  const studentsQuery = useAllStudents();
  const studentActions = useStudents();
  const subjectsQuery = useAllSubjects();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [studentForm, setStudentForm] = useState({
    classId: "",
    first_name: "",
    last_name: "",
    notes: "",
  });

  const studentIds = useMemo(
    () => (studentsQuery.data ?? []).map((student) => student.id),
    [studentsQuery.data],
  );
  const subjectIds = useMemo(
    () => (subjectsQuery.data ?? []).map((subject) => subject.id),
    [subjectsQuery.data],
  );

  const summaryQuery = useQuery({
    queryKey: ["students", "summary", studentIds.join(","), subjectIds.join(",")],
    enabled: studentIds.length > 0 && subjectIds.length > 0,
    queryFn: async () => {
      const { data: definitionsData, error: definitionsError } = await supabase
        .from("assessment_definitions")
        .select("*")
        .in("subject_id", subjectIds);

      if (definitionsError) {
        throw definitionsError;
      }

      const definitions = (definitionsData ?? []) as AssessmentDefinition[];
      const definitionIds = definitions.map((entry) => entry.id);

      if (definitionIds.length === 0) {
        return {
          definitions,
          results: [] as AssessmentResult[],
          boundaries: [] as GradeBoundary[],
        };
      }

      const { data: resultsData, error: resultsError } = await supabase
        .from("assessment_results")
        .select("*")
        .in("assessment_definition_id", definitionIds)
        .in("student_id", studentIds);

      if (resultsError) {
        throw resultsError;
      }

      const { data: boundariesData, error: boundariesError } = await supabase
        .from("grade_boundaries")
        .select("*");

      if (boundariesError) {
        throw boundariesError;
      }

      return {
        definitions,
        results: (resultsData ?? []) as AssessmentResult[],
        boundaries: (boundariesData ?? []) as GradeBoundary[],
      };
    },
  });

  const averageMap = useMemo(() => {
    const map = new Map<string, number>();
    const definitions = summaryQuery.data?.definitions ?? [];
    const results = summaryQuery.data?.results ?? [];
    const boundaries = summaryQuery.data?.boundaries ?? [];

    for (const student of studentsQuery.data ?? []) {
      const grades: number[] = [];

      for (const result of results.filter((entry) => entry.student_id === student.id)) {
        if (result.grade !== null) {
          grades.push(Number(result.grade));
          continue;
        }

        const definition = definitions.find((entry) => entry.id === result.assessment_definition_id);
        if (!definition) {
          continue;
        }

        const percent = calculateAssessmentPercent(result.points, definition.max_points);
        const computedGrade = gradeFromPercent(
          percent,
          resolveGradeBoundaries(boundaries, definition.subject_id),
        );

        if (computedGrade !== null) {
          grades.push(computedGrade);
        }
      }

      if (grades.length > 0) {
        map.set(student.id, grades.reduce((sum, value) => sum + value, 0) / grades.length);
      }
    }

    return map;
  }, [studentsQuery.data, summaryQuery.data?.boundaries, summaryQuery.data?.definitions, summaryQuery.data?.results]);

  const filteredStudents = useMemo(() => {
    return (studentsQuery.data ?? []).filter((student) => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      const matchesSearch = fullName.includes(search.toLowerCase());
      const currentClassId = student.enrollments[0]?.class_id ?? "";
      const matchesClass = !classFilter || currentClassId === classFilter;

      return matchesSearch && matchesClass;
    });
  }, [classFilter, search, studentsQuery.data]);
  const hasStudents = (studentsQuery.data ?? []).length > 0;

  const getClassName = (classId?: string) =>
    classesQuery.data?.find((item) => item.id === classId)?.name ?? "Keine Klasse";

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Schülerverwaltung</p>
          <h2 className="text-2xl font-semibold text-slate-900">Schüler</h2>
        </div>
        <button
          type="button"
          className="button-primary"
          onClick={() => setIsCreateOpen((value) => !value)}
        >
          + Schüler hinzufügen
        </button>
      </section>

      {isCreateOpen ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Schüler hinzufügen</h3>
          <p className="mt-1 text-sm text-slate-500">
            Klasse wählen und den Schüler direkt anlegen.
          </p>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setCreateError(null);

              if (!studentForm.classId) {
                setCreateError("Bitte zuerst eine Klasse auswählen.");
                return;
              }

              const result = studentSchema.safeParse({
                first_name: studentForm.first_name,
                last_name: studentForm.last_name,
                notes: studentForm.notes,
              });

              if (!result.success) {
                setCreateError(result.error.issues[0]?.message ?? "Bitte Eingaben prüfen.");
                return;
              }

              try {
                await studentActions.createStudent.mutateAsync({
                  ...result.data,
                  classId: studentForm.classId,
                });
                toast.success("Schüler wurde erstellt.");
                setStudentForm({
                  classId: "",
                  first_name: "",
                  last_name: "",
                  notes: "",
                });
                setIsCreateOpen(false);
              } catch (error) {
                toast.error("Schüler konnte nicht angelegt werden.");
                setCreateError(
                  error instanceof Error
                    ? error.message
                    : "Schüler konnte nicht angelegt werden.",
                );
              }
            }}
          >
            <select
              className="field"
              value={studentForm.classId}
              onChange={(event) =>
                setStudentForm((prev) => ({ ...prev, classId: event.target.value }))
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
              placeholder="Vorname"
              value={studentForm.first_name}
              onChange={(event) =>
                setStudentForm((prev) => ({ ...prev, first_name: event.target.value }))
              }
            />
            <input
              className="field"
              placeholder="Nachname"
              value={studentForm.last_name}
              onChange={(event) =>
                setStudentForm((prev) => ({ ...prev, last_name: event.target.value }))
              }
            />
            <button type="submit" className="button-primary" disabled={studentActions.createStudent.isPending}>
              {studentActions.createStudent.isPending ? "Wird gespeichert..." : "Speichern"}
            </button>
            <textarea
              className="field min-h-24 md:col-span-2 xl:col-span-4"
              placeholder="Notiz (optional)"
              value={studentForm.notes}
              onChange={(event) =>
                setStudentForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </form>
          {createError ? <div className="mt-3"><ErrorState message={createError} /></div> : null}
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            className="field"
            placeholder="Schüler suchen"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="field"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
          >
            <option value="">Alle Klassen</option>
            {classesQuery.data?.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {studentsQuery.error ? <ErrorState message={studentsQuery.error.message} /> : null}
      {summaryQuery.error ? <ErrorState message={summaryQuery.error.message} /> : null}
      {deleteError ? <ErrorState message={deleteError} /> : null}

      {filteredStudents.length === 0 ? (
        <EmptyState
          title={hasStudents ? "Keine Suchergebnisse" : "Keine Schüler vorhanden"}
          description={
            hasStudents
              ? "Passe Suche oder Klassenfilter an, um passende Schüler zu sehen."
              : "Lege den ersten Schüler an, um mit der Verwaltung zu starten."
          }
          actionLabel="+ Schüler hinzufügen"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredStudents.map((student) => {
            const classId = student.enrollments[0]?.class_id;
            const initials = `${student.first_name[0] ?? ""}${student.last_name[0] ?? ""}`;
            const average = averageMap.get(student.id);

            return (
              <Link
                key={student.id}
                to={`/students/${student.id}`}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                    {initials.toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                      {getClassName(classId)}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      onClick={async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDeleteError(null);
                        const confirmed = window.confirm(
                          "Diesen Schüler wirklich löschen?\nAlle zugehörigen Ergebnisse werden entfernt.\nDu kannst die Aktion danach über „Rückgängig“ wiederherstellen.",
                        );
                        if (!confirmed) {
                          return;
                        }

                        try {
                          const snapshot = await studentActions.deleteStudent.mutateAsync(student.id);
                          toast.undoable("Schüler gelöscht.", async () => {
                            await studentActions.restoreDeletedStudent.mutateAsync(snapshot);
                            toast.success("Schüler wurde wiederhergestellt.");
                          });
                        } catch (error) {
                          toast.error("Schüler konnte nicht gelöscht werden.");
                          setDeleteError(
                            error instanceof Error
                              ? error.message
                              : "Schüler konnte nicht gelöscht werden.",
                          );
                        }
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {student.first_name} {student.last_name}
                </h3>
                {average !== undefined ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Durchschnitt: <span className="font-semibold text-slate-900">{average.toFixed(2)}</span>
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">Noch keine Notendaten</p>
                )}
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
};
