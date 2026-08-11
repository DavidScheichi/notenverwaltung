import { NavLink } from "react-router-dom";

const items = [
  { to: "/dashboard", label: "Übersicht", glyph: "◎" },
  { to: "/classes", label: "Klassen", glyph: "▦" },
  { to: "/students", label: "Schüler", glyph: "☺" },
  { to: "/subjects", label: "Fächer", glyph: "✎" },
];

export const BottomNav = () => (
  <nav
    aria-label="Hauptnavigation"
    className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
  >
    <ul className="grid grid-cols-4">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-1 py-2.5 text-[11px] font-medium transition ${
                isActive ? "text-accent-strong" : "text-ink-3 hover:text-ink"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-12 items-center justify-center rounded-full text-base transition ${
                    isActive ? "bg-accent-soft" : ""
                  }`}
                >
                  {item.glyph}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
