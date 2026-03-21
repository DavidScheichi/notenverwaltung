import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export const AppShell = () => {
  const { isAuthenticated, isLoading, signOut, session } = useAuth();

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Lade Sitzung...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-slate-50/80 p-6 lg:block">
          <div className="flex h-full flex-col">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Notenverwaltung
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">Lehrerbereich</h1>
              <p className="mt-1 text-sm text-slate-500">{session?.user.email}</p>
            </div>
            <nav className="mt-8 grid gap-2">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive ? "button-primary justify-start" : "button-secondary justify-start"
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/students"
                className={({ isActive }) =>
                  isActive ? "button-primary justify-start" : "button-secondary justify-start"
                }
              >
                Schüler
              </NavLink>
              <NavLink
                to="/subjects"
                className={({ isActive }) =>
                  isActive ? "button-primary justify-start" : "button-secondary justify-start"
                }
              >
                Fächer
              </NavLink>
            </nav>
            <div className="mt-auto">
              <button type="button" onClick={() => void signOut()} className="button-danger w-full">
                Logout
              </button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm lg:hidden">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                  Notenverwaltung
                </p>
                <p className="mt-1 text-sm text-slate-500">{session?.user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    isActive ? "button-primary" : "button-secondary"
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/students"
                  className={({ isActive }) =>
                    isActive ? "button-primary" : "button-secondary"
                  }
                >
                  Schüler
                </NavLink>
                <NavLink
                  to="/subjects"
                  className={({ isActive }) =>
                    isActive ? "button-primary" : "button-secondary"
                  }
                >
                  Fächer
                </NavLink>
                <button type="button" onClick={() => void signOut()} className="button-danger">
                  Logout
                </button>
              </div>
            </header>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
