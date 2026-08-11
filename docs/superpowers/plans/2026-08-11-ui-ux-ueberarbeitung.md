# UI/UX-Überarbeitung Notenverwaltung — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die bestehende Notenverwaltung optisch und in der Bedienführung überarbeiten, ohne Datenlogik anzufassen.

**Architecture:** Vier Schichten von unten nach oben — (1) Design-Tokens und Basisklassen in CSS/Tailwind, (2) wiederverwendbare UI-Bausteine in `src/components/ui/`, (3) Navigation im `AppShell`, (4) Seiten. Jede Schicht baut auf der darunterliegenden auf; die Reihenfolge der Tasks ist deshalb verbindlich.

**Tech Stack:** React 19, TypeScript, Vite 6, TailwindCSS 3.4, React Router 7, TanStack Query 5. Keine neuen Abhängigkeiten.

## Global Constraints

- **Unveränderlich:** `src/hooks/`, `src/lib/`, `src/schemas/`, `supabase/`, `package.json`. Keine neuen Laufzeit-Abhängigkeiten.
- **Props-Kompatibilität:** Bestehende Komponenten behalten ihre exportierten Prop-Signaturen (`EmptyState`, `ErrorState`, `StudentCreateModal`, `AssessmentCreateDrawer`, `GradeMatrix`, `GradeRow`, `GradeCell`, `SubjectMobileList`, `LoginForm`, `useToast`). Auch `export const GradeTable = GradeMatrix;` bleibt bestehen.
- **Tailwind-Config-Fallstrick:** `tailwind.config.ts` ist die Quelle, `tailwind.config.js` und `tailwind.config.d.ts` werden von `tsc -b` erzeugt und sind eingecheckt. Tailwind liest im Dev-Server die **`.js`**. Nach jeder Änderung an `tailwind.config.ts` muss `npm run build` laufen, damit die `.js` neu erzeugt wird — sonst greifen neue Farben im Dev-Server nicht. Beide Dateien werden gemeinsam committet.
- **Kein Testframework vorhanden.** Statt TDD gilt pro Task: `npm run build` muss fehlerfrei durchlaufen, danach die im Task genannte manuelle Prüfung im Dev-Server. Erst dann committen.
- **Sprache:** Alle sichtbaren Texte auf Deutsch, Du-Form (wie bisher). Umlaute ausgeschrieben.
- **Branch:** `ui-ux-ueberarbeitung`.
- **Commit-Nachrichten:** Deutsch, Imperativ, mit `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` als letzte Zeile.

## Dateistruktur

**Neu:**

| Datei | Verantwortung |
|---|---|
| `src/components/ui/Modal.tsx` | Basis-Dialog (Backdrop, ESC, Fokusfalle, Größen) |
| `src/components/ui/ConfirmDialog.tsx` | Bestätigung destruktiver Aktionen |
| `src/components/ui/useConfirm.tsx` | Promise-basierter Zugriff auf `ConfirmDialog` |
| `src/components/ui/Menu.tsx` | „⋯"-Overflow-Menü |
| `src/components/ui/Field.tsx` | Label + Control + Hinweis + Fehler |
| `src/components/ui/Breadcrumbs.tsx` | Pfadanzeige |
| `src/components/ui/PageHeader.tsx` | Einheitlicher Seitenkopf |
| `src/components/ui/GradeBadge.tsx` | Farbcodierte Note |
| `src/components/ui/statusMeta.ts` | Zentrale Status-Metadaten (Symbol, Label, Farbe) |
| `src/components/ui/StatusLegend.tsx` | Legende der Statuskürzel |
| `src/components/ui/PointsMappingEditor.tsx` | Zeilen-UI für Punkte-zu-Note |
| `src/components/layout/AccountMenu.tsx` | Konto-Menü in der Topbar |
| `src/components/layout/BottomNav.tsx` | Mobile Navigationsleiste |
| `src/components/subjects/SubjectFormFields.tsx` | Gemeinsame Felder des Fach-Formulars |
| `src/pages/ClassesPage.tsx` | Klassenübersicht als eigene Seite |

**Geändert:** `src/index.css`, `tailwind.config.ts`, `index.html`, `src/router.tsx`, `src/components/layout/AppShell.tsx`, `src/components/ui/{EmptyState,ErrorState,ToastProvider,StudentCreateModal}.tsx`, `src/components/grades/*`, `src/components/auth/LoginForm.tsx`, alle Dateien in `src/pages/`.

---

### Task 1: Design-Tokens, Basisklassen und Schrift

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/index.css` (vollständig ersetzen)
- Modify: `index.html:6-11`

**Interfaces:**
- Consumes: nichts
- Produces: Tailwind-Farben `canvas`, `surface`, `sunken`, `line`, `line-strong`, `ink`, `ink-2`, `ink-3`, `accent`, `accent-soft`, `accent-strong`, `accent-ring`; Schatten `card`, `overlay`; CSS-Komponentenklassen `.card`, `.card-raised`, `.card-pad`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-icon`, `.label`, `.hint`, `.field`, `.field-error`, `.badge-neutral`, `.badge-accent`, `.tab`, `.tab-active`, `.chip`, `.chip-active`, `.grade-badge`, `.grade-1` … `.grade-5`, `.grade-none`, `.row-hover`; Legacy-Aliase `.panel`, `.button-primary`, `.button-secondary`, `.button-danger` bleiben nutzbar.

- [ ] **Step 1: Tailwind-Config erweitern**

`tailwind.config.ts` vollständig ersetzen:

```ts
import type { Config } from "tailwindcss";

const withAlpha = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        canvas: withAlpha("--c-canvas"),
        surface: withAlpha("--c-surface"),
        sunken: withAlpha("--c-sunken"),
        line: withAlpha("--c-line"),
        "line-strong": withAlpha("--c-line-strong"),
        ink: withAlpha("--c-ink"),
        "ink-2": withAlpha("--c-ink-2"),
        "ink-3": withAlpha("--c-ink-3"),
        accent: withAlpha("--c-accent"),
        "accent-soft": withAlpha("--c-accent-soft"),
        "accent-strong": withAlpha("--c-accent-strong"),
        "accent-ring": withAlpha("--c-accent-ring"),
      },
      boxShadow: {
        panel: "0 20px 45px -25px rgba(15, 23, 42, 0.35)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -16px rgba(15, 23, 42, 0.18)",
        overlay: "0 24px 60px -20px rgba(15, 23, 42, 0.45)",
      },
      keyframes: {
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "sheet-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "toast-in": "toast-in 160ms ease-out",
        "overlay-in": "overlay-in 120ms ease-out",
        "sheet-in": "sheet-in 160ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: `src/index.css` vollständig ersetzen**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --c-canvas: 246 247 251;
  --c-surface: 255 255 255;
  --c-sunken: 248 250 252;
  --c-line: 226 232 240;
  --c-line-strong: 203 213 225;
  --c-ink: 15 23 42;
  --c-ink-2: 71 85 105;
  --c-ink-3: 100 116 139;
  --c-accent: 37 99 235;
  --c-accent-soft: 239 246 255;
  --c-accent-strong: 29 78 216;
  --c-accent-ring: 191 219 254;

  color-scheme: light;
}

@layer base {
  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    @apply min-h-screen bg-canvas font-sans text-ink antialiased;
  }

  #root {
    @apply min-h-screen;
  }

  h1, h2, h3 {
    @apply tracking-tight;
  }

  ::selection {
    @apply bg-accent-soft text-accent-strong;
  }
}

@layer components {
  /* Flächen */
  .card {
    @apply rounded-2xl border border-line bg-surface;
  }

  .card-raised {
    @apply rounded-2xl border border-line bg-surface shadow-card;
  }

  .card-pad {
    @apply p-5;
  }

  /* Buttons */
  .btn {
    @apply inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-55;
  }

  .btn-primary {
    @apply btn bg-accent text-white hover:bg-accent-strong;
  }

  .btn-secondary {
    @apply btn border border-line-strong bg-surface text-ink-2 hover:bg-sunken hover:text-ink;
  }

  .btn-ghost {
    @apply btn text-ink-2 hover:bg-sunken hover:text-ink;
  }

  .btn-danger {
    @apply btn bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-200;
  }

  .btn-sm {
    @apply h-8 gap-1.5 px-3 text-[13px];
  }

  .btn-icon {
    @apply h-9 w-9 px-0;
  }

  /* Formular */
  .label {
    @apply block text-sm font-medium text-ink-2;
  }

  .hint {
    @apply text-[13px] leading-snug text-ink-3;
  }

  .field {
    @apply w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent-ring;
  }

  .field-error {
    @apply border-rose-400 focus:border-rose-500 focus:ring-rose-100;
  }

  /* Badges und Chips */
  .badge-neutral {
    @apply inline-flex items-center gap-1 rounded-full border border-line bg-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-2;
  }

  .badge-accent {
    @apply inline-flex items-center gap-1 rounded-full border border-accent-ring bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-strong;
  }

  .chip {
    @apply inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 transition hover:bg-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring;
  }

  .chip-active {
    @apply border-accent bg-accent-soft text-accent-strong hover:bg-accent-soft hover:text-accent-strong;
  }

  /* Tabs */
  .tab {
    @apply relative -mb-px whitespace-nowrap border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-ink-3 transition hover:text-ink focus-visible:outline-none focus-visible:text-ink;
  }

  .tab-active {
    @apply border-accent text-ink;
  }

  /* Noten */
  .grade-badge {
    @apply inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md border px-1.5 text-sm font-bold tabular-nums;
  }

  .grade-1 {
    @apply border-emerald-200 bg-emerald-50 text-emerald-700;
  }

  .grade-2 {
    @apply border-lime-200 bg-lime-50 text-lime-700;
  }

  .grade-3 {
    @apply border-yellow-200 bg-yellow-50 text-yellow-700;
  }

  .grade-4 {
    @apply border-orange-200 bg-orange-50 text-orange-700;
  }

  .grade-5 {
    @apply border-rose-200 bg-rose-50 text-rose-700;
  }

  .grade-none {
    @apply border-line bg-sunken text-ink-3;
  }

  /* Listen */
  .row-hover {
    @apply transition hover:bg-sunken;
  }

  /* Legacy-Aliase — bestehende Aufrufe bleiben lauffähig, bis die Seiten umgestellt sind */
  .panel {
    @apply card-raised card-pad;
  }

  .button-primary {
    @apply btn-primary;
  }

  .button-secondary {
    @apply btn-secondary;
  }

  .button-danger {
    @apply btn border border-rose-200 bg-surface text-rose-700 hover:bg-rose-50;
  }
}
```

- [ ] **Step 3: Schrift in `index.html` einbinden**

`index.html` — im `<head>` vor `<title>` einfügen und die `body`-Klasse leeren:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
```

Und `<body class="bg-slate-100">` zu `<body>` ändern — der Hintergrund kommt jetzt aus `@layer base`.

- [ ] **Step 4: Build ausführen (erzeugt `tailwind.config.js` neu)**

Run: `npm run build`
Expected: Kein TypeScript-Fehler, Vite-Build erfolgreich, `tailwind.config.js` enthält die neuen Farben.

Prüfen mit: `grep -c "c-accent" tailwind.config.js` → Ergebnis muss > 0 sein.

- [ ] **Step 5: Sichtprüfung**

Run: `npm run dev`
Prüfen: App startet, Seitenhintergrund ist ein sehr helles Grau (nicht mehr Weiß), Text erscheint in Inter (Buchstabe „a" mit gerader Endung, deutlich anders als Segoe UI/Helvetica). Keine Seite ist zerschossen — die Legacy-Aliase greifen.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts tailwind.config.js tailwind.config.d.ts src/index.css index.html
git commit -m "$(cat <<'EOF'
Führe Design-Tokens, Basisklassen und Inter-Schrift ein

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Dialog-Bausteine (Modal, ConfirmDialog, useConfirm)

**Files:**
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/ConfirmDialog.tsx`
- Create: `src/components/ui/useConfirm.tsx`

**Interfaces:**
- Consumes: Klassen aus Task 1 (`.btn-*`, `.card`, `shadow-overlay`, `animation`)
- Produces:
  - `Modal({ isOpen, onClose, title, description?, size?: "sm" | "md" | "lg", footer?, children })`
  - `ConfirmDialog({ isOpen, title, description, confirmLabel, cancelLabel?, tone?: "danger" | "default", isBusy?, onConfirm, onCancel })`
  - `useConfirm(): { confirm: (options: ConfirmOptions) => Promise<boolean>; confirmDialog: ReactNode }` mit `ConfirmOptions = { title: string; description: string; confirmLabel?: string; tone?: "danger" | "default" }`

- [ ] **Step 1: `src/components/ui/Modal.tsx` anlegen**

```tsx
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

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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
        event.preventDefault();
        onCloseRef.current();
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
      document.body.style.overflow = previousOverflow;
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
```

- [ ] **Step 2: `src/components/ui/ConfirmDialog.tsx` anlegen**

```tsx
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Abbrechen",
  tone = "danger",
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    title={title}
    size="sm"
    footer={
      <>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isBusy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={tone === "danger" ? "btn-danger" : "btn-primary"}
          onClick={onConfirm}
          disabled={isBusy}
        >
          {isBusy ? "Wird ausgeführt..." : confirmLabel}
        </button>
      </>
    }
  >
    <p className="text-sm leading-relaxed text-ink-2">{description}</p>
  </Modal>
);
```

- [ ] **Step 3: `src/components/ui/useConfirm.tsx` anlegen**

```tsx
import { useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
}

const closedState: ConfirmState = {
  isOpen: false,
  title: "",
  description: "",
};

export const useConfirm = () => {
  const [state, setState] = useState<ConfirmState>(closedState);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(closedState);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({ ...options, isOpen: true });
    });
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel ?? "Löschen"}
      tone={state.tone ?? "danger"}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, confirmDialog };
};
```

