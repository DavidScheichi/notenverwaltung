import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";

export type MenuItem =
  | {
      kind: "action";
      label: string;
      onSelect: () => void;
      tone?: "default" | "danger";
      disabled?: boolean;
    }
  | { kind: "link"; label: string; to: string }
  | { kind: "separator" }
  | { kind: "heading"; label: string };

interface MenuProps {
  items: MenuItem[];
  label?: string;
  align?: "left" | "right";
}

export const Menu = ({ items, label = "Weitere Aktionen", align = "right" }: MenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        className="btn-ghost btn-icon border border-transparent text-lg leading-none hover:border-line"
        onClick={() => setIsOpen((value) => !value)}
      >
        ⋯
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute z-40 mt-1 min-w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-overlay ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item, index) => {
            if (item.kind === "separator") {
              return <div key={`sep-${index}`} className="my-1 h-px bg-line" role="separator" />;
            }

            if (item.kind === "heading") {
              return (
                <p
                  key={`head-${index}`}
                  className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3"
                >
                  {item.label}
                </p>
              );
            }

            if (item.kind === "link") {
              return (
                <Link
                  key={`link-${item.to}-${index}`}
                  to={item.to}
                  role="menuitem"
                  className="block px-3 py-2 text-sm text-ink-2 hover:bg-sunken hover:text-ink"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={`action-${item.label}-${index}`}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={`block w-full px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  item.tone === "danger"
                    ? "text-rose-700 hover:bg-rose-50"
                    : "text-ink-2 hover:bg-sunken hover:text-ink"
                }`}
                onClick={() => {
                  setIsOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
