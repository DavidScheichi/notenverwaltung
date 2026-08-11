import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export const Breadcrumbs = ({ items }: { items: BreadcrumbItem[] }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Brotkrumen">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.to && !isLast ? (
                <Link to={item.to} className="rounded hover:text-accent-strong hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium text-ink-2" : undefined}>{item.label}</span>
              )}
              {isLast ? null : <span aria-hidden="true">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
