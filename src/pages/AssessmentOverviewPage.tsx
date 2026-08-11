import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { GradeBadge } from "../components/ui/GradeBadge";
import { PageHeader } from "../components/ui/PageHeader";
import { useSubjectAssessmentData } from "../hooks/useAssessmentDefinitions";
import { useClassById } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useSubjectById } from "../hooks/useSubjects";
import {
  calculateAssessmentPercent,
  gradeFromPercent,
  resolveGradeBoundaries,
} from "../lib/subjectOverview";

export const AssessmentOverviewPage = () => {
  const { classId = "", subjectId = "", assessmentId = "" } = useParams();
  const classQuery = useClassById(classId);
  const subjectQuery = useSubjectById(subjectId);
  const studentsQuery = useStudents(classId);
  const matrixQuery = useSubjectAssessmentData(subjectId);

  const definition = (matrixQuery.data?.definitions ?? []).find(
    (entry) => entry.id === assessmentId,
  );
  const boundaries = resolveGradeBoundaries(matrixQuery.data?.boundaries ?? [], subjectId);

  const rows = useMemo(() => {
    const baseRows = (studentsQuery.data ?? []).map((student) => {
      const result = (matrixQuery.data?.results ?? []).find(
        (entry) =>
          entry.assessment_definition_id === assessmentId && entry.student_id === student.id,
      );
      const percent = calculateAssessmentPercent(result?.points ?? null, definition?.max_points ?? null);
      const calculatedGrade = gradeFromPercent(percent, boundaries);

      return {
        student,
        result,
        percent,
        calculatedGrade,
      };
    });

    const ranked = baseRows
      .filter((entry) => entry.result?.points !== null && entry.result?.points !== undefined)
      .sort((a, b) => Number(b.result?.points ?? 0) - Number(a.result?.points ?? 0));

    const rankMap = new Map<string, number>();
    ranked.forEach((entry, index) => {
      rankMap.set(entry.student.id, index + 1);
    });

    return baseRows.map((entry) => ({
      ...entry,
      rank: rankMap.get(entry.student.id) ?? null,
    }));
  }, [assessmentId, boundaries, definition?.max_points, matrixQuery.data?.results, studentsQuery.data]);

  const stats = useMemo(() => {
    const points = rows
      .map((entry) => entry.result?.points)
      .filter((value): value is number => value !== null && value !== undefined)
      .map(Number);

    if (points.length === 0) {
      return { average: null, min: null, max: null, count: 0 };
    }

    return {
      average: points.reduce((sum, value) => sum + value, 0) / points.length,
      min: Math.min(...points),
      max: Math.max(...points),
      count: points.length,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Klassen", to: "/classes" },
          { label: classQuery.data?.name ?? "Klasse", to: `/classes/${classId}` },
          {
            label: subjectQuery.data?.name ?? "Fach",
            to: `/classes/${classId}/subjects/${subjectId}`,
          },
          { label: definition?.name ?? "Leistungsnachweis" },
        ]}
        eyebrow={`${classQuery.data?.name ?? "Klasse"} · ${subjectQuery.data?.name ?? "Fach"}`}
        title={definition?.name ?? "Leistungsnachweis"}
        stats={[
          { label: "Durchschnitt", value: stats.average === null ? "—" : stats.average.toFixed(2) },
          { label: "Minimum", value: stats.min === null ? "—" : stats.min.toFixed(2) },
          { label: "Maximum", value: stats.max === null ? "—" : stats.max.toFixed(2) },
          { label: "Eingetragen", value: stats.count },
        ]}
      />

      {matrixQuery.error ? (
        <ErrorState message={matrixQuery.error.message} />
      ) : !definition ? (
        <EmptyState
          title="Leistungsnachweis nicht gefunden"
          description="Prüfe die URL oder lege zuerst einen Leistungsnachweis an."
        />
      ) : (
        <section className="card-raised overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-sunken">
                <tr>
                  <th scope="col" className="border-b border-line px-4 py-3 text-left font-semibold text-ink-2">Schüler</th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-left font-semibold text-ink-2">Wert</th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-left font-semibold text-ink-2">Prozent</th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-left font-semibold text-ink-2">Note</th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-left font-semibold text-ink-2">Rang</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry, index) => (
                  <tr key={entry.student.id} className={index % 2 === 1 ? "bg-sunken/50" : undefined}>
                    <td className="border-b border-line px-4 py-3 font-medium text-ink">
                      {entry.student.first_name} {entry.student.last_name}
                    </td>
                    <td className="border-b border-line px-4 py-3 tabular-nums text-ink-2">
                      {entry.result?.points !== null && entry.result?.points !== undefined
                        ? entry.result.points
                        : entry.result?.grade ?? "—"}
                    </td>
                    <td className="border-b border-line px-4 py-3 tabular-nums text-ink-2">
                      {entry.percent === null ? "—" : `${entry.percent.toFixed(1)} %`}
                    </td>
                    <td className="border-b border-line px-4 py-3">
                      <GradeBadge grade={entry.percent === null ? null : entry.calculatedGrade} />
                    </td>
                    <td className="border-b border-line px-4 py-3 tabular-nums text-ink-3">
                      {entry.rank ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
