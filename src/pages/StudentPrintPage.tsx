import { useEffect, useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useClassById } from "../hooks/useClasses";
import { useStudentById } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { useStudentAssessmentOverview } from "../hooks/useAssessmentDefinitions";
import { GradeBadge } from "../components/ui/GradeBadge";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";
import {
  calculateSubjectTotals,
  gradeFromPercent,
  resolveGradeBoundaries,
} from "../lib/subjectOverview";
import { formatDate } from "../lib/utils";

export const StudentPrintPage = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { studentId = "" } = useParams();
  const navigate = useNavigate();

  const studentQuery = useStudentById(studentId);
  const derivedClassId = studentQuery.data?.enrollments[0]?.class_id ?? "";
  const classQuery = useClassById(derivedClassId);
  const subjectsQuery = useSubjects(derivedClassId);
  const subjectIds = useMemo(
    () => (subjectsQuery.data ?? []).map((subject) => subject.id),
    [subjectsQuery.data],
  );
  const assessmentOverviewQuery = useStudentAssessmentOverview(subjectIds, studentId);

  const subjectGrades = useMemo(() => {
    return (subjectsQuery.data ?? []).map((subject) => {
      const definitions = (assessmentOverviewQuery.data?.definitions ?? []).filter(
        (definition) => definition.subject_id === subject.id,
      );
      const rowResults = (assessmentOverviewQuery.data?.results ?? []).filter(
        (result) =>
          definitions.some((definition) => definition.id === result.assessment_definition_id) &&
          result.student_id === studentId,
      );
      const totals = calculateSubjectTotals(definitions, rowResults);
      const boundaries = resolveGradeBoundaries(
        assessmentOverviewQuery.data?.boundaries ?? [],
        subject.id,
      );
      const finalGrade = gradeFromPercent(totals.percent, boundaries);

      return { subject, finalGrade };
    });
  }, [
    assessmentOverviewQuery.data?.definitions,
    assessmentOverviewQuery.data?.results,
    assessmentOverviewQuery.data?.boundaries,
    studentId,
    subjectsQuery.data,
  ]);

  const studentName =
    `${studentQuery.data?.first_name ?? ""} ${studentQuery.data?.last_name ?? ""}`.trim() ||
    "Schüler";

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `Zeugnis ${studentName}`;
    return () => {
      document.title = previousTitle;
    };
  }, [studentName]);

  if (!isAuthLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (
    isAuthLoading ||
    studentQuery.isLoading ||
    subjectsQuery.isLoading ||
    assessmentOverviewQuery.isLoading
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-ink-3">Wird geladen...</p>
      </div>
    );
  }

  const queryError = studentQuery.error ?? subjectsQuery.error ?? assessmentOverviewQuery.error;

  if (queryError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <ErrorState message={queryError.message} />
      </div>
    );
  }

  if (subjectGrades.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <EmptyState
          title="Kein Zeugnis möglich"
          description="Für diesen Schüler gibt es keine Fächer oder Noten, aus denen ein Zeugnis erstellt werden kann."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="print:hidden mb-6 flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary btn-sm">
          Zurück
        </button>
        <button type="button" onClick={() => window.print()} className="btn-primary btn-sm">
          Drucken
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">{studentName}</h1>
        <p className="mt-1 text-sm text-ink-3">
          {classQuery.data?.name ?? "Klasse"} · {formatDate(new Date().toISOString())}
        </p>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-ink-3">
            <th className="py-2 font-medium">Fach</th>
            <th className="py-2 text-right font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {subjectGrades.map(({ subject, finalGrade }) => (
            <tr key={subject.id} className="border-b border-line">
              <td className="py-2.5 text-ink">{subject.name}</td>
              <td className="py-2.5 text-right">
                <GradeBadge grade={finalGrade} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
