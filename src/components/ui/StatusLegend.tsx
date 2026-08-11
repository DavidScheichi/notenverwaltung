import { STATUS_META, STATUS_ORDER } from "./statusMeta";

export const StatusLegend = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-3">
    <span className="font-medium text-ink-2">Kürzel:</span>
    {STATUS_ORDER.filter((status) => STATUS_META[status].symbol !== "").map((status) => (
      <span key={status} className="flex items-center gap-1.5">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded border border-line bg-sunken text-xs ${STATUS_META[status].textClass}`}
        >
          {STATUS_META[status].symbol}
        </span>
        {STATUS_META[status].label}
      </span>
    ))}
  </div>
);
