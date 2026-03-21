import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
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
      <section className="panel">
        <Link to={`/classes/${classId}/subjects/${subjectId}`} className="text-sm font-medium text-brand-700">
          ← Zurück zur Fächerübersicht
        </Link>
        <div className="mt-3">
          <p className="text-sm text-slate-500">
            {classQuery.data?.name ?? "Klasse"} · {subjectQuery.data?.name ?? "Fach"}
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            {definition?.name ?? "Leistungsnachweis"}
          </h2>
        </div>
        {matrixQuery.error ? (
          <div className="mt-3">
            <ErrorState message={matrixQuery.error.message} />
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel">
          <p className="text-sm text-slate-500">Durchschnitt</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.average === null ? "-" : stats.average.toFixed(2)}
          </p>
        </div>
        <div className="panel">
          <p className="text-sm text-slate-500">Minimum</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.min === null ? "-" : stats.min.toFixed(2)}
          </p>
        </div>
        <div className="panel">
          <p className="text-sm text-slate-500">Maximum</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.max === null ? "-" : stats.max.toFixed(2)}
          </p>
        </div>
        <div className="panel">
          <p className="text-sm text-slate-500">Eingetragen</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.count}</p>
        </div>
      </section>

      <section className="panel overflow-hidden p-0">
        {!definition ? (
          <div className="p-5">
            <EmptyState
              title="Leistungsnachweis nicht gefunden"
              description="Prüfe die URL oder lege zuerst einen Leistungsnachweis an."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Schüler</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Wert</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Prozent</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Berechnete Note</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left">Rang</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.student.id}>
                    <td className="border-b border-slate-100 px-4 py-3 font-medium">
                      {entry.student.first_name} {entry.student.last_name}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      {entry.result?.points !== null && entry.result?.points !== undefined
                        ? entry.result.points
                        : entry.result?.grade ?? "-"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      {entry.percent === null ? "-" : `${entry.percent.toFixed(1)} %`}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      {entry.percent === null ? "-" : entry.calculatedGrade ?? "-"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      {entry.rank ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