- [ ] **Step 4: Build prüfen**

Run: `npm run build`
Expected: erfolgreich. (Die Dateien sind noch nirgends eingebunden — das ist beabsichtigt, Task 6 ff. nutzen sie.)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Modal.tsx src/components/ui/ConfirmDialog.tsx src/components/ui/useConfirm.tsx
git commit -m "$(cat <<'EOF'
Ergänze Modal-, Bestätigungs- und Confirm-Hook-Bausteine

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Struktur-Bausteine (Menu, Field, Breadcrumbs, PageHeader)

**Files:**
- Create: `src/components/ui/Menu.tsx`
- Create: `src/components/ui/Field.tsx`
- Create: `src/components/ui/Breadcrumbs.tsx`
- Create: `src/components/ui/PageHeader.tsx`

**Interfaces:**
- Consumes: Klassen aus Task 1
- Produces:
  - `type MenuItem = { kind: "action"; label: string; onSelect: () => void; tone?: "default" | "danger"; disabled?: boolean } | { kind: "link"; label: string; to: string } | { kind: "separator" } | { kind: "heading"; label: string }`
  - `Menu({ items, label?, align?: "left" | "right" })`
  - `Field({ label, htmlFor?, hint?, error?, children })`
  - `type BreadcrumbItem = { label: string; to?: string }`
  - `Breadcrumbs({ items })`
  - `PageHeader({ breadcrumbs?, eyebrow?, title, description?, stats?, actions? })` mit `stats?: Array<{ label: string; value: ReactNode }>`

- [ ] **Step 1: `src/components/ui/Menu.tsx` anlegen**

```tsx
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
```

- [ ] **Step 2: `src/components/ui/Field.tsx` anlegen**

```tsx
import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export const Field = ({ label, htmlFor, hint, error, children }: FieldProps) => (
  <div className="space-y-1.5">
    <label className="label" htmlFor={htmlFor}>
      {label}
    </label>
    {children}
    {error ? (
      <p className="text-[13px] font-medium text-rose-700">{error}</p>
    ) : hint ? (
      <p className="hint">{hint}</p>
    ) : null}
  </div>
);
```

- [ ] **Step 3: `src/components/ui/Breadcrumbs.tsx` anlegen**

```tsx
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
```

- [ ] **Step 4: `src/components/ui/PageHeader.tsx` anlegen**

```tsx
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
```

- [ ] **Step 5: Build prüfen**

Run: `npm run build`
Expected: erfolgreich.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Menu.tsx src/components/ui/Field.tsx src/components/ui/Breadcrumbs.tsx src/components/ui/PageHeader.tsx
git commit -m "$(cat <<'EOF'
Ergänze Menü-, Feld-, Brotkrumen- und Seitenkopf-Bausteine

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Noten- und Status-Darstellung

**Files:**
- Create: `src/components/ui/GradeBadge.tsx`
- Create: `src/components/ui/statusMeta.ts`
- Create: `src/components/ui/StatusLegend.tsx`
- Modify: `src/components/ui/EmptyState.tsx`
- Modify: `src/components/ui/ErrorState.tsx`

**Interfaces:**
- Consumes: `.grade-*`-Klassen aus Task 1, `AssessmentResultStatus` aus `src/lib/supabase/types`
- Produces:
  - `GradeBadge({ grade, fallback? })` — `grade: number | null | undefined`, rundet zur Farbwahl auf ganze Note, zeigt aber den übergebenen Wert (max. eine Nachkommastelle)
  - `STATUS_META: Record<AssessmentResultStatus, { symbol: string; label: string; textClass: string }>`
  - `STATUS_ORDER: AssessmentResultStatus[]`
  - `StatusLegend()` — ohne Props
  - `EmptyState` und `ErrorState` behalten ihre bestehenden Props

- [ ] **Step 1: `src/components/ui/GradeBadge.tsx` anlegen**

```tsx
interface GradeBadgeProps {
  grade: number | null | undefined;
  fallback?: string;
}

const toneClass = (grade: number) => {
  const rounded = Math.min(5, Math.max(1, Math.round(grade)));
  return `grade-${rounded}`;
};

const formatGrade = (grade: number) =>
  Number.isInteger(grade) ? String(grade) : grade.toFixed(1).replace(".", ",");

export const GradeBadge = ({ grade, fallback = "—" }: GradeBadgeProps) => {
  if (grade === null || grade === undefined || !Number.isFinite(grade)) {
    return <span className="grade-badge grade-none">{fallback}</span>;
  }

  return <span className={`grade-badge ${toneClass(grade)}`}>{formatGrade(grade)}</span>;
};
```

- [ ] **Step 2: `src/components/ui/statusMeta.ts` anlegen**

```ts
import type { AssessmentResultStatus } from "../../lib/supabase/types";

export const STATUS_META: Record<
  AssessmentResultStatus,
  { symbol: string; label: string; textClass: string }
> = {
  filled: { symbol: "", label: "Eingetragen", textClass: "text-ink" },
  missing: { symbol: "—", label: "Fehlt", textClass: "text-ink-3 font-semibold" },
  excused: { symbol: "E", label: "Entschuldigt", textClass: "text-amber-700 font-semibold" },
  absent_unexcused: {
    symbol: "U",
    label: "Unentschuldigt",
    textClass: "text-rose-700 font-semibold",
  },
  makeup_pending: {
    symbol: "N",
    label: "Nachtrag offen",
    textClass: "text-indigo-700 font-semibold",
  },
  exempt: { symbol: "B", label: "Befreit", textClass: "text-amber-700 font-semibold" },
};

export const STATUS_ORDER: AssessmentResultStatus[] = [
  "filled",
  "missing",
  "excused",
  "absent_unexcused",
  "makeup_pending",
  "exempt",
];

export const STATUS_OPTIONS = STATUS_ORDER.map((value) => ({
  value,
  label: STATUS_META[value].label,
}));
```

- [ ] **Step 3: `src/components/ui/StatusLegend.tsx` anlegen**

```tsx
import { STATUS_META, STATUS_ORDER } from "./statusMeta";

export const StatusLegend = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-3">
    <span className="font-medium text-ink-2">Kürzel:</span>
    {STATUS_ORDER.filter((status) => STATUS_META[status].symbol !== "").map((status) => (
      <span key={status} className="flex items-center gap-1.5">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded border border-line bg-sunken text-xs ${STATUS_META[status].textClass}`}
        >
          {STATUS_META[status].symbol}
        </span>
        {STATUS_META[status].label}
      </span>
    ))}
  </div>
);
```

- [ ] **Step 4: `src/components/ui/EmptyState.tsx` ersetzen**

```tsx
interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ title, description, actionLabel, onAction }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-sunken px-6 py-10 text-center">
    <div
      aria-hidden="true"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-lg text-ink-3"
    >
      +
    </div>
    <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 max-w-md text-sm text-ink-3">{description}</p>
    {actionLabel && onAction ? (
      <button type="button" className="btn-primary mt-5" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null}
  </div>
);
```

- [ ] **Step 5: `src/components/ui/ErrorState.tsx` ersetzen**

```tsx
interface ErrorStateProps {
  message: string;
}

export const ErrorState = ({ message }: ErrorStateProps) => (
  <div
    role="alert"
    className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
  >
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white"
    >
      !
    </span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-rose-900">Da ist etwas schiefgelaufen</p>
      <p className="mt-0.5 break-words text-sm text-rose-800">{message}</p>
    </div>
  </div>
);
```

- [ ] **Step 6: Build und Sichtprüfung**

Run: `npm run build`
Expected: erfolgreich.

Run: `npm run dev` — eine Seite ohne Daten öffnen (z. B. `/subjects` bei leerer Datenbank) und prüfen, dass der Leerzustand mittig, ruhig und mit sichtbarem Aktionsbutton erscheint.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/GradeBadge.tsx src/components/ui/statusMeta.ts src/components/ui/StatusLegend.tsx src/components/ui/EmptyState.tsx src/components/ui/ErrorState.tsx
git commit -m "$(cat <<'EOF'
Ergänze Notenbadge, Statusmetadaten und überarbeite Leer- und Fehlerzustände

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

*(Fortsetzung: Tasks 5–15 folgen im selben Dokument.)*

### Task 5: Toast-System überarbeiten

**Files:**
- Modify: `src/components/ui/ToastProvider.tsx:40-46` (Tonklassen) und `:93-135` (Darstellung)

**Interfaces:**
- Consumes: Klassen und Animationen aus Task 1
- Produces: unveränderte `useToast()`-API (`success`, `error`, `info`, `warning`, `undoable`, `dismiss`)

- [ ] **Step 1: Tonklassen und Symbole ersetzen**

In `src/components/ui/ToastProvider.tsx` den Block `const toneClass` (Zeilen 40–46) ersetzen durch:

```tsx
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
```

- [ ] **Step 2: Darstellung ersetzen**

Den `<div className="pointer-events-none fixed bottom-4 right-4 …">`-Block (Zeilen 96–133) ersetzen durch:

```tsx
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
```

Die Toast-Leiste sitzt mobil oberhalb der Bottom-Navigation aus Task 6; der `bottom`-Wert ist bewusst so gewählt.

- [ ] **Step 3: Build prüfen**

Run: `npm run build`
Expected: erfolgreich, keine ungenutzte Variable (`push` wird im Undo-Zweig weiterhin verwendet).

- [ ] **Step 4: Sichtprüfung**

Run: `npm run dev` — einen Schüler löschen. Erwartet: Toast mit „↩"-Symbol, deutlich sichtbarem „Rückgängig"-Button und „×" zum Schließen, eingeblendet mit kurzer Animation.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ToastProvider.tsx
git commit -m "$(cat <<'EOF'
Überarbeite Darstellung der Toast-Meldungen

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Navigation — AppShell, Konto-Menü, Bottom-Navigation, Klassenseite

**Files:**
- Create: `src/components/layout/AccountMenu.tsx`
- Create: `src/components/layout/BottomNav.tsx`
- Create: `src/pages/ClassesPage.tsx`
- Modify: `src/components/layout/AppShell.tsx` (vollständig ersetzen)
- Modify: `src/router.tsx:1-12` (Import) und `:20-25` (Routen)

**Interfaces:**
- Consumes: `PageHeader`, `EmptyState`, `ErrorState`, `Modal`, `Menu` aus Tasks 2–4; `useAuth`, `useClasses`, `useAllStudents`, `useAllSubjects` unverändert; `classSchema` aus `src/schemas/classes`
- Produces:
  - `AccountMenu({ email })`
  - `BottomNav()` — ohne Props
  - `ClassesPage()` — Route `/classes`

- [ ] **Step 1: `src/components/layout/AccountMenu.tsx` anlegen**

```tsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

export const AccountMenu = ({ email }: { email: string }) => {
  const { signOut } = useAuth();
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
            onClick={() => {
              setIsOpen(false);
              void signOut();
            }}
          >
            Abmelden
          </button>
        </div>
      ) : null}
    </div>
  );
};
```

- [ ] **Step 2: `src/components/layout/BottomNav.tsx` anlegen**

```tsx
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
```

- [ ] **Step 3: `src/components/layout/AppShell.tsx` vollständig ersetzen**

```tsx
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useClasses } from "../../hooks/useClasses";
import { AccountMenu } from "./AccountMenu";
import { BottomNav } from "./BottomNav";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-accent-soft text-accent-strong before:absolute before:inset-y-1.5 before:-left-2 before:w-1 before:rounded-full before:bg-accent"
      : "text-ink-2 hover:bg-sunken hover:text-ink"
  }`;

export const AppShell = () => {
  const { isAuthenticated, isLoading, session } = useAuth();
  const classesQuery = useClasses();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-ink-3">Sitzung wird geladen...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const email = session?.user.email ?? "";
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
          <AccountMenu email={email} />
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
```

- [ ] **Step 4: `src/pages/ClassesPage.tsx` anlegen**

```tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../components/ui/ToastProvider";
import { useClasses } from "../hooks/useClasses";
import { useAllStudents } from "../hooks/useStudents";
import { useAllSubjects } from "../hooks/useSubjects";
import { classSchema } from "../schemas/classes";

export const ClassesPage = () => {
  const toast = useToast();
  const { data: classes, isLoading, error, createClass } = useClasses();
  const studentsQuery = useAllStudents();
  const subjectsQuery = useAllSubjects();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const students = new Map<string, number>();
    const subjects = new Map<string, number>();

    for (const student of studentsQuery.data ?? []) {
      const classId = student.enrollments[0]?.class_id;
      if (classId) {
        students.set(classId, (students.get(classId) ?? 0) + 1);
      }
    }

    for (const subject of subjectsQuery.data ?? []) {
      subjects.set(subject.class_id, (subjects.get(subject.class_id) ?? 0) + 1);
    }

    return { students, subjects };
  }, [studentsQuery.data, subjectsQuery.data]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = classSchema.safeParse({ name: newName });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Bitte einen gültigen Klassennamen eingeben.");
      return;
    }

    try {
      await createClass.mutateAsync(parsed.data.name);
      toast.success("Klasse wurde angelegt.");
      setNewName("");
      setIsCreateOpen(false);
    } catch (mutationError) {
      setFormError(
        mutationError instanceof Error
          ? mutationError.message
          : "Klasse konnte nicht angelegt werden.",
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Klassen"
        description="Alle Klassen, die du unterrichtest."
        stats={[{ label: "Klassen", value: classes?.length ?? 0 }]}
        actions={
          <button type="button" className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            Neue Klasse
          </button>
        }
      />

      {error ? <ErrorState message={error.message} /> : null}

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-xl bg-sunken" />
          <div className="h-16 animate-pulse rounded-xl bg-sunken" />
        </div>
      ) : !classes || classes.length === 0 ? (
        <EmptyState
          title="Noch keine Klassen"
          description="Lege deine erste Klasse an, um Schüler, Fächer und Noten zu verwalten."
          actionLabel="Neue Klasse"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="card-raised divide-y divide-line overflow-hidden">
          {classes.map((schoolClass) => (
            <Link
              key={schoolClass.id}
              to={`/classes/${schoolClass.id}`}
              className="row-hover flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-ink">{schoolClass.name}</p>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {counts.students.get(schoolClass.id) ?? 0} Schüler ·{" "}
                  {counts.subjects.get(schoolClass.id) ?? 0} Fächer
                </p>
              </div>
              <span aria-hidden="true" className="shrink-0 text-ink-3">
                ›
              </span>
            </Link>
          ))}
        </div>
      )}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setFormError(null);
        }}
        title="Neue Klasse anlegen"
        description="Der Name erscheint überall dort, wo du die Klasse auswählst."
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setFormError(null);
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              form="class-create-form"
              className="btn-primary"
              disabled={createClass.isPending}
            >
              {createClass.isPending ? "Wird gespeichert..." : "Klasse anlegen"}
            </button>
          </>
        }
      >
        <form id="class-create-form" className="space-y-4" onSubmit={handleCreate}>
          <Field label="Klassenname" htmlFor="class-name" hint="Zum Beispiel 4B oder 2AHIF.">
            <input
              id="class-name"
              className={formError ? "field field-error" : "field"}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="4B"
            />
          </Field>
          {formError ? <ErrorState message={formError} /> : null}
        </form>
      </Modal>
    </>
  );
};
```

- [ ] **Step 5: Route in `src/router.tsx` ergänzen**

Import ergänzen (alphabetisch nach `ClassDetailPage`):

```tsx
import { ClassesPage } from "./pages/ClassesPage";
```

Und im `children`-Array direkt nach `{ path: "dashboard", element: <DashboardPage /> },` einfügen:

```tsx
      { path: "classes", element: <ClassesPage /> },
```

- [ ] **Step 6: Build prüfen**

Run: `npm run build`
Expected: erfolgreich.

- [ ] **Step 7: Sichtprüfung**

Run: `npm run dev`

Prüfen:
- Desktop (1440 px): Topbar oben mit Konto-Menü rechts; Sidebar mit Übersicht / Klassen (+ Klassenliste darunter) / Schüler / Fächer; aktiver Punkt hat blauen Balken links.
- Konto-Menü öffnet, zeigt E-Mail und „Abmelden"; Abmelden funktioniert.
- Mobil (375 px): keine Sidebar, stattdessen Leiste unten mit vier Zielen; Inhalt wird nicht von der Leiste verdeckt (`pb-24` am `main`).
- `/classes` zeigt die Klassenliste; „Neue Klasse" öffnet den Dialog; ESC schließt ihn; Anlegen erzeugt Toast.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/AppShell.tsx src/components/layout/AccountMenu.tsx src/components/layout/BottomNav.tsx src/pages/ClassesPage.tsx src/router.tsx
git commit -m "$(cat <<'EOF'
Baue Navigation mit Topbar, Sidebar, Bottom-Leiste und Klassenseite um

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Übersichtsseite (DashboardPage)

**Files:**
- Modify: `src/pages/DashboardPage.tsx` (Darstellungsteil ab Zeile 149 ersetzen; Datenteil Zeilen 1–147 bleibt unverändert)

**Interfaces:**
- Consumes: `PageHeader`, `EmptyState`, `ErrorState`, `Field`, `Modal`, `GradeBadge`, `useToast`
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Importe ergänzen**

Am Dateikopf ergänzen:

```tsx
import { Field } from "../components/ui/Field";
import { GradeBadge } from "../components/ui/GradeBadge";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../components/ui/ToastProvider";
```

Und in der Komponente als erste Zeile `const toast = useToast();` ergänzen. `SkeletonCard` (Zeile 14) ersetzen durch:

```tsx
const SkeletonRow = () => <div className="h-16 animate-pulse rounded-xl bg-sunken" />;
```

In `handleCreate` nach `await createClass.mutateAsync(parsed.data.name);` die Zeile `toast.success("Klasse wurde angelegt.");` ergänzen.

- [ ] **Step 2: Den gesamten `return`-Block (ab Zeile 149) ersetzen**

```tsx
  return (
    <>
      <PageHeader
        title="Übersicht"
        description="Deine Klassen und die zuletzt eingetragenen Noten auf einen Blick."
        stats={
          classesLoading || studentsLoading || subjectsLoading || resultsMetaQuery.isLoading
            ? undefined
            : [
                { label: "Klassen", value: classes?.length ?? 0 },
                { label: "Schüler", value: students?.length ?? 0 },
                { label: "Fächer", value: subjects?.length ?? 0 },
                { label: "Noten eingetragen", value: resultsMetaQuery.data?.totalCount ?? 0 },
              ]
        }
        actions={
          <button type="button" className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            Neue Klasse
          </button>
        }
      />

      {anyError ? <ErrorState message={anyError.message} /> : null}

      <section className="card-raised overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Klassen</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">Öffne eine Klasse, um Schüler und Fächer zu bearbeiten.</p>
          </div>
          <Link to="/classes" className="btn-ghost btn-sm">
            Alle ansehen
          </Link>
        </div>

        {classesLoading ? (
          <div className="space-y-3 p-5">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : !classes || classes.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Noch keine Klassen"
              description="Lege deine erste Klasse an, um mit der Notenverwaltung zu starten."
              actionLabel="Neue Klasse"
              onAction={() => setIsCreateOpen(true)}
            />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {classes.map((schoolClass) => (
              <Link
                key={schoolClass.id}
                to={`/classes/${schoolClass.id}`}
                className="row-hover flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-ink">{schoolClass.name}</p>
                  <p className="mt-0.5 text-[13px] text-ink-3">
                    {classStats.studentCounts.get(schoolClass.id) ?? 0} Schüler ·{" "}
                    {classStats.subjectCounts.get(schoolClass.id) ?? 0} Fächer
                  </p>
                </div>
                <span aria-hidden="true" className="shrink-0 text-ink-3">
                  ›
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card-raised overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Zuletzt eingetragen</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">Die acht zuletzt aktualisierten Ergebnisse.</p>
        </div>

        {resultsMetaQuery.isLoading || recentDefinitionsQuery.isLoading ? (
          <div className="space-y-3 p-5">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : recentItems.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Noch keine Einträge"
              description="Sobald du Leistungsnachweise bewertest, erscheinen sie hier."
              actionLabel="Zu den Fächern"
              onAction={() => navigate("/subjects")}
            />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {recentItems.map(({ result, definition, student, subject }) => (
              <Link
                key={result.id}
                to={student ? `/students/${student.id}` : "/students"}
                className="row-hover flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {student ? `${student.first_name} ${student.last_name}` : "Unbekannter Schüler"}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-ink-3">
                    {subject?.name ?? "Unbekanntes Fach"} · {definition?.name ?? "Leistungsnachweis"} ·{" "}
                    {formatDate(result.updated_at)}
                  </p>
                </div>
                {result.grade !== null ? (
                  <GradeBadge grade={result.grade} />
                ) : (
                  <span className="badge-neutral tabular-nums">
                    {result.points !== null ? `${result.points} P` : "—"}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setFormError(null);
        }}
        title="Neue Klasse anlegen"
        description="Der Name erscheint überall dort, wo du die Klasse auswählst."
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setFormError(null);
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              form="dashboard-class-form"
              className="btn-primary"
              disabled={createClass.isPending}
            >
              {createClass.isPending ? "Wird gespeichert..." : "Klasse anlegen"}
            </button>
          </>
        }
      >
        <form id="dashboard-class-form" className="space-y-4" onSubmit={handleCreate}>
          <Field label="Klassenname" htmlFor="dashboard-class-name" hint="Zum Beispiel 4B oder 2AHIF.">
            <input
              id="dashboard-class-name"
              className={formError ? "field field-error" : "field"}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="4B"
            />
          </Field>
          {formError ? <ErrorState message={formError} /> : null}
        </form>
      </Modal>
    </>
  );
```

- [ ] **Step 3: Build prüfen**

Run: `npm run build`
Expected: erfolgreich. Falls TypeScript ungenutzte Importe meldet (`SkeletonCard` wurde ersetzt), diese entfernen.

- [ ] **Step 4: Sichtprüfung**

Run: `npm run dev` → `/dashboard`

Prüfen: Kennzahlen stehen als schlanke Zeile unter dem Titel (nicht mehr als vier große Karten); Klassen und „Zuletzt eingetragen" sind Listen mit Trennlinien; „Neue Klasse" öffnet den Dialog; Noten im Verlauf erscheinen farbcodiert.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "$(cat <<'EOF'
Überarbeite Übersichtsseite mit Seitenkopf, Listen und Dialog

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Fach-Formular und Punkte-Mapping-Editor

**Files:**
- Create: `src/components/ui/PointsMappingEditor.tsx`
- Create: `src/components/subjects/SubjectFormFields.tsx`

**Interfaces:**
- Consumes: `Field` aus Task 3
- Produces:
  - `PointsMappingEditor({ value, onChange })` — `value: string` (JSON), `onChange: (nextJson: string) => void`
  - `type SubjectFormValues = { class_id: string; name: string; subject_type: string; grading_kind: string; average_mode: string; default_weight: string; points_to_grade_raw: string }`
  - `SubjectFormFields({ values, onChange, classes, idPrefix, lockClass? })` mit `classes: Array<{ id: string; name: string }>`, `onChange: (next: SubjectFormValues) => void`, `idPrefix: string`, `lockClass?: boolean`

- [ ] **Step 1: `src/components/ui/PointsMappingEditor.tsx` anlegen**

Der Editor arbeitet mit dem bestehenden Datenformat: ein JSON-Objekt, dessen Schlüssel die Mindestprozentzahl und dessen Werte die Note sind (z. B. `{ "90": 1, "80": 2 }`). Er parst den String beim Rendern und serialisiert bei jeder Änderung zurück.

```tsx
import { useMemo } from "react";

interface PointsMappingEditorProps {
  value: string;
  onChange: (nextJson: string) => void;
}

interface MappingRow {
  minPercent: string;
  grade: string;
}

const parseRows = (raw: string): MappingRow[] => {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const rows = Object.entries(parsed)
      .map(([percent, grade]) => ({ minPercent: percent, grade: String(grade) }))
      .sort((left, right) => Number(right.minPercent) - Number(left.minPercent));

    return rows.length > 0 ? rows : [{ minPercent: "", grade: "" }];
  } catch {
    return [{ minPercent: "", grade: "" }];
  }
};

const serialise = (rows: MappingRow[]) => {
  const mapping: Record<string, number> = {};

  for (const row of rows) {
    const percent = Number(row.minPercent);
    const grade = Number(row.grade);

    if (!row.minPercent.trim() || !row.grade.trim()) {
      continue;
    }

    if (!Number.isFinite(percent) || !Number.isFinite(grade)) {
      continue;
    }

    mapping[String(percent)] = grade;
  }

  return JSON.stringify(mapping);
};

export const PointsMappingEditor = ({ value, onChange }: PointsMappingEditorProps) => {
  const rows = useMemo(() => parseRows(value), [value]);

  const update = (nextRows: MappingRow[]) => {
    onChange(serialise(nextRows));
  };

  const isValid = rows.every(
    (row) =>
      (!row.minPercent.trim() && !row.grade.trim()) ||
      (Number.isFinite(Number(row.minPercent)) && Number.isFinite(Number(row.grade))),
  );

  return (
    <div className="space-y-3 rounded-xl border border-line bg-sunken p-4">
      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 text-[13px] font-medium text-ink-3">
        <span>Ab Prozent</span>
        <span>Note</span>
        <span className="sr-only">Aktion</span>
      </div>

      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
          <input
            className="field"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            placeholder="90"
            value={row.minPercent}
            onChange={(event) => {
              const next = rows.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, minPercent: event.target.value } : entry,
              );
              update(next);
            }}
          />
          <input
            className="field"
            type="number"
            min={1}
            max={5}
            step={1}
            inputMode="numeric"
            placeholder="1"
            value={row.grade}
            onChange={(event) => {
              const next = rows.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, grade: event.target.value } : entry,
              );
              update(next);
            }}
          />
          <button
            type="button"
            aria-label={`Zeile ${index + 1} entfernen`}
            className="btn-ghost btn-icon text-lg leading-none text-ink-3 hover:text-rose-700"
            disabled={rows.length === 1}
            onClick={() => update(rows.filter((_, entryIndex) => entryIndex !== index))}
          >
            ×
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => update([...rows, { minPercent: "", grade: "" }])}
        >
          Stufe hinzufügen
        </button>
        <p className="hint">
          {isValid
            ? "Ein Ergebnis erhält die Note der höchsten Stufe, die es erreicht."
            : "Bitte nur Zahlen eingeben."}
        </p>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: `src/components/subjects/SubjectFormFields.tsx` anlegen**

```tsx
import { Field } from "../ui/Field";
import { PointsMappingEditor } from "../ui/PointsMappingEditor";

export interface SubjectFormValues {
  class_id: string;
  name: string;
  subject_type: string;
  grading_kind: string;
  average_mode: string;
  default_weight: string;
  points_to_grade_raw: string;
}

interface SubjectFormFieldsProps {
  values: SubjectFormValues;
  onChange: (next: SubjectFormValues) => void;
  classes: Array<{ id: string; name: string }>;
  idPrefix: string;
  lockClass?: boolean;
}

