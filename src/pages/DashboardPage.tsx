import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field } from "../components/ui/Field";
import { GradeBadge } from "../components/ui/GradeBadge";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../components/ui/ToastProvider";
import { useSchoolYear } from "../components/layout/SchoolYearContext";
import { useClasses } from "../hooks/useClasses";
import { useAllStudents } from "../hooks/useStudents";
import { useAllSubjects } from "../hooks/useSubjects";
import { supabase } from "../lib/supabase/client";
import { formatDate } from "../lib/utils";
import type { AssessmentDefinition, AssessmentResult } from "../lib/supabase/types";
import { classSchema } from "../schemas/classes";

const SkeletonRow = () => <div className="h-16 animate-pulse rounded-xl bg-sunken" />;

export const DashboardPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { selectedSchoolYear } = useSchoolYear();
  const { data: classes, isLoading: classesLoading, error: classesError, createClass } =
    useClasses(selectedSchoolYear?.id);
  const { data: students, isLoading: studentsLoading, error: studentsError } =
    useAllStudents(selectedSchoolYear?.id);
  const { data: subjects, isLoading: subjectsLoading, error: subjectsError } = useAllSubjects();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const resultsMetaQuery = useQuery({
    queryKey: ["dashboard", "results-meta"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assessment_results")
        .select("id", { count: "exact", head: true });

      if (error) {
        throw error;
      }

      const { data: recentData, error: recentError } = await supabase
        .from("assessment_results")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(8);

      if (recentError) {
        throw recentError;
      }

      return {
        totalCount: count ?? 0,
        recentResults: (recentData ?? []) as AssessmentResult[],
      };
    },
  });

  const recentDefinitionIds = useMemo(
    () =>
      Array.from(
        new Set(
          (resultsMetaQuery.data?.recentResults ?? []).map(
            (result) => result.assessment_definition_id,
          ),
        ),
      ),
    [resultsMetaQuery.data?.recentResults],
  );

  const recentDefinitionsQuery = useQuery({
    queryKey: ["dashboard", "recent-definitions", recentDefinitionIds.join(",")],
    enabled: recentDefinitionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_definitions")
        .select("*")
        .in("id", recentDefinitionIds);

      if (error) {
        throw error;
      }

      return (data ?? []) as AssessmentDefinition[];
    },
  });

  const classStats = useMemo(() => {
    const studentCounts = new Map<string, number>();
    const subjectCounts = new Map<string, number>();

    for (const student of students ?? []) {
      const classId = student.enrollments[0]?.class_id;
      if (!classId) {
        continue;
      }

      studentCounts.set(classId, (studentCounts.get(classId) ?? 0) + 1);
    }

    for (const subject of subjects ?? []) {
      subjectCounts.set(subject.class_id, (subjectCounts.get(subject.class_id) ?? 0) + 1);
    }

    return {
      studentCounts,
      subjectCounts,
    };
  }, [students, subjects]);

  const recentItems = useMemo(() => {
    const definitionMap = new Map(
      (recentDefinitionsQuery.data ?? []).map((definition) => [definition.id, definition]),
    );
    const studentMap = new Map((students ?? []).map((student) => [student.id, student]));
    const subjectMap = new Map((subjects ?? []).map((subject) => [subject.id, subject]));

    return (resultsMetaQuery.data?.recentResults ?? []).map((result) => {
      const definition = definitionMap.get(result.assessment_definition_id);
      const student = studentMap.get(result.student_id);
      const subject = definition ? subjectMap.get(definition.subject_id) : undefined;

      return {
        result,
        definition,
        student,
        subject,
      };
    });
  }, [recentDefinitionsQuery.data, resultsMetaQuery.data?.recentResults, students, subjects]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = classSchema.safeParse({ name: newName });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Bitte einen gültigen Klassennamen eingeben.");
      return;
    }

    try {
      await createClass.mutateAsync(parsed.data.name);
      toast.success("Klasse wurde angelegt.");
      setNewName("");
      setIsCreateOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Klasse konnte nicht angelegt werden.",
      );
    }
  };

  const classesSectionError = classesError;
  const recentSectionError = resultsMetaQuery.error || recentDefinitionsQuery.error;
  const anyError = studentsError || subjectsError;

  return (
    <>
      <PageHeader
        title="Übersicht"
        description="Deine Klassen und die zuletzt eingetragenen Noten auf einen Blick."
        stats={
          classesLoading || studentsLoading || subjectsLoading || resultsMetaQuery.isLoading
            ? undefined
            : [
                { label: "Klassen", value: classes?.length ?? 0 },
                { label: "Schüler", value: students?.length ?? 0 },
                { label: "Fächer", value: subjects?.length ?? 0 },
                { label: "Noten eingetragen", value: resultsMetaQuery.data?.totalCount ?? 0 },
              ]
        }
        actions={
          <button type="button" className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            Neue Klasse
          </button>
        }
      />

      {anyError ? <ErrorState message={anyError.message} /> : null}

      <section className="card-raised overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Klassen</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">Öffne eine Klasse, um Schüler und Fächer zu bearbeiten.</p>
          </div>
          <Link to="/classes" className="btn-ghost btn-sm">
            Alle ansehen
          </Link>
        </div>

        {classesSectionError ? (
          <div className="p-5">
            <ErrorState message={classesSectionError.message} />
          </div>
        ) : classesLoading ? (
          <div className="space-y-3 p-5">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : !classes || classes.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Noch keine Klassen"
              description="Lege deine erste Klasse an, um mit der Notenverwaltung zu starten."
              actionLabel="Neue Klasse"
              onAction={() => setIsCreateOpen(true)}
            />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {classes.map((schoolClass) => (
              <Link
                key={schoolClass.id}
                to={`/classes/${schoolClass.id}`}
                className="row-hover flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-ink">{schoolClass.name}</p>
                  <p className="mt-0.5 text-[13px] text-ink-3">
                    {classStats.studentCounts.get(schoolClass.id) ?? 0} Schüler ·{" "}
                    {classStats.subjectCounts.get(schoolClass.id) ?? 0} Fächer
                  </p>
                </div>
                <span aria-hidden="true" className="shrink-0 text-ink-3">
                  ›
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card-raised overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Zuletzt eingetragen</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">Die acht zuletzt aktualisierten Ergebnisse.</p>
        </div>

        {recentSectionError ? (
          <div className="p-5">
            <ErrorState message={recentSectionError.message} />
          </div>
        ) : resultsMetaQuery.isLoading || recentDefinitionsQuery.isLoading ? (
          <div className="space-y-3 p-5">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : recentItems.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Noch keine Einträge"
              description="Sobald du Leistungsnachweise bewertest, erscheinen sie hier."
              actionLabel="Zu den Fächern"
              onAction={() => navigate("/subjects")}
            />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {recentItems.map(({ result, definition, student, subject }) => (
              <Link
                key={result.id}
                to={student ? `/students/${student.id}` : "/students"}
                className="row-hover flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {student ? `${student.first_name} ${student.last_name}` : "Unbekannter Schüler"}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-ink-3">
                    {subject?.name ?? "Unbekanntes Fach"} · {definition?.name ?? "Leistungsnachweis"} ·{" "}
                    {formatDate(result.updated_at)}
                  </p>
                </div>
                {result.grade !== null ? (
                  <GradeBadge grade={result.grade} />
                ) : (
                  <span className="badge-neutral tabular-nums">
                    {result.points !== null ? `${result.points} P` : "—"}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setFormError(null);
        }}
        title="Neue Klasse anlegen"
        description="Der Name erscheint überall dort, wo du die Klasse auswählst."
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setFormError(null);
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              form="dashboard-class-form"
              className="btn-primary"
              disabled={createClass.isPending}
            >
              {createClass.isPending ? "Wird gespeichert..." : "Klasse anlegen"}
            </button>
          </>
        }
      >
        <form id="dashboard-class-form" className="space-y-4" onSubmit={handleCreate}>
          <Field label="Klassenname" htmlFor="dashboard-class-name" hint="Zum Beispiel 4B oder 2AHIF.">
            <input
              id="dashboard-class-name"
              className={formError ? "field field-error" : "field"}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="4B"
            />
          </Field>
          {formError ? <ErrorState message={formError} /> : null}
        </form>
      </Modal>
    </>
  );
};
