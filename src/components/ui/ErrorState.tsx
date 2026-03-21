interface ErrorStateProps {
  message: string;
}

export const ErrorState = ({ message }: ErrorStateProps) => (
  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
    {message}
  </div>
);

