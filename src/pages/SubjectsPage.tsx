import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SubjectFormFields } from "../components/subjects/SubjectFormFields";
import type { SubjectFormValues } from "../components/subjects/SubjectFormFields";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field } from "../components/ui/Field";
import { Menu } from "../components/ui/Menu";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../components/ui/ToastProvider";
import { useConfirm } from "../components/ui/useConfirm";
import { useSchoolYear } from "../components/layout/SchoolYearContext";
import { useClasses } from "../hooks/useClasses";
import { useAllStudents } from "../hooks/useStudents";
import { useAllSubjects, useSubjects } from "../hooks/useSubjects";
import { supabase } from "../lib/supabase/client";
import type { AssessmentDefinition } from "../lib/supabase/types";
import { parsePointsMapping, subjectSchema } from "../schemas/subjects";

const LoadingRows = () => (
  <div className="space-y-3">
    <div className="h-14 animate-pulse rounded-xl bg-sunken" />
    <div className="h-14 animate-pulse rounded-xl bg-sunken" />
  </div>
);

export const SubjectsPage = () => {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const { selectedSchoolYear } = useSchoolYear();
  const classesQuery = useClasses(selectedSchoolYear?.id);
  const studentsQuery = useAllStudents(selectedSchoolYear?.id);
  const subjectsQuery = useAllSubjects();
  const subjectActions = useSubjects();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState<SubjectFormValues>({
    class_id: "",
    name: "",
    subject_type: "normal",
    grading_kind: "grade",
    average_mode: "mean",
    default_weight: "1",
    points_to_grade_raw: '{"90":1,"80":2,"65":3,"50":4,"0":5}',
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

  const filteredSubjects = useMemo(() => {
    return (subjectsQuery.data ?? []).filter((subject) => {
      const matchesSearch = subject.name.toLowerCase().includes(search.toLowerCase());
      const matchesClass = !classFilter || subject.class_id === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [classFilter, search, subjectsQuery.data]);

  const hasFilters = Boolean(search || classFilter);

  const handleCreateSubject = async (event: React.FormEvent<HTMLFormElement>) => {
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
        points_to_grade_raw: '{"90":1,"80":2,"65":3,"50":4,"0":5}',
      });
      setIsCreateOpen(false);
    } catch (error) {
      toast.error("Fach konnte nicht angelegt werden.");
      setCreateError(
        error instanceof Error ? error.message : "Fach konnte nicht angelegt werden.",
      );
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    setDeleteError(null);

    const confirmed = await confirm({
      title: `„${subjectName}" löschen?`,
      description:
        "Alle Leistungsnachweise und eingetragenen Ergebnisse dieses Fachs werden entfernt. Direkt danach kannst du die Aktion über „Rückgängig\" wiederherstellen.",
      confirmLabel: "Fach löschen",
    });

    if (!confirmed) {
      return;
    }

    try {
      const snapshot = await subjectActions.deleteSubject.mutateAsync(subjectId);
      toast.undoable("Fach gelöscht.", async () => {
        await subjectActions.restoreDeletedSubject.mutateAsync(snapshot);
        toast.success("Fach wurde wiederhergestellt.");
      });
    } catch (error) {
      toast.error("Fach konnte nicht gelöscht werden.");
      setDeleteError(
        error instanceof Error ? error.message : "Fach konnte nicht gelöscht werden.",
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Fächer"
        description="Alle Fächer über deine Klassen hinweg."
        stats={[{ label: "Fächer", value: subjectsQuery.data?.length ?? 0 }]}
        actions={
          <button type="button" className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            Neues Fach
          </button>
        }
      />

      <section className="card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <Field label="Suche" htmlFor="subject-search">
            <input
              id="subject-search"
              className="field"
              placeholder="Fachname"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Klasse" htmlFor="subject-class-filter">
            <select
              id="subject-class-filter"
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
              {filteredSubjects.length} von {subjectsQuery.data?.length ?? 0} Fächern
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

      {subjectsQuery.error ? (
        <ErrorState message={subjectsQuery.error.message} />
      ) : definitionsQuery.error ? (
        <ErrorState message={definitionsQuery.error.message} />
      ) : subjectsQuery.isLoading ? (
        <LoadingRows />
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Keine Treffer" : "Noch keine Fächer"}
          description={
            hasFilters
              ? "Passe Suche oder Klassenfilter an."
              : "Lege das erste Fach an, um Leistungsnachweise und Noten zu verwalten."
          }
          actionLabel={hasFilters ? undefined : "Neues Fach"}
          onAction={hasFilters ? undefined : () => setIsCreateOpen(true)}
        />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {filteredSubjects.map((subject) => {
            const studentCount = (studentsQuery.data ?? []).filter((student) =>
              student.enrollments.some((enrollment) => enrollment.class_id === subject.class_id),
            ).length;
            const assessmentCount = (definitionsQuery.data ?? []).filter(
              (entry) => entry.subject_id === subject.id,
            ).length;

            return (
              <article key={subject.id} className="card-raised group relative p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-base font-bold text-accent-strong"
                    >
                      {subject.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <Link
                        to={`/subjects/${subject.id}`}
                        className="block truncate text-base font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-accent-strong"
                      >
                        {subject.name}
                      </Link>
                      <p className="mt-0.5 text-[13px] text-ink-3">
                        Klasse {getClassName(subject.class_id)}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-10 shrink-0">
                    <Menu
                      items={[
                        { kind: "link", label: "Notenübersicht öffnen", to: `/subjects/${subject.id}` },
                        { kind: "separator" },
                        {
                          kind: "action",
                          label: "Fach löschen",
                          tone: "danger",
                          onSelect: () => void handleDeleteSubject(subject.id, subject.name),
                        },
                      ]}
                    />
                  </div>
                </div>

                <dl className="mt-4 flex items-center gap-5 border-t border-line pt-3 text-[13px]">
                  <div className="flex items-baseline gap-1.5">
                    <dd className="font-semibold tabular-nums text-ink">{studentCount}</dd>
                    <dt className="text-ink-3">Schüler</dt>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <dd className="font-semibold tabular-nums text-ink">{assessmentCount}</dd>
                    <dt className="text-ink-3">Leistungsnachweise</dt>
                  </div>
                </dl>
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
        title="Neues Fach anlegen"
        description="Lege fest, wie in diesem Fach bewertet wird."
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
              form="subject-create-form"
              className="btn-primary"
              disabled={subjectActions.createSubject.isPending}
            >
              {subjectActions.createSubject.isPending ? "Wird gespeichert..." : "Fach anlegen"}
            </button>
          </>
        }
      >
        <form id="subject-create-form" className="space-y-6" onSubmit={handleCreateSubject}>
          <SubjectFormFields
            values={subjectForm}
            onChange={setSubjectForm}
            classes={classesQuery.data ?? []}
            idPrefix="subjects-page"
          />
          {createError ? <ErrorState message={createError} /> : null}
        </form>
      </Modal>

      {confirmDialog}
    </>
  );
};