export const SubjectFormFields = ({
  values,
  onChange,
  classes,
  idPrefix,
  lockClass = false,
}: SubjectFormFieldsProps) => {
  const set = <K extends keyof SubjectFormValues>(key: K, next: SubjectFormValues[K]) =>
    onChange({ ...values, [key]: next });

  return (
    <div className="space-y-7">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Grunddaten</legend>

        {lockClass ? null : (
          <Field
            label="Klasse"
            htmlFor={`${idPrefix}-class`}
            hint="Das Fach gehört zu genau einer Klasse."
          >
            <select
              id={`${idPrefix}-class`}
              className="field"
              value={values.class_id}
              onChange={(event) => set("class_id", event.target.value)}
            >
              <option value="">Klasse wählen</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Fachname" htmlFor={`${idPrefix}-name`}>
          <input
            id={`${idPrefix}-name`}
            className="field"
            placeholder="Mathematik"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
          />
        </Field>

        <Field
          label="Fachart"
          htmlFor={`${idPrefix}-type`}
          hint="Ein Klassenkasse-Fach dient der Geldverwaltung statt der Benotung."
        >
          <select
            id={`${idPrefix}-type`}
            className="field"
            value={values.subject_type}
            onChange={(event) => set("subject_type", event.target.value)}
          >
            <option value="normal">Normales Fach</option>
            <option value="class_fund">Klassenkasse-Fach</option>
          </select>
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink">Bewertung</legend>

        <Field
          label="Art der Bewertung"
          htmlFor={`${idPrefix}-grading`}
          hint={
            values.grading_kind === "points"
              ? "Du trägst Punkte ein, die Note wird über die Prozentstufen unten berechnet."
              : "Du trägst die Note direkt ein, ohne Punkteumrechnung."
          }
        >
          <select
            id={`${idPrefix}-grading`}
            className="field"
            value={values.grading_kind}
            onChange={(event) => set("grading_kind", event.target.value)}
          >
            <option value="grade">Direkte Note</option>
            <option value="points">Punkte mit Umrechnung</option>
          </select>
        </Field>

        <Field
          label="Durchschnittsberechnung"
          htmlFor={`${idPrefix}-average`}
          hint={
            values.average_mode === "weighted"
              ? "Jeder Leistungsnachweis zählt entsprechend seinem Gewicht."
              : "Alle Leistungsnachweise zählen gleich viel."
          }
        >
          <select
            id={`${idPrefix}-average`}
            className="field"
            value={values.average_mode}
            onChange={(event) => set("average_mode", event.target.value)}
          >
            <option value="mean">Mittelwert</option>
            <option value="weighted">Gewichteter Durchschnitt</option>
          </select>
        </Field>

        <Field
          label="Standardgewicht"
          htmlFor={`${idPrefix}-weight`}
          hint="Vorbelegung für neue Leistungsnachweise. 1 = normale Gewichtung, 2 = zählt doppelt."
        >
          <input
            id={`${idPrefix}-weight`}
            className="field"
            type="number"
            step="0.1"
            min="0"
            value={values.default_weight}
            onChange={(event) => set("default_weight", event.target.value)}
          />
        </Field>
      </fieldset>

      {values.grading_kind === "points" ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-ink">Punkte-Umrechnung</legend>
          <p className="hint">
            Lege fest, ab welchem Prozentsatz welche Note gilt. Die Stufen gelten für alle
            Leistungsnachweise dieses Fachs.
          </p>
          <PointsMappingEditor
            value={values.points_to_grade_raw}
            onChange={(next) => set("points_to_grade_raw", next)}
          />
        </fieldset>
      ) : null}
    </div>
  );
};
```

- [ ] **Step 3: Build prüfen**

Run: `npm run build`
Expected: erfolgreich (die Dateien werden in Tasks 9 und 10 eingebunden).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/PointsMappingEditor.tsx src/components/subjects/SubjectFormFields.tsx
git commit -m "$(cat <<'EOF'
Ergänze beschriftetes Fach-Formular und Punkte-Umrechnungs-Editor

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Fächerseite (SubjectsPage)

**Files:**
- Modify: `src/pages/SubjectsPage.tsx` (Darstellung ab Zeile 58 ersetzen, Datenteil Zeilen 1–56 bleibt)

**Interfaces:**
- Consumes: `PageHeader`, `Menu`, `Modal`, `SubjectFormFields`, `SubjectFormValues`, `useConfirm`, `EmptyState`, `ErrorState`
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Importe und Zustand anpassen**

Importe ergänzen:

```tsx
import { SubjectFormFields } from "../components/subjects/SubjectFormFields";
import type { SubjectFormValues } from "../components/subjects/SubjectFormFields";
import { Menu } from "../components/ui/Menu";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { useConfirm } from "../components/ui/useConfirm";
```

In der Komponente nach `const toast = useToast();` ergänzen:

```tsx
  const { confirm, confirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
```

Den `subjectForm`-State auf den geteilten Typ heben:

```tsx
  const [subjectForm, setSubjectForm] = useState<SubjectFormValues>({
    class_id: "",
    name: "",
    subject_type: "normal",
    grading_kind: "grade",
    average_mode: "mean",
    default_weight: "1",
    points_to_grade_raw: '{"90":1,"80":2,"65":3,"50":4,"0":5}',
  });
```

- [ ] **Step 2: Gefilterte Liste ergänzen**

Nach `definitionsQuery` einfügen:

```tsx
  const filteredSubjects = useMemo(() => {
    return (subjectsQuery.data ?? []).filter((subject) => {
      const matchesSearch = subject.name.toLowerCase().includes(search.toLowerCase());
      const matchesClass = !classFilter || subject.class_id === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [classFilter, search, subjectsQuery.data]);

  const hasFilters = Boolean(search || classFilter);
```

- [ ] **Step 3: Submit-Handler auslagern**

Den bisherigen Inline-`onSubmit` (Zeilen 82–145) als benannte Funktion oberhalb des `return` ablegen — Inhalt unverändert übernehmen, nur `subjectForm.class_id` statt der bisherigen Feldnamen prüfen und am Ende `setIsCreateOpen(false);` behalten:

```tsx
  const handleCreateSubject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    if (!subjectForm.class_id) {
      setCreateError("Bitte zuerst eine Klasse auswählen.");
      return;
    }

    const result = subjectSchema.safeParse({
      name: subjectForm.name,
      subject_type: subjectForm.subject_type,
      grading_kind: subjectForm.grading_kind,
      average_mode: subjectForm.average_mode,
      default_weight: subjectForm.default_weight,
      points_to_grade_raw: subjectForm.points_to_grade_raw,
    });

    if (!result.success) {
      setCreateError(result.error.issues[0]?.message ?? "Bitte Eingaben prüfen.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht eingeloggt.");
      }

      await subjectActions.createSubject.mutateAsync({
        teacher_id: user.id,
        class_id: subjectForm.class_id,
        name: result.data.name,
        subject_type: result.data.subject_type,
        grading_kind: result.data.grading_kind,
        average_mode: result.data.average_mode,
        default_weight: result.data.default_weight,
        points_to_grade:
          result.data.grading_kind === "points"
            ? parsePointsMapping(result.data.points_to_grade_raw)
            : null,
      });
      toast.success("Fach wurde erstellt.");

      setSubjectForm({
        class_id: "",
        name: "",
        subject_type: "normal",
        grading_kind: "grade",
        average_mode: "mean",
        default_weight: "1",
        points_to_grade_raw: '{"90":1,"80":2,"65":3,"50":4,"0":5}',
      });
      setIsCreateOpen(false);
    } catch (error) {
      toast.error("Fach konnte nicht angelegt werden.");
      setCreateError(
        error instanceof Error ? error.message : "Fach konnte nicht angelegt werden.",
      );
    }
  };
```

Und den Löschvorgang als Funktion:

```tsx
  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    setDeleteError(null);

    const confirmed = await confirm({
      title: `„${subjectName}" löschen?`,
      description:
        "Alle Leistungsnachweise und eingetragenen Ergebnisse dieses Fachs werden entfernt. Direkt danach kannst du die Aktion über „Rückgängig" wiederherstellen.",
      confirmLabel: "Fach löschen",
    });

    if (!confirmed) {
      return;
    }

    try {
      const snapshot = await subjectActions.deleteSubject.mutateAsync(subjectId);
      toast.undoable("Fach gelöscht.", async () => {
        await subjectActions.restoreDeletedSubject.mutateAsync(snapshot);
        toast.success("Fach wurde wiederhergestellt.");
      });
    } catch (error) {
      toast.error("Fach konnte nicht gelöscht werden.");
      setDeleteError(
        error instanceof Error ? error.message : "Fach konnte nicht gelöscht werden.",
      );
    }
  };
```

- [ ] **Step 4: Den `return`-Block ersetzen**

```tsx
  return (
    <>
      <PageHeader
        title="Fächer"
        description="Alle Fächer über deine Klassen hinweg."
        stats={[{ label: "Fächer", value: subjectsQuery.data?.length ?? 0 }]}
        actions={
          <button type="button" className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            Neues Fach
          </button>
        }
      />

      <section className="card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <Field label="Suche" htmlFor="subject-search">
            <input
              id="subject-search"
              className="field"
              placeholder="Fachname"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Klasse" htmlFor="subject-class-filter">
            <select
              id="subject-class-filter"
              className="field"
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
            >
              <option value="">Alle Klassen</option>
              {classesQuery.data?.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {hasFilters ? (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-[13px] text-ink-3">
              {filteredSubjects.length} von {subjectsQuery.data?.length ?? 0} Fächern
            </p>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                setSearch("");
                setClassFilter("");
              }}
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : null}
      </section>

      {subjectsQuery.error ? <ErrorState message={subjectsQuery.error.message} /> : null}
      {definitionsQuery.error ? <ErrorState message={definitionsQuery.error.message} /> : null}
      {deleteError ? <ErrorState message={deleteError} /> : null}

      {filteredSubjects.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Keine Treffer" : "Noch keine Fächer"}
          description={
            hasFilters
              ? "Passe Suche oder Klassenfilter an."
              : "Lege das erste Fach an, um Leistungsnachweise und Noten zu verwalten."
          }
          actionLabel={hasFilters ? undefined : "Neues Fach"}
          onAction={hasFilters ? undefined : () => setIsCreateOpen(true)}
        />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {filteredSubjects.map((subject) => {
            const studentCount = (studentsQuery.data ?? []).filter((student) =>
              student.enrollments.some((enrollment) => enrollment.class_id === subject.class_id),
            ).length;
            const assessmentCount = (definitionsQuery.data ?? []).filter(
              (entry) => entry.subject_id === subject.id,
            ).length;

            return (
              <article key={subject.id} className="card-raised group relative p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-base font-bold text-accent-strong"
                    >
                      {subject.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <Link
                        to={`/subjects/${subject.id}`}
                        className="block truncate text-base font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-accent-strong"
                      >
                        {subject.name}
                      </Link>
                      <p className="mt-0.5 text-[13px] text-ink-3">
                        Klasse {getClassName(subject.class_id)}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-10 shrink-0">
                    <Menu
                      items={[
                        { kind: "link", label: "Notenübersicht öffnen", to: `/subjects/${subject.id}` },
                        { kind: "separator" },
                        {
                          kind: "action",
                          label: "Fach löschen",
                          tone: "danger",
                          onSelect: () => void handleDeleteSubject(subject.id, subject.name),
                        },
                      ]}
                    />
                  </div>
                </div>

                <dl className="mt-4 flex items-center gap-5 border-t border-line pt-3 text-[13px]">
                  <div className="flex items-baseline gap-1.5">
                    <dd className="font-semibold tabular-nums text-ink">{studentCount}</dd>
                    <dt className="text-ink-3">Schüler</dt>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <dd className="font-semibold tabular-nums text-ink">{assessmentCount}</dd>
                    <dt className="text-ink-3">Leistungsnachweise</dt>
                  </div>
                </dl>
              </article>
            );
          })}
        </section>
      )}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError(null);
        }}
        title="Neues Fach anlegen"
        description="Lege fest, wie in diesem Fach bewertet wird."
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setCreateError(null);
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              form="subject-create-form"
              className="btn-primary"
              disabled={subjectActions.createSubject.isPending}
            >
              {subjectActions.createSubject.isPending ? "Wird gespeichert..." : "Fach anlegen"}
            </button>
          </>
        }
      >
        <form id="subject-create-form" className="space-y-6" onSubmit={handleCreateSubject}>
          <SubjectFormFields
            values={subjectForm}
            onChange={setSubjectForm}
            classes={classesQuery.data ?? []}
            idPrefix="subjects-page"
          />
          {createError ? <ErrorState message={createError} /> : null}
        </form>
      </Modal>

      {confirmDialog}
    </>
  );
```

`Field` muss zusätzlich importiert werden: `import { Field } from "../components/ui/Field";`

- [ ] **Step 5: Build und Sichtprüfung**

Run: `npm run build`

Run: `npm run dev` → `/subjects`

Prüfen: Kein „Löschen"-Button mehr in der Karte, stattdessen „⋯"-Menü; Klick auf die Karte öffnet die Notenübersicht (die `after:inset-0`-Fläche); Klick auf „⋯" öffnet das Menü, ohne zu navigieren; „Neues Fach" zeigt beschriftete Felder mit Erklärungen; bei „Punkte mit Umrechnung" erscheint der Zeilen-Editor mit fünf vorbefüllten Stufen; Löschen zeigt einen gestalteten Dialog statt des Browser-Popups.

- [ ] **Step 6: Commit**

```bash
git add src/pages/SubjectsPage.tsx
git commit -m "$(cat <<'EOF'
Überarbeite Fächerseite mit Menü, Filtern und Fach-Dialog

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Klassen-Detailseite (ClassDetailPage)

