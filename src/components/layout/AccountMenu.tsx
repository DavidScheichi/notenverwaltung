import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../ui/ToastProvider";

export const AccountMenu = ({ email }: { email: string }) => {
  const { signOut } = useAuth();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm font-medium text-ink-2 transition hover:bg-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden max-w-40 truncate sm:inline">{email}</span>
        <span aria-hidden="true" className="text-xs text-ink-3">
          ▾
        </span>
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-overlay"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Angemeldet als
            </p>
            <p className="mt-1 truncate text-sm font-medium text-ink">{email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-4 py-3 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            onClick={async () => {
              setIsOpen(false);
              try {
                await signOut();
              } catch {
                toast.error("Abmelden fehlgeschlagen. Bitte versuche es erneut.");
              }
            }}
          >
            Abmelden
          </button>
        </div>
      ) : null}
    </div>
  );
};
