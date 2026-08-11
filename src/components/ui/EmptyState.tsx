interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ title, description, actionLabel, onAction }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-sunken px-6 py-10 text-center">
    <div
      aria-hidden="true"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-lg text-ink-3"
    >
      +
    </div>
    <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 max-w-md text-sm text-ink-3">{description}</p>
    {actionLabel && onAction ? (
      <button type="button" className="btn-primary mt-5" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null}
  </div>
);
