import type { AssessmentResultStatus } from "../../lib/supabase/types";

export const STATUS_META: Record<
  AssessmentResultStatus,
  { symbol: string; label: string; textClass: string }
> = {
  filled: { symbol: "", label: "Eingetragen", textClass: "text-ink" },
  missing: { symbol: "—", label: "Fehlt", textClass: "text-ink-3 font-semibold" },
  excused: { symbol: "E", label: "Entschuldigt", textClass: "text-amber-700 font-semibold" },
  absent_unexcused: {
    symbol: "U",
    label: "Unentschuldigt",
    textClass: "text-rose-700 font-semibold",
  },
  makeup_pending: {
    symbol: "N",
    label: "Nachtrag offen",
    textClass: "text-indigo-700 font-semibold",
  },
  exempt: { symbol: "B", label: "Befreit", textClass: "text-amber-700 font-semibold" },
};

export const STATUS_ORDER: AssessmentResultStatus[] = [
  "filled",
  "missing",
  "excused",
  "absent_unexcused",
  "makeup_pending",
  "exempt",
];

export const STATUS_OPTIONS = STATUS_ORDER.map((value) => ({
  value,
  label: STATUS_META[value].label,
}));
