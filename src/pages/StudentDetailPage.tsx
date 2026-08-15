import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { GradeBadge } from "../components/ui/GradeBadge";
import { PageHeader } from "../components/ui/PageHeader";
import { useStudentAssessmentOverview } from "../hooks/useAssessmentDefinitions";
import { useClassById } from "../hooks/useClasses";
import { useStudentById } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { useSchoolYear } from "../components/layout/SchoolYearContext";
import {
  calculateAssessmentPercent,
  gradeFromPercent,
  resolveGradeBoundaries,
} from "../lib/subjectOverview";
import { formatDate } from "../lib/utils";

const LoadingRows = () => (
  <div className="space-y-3">
    <div className="h-14 animate-pulse rounded-xl bg-sunken" />
    <div className="h-14 animate-pulse rounded-xl bg-sunken" />
  </div>
);

export const StudentDetailPage = () => {
  const { classId: classIdParam, studentId = "" } = useParams();
  const { selectedSchoolYear } = useSchoolYear();
  const studentQuery = useStudentById(studentId, selectedSchoolYear?.id);
  const derivedClassId = classIdParam ?? studentQuery.data?.enrollments[0]?.class_id ?? "";
  const classQuery = useClassById(derivedClassId);
  const subjectsQuery = useSubjects(derivedClassId);
  const subjectIds = useMemo(
    () => (subjectsQuery.data ?? []).map((subject) => subject.id),
    [subjectsQuery.data],
  );
  const assessmentOverviewQuery = useStudentAssessmentOverview(subjectIds, studentId);

  const groupedBySubject = useMemo(() => {
    return (subjectsQuery.data ?? []).map((subject) => {
      const definitions = (assessmentOverviewQuery.data?.definitions ?? []).filter(
        (definition) => definition.subject_id === subject.id,
      );
      const entries = definitions.map((definition) => {
        const result = (assessmentOverviewQuery.data?.results ?? []).find(
          (assessment) =>
            assessment.assessment_definition_id === definition.id &&
            assessment.student_id === studentId,
        );

        return {
          definition,
          result,
        };
      })
        .filter((entry) => Boolean(entry.result))
        .sort((a, b) => {
          const left = a.definition.assessment_date ?? a.definition.created_at;
          const right = b.definition.assessment_date ?? b.definition.created_at;

          return new Date(right).getTime() - new Date(left).getTime();
        })
        .slice(0, 10);

      return {
        subject,
        entries,
      };
    });
  }, [assessmentOverviewQuery.data?.definitions, assessmentOverviewQuery.data?.results, studentId, subjectsQuery.data]);

  return (
    <>
      <PageHeader
        breadcrumbs={
          classIdParam
            ? [
                { label: "Klassen", to: "/classes" },
                { label: classQuery.data?.name ?? "Klasse", to: `/classes/${derivedClassId}` },
                { label: `${studentQuery.data?.first_name ?? ""} ${studentQuery.data?.last_name ?? ""}`.trim() || "Schüler" },
              ]
            : [
                { label: "Schüler", to: "/students" },
                { label: `${studentQuery.data?.first_name ?? ""} ${studentQuery.data?.last_name ?? ""}`.trim() || "Schüler" },
              ]
        }
        eyebrow={classQuery.data?.name ?? "Klasse"}
        title={`${studentQuery.data?.first_name ?? ""} ${studentQuery.data?.last_name ?? ""}`.trim() || "Schüler"}
        description={studentQuery.data?.notes || undefined}
        actions={
          <Link to={`/students/${studentId}/print`} className="btn-secondary btn-sm">
            Zeugnis drucken
          </Link>
        }
      />

      {assessmentOverviewQuery.error ? (
        <ErrorState message={assessmentOverviewQuery.error.message} />
      ) : studentQuery.isLoading || subjectsQuery.isLoading || assessmentOverviewQuery.isLoading ? (
        <LoadingRows />
      ) : groupedBySubject.length === 0 ? (
        <EmptyState
          title="Noch keine Fächer"
          description="Lege in der Klasse zuerst Fächer an, damit hier Ergebnisse erscheinen."
        />
      ) : (
        <div className="space-y-4">
          {groupedBySubject.map(({ subject, entries }) => (
            <section key={subject.id} className="card-raised overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
                <h2 className="text-base font-semibold text-ink">{subject.name}</h2>
                <Link
                  to={`/classes/${derivedClassId}/subjects/${subject.id}`}
                  className="btn-ghost btn-sm"
                >
                  Zur Notenübersicht
                </Link>
              </div>

              {entries.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-ink-3">
                  Noch keine Ergebnisse in diesem Fach.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {entries.map((entry) => {
                    const displayGrade =
                      entry.result?.grade !== null && entry.result?.grade !== undefined
                        ? entry.result.grade
                        : gradeFromPercent(
                            calculateAssessmentPercent(
                              entry.result?.points ?? null,
                              entry.definition.max_points,
                            ),
                            resolveGradeBoundaries(
                              assessmentOverviewQuery.data?.boundaries ?? [],
                              subject.id,
                            ),
                          );

                    return (
                      <div
                        key={entry.definition.id}
                        className="flex items-start justify-between gap-4 px-5 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {entry.definition.name}
                          </p>
                          <p className="mt-0.5 text-[13px] text-ink-3">
                            {entry.definition.assessment_date
                              ? formatDate(entry.definition.assessment_date)
                              : "Ohne Datum"}
                            {entry.result?.points !== null && entry.result?.points !== undefined
                              ? ` · ${entry.result.points} Punkte`
                              : ""}
                          </p>
                          {entry.result?.comment ? (
                            <p className="mt-1 text-[13px] text-ink-2">{entry.result.comment}</p>
                          ) : null}
                        </div>
                        <GradeBadge grade={displayGrade} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
};
