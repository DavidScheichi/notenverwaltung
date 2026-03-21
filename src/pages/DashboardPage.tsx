import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { useClasses } from "../hooks/useClasses";
import { useAllStudents } from "../hooks/useStudents";
import { useAllSubjects } from "../hooks/useSubjects";
import { supabase } from "../lib/supabase/client";
import { formatDate } from "../lib/utils";
import type { AssessmentDefinition, AssessmentResult } from "../lib/supabase/types";
import { classSchema } from "../schemas/classes";

const SkeletonCard = () => <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />;

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: classes, isLoading: classesLoading, error: classesError, createClass } = useClasses();
  const { data: students, isLoading: studentsLoading, error: studentsError } = useAllStudents();
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
      setNewName("");
      setIsCreateOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Klasse konnte nicht angelegt werden.",
      );
    }
  };

  const anyError = classesError || studentsError || subjectsError || resultsMetaQuery.error || recentDefinitionsQuery.error;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">Übersicht über Ihre Klassen und Noten</p>
        </div>
        <button type="button" className="button-primary" onClick={() => setIsCreateOpen((value) => !value)}>
          + Neue Klasse
        </button>
      </section>

      {isCreateOpen ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Neue Klasse anlegen</h2>
              <p className="mt-1 text-sm text-slate-500">
                Lege eine neue Klasse an und öffne sie danach direkt aus der Übersicht.
              </p>
            </div>
          </div>
          <form className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleCreate}>
            <input
              className="field"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="z. B. 10A"
            />
            <button type="submit" className="button-primary" disabled={createClass.isPending}>
              {createClass.isPending ? "Wird gespeichert..." : "Klasse speichern"}
            </button>
          </form>
          {formError ? <div className="mt-3"><ErrorState message={formError} /></div> : null}
        </section>
      ) : null}

      {anyError ? <ErrorState message={anyError.message} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {classesLoading || studentsLoading || subjectsLoading || resultsMetaQuery.isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Schüler gesamt</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{students?.length ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Fächer</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{subjects?.length ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Noten eingetragen</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {resultsMetaQuery.data?.totalCount ?? 0}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Klassen</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{classes?.length ?? 0}</p>
            </div>
          </>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Klassenübersicht</h2>
              <p className="mt-1 text-sm text-slate-500">Alle Klassen mit den wichtigsten Kennzahlen</p>
            </div>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
              {classes?.length ?? 0} Klassen
            </span>
          </div>

          {classesLoading ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : !classes || classes.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="Noch keine Klassen"
                description="Lege deine erste Klasse direkt über den Button oben an."
                actionLabel="+ Neue Klasse"
                onAction={() => setIsCreateOpen(true)}
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {classes.map((schoolClass) => (
                <article
                  key={schoolClass.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{schoolClass.name}</p>
                      <p className="mt-1 text-sm text-slate-500">Klasse</p>
                    </div>
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                      {classStats.studentCounts.get(schoolClass.id) ?? 0} Schüler
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <span>{classStats.subjectCounts.get(schoolClass.id) ?? 0} Fächer</span>
                    <Link to={`/classes/${schoolClass.id}`} className="button-secondary">
                      Öffnen
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Kürzlich eingetragene Noten</h2>
              <p className="mt-1 text-sm text-slate-500">Die zuletzt aktualisierten Einträge</p>
            </div>
          </div>

          {resultsMetaQuery.isLoading || recentDefinitionsQuery.isLoading ? (
            <div className="mt-5 grid gap-3">
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : recentItems.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="Noch keine Einträge"
                description="Sobald Leistungsnachweise bewertet wurden, erscheinen sie hier."
                actionLabel="Zu den Fächern"
                onAction={() => navigate("/subjects")}
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {recentItems.map(({ result, definition, student, subject }) => (
                <Link
                  key={result.id}
                  to={student ? `/students/${student.id}` : "/students"}
                  className="rounded-2xl border border-slate-200 p-4 transition hover:border-brand-500 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {student ? `${student.first_name} ${student.last_name}` : "Unbekannter Schüler"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {subject?.name ?? "Unbekanntes Fach"} · {definition?.name ?? "Leistungsnachweis"}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                      {result.points !== null ? result.points : result.grade ?? "-"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                    Aktualisiert {formatDate(result.updated_at)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