**Files:**
- Modify: `src/pages/ClassDetailPage.tsx` (vollständige Überarbeitung der Darstellung; Queries und Mutationsaufrufe bleiben unverändert)

**Interfaces:**
- Consumes: `PageHeader`, `Menu`, `Modal`, `Field`, `SubjectFormFields`, `useConfirm`, `GradeBadge`, `StudentCreateModal`
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Importe und Zustand ergänzen**

```tsx
import { SubjectFormFields } from "../components/subjects/SubjectFormFields";
import type { SubjectFormValues } from "../components/subjects/SubjectFormFields";
import { Field } from "../components/ui/Field";
import { GradeBadge } from "../components/ui/GradeBadge";
import { Menu } from "../components/ui/Menu";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { useConfirm } from "../components/ui/useConfirm";
```

In der Komponente ergänzen:

```tsx
  const { confirm, confirmDialog } = useConfirm();
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectCreateError, setSubjectCreateError] = useState<string | null>(null);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
```

`subjectForm` auf `useState<SubjectFormValues>` typisieren, `points_to_grade_raw` auf `'{"90":1,"80":2,"65":3,"50":4,"0":5}'` setzen.

- [ ] **Step 2: Tab-Definition ersetzen**

Zeile 17 ersetzen durch:

```tsx
const tabs = [
  { key: "students", label: "Schüler" },
  { key: "subjects", label: "Fächer" },
  { key: "fund", label: "Klassenkasse" },
] as const;
type TabKey = (typeof tabs)[number]["key"];
```

- [ ] **Step 3: Seitenkopf und Tab-Leiste ersetzen**

Der bisherige Kopf-`<section className="panel">` (Zeilen 72–96) wird zu:

```tsx
      <PageHeader
        breadcrumbs={[
          { label: "Klassen", to: "/classes" },
          { label: classQuery.data?.name ?? "Klasse" },
        ]}
        eyebrow="Klasse"
        title={classQuery.data?.name ?? "Wird geladen..."}
        stats={[
          { label: "Schüler", value: studentsQuery.data?.length ?? 0 },
          { label: "Fächer", value: subjectsQuery.data?.length ?? 0 },
          { label: "Kassenstand", value: formatCurrency(fundBalance) },
        ]}
      />

      {classQuery.error ? <ErrorState message={classQuery.error.message} /> : null}

      <div className="border-b border-line">
        <div role="tablist" aria-label="Bereiche der Klasse" className="flex gap-6 overflow-x-auto">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={item.key === tab}
              className={item.key === tab ? "tab tab-active" : "tab"}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
```

- [ ] **Step 4: Schüler-Tab ersetzen**

Der Inhalt des `tab === "students"`-Zweigs wird zu einer Liste mit Menü:

```tsx
      {tab === "students" ? (
        <>
          <section className="card-raised overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Schülerliste</h2>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {studentsQuery.data?.length ?? 0} Schüler in dieser Klasse
                </p>
              </div>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => setIsStudentModalOpen(true)}
              >
                Schüler hinzufügen
              </button>
            </div>

            {studentsQuery.error ? (
              <div className="p-5">
                <ErrorState message={studentsQuery.error.message} />
              </div>
            ) : null}

            {studentsQuery.data?.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="Noch keine Schüler"
                  description="Lege den ersten Schüler für diese Klasse an."
                  actionLabel="Schüler hinzufügen"
                  onAction={() => setIsStudentModalOpen(true)}
                />
              </div>
            ) : (
              <div className="divide-y divide-line">
                {studentsQuery.data?.map((student) => (
                  <div key={student.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <Link
                      to={`/classes/${classId}/students/${student.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-semibold text-ink hover:text-accent-strong">
                        {student.first_name} {student.last_name}
                      </p>
                      {student.notes ? (
                        <p className="mt-0.5 truncate text-[13px] text-ink-3">{student.notes}</p>
                      ) : null}
                    </Link>
                    <Menu
                      items={[
                        {
                          kind: "link",
                          label: "Details öffnen",
                          to: `/classes/${classId}/students/${student.id}`,
                        },
                        { kind: "separator" },
                        { kind: "heading", label: "In Klasse verschieben" },
                        ...(classesQuery.data ?? [])
                          .filter((schoolClass) => schoolClass.id !== classId)
                          .map((schoolClass) => ({
                            kind: "action" as const,
                            label: schoolClass.name,
                            onSelect: () => {
                              void studentsQuery.moveStudent
                                .mutateAsync({
                                  enrollmentId: student.enrollments[0]?.id ?? "",
                                  newClassId: schoolClass.id,
                                })
                                .then(() => toast.success(`Verschoben nach ${schoolClass.name}.`))
                                .catch(() => toast.error("Verschieben fehlgeschlagen."));
                            },
                          })),
                        { kind: "separator" },
                        {
                          kind: "action",
                          label: "Schüler löschen",
                          tone: "danger",
                          onSelect: () =>
                            void handleDeleteStudent(
                              student.id,
                              `${student.first_name} ${student.last_name}`,
                            ),
                        },
                      ]}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <StudentCreateModal … />
        </>
      ) : null}
```

Der `StudentCreateModal`-Aufruf bleibt unverändert wie bisher (Zeilen 186–215).

Die Löschfunktion oberhalb des `return` ergänzen:

```tsx
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    const confirmed = await confirm({
      title: `${studentName} löschen?`,
      description:
        "Alle Ergebnisse dieses Schülers werden entfernt. Direkt danach kannst du die Aktion über „Rückgängig" wiederherstellen.",
      confirmLabel: "Schüler löschen",
    });

    if (!confirmed) {
      return;
    }

    try {
      const snapshot = await studentsQuery.deleteStudent.mutateAsync(studentId);
      toast.undoable("Schüler gelöscht.", async () => {
        await studentsQuery.restoreDeletedStudent.mutateAsync(snapshot);
        toast.success("Schüler wurde wiederhergestellt.");
      });
    } catch {
      toast.error("Schüler konnte nicht gelöscht werden.");
    }
  };
