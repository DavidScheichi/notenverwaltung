import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning" | "undoable";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  onUndo?: () => void | Promise<void>;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  undoable: (message: string, onUndo: () => void | Promise<void>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const defaultDuration: Record<ToastType, number> = {
  success: 2800,
  info: 2800,
  warning: 4200,
  error: 5200,
  undoable: 7000,
};

const toneClass: Record<ToastType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
  undoable: "border-line-strong bg-surface text-ink",
};

const toneSymbol: Record<ToastType, string> = {
  success: "✓",
  info: "i",
  warning: "!",
  error: "!",
  undoable: "↩",
};

const toneBadge: Record<ToastType, string> = {
  success: "bg-emerald-600 text-white",
  info: "bg-sky-600 text-white",
  warning: "bg-amber-500 text-white",
  error: "bg-rose-600 text-white",
  undoable: "bg-ink text-white",
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type: ToastType, message: string, onUndo?: () => void | Promise<void>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const next: ToastItem = {
        id,
        type,
        message,
        duration: defaultDuration[type],
        onUndo,
      };

      setToasts((prev) => [...prev, next].slice(-5));
      const timer = window.setTimeout(() => {
        dismiss(id);
      }, next.duration);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const api = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
      warning: (message) => push("warning", message),
      undoable: (message, onUndo) => push("undoable", message, onUndo),
      dismiss,
    }),
    [dismiss, push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[100] flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl border px-4 py-3 shadow-overlay ${toneClass[toast.type]}`}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${toneBadge[toast.type]}`}
            >
              {toneSymbol[toast.type]}
            </span>

            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{toast.message}</p>

            {toast.type === "undoable" && toast.onUndo ? (
              <button
                type="button"
                className="btn-secondary btn-sm shrink-0"
                onClick={async () => {
                  try {
                    await toast.onUndo?.();
                  } catch {
                    push("error", "Rückgängig konnte nicht ausgeführt werden.");
                  } finally {
                    dismiss(toast.id);
                  }
                }}
              >
                Rückgängig
              </button>
            ) : null}

            <button
              type="button"
              aria-label="Meldung schließen"
              className="-mr-1 -mt-1 shrink-0 rounded p-1 text-lg leading-none opacity-60 transition hover:opacity-100"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast muss innerhalb von <ToastProvider> verwendet werden.");
  }

  return context;
};
