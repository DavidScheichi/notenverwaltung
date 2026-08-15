import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useClasses } from "../../hooks/useClasses";
import { AccountMenu } from "./AccountMenu";
import { BottomNav } from "./BottomNav";
import { SchoolYearProvider, useSchoolYear } from "./SchoolYearContext";
import { SchoolYearSwitcher } from "./SchoolYearSwitcher";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-accent-soft text-accent-strong before:absolute before:inset-y-1.5 before:-left-2 before:w-1 before:rounded-full before:bg-accent"
      : "text-ink-2 hover:bg-sunken hover:text-ink"
  }`;

const AppShellInner = ({ email }: { email: string }) => {
  const { selectedSchoolYear } = useSchoolYear();
  const classesQuery = useClasses(selectedSchoolYear?.id);
  const classes = classesQuery.data ?? [];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white"
            >
              N
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink">Notenverwaltung</span>
          </NavLink>
          <div className="flex items-center gap-3">
            <SchoolYearSwitcher />
            <AccountMenu email={email} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-line px-4 py-6 lg:block">
          <nav aria-label="Hauptnavigation" className="space-y-1">
            <NavLink to="/dashboard" className={navItemClass}>
              Übersicht
            </NavLink>
            <NavLink to="/classes" end className={navItemClass}>
              Klassen
            </NavLink>

            {classes.length > 0 ? (
              <ul className="mb-1 ml-3 space-y-0.5 border-l border-line pl-3">
                {classes.map((schoolClass) => (
                  <li key={schoolClass.id}>
                    <NavLink
                      to={`/classes/${schoolClass.id}`}
                      className={({ isActive }) =>
                        `block truncate rounded-md px-2.5 py-1.5 text-[13px] transition ${
                          isActive
                            ? "bg-sunken font-semibold text-ink"
                            : "text-ink-3 hover:bg-sunken hover:text-ink"
                        }`
                      }
                    >
                      {schoolClass.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            ) : null}

            <NavLink to="/students" className={navItemClass}>
              Schüler
            </NavLink>
            <NavLink to="/subjects" className={navItemClass}>
              Fächer
            </NavLink>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-5xl space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
};

export const AppShell = () => {
  const { isAuthenticated, isLoading, session } = useAuth();
  const classesQuery = useClasses();

  if (isLoading || classesQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-ink-3">Sitzung wird geladen...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Ableitung "braucht Onboarding" aus 0 Klassen (keine eigene Spalte, siehe
  // docs/superpowers/specs/2026-08-14-signup-onboarding-design.md). Kann nicht
  // zwischen "nie eine Klasse gehabt" und "letzte Klasse gerade gelöscht"
  // unterscheiden — relevant, sobald deleteClass an die UI angebunden wird.
  if (classesQuery.isSuccess && classesQuery.data.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  const email = session?.user.email ?? "";

  return (
    <SchoolYearProvider>
      <AppShellInner email={email} />
    </SchoolYearProvider>
  );
};
