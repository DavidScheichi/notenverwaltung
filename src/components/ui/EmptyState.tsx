interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm text-slate-500">{description}</p>
    {actionLabel && onAction ? (
      <div className="mt-4">
        <button type="button" className="button-primary" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    ) : null}
  </div>
);
