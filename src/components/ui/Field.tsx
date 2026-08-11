import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export const Field = ({ label, htmlFor, hint, error, children }: FieldProps) => (
  <div className="space-y-1.5">
    <label className="label" htmlFor={htmlFor}>
      {label}
    </label>
    {children}
    {error ? (
      <p className="text-[13px] font-medium text-rose-700">{error}</p>
    ) : hint ? (
      <p className="hint">{hint}</p>
    ) : null}
  </div>
);