```

- [ ] **Step 5: Fächer-Tab ersetzen**

Das linke Inline-Formular entfällt; stattdessen Liste plus Dialog:

```tsx
      {tab === "subjects" ? (
        <section className="card-raised overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Fächer</h2>
              <p className="mt-0.5 text-[13px] text-ink-3">
                {subjectsQuery.data?.length ?? 0} Fächer in dieser Klasse
              </p>
            </div>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setIsSubjectModalOpen(true)}
            >
              Fach anlegen
            </button>
          </div>

          {subjectsQuery.data?.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Noch keine Fächer"
                description="Lege das erste Fach an, um Leistungsnachweise zu erfassen."
                actionLabel="Fach anlegen"
                onAction={() => setIsSubjectModalOpen(true)}
              />
            </div>
          ) : (
            <div className="divide-y divide-line">
              {subjectsQuery.data?.map((subject) => {
                const linkedAssessments = (assessmentsQuery.data ?? []).filter(
                  (assessment) => assessment.subject_id === subject.id,
                );
                const average = computeSubjectAverage(subject, linkedAssessments);

                return (
                  <div key={subject.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <Link
                      to={`/classes/${classId}/subjects/${subject.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-semibold text-ink hover:text-accent-strong">
                        {subject.name}
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-3">
                        {subject.grading_kind === "points" ? "Punkte" : "Direkte Note"} ·{" "}
                        {subject.average_mode === "weighted" ? "gewichtet" : "Mittelwert"}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">Schnitt</p>
                        <div className="mt-0.5">
                          <GradeBadge grade={average} />
                        </div>
                      </div>
                      <Menu
                        items={[
                          {
                            kind: "link",
                            label: "Notenübersicht öffnen",
                            to: `/classes/${classId}/subjects/${subject.id}`,
                          },
                          { kind: "separator" },
                          {
                            kind: "action",
                            label: "Fach löschen",
                            tone: "danger",
                            onSelect: () => void handleDeleteSubject(subject.id, subject.name),
                          },
                        ]}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
```

`handleDeleteSubject` oberhalb des `return` ergänzen:

```tsx
  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    const confirmed = await confirm({
      title: `„${subjectName}" löschen?`,
      description:
        "Alle Leistungsnachweise und eingetragenen Ergebnisse dieses Fachs werden entfernt. Direkt danach kannst du die Aktion über „Rückgängig" wiederherstellen.",
      confirmLabel: "Fach löschen",
    });

    if (!confirmed) {
      return;
    }

    try {
      const snapshot = await subjectsQuery.deleteSubject.mutateAsync(subjectId);
      toast.undoable("Fach gelöscht.", async () => {
        await subjectsQuery.restoreDeletedSubject.mutateAsync(snapshot);
        toast.success("Fach wurde wiederhergestellt.");
      });
    } catch {
      toast.error("Fach konnte nicht gelöscht werden.");
    }
  };
```

Der Fach-Dialog (außerhalb der Tab-Zweige, vor `{confirmDialog}`):

```tsx
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setSubjectCreateError(null);
        }}
        title="Neues Fach anlegen"
        description={`Für die Klasse ${classQuery.data?.name ?? ""}.`}
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsSubjectModalOpen(false);
                setSubjectCreateError(null);
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              form="class-subject-form"
              className="btn-primary"
              disabled={subjectsQuery.createSubject.isPending}
            >
              {subjectsQuery.createSubject.isPending ? "Wird gespeichert..." : "Fach anlegen"}
            </button>
          </>
        }
      >
        <form id="class-subject-form" className="space-y-6" onSubmit={handleCreateSubject}>
          <SubjectFormFields
            values={subjectForm}
            onChange={setSubjectForm}
            classes={classesQuery.data ?? []}
            idPrefix="class-detail"
            lockClass
          />
          {subjectCreateError ? <ErrorState message={subjectCreateError} /> : null}
        </form>
      </Modal>
```

`handleCreateSubject` entspricht dem bisherigen Inline-`onSubmit` (Zeilen 225–253), erweitert um `setSubjectCreateError` im Fehlerfall und `setIsSubjectModalOpen(false)` im Erfolgsfall. `class_id` wird fest auf `classId` gesetzt, weil `lockClass` das Feld ausblendet.

- [ ] **Step 6: Klassenkasse-Tab ersetzen**

Formular in einen Dialog, Buchungen als Liste mit Vorzeichenfarbe:

```tsx
      {tab === "fund" ? (
        <section className="card-raised overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Klassenkasse</h2>
              <p className="mt-0.5 text-[13px] text-ink-3">
                Aktueller Saldo:{" "}
                <span
                  className={`font-semibold ${fundBalance < 0 ? "text-rose-700" : "text-emerald-700"}`}
                >
                  {formatCurrency(fundBalance)}
                </span>
              </p>
            </div>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setIsFundModalOpen(true)}
            >
              Buchung erfassen
            </button>
          </div>

          {fundQuery.data?.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Keine Buchungen"
                description="Noch keine Ein- oder Auszahlungen erfasst."
                actionLabel="Buchung erfassen"
                onAction={() => setIsFundModalOpen(true)}
              />
            </div>
          ) : (
            <div className="divide-y divide-line">
              {fundQuery.data?.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {entry.entry_type === "deposit" ? "Einzahlung" : "Auszahlung"}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-ink-3">
                      {formatDate(entry.entry_date)}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        entry.entry_type === "deposit" ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {formatCurrency(
                        entry.entry_type === "deposit" ? entry.amount : -entry.amount,
                      )}
                    </span>
                    <Menu
                      items={[
                        {
                          kind: "action",
                          label: "Buchung löschen",
                          tone: "danger",
                          onSelect: () => void handleDeleteFundEntry(entry.id),
                        },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
```

Mit:

```tsx
  const handleDeleteFundEntry = async (entryId: string) => {
    const confirmed = await confirm({
      title: "Buchung löschen?",
      description: "Die Buchung wird dauerhaft entfernt und der Saldo neu berechnet.",
      confirmLabel: "Buchung löschen",
    });

    if (!confirmed) {
      return;
    }

    try {
      await fundQuery.deleteEntry.mutateAsync(entryId);
      toast.success("Buchung gelöscht.");
    } catch {
      toast.error("Buchung konnte nicht gelöscht werden.");
    }
  };
```

Der Buchungs-Dialog nutzt `Field` für alle vier Eingaben (Art, Betrag, Datum, Notiz) und ruft im `onSubmit` unverändert `fundQuery.createEntry.mutateAsync` mit denselben Feldern wie bisher (Zeilen 425–442) auf, gefolgt von `setIsFundModalOpen(false)` und `toast.success("Buchung gespeichert.")`.

- [ ] **Step 7: `{confirmDialog}` am Ende des `return` einfügen**

- [ ] **Step 8: Build und Sichtprüfung**

Run: `npm run build`

Run: `npm run dev` → eine Klasse öffnen

Prüfen: Breadcrumbs oben; Kennzahlen unter dem Titel; Tabs mit Unterstrich statt Buttons; Schülerzeilen ohne sichtbaren Löschen-Button, Verschieben über das Menü; Fach anlegen im Dialog mit beschrifteten Feldern; Klassenkasse mit farbigem Saldo und Buchungs-Dialog; alle Löschungen mit gestaltetem Dialog.

- [ ] **Step 9: Commit**

```bash
git add src/pages/ClassDetailPage.tsx
git commit -m "$(cat <<'EOF'
Überarbeite Klassen-Detailseite mit Tabs, Listen und Dialogen

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Schülerseite (StudentsPage)

**Files:**
- Modify: `src/pages/StudentsPage.tsx` (Darstellung ab Zeile 150; Datenteil Zeilen 1–148 bleibt unverändert)

**Interfaces:**
- Consumes: `PageHeader`, `Menu`, `Modal`, `Field`, `GradeBadge`, `useConfirm`
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Importe und Confirm-Hook ergänzen**

```tsx
import { Field } from "../components/ui/Field";
import { GradeBadge } from "../components/ui/GradeBadge";
import { Menu } from "../components/ui/Menu";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { useConfirm } from "../components/ui/useConfirm";
```

Und `const { confirm, confirmDialog } = useConfirm();` in der Komponente.

- [ ] **Step 2: Handler auslagern**

Den Inline-`onSubmit` (Zeilen 174–215) als `handleCreateStudent` und den Inline-`onClick` des Löschen-Buttons (Zeilen 325–350) als `handleDeleteStudent` extrahieren. Im Löschhandler `window.confirm` ersetzen durch:

```tsx
    const confirmed = await confirm({
      title: `${student.first_name} ${student.last_name} löschen?`,
      description:
        "Alle Ergebnisse dieses Schülers werden entfernt. Direkt danach kannst du die Aktion über „Rückgängig" wiederherstellen.",
      confirmLabel: "Schüler löschen",
    });

    if (!confirmed) {
      return;
    }
```

Der Rest des Handlers (Mutation, Toast, `setDeleteError`) bleibt Zeile für Zeile wie bisher.

- [ ] **Step 3: `return`-Block ersetzen**

Aufbau: `PageHeader` (Titel „Schüler", Kennzahl Anzahl, Aktion „Schüler hinzufügen") → Filterkarte mit `Field`-beschrifteter Suche und Klassenfilter samt Trefferzahl und „Filter zurücksetzen" → Fehlerzustände → Kartenraster.

Die Schülerkarte:

```tsx
              <article key={student.id} className="card-raised group relative p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white"
                    >
                      {initials.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <Link
                        to={`/students/${student.id}`}
                        className="block truncate text-base font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-accent-strong"
                      >
                        {student.first_name} {student.last_name}
                      </Link>
                      <p className="mt-0.5 text-[13px] text-ink-3">{getClassName(classId)}</p>
                    </div>
                  </div>
                  <div className="relative z-10 shrink-0">
                    <Menu
                      items={[
                        { kind: "link", label: "Details öffnen", to: `/students/${student.id}` },
                        { kind: "separator" },
                        {
                          kind: "action",
                          label: "Schüler löschen",
                          tone: "danger",
                          onSelect: () => void handleDeleteStudent(student),
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-[13px] text-ink-3">Notendurchschnitt</span>
                  <GradeBadge grade={average ?? null} fallback="—" />
                </div>
              </article>
```

Der Anlege-Dialog nutzt `Modal` (Titel „Schüler hinzufügen") mit `Field`-beschrifteten Eingaben für Klasse, Vorname, Nachname und Notiz; der Submit-Button liegt im `footer` und referenziert `form="student-create-form"`.

Am Ende `{confirmDialog}` einfügen.

- [ ] **Step 4: Build und Sichtprüfung**

Run: `npm run build`

Run: `npm run dev` → `/students`

Prüfen: Filterleiste mit Labels und Trefferzahl; Karten mit Menü statt Löschen-Button; Durchschnitt als farbiges Badge; Anlegen im Dialog.

- [ ] **Step 5: Commit**

```bash
git add src/pages/StudentsPage.tsx
git commit -m "$(cat <<'EOF'
Überarbeite Schülerseite mit Menü, beschrifteten Filtern und Dialog

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Bestehende Dialoge auf Modal umstellen

**Files:**
- Modify: `src/components/ui/StudentCreateModal.tsx` (vollständig ersetzen)
- Modify: `src/components/grades/AssessmentCreateDrawer.tsx` (vollständig ersetzen)

**Interfaces:**
- Consumes: `Modal` (Task 2), `Field` (Task 3)
- Produces: unveränderte Props beider Komponenten — `StudentCreateModalProps` und `AssessmentCreateDrawerProps` bleiben exakt wie bisher, damit die aufrufenden Seiten nicht angepasst werden müssen.

- [ ] **Step 1: `StudentCreateModal` auf `Modal` umstellen**

Die eigene Backdrop-, ESC- und Fokus-Logik (Zeilen 22–76) entfällt vollständig — das übernimmt `Modal`. Die Komponente wird zu:

```tsx
import { Field } from "./Field";
import { Modal } from "./Modal";
import { studentSchema } from "../../schemas/students";

interface StudentCreateModalProps {
  isOpen: boolean;
  isSaving: boolean;
  values: {
    first_name: string;
    last_name: string;
    notes: string;
  };
  error: string | null;
  onChange: (values: { first_name: string; last_name: string; notes: string }) => void;
  onClose: () => void;
  onSave: (values: { first_name: string; last_name: string; notes?: string }) => Promise<void>;
}

export const StudentCreateModal = ({
  isOpen,
  isSaving,
  values,
  error,
  onChange,
  onClose,
  onSave,
}: StudentCreateModalProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Schüler hinzufügen"
    description="Vor- und Nachname sind Pflicht, die Notiz ist optional."
    size="sm"
    footer={
      <>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
          Abbrechen
        </button>
        <button type="submit" form="student-modal-form" className="btn-primary" disabled={isSaving}>
          {isSaving ? "Wird gespeichert..." : "Schüler anlegen"}
        </button>
      </>
    }
  >
    <form
      id="student-modal-form"
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const parsed = studentSchema.safeParse(values);
        if (!parsed.success) {
          return;
        }

        await onSave(parsed.data);
      }}
    >
      <Field label="Vorname" htmlFor="student-modal-first">
        <input
          id="student-modal-first"
          className="field"
          placeholder="Anna"
          value={values.first_name}
          onChange={(event) => onChange({ ...values, first_name: event.target.value })}
        />
      </Field>

      <Field label="Nachname" htmlFor="student-modal-last">
        <input
          id="student-modal-last"
          className="field"
          placeholder="Bauer"
          value={values.last_name}
          onChange={(event) => onChange({ ...values, last_name: event.target.value })}
        />
      </Field>

      <Field
        label="Notiz"
        htmlFor="student-modal-notes"
        hint="Nur für dich sichtbar, zum Beispiel Sitzplatz oder Förderbedarf."
      >
        <textarea
          id="student-modal-notes"
          className="field min-h-24"
          value={values.notes}
          onChange={(event) => onChange({ ...values, notes: event.target.value })}
        />
      </Field>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
    </form>
  </Modal>
);
```

- [ ] **Step 2: `AssessmentCreateDrawer` auf `Modal` umstellen**

Ebenfalls die eigene Overlay-Logik (Zeilen 36–79) entfernen. Die Felder bekommen Labels und Hinweise:

- „Name" — Hinweis „Erscheint in der Detailansicht des Leistungsnachweises."
- „Kurzbezeichnung" — Hinweis „Wird als Spaltenkopf in der Notentabelle angezeigt, z. B. HÜ1."
- „Art" (`typeId`, ruft weiterhin `onApplyTypeDefaults`) — Hinweis „Die Art setzt Vorgaben für Eingabeart, Maximalpunkte und Gewicht."
- „Datum" (`assessmentDate`)
- „Eingabeart" (`inputMode`) — Hinweis abhängig vom Wert: bei `points` „Du trägst Punkte ein.", bei `grade` „Du trägst Noten von 1 bis 5 ein.", bei `either` „Du kannst pro Schüler zwischen Punkten und Note wechseln."
- „Maximalpunkte" (`maxPoints`) — Hinweis „Basis für die Prozentrechnung. Leer lassen, wenn es keine Obergrenze gibt."
- „Gewicht" (`weightMultiplier`) — Hinweis „1 = normale Gewichtung, 2 = zählt doppelt."
- „In Gesamtrechnung einbeziehen" (`includeInTotal`) als Checkbox mit Hinweis „Ausgeschaltet zählt der Nachweis nicht in Summe, Prozent und Note."

Der Speichern-Button liegt im `footer` mit `form="assessment-create-form"`, der Fehler wird über `ErrorState` gerendert. Titel: „Neuer Leistungsnachweis", `size="md"`.

- [ ] **Step 3: Build und Sichtprüfung**

Run: `npm run build`

Run: `npm run dev`

Prüfen: Beide Dialoge erscheinen mittig (Desktop) bzw. als Sheet von unten (Mobil), schließen mit ESC, Backdrop-Klick und „×"; Tab-Taste bleibt im Dialog gefangen; alle Felder haben sichtbare Labels.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/StudentCreateModal.tsx src/components/grades/AssessmentCreateDrawer.tsx
git commit -m "$(cat <<'EOF'
Stelle Schüler- und Leistungsnachweis-Dialog auf gemeinsame Modal-Basis um

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Fachübersicht — Kopf und Filterleiste

**Files:**
- Modify: `src/pages/SubjectOverviewPage.tsx` (Zeilen 221–338 und 427–493; Datenteil Zeilen 1–219 bleibt unverändert)

**Interfaces:**
- Consumes: `PageHeader`, `Field`, `Modal`, `StatusLegend`
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Importe ergänzen**

```tsx
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusLegend } from "../components/ui/StatusLegend";
```

- [ ] **Step 2: Aktive Filter zählen**

Oberhalb des `return` ergänzen:

```tsx
  const activeFilterCount =
    (searchTerm ? 1 : 0) +
    (selectedTypeFilter === "all" ? 0 : 1) +
    (sortMode === "name" ? 0 : 1) +
    (statusFilter === "all" ? 0 : 1) +
    (onlyIncomplete ? 1 : 0) +
    (showDirectGrades ? 0 : 1);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedTypeFilter("all");
    setSortMode("name");
    setStatusFilter("all");
    setOnlyIncomplete(false);
    setShowDirectGrades(true);
  };
```

- [ ] **Step 3: Kopf-Section (Zeilen 223–338) ersetzen**

```tsx
      <PageHeader
        breadcrumbs={
          classIdParam
            ? [
                { label: "Klassen", to: "/classes" },
                { label: classQuery.data?.name ?? "Klasse", to: `/classes/${derivedClassId}` },
                { label: subjectQuery.data?.name ?? "Fach" },
              ]
            : [
                { label: "Fächer", to: "/subjects" },
                { label: subjectQuery.data?.name ?? "Fach" },
              ]
        }
        eyebrow={classQuery.data?.name ?? "Klasse"}
        title={subjectQuery.data?.name ?? "Fachübersicht"}
        stats={[
          { label: "Schüler", value: students.length },
          { label: "Leistungsnachweise", value: visibleDefinitions.length },
        ]}
        actions={
          <button type="button" className="btn-primary" onClick={() => setIsDrawerOpen(true)}>
            Leistungsnachweis anlegen
          </button>
        }
      />

      {/* Filter — mobil kompakt, ab lg vollständig */}
      <section className="card p-4">
        <div className="flex gap-2 lg:hidden">
          <input
            className="field"
            placeholder="Schüler suchen"
            aria-label="Schüler suchen"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() => setIsMobileFilterOpen(true)}
          >
            Filter
            {activeFilterCount > 0 ? (
              <span className="badge-accent ml-1">{activeFilterCount}</span>
            ) : null}
          </button>
        </div>

        <div className="hidden lg:block">
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Schüler suchen" htmlFor="overview-search">
              <input
                id="overview-search"
                className="field"
                placeholder="Name"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </Field>
            <Field label="Art des Nachweises" htmlFor="overview-type">
              <select
                id="overview-type"
                className="field"
                value={selectedTypeFilter}
                onChange={(event) => setSelectedTypeFilter(event.target.value)}
              >
                <option value="all">Alle Arten</option>
                {filterTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
                <option value="">Sonstiges</option>
              </select>
            </Field>
            <Field label="Sortierung" htmlFor="overview-sort">
              <select
                id="overview-sort"
                className="field"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as "name" | "best" | "weakest")}
              >
                <option value="name">Nach Name</option>
                <option value="best">Beste zuerst</option>
                <option value="weakest">Schwächste zuerst</option>
              </select>
            </Field>
            <Field label="Status" htmlFor="overview-status">
              <select
                id="overview-status"
                className="field"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | "open" | "makeup_pending" | "excused",
                  )
                }
              >
                <option value="all">Alle Status</option>
                <option value="open">Offen oder fehlend</option>
                <option value="makeup_pending">Nachtrag offen</option>
                <option value="excused">Entschuldigt</option>
              </select>
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <button
              type="button"
              aria-pressed={onlyIncomplete}
              className={onlyIncomplete ? "chip chip-active" : "chip"}
              onClick={() => setOnlyIncomplete((value) => !value)}
            >
              Nur unvollständige
            </button>
            <button
              type="button"
              aria-pressed={showDirectGrades}
              className={showDirectGrades ? "chip chip-active" : "chip"}
              onClick={() => setShowDirectGrades((value) => !value)}
            >
              Direkte Noten anzeigen
            </button>

            <span className="ml-auto text-[13px] text-ink-3">
              {students.length} von {studentsQuery.data?.length ?? 0} Schülern
            </span>
            {activeFilterCount > 0 ? (
              <button type="button" className="btn-ghost btn-sm" onClick={resetFilters}>
                Zurücksetzen
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {formError ? <ErrorState message={formError} /> : null}
      {deleteError ? <ErrorState message={deleteError} /> : null}
      {matrixQuery.error ? <ErrorState message={matrixQuery.error.message} /> : null}
```

- [ ] **Step 4: Legende unter der Matrix ergänzen**

Im Zweig, in dem `GradeMatrix` gerendert wird, direkt nach `</div>` des `hidden lg:block`-Containers ergänzen:

```tsx
            <div className="border-t border-line px-5 py-3">
              <StatusLegend />
            </div>
```

- [ ] **Step 5: Mobilen Filter-Sheet (Zeilen 427–493) auf `Modal` umstellen**

```tsx
      <Modal
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter"
        description={`${students.length} von ${studentsQuery.data?.length ?? 0} Schülern werden angezeigt.`}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                resetFilters();
                setIsMobileFilterOpen(false);
              }}
            >
              Zurücksetzen
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsMobileFilterOpen(false)}
            >
              Anzeigen
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Art des Nachweises" htmlFor="mobile-type">
            <select
              id="mobile-type"
              className="field"
              value={selectedTypeFilter}
              onChange={(event) => setSelectedTypeFilter(event.target.value)}
            >
              <option value="all">Alle Arten</option>
              {filterTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
              <option value="">Sonstiges</option>
            </select>
          </Field>

          <Field label="Sortierung" htmlFor="mobile-sort">
            <select
              id="mobile-sort"
              className="field"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as "name" | "best" | "weakest")}
            >
              <option value="name">Nach Name</option>
              <option value="best">Beste zuerst</option>
              <option value="weakest">Schwächste zuerst</option>
            </select>
          </Field>

          <Field label="Status" htmlFor="mobile-status">
            <select
              id="mobile-status"
              className="field"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | "open" | "makeup_pending" | "excused")
              }
            >
              <option value="all">Alle Status</option>
              <option value="open">Offen oder fehlend</option>
              <option value="makeup_pending">Nachtrag offen</option>
              <option value="excused">Entschuldigt</option>
            </select>
          </Field>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={onlyIncomplete}
              className={onlyIncomplete ? "chip chip-active" : "chip"}
              onClick={() => setOnlyIncomplete((value) => !value)}
            >
              Nur unvollständige
            </button>
            <button
              type="button"
              aria-pressed={showDirectGrades}
              className={showDirectGrades ? "chip chip-active" : "chip"}
              onClick={() => setShowDirectGrades((value) => !value)}
            >
              Direkte Noten anzeigen
            </button>
          </div>
        </div>
      </Modal>
