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
  undoable: "border-slate-300 bg-white text-slate-900",
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
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[92vw] max-w-sm flex-col gap-2 sm:w-96">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-3 py-2 shadow-sm ${toneClass[toast.type]}`}
          >
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm">{toast.message}</p>
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                onClick={() => dismiss(toast.id)}
              >
                Schließen
              </button>
            </div>
            {toast.type === "undoable" && toast.onUndo ? (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
              </div>
            ) : null}
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
