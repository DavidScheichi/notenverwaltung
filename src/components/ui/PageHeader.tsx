import type { ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import type { BreadcrumbItem } from "./Breadcrumbs";

interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;
  title: string;
  description?: string;
  stats?: Array<{ label: string; value: ReactNode }>;
  actions?: ReactNode;
}

export const PageHeader = ({
  breadcrumbs,
  eyebrow,
  title,
  description,
  stats,
  actions,
}: PageHeaderProps) => (
  <header className="space-y-4">
    {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumbs items={breadcrumbs} /> : null}

    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-ink-3">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>

    {stats && stats.length > 0 ? (
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline gap-1.5">
            <dd className="text-base font-semibold tabular-nums text-ink">{stat.value}</dd>
            <dt className="text-[13px] text-ink-3">{stat.label}</dt>
          </div>
        ))}
      </dl>
    ) : null}
  </header>
);