```

Das mobile Suchfeld und der „+ Leistungsnachweis"-Button aus dem alten Kopfbereich entfallen dort, weil sie oben bereits enthalten sind.

- [ ] **Step 6: Build und Sichtprüfung**

Run: `npm run build`

Run: `npm run dev` → ein Fach öffnen

Prüfen: Breadcrumbs zeigen den vollen Pfad; alle Filter haben Labels; Toggle-Chips färben sich bei Aktivierung; Trefferzahl und „Zurücksetzen" erscheinen; mobil zeigt der Filter-Button die Anzahl aktiver Filter; die Legende erklärt E/U/N/B.

- [ ] **Step 7: Commit**

```bash
git add src/pages/SubjectOverviewPage.tsx
git commit -m "$(cat <<'EOF'
Überarbeite Kopf und Filterleiste der Fachübersicht

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Notenmatrix aufräumen

**Files:**
- Modify: `src/components/grades/GradeTable.tsx` (Spaltenköpfe und Rahmen)
- Modify: `src/components/grades/GradeRow.tsx` (Zebra, Note als Badge)
- Modify: `src/components/grades/GradeCell.tsx` (Statusmetadaten zentralisieren, Speicherzustände)

**Interfaces:**
- Consumes: `Menu` (Task 3), `GradeBadge` und `STATUS_META` / `STATUS_OPTIONS` (Task 4)
- Produces: unveränderte Props aller drei Komponenten

**Wichtig:** Die Logik in `GradeCell` (Debounce, `buildPayload`, `commit`, Escape-Verhalten, Paste-Weitergabe) bleibt Zeile für Zeile erhalten. Geändert werden nur Klassennamen, die beiden lokalen Status-Konstanten und die Darstellung der Speicherzustände.

- [ ] **Step 1: Spaltenkopf in `GradeTable.tsx` vereinheitlichen**

Beide Kopfvarianten (mit und ohne Gruppierung) nutzen künftig denselben Inhalt. Oberhalb der Komponente eine lokale Kopfzelle definieren:

```tsx
const DefinitionHeader = ({
  definition,
  classId,
  subjectId,
  typeLabelText,
  showTypeBadge,
  isActive,
  onToggleInclude,
  onDelete,
}: {
  definition: AssessmentDefinition;
  classId: string;
  subjectId: string;
  typeLabelText: string;
  showTypeBadge: boolean;
  isActive: boolean;
  onToggleInclude: (definitionId: string, includeInTotal: boolean) => void;
  onDelete: () => void;
}) => (
  <th
    scope="col"
    className={`border-b border-line px-3 py-3 text-left align-top ${
      isActive ? "bg-accent-soft/60" : "bg-surface"
    }`}
  >
    <div className="flex items-start justify-between gap-1">
      <div className="min-w-0">
        <Link
          to={`/classes/${classId}/subjects/${subjectId}/assessments/${definition.id}`}
          className="block truncate text-sm font-semibold text-ink hover:text-accent-strong"
          title={definition.name}
        >
          {definition.short_label || definition.name}
        </Link>
        <p className="mt-0.5 whitespace-nowrap text-[11px] text-ink-3">
          {showTypeBadge ? `${typeLabelText} · ` : ""}
          {definition.max_points !== null ? `max ${definition.max_points}` : "ohne Max"}
          {definition.weight_multiplier !== 1 ? ` · ×${definition.weight_multiplier}` : ""}
        </p>
        {definition.include_in_total ? null : (
          <span className="badge-neutral mt-1.5">zählt nicht</span>
        )}
      </div>
      <Menu
        align="right"
        label={`Aktionen für ${definition.name}`}
        items={[
          {
            kind: "link",
            label: "Auswertung öffnen",
            to: `/classes/${classId}/subjects/${subjectId}/assessments/${definition.id}`,
          },
          {
            kind: "action",
            label: definition.include_in_total
              ? "Aus Gesamtrechnung nehmen"
              : "In Gesamtrechnung aufnehmen",
            onSelect: () => onToggleInclude(definition.id, !definition.include_in_total),
          },
          { kind: "separator" },
          { kind: "action", label: "Nachweis löschen", tone: "danger", onSelect: onDelete },
        ]}
      />
    </div>
  </th>
);
```

Beide `definitions.map(...)`-Blöcke in `<thead>` rufen `DefinitionHeader` auf; im gruppierten Fall mit `showTypeBadge={false}` (die Gruppenzeile nennt die Art bereits), sonst mit `showTypeBadge`.

`onDelete` verwendet nicht mehr `window.confirm`, sondern reicht direkt an `onDeleteDefinition` weiter — die Bestätigung übernimmt die aufrufende Seite. Dazu in `SubjectOverviewPage` den `onDeleteDefinition`-Handler um den `confirm`-Aufruf aus `useConfirm` erweitern:

```tsx
                onDeleteDefinition={async (definitionId) => {
                  setDeleteError(null);

                  const confirmed = await confirm({
                    title: "Leistungsnachweis löschen?",
                    description:
                      "Alle eingetragenen Ergebnisse dieses Nachweises werden entfernt. Direkt danach kannst du die Aktion über „Rückgängig" wiederherstellen.",
                    confirmLabel: "Nachweis löschen",
                  });

                  if (!confirmed) {
                    return;
                  }

                  try {
                    const snapshot = await matrixQuery.deleteDefinition.mutateAsync(definitionId);
                    toast.undoable("Leistungsnachweis gelöscht.", async () => {
                      await matrixQuery.restoreDeletedDefinition.mutateAsync(snapshot);
                      toast.success("Leistungsnachweis wurde wiederhergestellt.");
                    });
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Leistungsnachweis konnte nicht gelöscht werden.";
                    toast.error(message);
                    setDeleteError(message);
                  }
                }}
```

Der `throw` am Ende entfällt, weil die Kopfzelle den Fehler nicht mehr abfängt. `useConfirm` und `{confirmDialog}` müssen in `SubjectOverviewPage` ergänzt werden.

- [ ] **Step 2: Tastatur-Hinweis und Rahmen in `GradeTable.tsx`**

Den äußeren Container ersetzen:

```tsx
    <div className="space-y-2">
      {pasteInfo ? (
        <div className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {pasteInfo}
        </div>
      ) : null}
      {pasteError ? (
        <div className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {pasteError}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          {/* thead und tbody unverändert in Struktur */}
        </table>
      </div>

      <p className="border-t border-line px-5 py-2.5 text-[13px] text-ink-3">
        Enter bearbeiten · Pfeiltasten navigieren · Escape verwirft · Mehrere Werte aus einer
        Tabelle in eine Spalte einfügen
      </p>
    </div>
```

Die sticky Ergebnis-Spalten behalten ihre `style`-Angaben (`right: 224`, `right: 112`), tauschen aber `bg-slate-50` gegen `bg-sunken` und `border-slate-200` gegen `border-line`.

- [ ] **Step 3: `GradeRow.tsx` — Zebra und Notenbadge**

`<tr>`-Klassen ersetzen:

```tsx
    <tr
      className={`group ${rowIndex % 2 === 1 ? "bg-sunken/50" : ""} hover:bg-accent-soft/40 ${
        activeRowIndex === rowIndex ? "bg-accent-soft/60" : ""
      }`}
    >
```

Die Namensspalte:

```tsx
      <td
        className={`sticky left-0 z-10 border-b border-line px-4 py-2.5 font-medium text-ink ${
          activeRowIndex === rowIndex
            ? "bg-accent-soft"
            : rowIndex % 2 === 1
              ? "bg-sunken"
              : "bg-surface"
        }`}
      >
```

Die drei Ergebnisspalten: `bg-slate-50` → `bg-sunken`, `border-slate-100` → `border-line`, Zahlen mit `tabular-nums`. Die Notenspalte rendert statt `{finalGrade ?? "—"}`:

```tsx
        <GradeBadge grade={finalGrade} />
```

Import ergänzen: `import { GradeBadge } from "../ui/GradeBadge";`

- [ ] **Step 4: `GradeCell.tsx` — Statusmetadaten zentralisieren**

Die lokalen Konstanten `statusOptions` (Zeilen 36–43) und `statusSymbols` (Zeilen 45–52) löschen und ersetzen durch:

```tsx
import { STATUS_META, STATUS_OPTIONS } from "../ui/statusMeta";
```

`valueLabel` nutzt `STATUS_META[status].symbol`, `valueClassName` gibt `STATUS_META[status].textClass` zurück (für `filled` mit Wert weiterhin `text-ink`, ohne Wert `text-ink-3`). Die Auswahl im Bearbeitungsmodus iteriert über `STATUS_OPTIONS`.

Die Ansichts-Schaltfläche (Zeilen 264–289) bekommt:

```tsx
        className={`h-9 w-full rounded-md border border-transparent px-2 text-left text-sm tabular-nums outline-none transition hover:border-line-strong hover:bg-surface focus:border-accent focus:ring-2 focus:ring-accent-ring ${valueClassName}`}
```

Der Bearbeitungscontainer (Zeile 295) wird zu:

```tsx
      className={`min-w-32 space-y-1 rounded-md border p-1.5 ${
        saveError ? "border-rose-300 bg-rose-50" : "border-accent bg-accent-soft"
      }`}
```

Die Speicherzustände (Zeilen 522–528) werden kompakter und ohne Layoutsprung:

```tsx
      <p className="min-h-4 text-[11px] leading-4">
        {saveError ? (
          <span className="font-medium text-rose-700">Nicht gespeichert</span>
        ) : saveState === "saving" ? (
          <span className="text-ink-3">Speichert…</span>
        ) : saveState === "saved" ? (
          <span className="text-emerald-700">✓ Gespeichert</span>
        ) : null}
      </p>
```

- [ ] **Step 5: Build und Sichtprüfung**

Run: `npm run build`

Run: `npm run dev` → ein Fach mit Leistungsnachweisen öffnen

Prüfen:
- Spaltenköpfe zeigen nur Kürzel und Meta; „⋯" enthält Auswertung, Gesamtrechnung-Umschaltung und Löschen.
- Zeilen sind abwechselnd hinterlegt; die aktive Zeile und Spalte sind hervorgehoben.
- Die Notenspalte zeigt farbige Badges.
- Legende und Tastatur-Hinweis stehen unter der Tabelle.
- Tastatur: Pfeile bewegen die Auswahl, Enter öffnet die Bearbeitung, Escape verwirft, Einfügen mehrerer Zeilen füllt die Spalte.
- Löschen eines Nachweises zeigt den gestalteten Dialog und danach den Rückgängig-Toast.

- [ ] **Step 6: Commit**

```bash
git add src/components/grades/GradeTable.tsx src/components/grades/GradeRow.tsx src/components/grades/GradeCell.tsx src/pages/SubjectOverviewPage.tsx
git commit -m "$(cat <<'EOF'
Räume Notenmatrix auf: Spaltenmenü, Zebra, Notenfarben und Legende

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Mobile Notenliste, Schüler- und Nachweis-Detailseite

**Files:**
- Modify: `src/components/grades/SubjectMobileList.tsx`
- Modify: `src/pages/StudentDetailPage.tsx`
- Modify: `src/pages/AssessmentOverviewPage.tsx`

**Interfaces:**
- Consumes: `Modal`, `Field`, `GradeBadge`, `STATUS_META`, `STATUS_OPTIONS`, `PageHeader`
- Produces: unveränderte Props von `SubjectMobileList`

- [ ] **Step 1: `SubjectMobileList` angleichen**

Die lokalen `statusSymbols` und `statusOptions` (Zeilen 29–43) löschen, stattdessen `import { STATUS_META, STATUS_OPTIONS } from "../ui/statusMeta";`. `resultLabel` nutzt `STATUS_META[status].symbol`.

Die drei Kennzahl-Kacheln (Zeilen mit „Punkte", „Prozent", „Note") ersetzen durch:

```tsx
              <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-[13px]">
                <span className="text-ink-3">
                  Punkte{" "}
                  <span className="font-semibold tabular-nums text-ink">
                    {row.totals.maxWeighted > 0
                      ? `${row.totals.achievedWeighted.toFixed(1)} / ${row.totals.maxWeighted.toFixed(1)}`
                      : "—"}
                  </span>
                </span>
                <span className="text-ink-3">
                  Prozent{" "}
                  <span className="font-semibold tabular-nums text-ink">
                    {row.totals.percent === null ? "—" : `${row.totals.percent.toFixed(1)} %`}
                  </span>
                </span>
                <span className="ml-auto">
                  <GradeBadge grade={row.finalGrade} />
                </span>
              </div>
