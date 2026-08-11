interface GradeBadgeProps {
  grade: number | null | undefined;
  fallback?: string;
}

const TONE: Record<number, string> = {
  1: "grade-1",
  2: "grade-2",
  3: "grade-3",
  4: "grade-4",
  5: "grade-5",
};

const toneClass = (grade: number) => TONE[Math.min(5, Math.max(1, Math.round(grade)))];

const formatGrade = (grade: number) =>
  Number.isInteger(grade) ? String(grade) : grade.toFixed(1).replace(".", ",");

export const GradeBadge = ({ grade, fallback = "—" }: GradeBadgeProps) => {
  if (grade === null || grade === undefined || !Number.isFinite(grade)) {
    return <span className="grade-badge grade-none">{fallback}</span>;
  }

  return <span className={`grade-badge ${toneClass(grade)}`}>{formatGrade(grade)}</span>;
};
