interface GradeBadgeProps {
  grade: number | null | undefined;
  fallback?: string;
}

const toneClass = (grade: number) => {
  const rounded = Math.min(5, Math.max(1, Math.round(grade)));
  return `grade-${rounded}`;
};

const formatGrade = (grade: number) =>
  Number.isInteger(grade) ? String(grade) : grade.toFixed(1).replace(".", ",");

export const GradeBadge = ({ grade, fallback = "—" }: GradeBadgeProps) => {
  if (grade === null || grade === undefined || !Number.isFinite(grade)) {
    return <span className="grade-badge grade-none">{fallback}</span>;
  }

  return <span className={`grade-badge ${toneClass(grade)}`}>{formatGrade(grade)}</span>;
};
