import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { useStudentAssessmentOverview } from "../hooks/useAssessmentDefinitions";
import { useClassById } from "../hooks/useClasses";
import { useStudentById } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import {
  calculateAssessmentPercent,
  gradeFromPercent,
  resolveGradeBoundaries,
} from "../lib/subjectOverview";
import { formatDate } from "../lib/utils";

export const StudentDetailPage = () => {
  const { classId: classIdParam, studentId = "" } = useParams();
  const studentQuery = useStudentById(studentId);
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
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="panel">
        <Link
          to={classIdParam ? `/classes/${derivedClassId}` : "/students"}
          className="text-sm font-medium text-brand-700"
        >
          ← {classIdParam ? "Zurück zur Klasse" : "Zurück zu den Schülern"}
        </Link>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">
          {studentQuery.data?.first_name} {studentQuery.data?.last_name}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Klasse: {classQuery.data?.name ?? "Wird geladen..."}
        </p>
        <p className="mt-3 text-sm text-slate-600">
          {studentQuery.data?.notes || "Keine Zusatznotiz vorhanden."}
        </p>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-lg font-semibold text-slate-900">Leistungsdetails</h3>
          <p className="mt-2 text-sm text-slate-600">
            Punkte und Noten werden in der Fächer-Notenübersicht pro Leistungsnachweis gepflegt und hier
            gesammelt angezeigt.
          </p>
        </div>
      </section>

      <section className="panel">
        <h3 className="text-lg font-semibold text-slate-900">Leistungsnachweise pro Fach</h3>
        {assessmentOverviewQuery.error ? (
          <div className="mt-4">
            <ErrorState message={assessmentOverviewQuery.error.message} />
          </div>
        ) : null}
        {groupedBySubject.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Keine Fächer angelegt"
              description="Lege zuerst in der Klasse Fächer an."
            />
          </div>
        ) : null}
        <div className="mt-4 grid gap-4">
          {groupedBySubject.map(({ subject, entries }) => (
            <div key={subject.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{subject.name}</p>
                  <p className="text-sm text-slate-500">Alle Leistungsnachweise dieses Fachs</p>
                </div>
              </div>

              {entries.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="Noch keine Einträge"
                    description="Trage Werte in der Notenübersicht dieses Fachs ein."
                  />
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {entries.map((entry) => (
                    <div
                      key={entry.definition.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {entry.definition.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {entry.definition.assessment_date
                          ? formatDate(entry.definition.assessment_date)
                          : "Ohne Datum"}
                        {" · "}
                        Punkte:{" "}
                        {entry.result?.points !== null && entry.result?.points !== undefined
                          ? entry.result.points
                          : "-"}
                        {" · "}
                        Note:{" "}
                        {(() => {
                          if (
                            entry.result?.grade !== null &&
                            entry.result?.grade !== undefined
                          ) {
                            return entry.result.grade;
                          }

                          const percent = calculateAssessmentPercent(
                            entry.result?.points ?? null,
                            entry.definition.max_points,
                          );
                          const boundaries = resolveGradeBoundaries(
                            assessmentOverviewQuery.data?.boundaries ?? [],
                            subject.id,
                          );

                          return gradeFromPercent(percent, boundaries) ?? "-";
                        })()}
                      </p>
                      {entry.result?.comment ? (
                        <p className="mt-1 text-sm text-slate-600">{entry.result.comment}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
