interface ErrorStateProps {
  message: string;
}

export const ErrorState = ({ message }: ErrorStateProps) => (
  <div
    role="alert"
    className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
  >
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white"
    >
      !
    </span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-rose-900">Da ist etwas schiefgelaufen</p>
      <p className="mt-0.5 break-words text-sm text-rose-800">{message}</p>
    </div>
  </div>
);
