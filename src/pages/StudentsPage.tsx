import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field } from "../components/ui/Field";
import { GradeBadge } from "../components/ui/GradeBadge";
import { Menu } from "../components/ui/Menu";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/useConfirm";
import { useClasses } from "../hooks/useClasses";
import { useAllStudents, useStudents } from "../hooks/useStudents";
import { useAllSubjects } from "../hooks/useSubjects";
import {
  calculateAssessmentPercent,
  gradeFromPercent,
  resolveGradeBoundaries,
} from "../lib/subjectOverview";
import { supabase } from "../lib/supabase/client";
import type {
  AssessmentDefinition,
  AssessmentResult,
  GradeBoundary,
  StudentWithEnrollment,
} from "../lib/supabase/types";
import { studentSchema } from "../schemas/students";

const LoadingRows = () => (
  <div className="space-y-3">
    <div className="h-14 animate-pulse rounded-xl bg-sunken" />
    <div className="h-14 animate-pulse rounded-xl bg-sunken" />
  </div>
);

export const StudentsPage = () => {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
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
  const hasFilters = Boolean(search || classFilter);

  const getClassName = (classId?: string) =>
    classesQuery.data?.find((item) => item.id === classId)?.name ?? "Keine Klasse";

  const handleCreateStudent = async (event: React.FormEvent<HTMLFormElement>) => {
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
        error instanceof Error ? error.message : "Schüler konnte nicht angelegt werden.",
      );
    }
  };

  const handleDeleteStudent = async (student: StudentWithEnrollment) => {
    setDeleteError(null);

    const confirmed = await confirm({
      title: `${student.first_name} ${student.last_name} löschen?`,
      description:
        "Alle Ergebnisse dieses Schülers werden entfernt. Direkt danach kannst du die Aktion über „Rückgängig\" wiederherstellen.",
      confirmLabel: "Schüler löschen",
    });

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
        error instanceof Error ? error.message : "Schüler konnte nicht gelöscht werden.",
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Schüler"
        description="Alle Schüler über deine Klassen hinweg."
        stats={[{ label: "Schüler", value: studentsQuery.data?.length ?? 0 }]}
        actions={
          <button type="button" className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            Schüler hinzufügen
          </button>
        }
      />

      <section className="card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <Field label="Suche" htmlFor="student-search">
            <input
              id="student-search"
              className="field"
              placeholder="Name suchen"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Klasse" htmlFor="student-class-filter">
            <select
              id="student-class-filter"
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
          </Field>
        </div>
        {hasFilters ? (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-[13px] text-ink-3">
              {filteredStudents.length} von {studentsQuery.data?.length ?? 0} Schülern
            </p>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                setSearch("");
                setClassFilter("");
              }}
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : null}
      </section>

      {deleteError ? <ErrorState message={deleteError} /> : null}

      {studentsQuery.error ? (
        <ErrorState message={studentsQuery.error.message} />
      ) : summaryQuery.error ? (
        <ErrorState message={summaryQuery.error.message} />
      ) : studentsQuery.isLoading ? (
        <LoadingRows />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Keine Suchergebnisse" : "Keine Schüler vorhanden"}
          description={
            hasFilters
              ? "Passe Suche oder Klassenfilter an, um passende Schüler zu sehen."
              : "Lege den ersten Schüler an, um mit der Verwaltung zu starten."
          }
          actionLabel={hasFilters ? undefined : "Schüler hinzufügen"}
          onAction={hasFilters ? undefined : () => setIsCreateOpen(true)}
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredStudents.map((student) => {
            const classId = student.enrollments[0]?.class_id;
            const initials = `${student.first_name[0] ?? ""}${student.last_name[0] ?? ""}`;
            const average = averageMap.get(student.id);

            return (
              <article key={student.id} className="card-raised group relative p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white"
                    >
                      {initials.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <Link
                        to={`/students/${student.id}`}
                        className="block truncate text-base font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-accent-strong"
                      >
                        {student.first_name} {student.last_name}
                      </Link>
                      <p className="mt-0.5 text-[13px] text-ink-3">{getClassName(classId)}</p>
                    </div>
                  </div>
                  <div className="relative z-10 shrink-0">
                    <Menu
                      items={[
                        { kind: "link", label: "Details öffnen", to: `/students/${student.id}` },
                        { kind: "separator" },
                        {
                          kind: "action",
                          label: "Schüler löschen",
                          tone: "danger",
                          onSelect: () => void handleDeleteStudent(student),
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-[13px] text-ink-3">Notendurchschnitt</span>
                  <GradeBadge grade={average ?? null} fallback="—" />
                </div>
              </article>
            );
          })}
        </section>
      )}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError(null);
        }}
        title="Schüler hinzufügen"
        description="Klasse wählen und den Schüler direkt anlegen."
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setCreateError(null);
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              form="student-create-form"
              className="btn-primary"
              disabled={studentActions.createStudent.isPending}
            >
              {studentActions.createStudent.isPending ? "Wird gespeichert..." : "Speichern"}
            </button>
          </>
        }
      >
        <form id="student-create-form" className="space-y-4" onSubmit={handleCreateStudent}>
          <Field label="Klasse" htmlFor="student-class">
            <select
              id="student-class"
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
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vorname" htmlFor="student-first-name">
              <input
                id="student-first-name"
                className="field"
                placeholder="Vorname"
                value={studentForm.first_name}
                onChange={(event) =>
                  setStudentForm((prev) => ({ ...prev, first_name: event.target.value }))
                }
              />
            </Field>
            <Field label="Nachname" htmlFor="student-last-name">
              <input
                id="student-last-name"
                className="field"
                placeholder="Nachname"
                value={studentForm.last_name}
                onChange={(event) =>
                  setStudentForm((prev) => ({ ...prev, last_name: event.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Notiz (optional)" htmlFor="student-notes">
            <textarea
              id="student-notes"
              className="field min-h-24"
              placeholder="Notiz"
              value={studentForm.notes}
              onChange={(event) =>
                setStudentForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </Field>
          {createError ? <ErrorState message={createError} /> : null}
        </form>
      </Modal>

      {confirmDialog}
    </>
  );
};