```

Die Karte wird `card-raised p-4`, die Eintrags-Buttons erhalten `border-line`-Rahmen und zeigen den Wert als `badge-neutral` bzw. bei Status ungleich `filled` in der Farbe aus `STATUS_META[...].textClass`.

Der Editor-Sheet (Zeilen ab `{editor ? (`) wird durch `Modal` ersetzt: `isOpen={Boolean(editor)}`, `onClose={() => setEditor(null)}`, `title={editor?.definition.name ?? ""}`, `description` mit dem Schülernamen, Speichern-Button im `footer`. Die Felder bekommen `Field`-Labels („Status", „Eingabeart", „Punkte", „Note"). `handleSave` bleibt unverändert.

- [ ] **Step 2: `StudentDetailPage` überarbeiten**

Den `return`-Block ersetzen:

```tsx
  return (
    <>
      <PageHeader
        breadcrumbs={
          classIdParam
            ? [
                { label: "Klassen", to: "/classes" },
                { label: classQuery.data?.name ?? "Klasse", to: `/classes/${derivedClassId}` },
                { label: `${studentQuery.data?.first_name ?? ""} ${studentQuery.data?.last_name ?? ""}`.trim() || "Schüler" },
              ]
            : [
                { label: "Schüler", to: "/students" },
                { label: `${studentQuery.data?.first_name ?? ""} ${studentQuery.data?.last_name ?? ""}`.trim() || "Schüler" },
              ]
        }
        eyebrow={classQuery.data?.name ?? "Klasse"}
        title={`${studentQuery.data?.first_name ?? ""} ${studentQuery.data?.last_name ?? ""}`.trim() || "Schüler"}
        description={studentQuery.data?.notes || undefined}
      />

      {assessmentOverviewQuery.error ? (
        <ErrorState message={assessmentOverviewQuery.error.message} />
      ) : null}

      {groupedBySubject.length === 0 ? (
        <EmptyState
          title="Noch keine Fächer"
          description="Lege in der Klasse zuerst Fächer an, damit hier Ergebnisse erscheinen."
        />
      ) : (
        <div className="space-y-4">
          {groupedBySubject.map(({ subject, entries }) => (
            <section key={subject.id} className="card-raised overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
                <h2 className="text-base font-semibold text-ink">{subject.name}</h2>
                <Link
                  to={`/classes/${derivedClassId}/subjects/${subject.id}`}
                  className="btn-ghost btn-sm"
                >
                  Zur Notenübersicht
                </Link>
              </div>

              {entries.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-ink-3">
                  Noch keine Ergebnisse in diesem Fach.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {entries.map((entry) => {
                    const displayGrade =
                      entry.result?.grade !== null && entry.result?.grade !== undefined
                        ? entry.result.grade
                        : gradeFromPercent(
                            calculateAssessmentPercent(
                              entry.result?.points ?? null,
                              entry.definition.max_points,
                            ),
                            resolveGradeBoundaries(
                              assessmentOverviewQuery.data?.boundaries ?? [],
                              subject.id,
                            ),
                          );

                    return (
                      <div
                        key={entry.definition.id}
                        className="flex items-start justify-between gap-4 px-5 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {entry.definition.name}
                          </p>
                          <p className="mt-0.5 text-[13px] text-ink-3">
                            {entry.definition.assessment_date
                              ? formatDate(entry.definition.assessment_date)
                              : "Ohne Datum"}
                            {entry.result?.points !== null && entry.result?.points !== undefined
                              ? ` · ${entry.result.points} Punkte`
                              : ""}
                          </p>
                          {entry.result?.comment ? (
                            <p className="mt-1 text-[13px] text-ink-2">{entry.result.comment}</p>
                          ) : null}
                        </div>
                        <GradeBadge grade={displayGrade} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
```

Importe ergänzen: `PageHeader`, `GradeBadge`.

- [ ] **Step 3: `AssessmentOverviewPage` überarbeiten**

Kopf durch `PageHeader` mit vollständigen Breadcrumbs ersetzen; die vier Kennzahl-Panels werden zu `stats` im `PageHeader` (Durchschnitt, Minimum, Maximum, Eingetragen). Die Tabelle bekommt:

```tsx
          <table className="min-w-full text-sm">
            <thead className="bg-sunken">
              <tr>
                <th scope="col" className="border-b border-line px-4 py-3 text-left font-semibold text-ink-2">Schüler</th>
                <th scope="col" className="border-b border-line px-4 py-3 text-left font-semibold text-ink-2">Wert</th>
                <th scope="col" className="border-b border-line px-4 py-3 text-left font-semibold text-ink-2">Prozent</th>
                <th scope="col" className="border-b border-line px-4 py-3 text-left font-semibold text-ink-2">Note</th>
                <th scope="col" className="border-b border-line px-4 py-3 text-left font-semibold text-ink-2">Rang</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry, index) => (
                <tr key={entry.student.id} className={index % 2 === 1 ? "bg-sunken/50" : undefined}>
                  <td className="border-b border-line px-4 py-3 font-medium text-ink">
                    {entry.student.first_name} {entry.student.last_name}
                  </td>
                  <td className="border-b border-line px-4 py-3 tabular-nums text-ink-2">
                    {entry.result?.points !== null && entry.result?.points !== undefined
                      ? entry.result.points
                      : entry.result?.grade ?? "—"}
                  </td>
                  <td className="border-b border-line px-4 py-3 tabular-nums text-ink-2">
                    {entry.percent === null ? "—" : `${entry.percent.toFixed(1)} %`}
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    <GradeBadge grade={entry.percent === null ? null : entry.calculatedGrade} />
                  </td>
                  <td className="border-b border-line px-4 py-3 tabular-nums text-ink-3">
                    {entry.rank ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
```

- [ ] **Step 4: Build und Sichtprüfung**

Run: `npm run build`

Run: `npm run dev` bei 375 px Breite → ein Fach öffnen

Prüfen: Die mobile Liste zeigt pro Schüler Punkte, Prozent und farbiges Notenbadge; Antippen eines Eintrags öffnet den Modal-Sheet mit beschrifteten Feldern; Schüler-Detail und Nachweis-Auswertung haben Breadcrumbs und Kennzahlenzeile.

- [ ] **Step 5: Commit**

```bash
git add src/components/grades/SubjectMobileList.tsx src/pages/StudentDetailPage.tsx src/pages/AssessmentOverviewPage.tsx
git commit -m "$(cat <<'EOF'
Überarbeite mobile Notenliste sowie Schüler- und Nachweis-Detailseite

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Login-Seite

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/components/auth/LoginForm.tsx`

**Interfaces:**
- Consumes: `Field` (Task 3), `ErrorState` (Task 4)
- Produces: unveränderte `LoginFormProps`

- [ ] **Step 1: `LoginPage` ersetzen**

```tsx
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { LoginForm } from "../components/auth/LoginForm";
import { useAuth } from "../hooks/useAuth";
import { supabaseConfigError } from "../lib/supabase/client";

export const LoginPage = () => {
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (values: { email: string; password: string }) => {
    setIsSubmitting(true);
    try {
      await signIn(values.email, values.password);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgb(var(--c-accent)/0.14),transparent_45%),radial-gradient(circle_at_90%_110%,rgb(var(--c-accent)/0.10),transparent_45%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white"
          >
            N
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-ink">Notenverwaltung</h1>
          <p className="mt-1.5 text-sm text-ink-3">
            Noten, Leistungsnachweise und Klassenkasse an einem Ort.
          </p>
        </div>

        <div className="card-raised p-6">
          {supabaseConfigError ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {supabaseConfigError}
            </div>
          ) : null}

          <LoginForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isDisabled={Boolean(supabaseConfigError)}
          />
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: `LoginForm` auf `Field` und `ErrorState` umstellen**

Die beiden `<div>`-Blöcke mit eigenem `<label>` durch `Field` ersetzen (`htmlFor="login-email"` bzw. `"login-password"`, passende `id` am Input). Den Fehler-Absatz durch `<ErrorState message={error} />` ersetzen. Der Button behält Text und `disabled`-Logik, bekommt aber `className="btn-primary w-full"`.

- [ ] **Step 3: Build und Sichtprüfung**

Run: `npm run build`

Run: `npm run dev` → `/login`

Prüfen: Zentrierte, schmale Karte auf dezent eingefärbtem Hintergrund; Labels sichtbar; Fehlermeldung im neuen Fehlerstil; Login funktioniert.

- [ ] **Step 4: Commit**

```bash
git add src/pages/LoginPage.tsx src/components/auth/LoginForm.tsx
git commit -m "$(cat <<'EOF'
Überarbeite Login-Seite und Login-Formular

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: Aufräumen und Gesamtabnahme

**Files:**
- Modify: `src/index.css` (Legacy-Aliase entfernen)
- Modify: verbleibende Dateien mit alten Klassennamen

- [ ] **Step 1: Verbliebene Altklassen finden**

Run:

```bash
grep -rn "button-primary\|button-secondary\|button-danger\|\bpanel\b\|text-slate-\|border-slate-\|bg-slate-\|text-brand-\|bg-brand-" src --include=*.tsx
```

Jeden Treffer auf die neuen Klassen umstellen: `button-*` → `btn-*`, `panel` → `card-raised card-pad`, `text-slate-900` → `text-ink`, `text-slate-600` → `text-ink-2`, `text-slate-500`/`400` → `text-ink-3`, `border-slate-200` → `border-line`, `border-slate-300` → `border-line-strong`, `bg-slate-50` → `bg-sunken`, `text-brand-700` → `text-accent-strong`, `bg-brand-50` → `bg-accent-soft`.

Ausgenommen bleiben bewusste Semantikfarben (`rose`, `emerald`, `amber`, `indigo`, `lime`, `yellow`, `orange`, `sky`) — die sind gewollt.

- [ ] **Step 2: Legacy-Aliase aus `src/index.css` entfernen**

Den Kommentarblock „Legacy-Aliase" samt `.panel`, `.button-primary`, `.button-secondary`, `.button-danger` löschen.

- [ ] **Step 3: Build und Vollständigkeitsprüfung**

Run: `npm run build`
Expected: erfolgreich.

Run: `grep -rn "button-primary\|button-secondary\|button-danger" src --include=*.tsx`
Expected: keine Treffer.

Run: `grep -rn "window.confirm" src --include=*.tsx`
Expected: keine Treffer.

Run: `git diff --stat main -- src/hooks src/lib src/schemas supabase package.json`
Expected: **leer** — die harte Grenze wurde eingehalten.

- [ ] **Step 4: Vollständiger manueller Durchgang**

Run: `npm run dev`

Ablauf bei 1440 px und danach bei 375 px:
1. Login
2. Übersicht → Klasse anlegen
3. Klasse öffnen → Schüler anlegen → Fach anlegen mit „Punkte mit Umrechnung" und geänderten Stufen
4. Fach öffnen → Leistungsnachweis anlegen → Werte in mehrere Zellen eintragen → Status „Entschuldigt" setzen
5. Mehrere Werte aus einer Tabellenkalkulation in eine Spalte einfügen
6. Leistungsnachweis löschen → Rückgängig im Toast
7. Schüler löschen → Rückgängig im Toast
8. Schüler-Detail und Nachweis-Auswertung öffnen
9. Klassenkasse: Ein- und Auszahlung erfassen, eine Buchung löschen
10. Abmelden über das Konto-Menü

Bei 375 px zusätzlich: Bottom-Leiste erreichbar, kein horizontales Scrollen der Seite (nur der Tabellencontainer scrollt), Toasts liegen über der Bottom-Leiste.

- [ ] **Step 5: Commit**

```bash
git add -A src docs
git commit -m "$(cat <<'EOF'
Entferne Legacy-Klassen und schließe UI-Überarbeitung ab

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Selbstprüfung des Plans

**Spec-Abdeckung:** Tokens/Typografie → Task 1. Bausteine → Tasks 2–4, 8. Navigation inkl. Bottom-Bar und Breadcrumbs → Task 6. Toasts → Task 5. Seiten → Tasks 7, 9, 10, 11, 13, 15, 16. Notenmatrix → Task 14. `window.confirm`-Ersatz → Tasks 9, 10, 11, 14 (verifiziert in Task 17). Punkte-Mapping-Editor → Task 8. Harte Grenze → in Task 17 per `git diff --stat` überprüft.

**Namenskonsistenz:** `SubjectFormValues` (Task 8) wird in Tasks 9 und 10 verwendet. `MenuItem`-Varianten (`action`, `link`, `separator`, `heading`) werden in Tasks 9, 10, 11, 14 genau so verwendet. `STATUS_META`/`STATUS_OPTIONS` (Task 4) in Tasks 14 und 15. `useConfirm` liefert `{ confirm, confirmDialog }` — in allen aufrufenden Tasks so benannt. `GradeBadge`-Prop heißt durchgängig `grade`.
