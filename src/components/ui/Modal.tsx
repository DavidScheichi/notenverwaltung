import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  children: ReactNode;
}

const sizeClass: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Module-level state for stacked modals
let savedOverflow: string | null = null;
let modalIdCounter = 0;
const openModalIds: number[] = [];

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
}: ModalProps) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  const modalIdRef = useRef<number | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Assign modal ID and add to stack
    modalIdRef.current = ++modalIdCounter;

    // Manage scroll lock: only lock on first modal
    if (openModalIds.length === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    openModalIds.push(modalIdRef.current);

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const target = panel.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panel).focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Only close if this is the topmost modal
        if (modalIdRef.current === openModalIds[openModalIds.length - 1]) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);

      // Remove from modal stack
      const index = openModalIds.indexOf(modalIdRef.current!);
      if (index > -1) {
        openModalIds.splice(index, 1);
      }

      // Manage scroll lock: unlock only when last modal closes
      if (openModalIds.length === 0) {
        if (savedOverflow !== null) {
          document.body.style.overflow = savedOverflow;
        }
        savedOverflow = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-overlay-in items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`flex max-h-[92vh] w-full animate-sheet-in flex-col rounded-t-3xl bg-surface shadow-overlay outline-none sm:rounded-2xl ${sizeClass[size]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-1 hint">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Dialog schließen"
            className="btn-ghost btn-icon -mr-2 -mt-1 text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};
