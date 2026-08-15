# Schuljahr-Wechsel mit Klassenhistorie Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lehrkräfte können eine Klasse am Ende eines Schuljahres ins neue Schuljahr "übernehmen" (Fächer-Konfiguration und Kassensaldo werden mitgenommen, Noten starten leer), ohne die Historie zu verlieren, und über einen Schuljahr-Umschalter zwischen aktuellem und vergangenen (read-only) Schuljahren wechseln.

**Architecture:** Eine neue `school_years`-Tabelle pro Lehrkraft mit genau einem `is_current`-Jahr. `classes` bekommt `school_year_id` + `predecessor_class_id` (Verkettung bei Fortführung). `enrollments` bekommt `school_year_id`, der globale `unique(student_id)`-Constraint wird durch `unique(student_id, school_year_id)` ersetzt — das ist der Kern-Blocker, der bisher jeden Jahres-/Klassenwechsel verhinderte. Ein React-Context (`SchoolYearProvider`, analog zum bestehenden `ToastProvider`) hält die im Umschalter gewählte Jahres-Auswahl bereit; bestehende Hooks/Seiten werden um einen optionalen `schoolYearId`-Filter erweitert, ohne bestehende Aufrufer zu brechen (additiv, kein Breaking Change).

**Tech Stack:** Supabase (Postgres, RLS), React, TanStack Query, Zod, Vitest — bestehender Stack, keine neuen Abhängigkeiten.

**Spec:** [docs/superpowers/specs/2026-08-15-schuljahr-wechsel-design.md](../specs/2026-08-15-schuljahr-wechsel-design.md)

## Global Constraints

- **Branch**: `main` (aktueller Branch, kein Feature-Branch verwendet in diesem Projekt bisher).
- **Commit-Nachrichten**: Deutsch, Imperativ, mit `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` als letzte Zeile.
- **Sprache**: UI-Texte und Test-Beschreibungen (`describe`/`it`) auf Deutsch, Umlaute ausgeschrieben — wie der Rest des Projekts.
- **Migrationen**: werden NICHT automatisch angewendet. Nach jedem Migrations-Task muss die SQL-Datei manuell im Supabase SQL Editor ausgeführt werden (bestehende Projekt-Konvention, siehe README.md "Supabase Setup").
- **Ownership/RLS**: bestehendes Muster aus `supabase/migrations/20260321093000_rls_owner_hardening.sql` — jede neue Tabelle bekommt `owner_id`/`teacher_id` (synchron gehalten via `public.ensure_matching_owner_teacher_ids()`-Trigger), RLS `enable` + `force`, vier Policies (`select_own`, `insert_own`, `update_own`, `delete_own`) benannt nach dem Muster `"<table>_<action>_own"`.
- **Keine DB-seitigen Geschäftsregeln**: Archiv-Schreibsperre (vergangene Jahre read-only) wird ausschließlich auf Hook-/UI-Ebene durchgesetzt, keine zusätzliche RLS-Policy dafür (siehe Spec, Abschnitt "Schuljahr-Umschalter & Archiv-Verhalten"). Analog werden Mehrfach-Insert-Ketten (z. B. Klasse fortführen) NICHT in eine echte DB-Transaktion gepackt — das Projekt hat dafür keine Stored Procedures, sondern verwendet bereits an anderer Stelle (`useStudents.deleteStudent`, `useSubjects.deleteSubject`) sequenzielle Supabase-Aufrufe mit frühem Abbruch bei Fehlern; dieses Muster wird hier fortgesetzt.
- **Supabase-Client ist ungetypt** (kein generischer `Database`-Typ in `src/lib/supabase/client.ts`) — `.insert(...)`-Aufrufe werden nicht gegen die TypeScript-Interfaces in `types.ts` geprüft. Das bedeutet: neue Pflichtfelder in Interfaces brechen den Build NICHT automatisch; sie müssen trotzdem an jeder Insert-Stelle ergänzt werden, sonst schlägt die DB-seitige `not null`-Constraint zur Laufzeit fehl.
- **Tests**: nur reine Funktionen werden mit Vitest getestet (`src/lib/**/*.test.ts`), keine Hook-/Komponenten-Tests — bestehende Projekt-Konvention (siehe `docs/superpowers/plans/2026-08-14-testabdeckung.md`). Verifikation von Hooks/Komponenten erfolgt über `npm run build` (TypeScript) und manuelle Prüfung.
- **Out of Scope** (siehe Spec): unterjähriger Klassenwechsel einzelner Schüler, Bearbeitung vergangener Schuljahre, mehrere Lehrkräfte pro Klasse.

---

### Task 1: Migration — `school_years`-Tabelle, Spalten, Constraint-Änderung, Backfill

**Files:**
- Create: `supabase/migrations/20260815100000_school_years.sql`

**Interfaces:**
- Consumes: bestehende Funktion `public.ensure_matching_owner_teacher_ids()` und `public.is_owner()` aus `supabase/migrations/20260228214000_init_notenverwaltung.sql` / `20260321093000_rls_owner_hardening.sql`
- Produces: Tabelle `public.school_years` (Spalten `id`, `owner_id`, `teacher_id`, `label`, `is_current`, `created_at`); `public.classes.school_year_id` (not null), `public.classes.predecessor_class_id` (nullable); `public.enrollments.school_year_id` (not null); Unique-Constraint `enrollments_student_school_year_key` auf `(student_id, school_year_id)` ersetzt den alten `unique(student_id)`. Wird von Task 3+ (TypeScript-Typen) und allen folgenden Hook-Tasks vorausgesetzt.

- [ ] **Step 1: Migrationsdatei schreiben**

```sql
-- School years: enable rollover of classes across school years while
-- preserving history (Notenverwaltung: Schuljahr-Wechsel).

create table if not exists public.school_years (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  teacher_id uuid not null default auth.uid(),
  label text not null check (char_length(label) between 4 and 20),
  is_current boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_school_years_one_current_per_owner
  on public.school_years (owner_id)
  where is_current;

create index if not exists idx_school_years_owner on public.school_years (owner_id);

drop trigger if exists set_school_years_owner_ids on public.school_years;
create trigger set_school_years_owner_ids
before insert or update on public.school_years
for each row
execute function public.ensure_matching_owner_teacher_ids();

alter table public.school_years enable row level security;
alter table public.school_years force row level security;

drop policy if exists "school_years_select_own" on public.school_years;
create policy "school_years_select_own"
on public.school_years for select
using (owner_id = auth.uid());

drop policy if exists "school_years_insert_own" on public.school_years;
create policy "school_years_insert_own"
on public.school_years for insert
with check (owner_id = auth.uid());

drop policy if exists "school_years_update_own" on public.school_years;
create policy "school_years_update_own"
on public.school_years for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "school_years_delete_own" on public.school_years;
create policy "school_years_delete_own"
on public.school_years for delete
using (owner_id = auth.uid());

-- classes: link to a school year, and to the class it was continued from
alter table public.classes add column if not exists school_year_id uuid references public.school_years (id);
alter table public.classes
  add column if not exists predecessor_class_id uuid references public.classes (id) on delete set null;

-- enrollments: denormalized school_year_id so a student can be enrolled
-- in one class per year, but in different classes across years
alter table public.enrollments add column if not exists school_year_id uuid references public.school_years (id);

-- Drop the old single-column unique constraint on student_id dynamically
-- (name not guaranteed to be enrollments_student_id_key across environments).
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.enrollments'::regclass
    and contype = 'u'
    and conkey = array[
      (select attnum from pg_attribute
        where attrelid = 'public.enrollments'::regclass and attname = 'student_id')
    ];

  if cname is not null then
    execute format('alter table public.enrollments drop constraint %I', cname);
  end if;
end $$;

-- Backfill: give every teacher with existing data a single "current"
-- school year and attach it to their existing classes/enrollments.
do $$
declare
  rec record;
  new_year_id uuid;
  current_year_num int := extract(year from now())::int;
  computed_label text;
begin
  computed_label := case
    when extract(month from now()) >= 8
      then current_year_num::text || '/' || (current_year_num + 1)::text
    else (current_year_num - 1)::text || '/' || current_year_num::text
  end;

  for rec in
    select distinct teacher_id from public.classes where school_year_id is null
  loop
    insert into public.school_years (owner_id, teacher_id, label, is_current)
    values (rec.teacher_id, rec.teacher_id, computed_label, true)
    returning id into new_year_id;

    update public.classes
      set school_year_id = new_year_id
      where teacher_id = rec.teacher_id and school_year_id is null;

    update public.enrollments
      set school_year_id = new_year_id
      where teacher_id = rec.teacher_id and school_year_id is null;
  end loop;
end $$;

alter table public.classes alter column school_year_id set not null;
alter table public.enrollments alter column school_year_id set not null;

create index if not exists idx_classes_school_year on public.classes (school_year_id);
create index if not exists idx_classes_predecessor on public.classes (predecessor_class_id);
create index if not exists idx_enrollments_school_year on public.enrollments (school_year_id);

alter table public.enrollments
  add constraint enrollments_student_school_year_key unique (student_id, school_year_id);
```

- [ ] **Step 2: Build prüfen (SQL ändert kein TypeScript, reiner Sanity-Check)**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler (Migration hat keine Code-Auswirkung).

- [ ] **Step 3: Manuell im Supabase SQL Editor ausführen**

Diese Migration muss von dir manuell im Supabase-Projekt (SQL Editor, wie im README beschrieben) ausgeführt werden, bevor Task 4+ gegen eine echte Datenbank getestet werden kann. Kein automatisierter Schritt hierfür in diesem Repo.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260815100000_school_years.sql
git commit -m "$(cat <<'EOF'
Ergänze school_years-Tabelle für Schuljahr-Wechsel

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Pure Helper-Funktionen `src/lib/schoolYear.ts`

**Files:**
- Create: `src/lib/schoolYear.ts`
- Create: `src/lib/schoolYear.test.ts`

**Interfaces:**
- Consumes: nichts (reine Funktionen, keine Abhängigkeiten)
- Produces: `deriveDefaultSchoolYearLabel(date: Date): string`, `incrementSchoolYearLabel(label: string): string`, `incrementClassName(name: string): string`, `computeCarryoverFundEntry(balance: number): { entry_type: "deposit" | "withdrawal"; amount: number } | null` — werden von Task 4 (`ensureCurrentSchoolYear`), Task 9 (`usePromoteClass`) und Task 10 (`PromoteClassModal`) konsumiert.

- [ ] **Step 1: Test schreiben**

```ts
import { describe, expect, it } from "vitest";
import {
  computeCarryoverFundEntry,
  deriveDefaultSchoolYearLabel,
  incrementClassName,
  incrementSchoolYearLabel,
} from "./schoolYear";

describe("deriveDefaultSchoolYearLabel", () => {
  it("verwendet das laufende und das folgende Jahr ab August", () => {
    expect(deriveDefaultSchoolYearLabel(new Date(2026, 7, 15))).toBe("2026/2027");
  });

  it("verwendet das vorherige und das laufende Jahr vor August", () => {
    expect(deriveDefaultSchoolYearLabel(new Date(2026, 2, 1))).toBe("2025/2026");
  });

  it("behandelt Juli noch als altes Schuljahr", () => {
    expect(deriveDefaultSchoolYearLabel(new Date(2026, 6, 31))).toBe("2025/2026");
  });
});

describe("incrementSchoolYearLabel", () => {
  it("zählt beide Jahreszahlen im Format YYYY/YYYY hoch", () => {
    expect(incrementSchoolYearLabel("2025/2026")).toBe("2026/2027");
  });

  it("gibt unbekannte Formate unverändert zurück", () => {
    expect(incrementSchoolYearLabel("Schuljahr A")).toBe("Schuljahr A");
  });
});

describe("incrementClassName", () => {
  it("zählt eine führende Ziffer hoch und behält den Rest", () => {
    expect(incrementClassName("3B")).toBe("4B");
  });

  it("zählt mehrstellige führende Zahlen hoch", () => {
    expect(incrementClassName("10A")).toBe("11A");
  });

  it("gibt Namen ohne führende Zahl unverändert zurück", () => {
    expect(incrementClassName("Musikklasse")).toBe("Musikklasse");
  });
});

describe("computeCarryoverFundEntry", () => {
  it("gibt null zurück bei einem Saldo von 0", () => {
    expect(computeCarryoverFundEntry(0)).toBeNull();
  });

  it("gibt eine Einzahlung zurück bei positivem Saldo", () => {
    expect(computeCarryoverFundEntry(42.5)).toEqual({ entry_type: "deposit", amount: 42.5 });
  });

  it("gibt eine Auszahlung mit positivem Betrag zurück bei negativem Saldo", () => {
    expect(computeCarryoverFundEntry(-15)).toEqual({ entry_type: "withdrawal", amount: 15 });
  });
});
```

- [ ] **Step 2: Test ausführen, muss fehlschlagen**

Run: `npx vitest run src/lib/schoolYear.test.ts`
Erwartet: FAIL — `./schoolYear` existiert nicht.

- [ ] **Step 3: Implementierung schreiben**

```ts
export const deriveDefaultSchoolYearLabel = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indiziert, 7 = August

  return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

const LABEL_PATTERN = /^(\d{4})\/(\d{4})$/;

export const incrementSchoolYearLabel = (label: string): string => {
  const match = LABEL_PATTERN.exec(label);
  if (!match) {
    return label;
  }

  const start = Number(match[1]) + 1;
  const end = Number(match[2]) + 1;
  return `${start}/${end}`;
};

const CLASS_NAME_PATTERN = /^(\d+)(.*)$/;

export const incrementClassName = (name: string): string => {
  const match = CLASS_NAME_PATTERN.exec(name);
  if (!match) {
    return name;
  }

  const nextNumber = Number(match[1]) + 1;
  return `${nextNumber}${match[2]}`;
};

export const computeCarryoverFundEntry = (
  balance: number,
): { entry_type: "deposit" | "withdrawal"; amount: number } | null => {
  if (balance === 0) {
    return null;
  }

  return balance > 0
    ? { entry_type: "deposit", amount: balance }
    : { entry_type: "withdrawal", amount: -balance };
};
```

- [ ] **Step 4: Test ausführen, muss bestehen**

Run: `npx vitest run src/lib/schoolYear.test.ts`
Erwartet: PASS (13 Tests).

- [ ] **Step 5: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schoolYear.ts src/lib/schoolYear.test.ts
git commit -m "$(cat <<'EOF'
Ergänze Hilfsfunktionen für Schuljahr-Labels und Klassennamen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: TypeScript-Typen erweitern

**Files:**
- Modify: `src/lib/supabase/types.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `SchoolYear`-Interface; `SchoolClass` um `school_year_id: string` und `predecessor_class_id: string | null` erweitert; `Enrollment` um `school_year_id: string` erweitert. Wird von Task 4, 6, 7, 9, 10 konsumiert.

- [ ] **Step 1: `SchoolYear`-Interface ergänzen und `SchoolClass`/`Enrollment` erweitern**

In `src/lib/supabase/types.ts`, nach dem `FundEntryType`-Export (Zeile 4) folgende Zeile ergänzen:

```ts
export type SchoolYear = {
  id: string;
  teacher_id: string;
  label: string;
  is_current: boolean;
  created_at: string;
};
```

`SchoolClass` (aktuell Zeilen 15-21) ersetzen durch:

```ts
export interface SchoolClass {
  id: string;
  teacher_id: string;
  name: string;
  school_year_id: string;
  predecessor_class_id: string | null;
  created_at: string;
  updated_at: string;
}
```

`Enrollment` (aktuell Zeilen 33-39) ersetzen durch:

```ts
export interface Enrollment {
  id: string;
  teacher_id: string;
  class_id: string;
  student_id: string;
  school_year_id: string;
  created_at: string;
}
```

- [ ] **Step 2: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler (Supabase-Client ist ungetypt, `.insert(...)`-Aufrufe werden nicht gegen diese Interfaces geprüft — siehe Global Constraints).

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "$(cat <<'EOF'
Erweitere TypeScript-Typen um SchoolYear und Jahres-Felder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `useSchoolYears`-Hook

**Files:**
- Create: `src/hooks/useSchoolYears.ts`

**Interfaces:**
- Consumes: `supabase` aus `src/lib/supabase/client.ts`, `SchoolYear` aus `src/lib/supabase/types.ts` (Task 3), `deriveDefaultSchoolYearLabel` aus `src/lib/schoolYear.ts` (Task 2)
- Produces: `useSchoolYears(): { data, isLoading, error, createSchoolYear }` (Liste aller Schuljahre), `useCurrentSchoolYear(): { data, isLoading, error }` (das eine `is_current`-Jahr), `ensureCurrentSchoolYear(teacherId: string): Promise<SchoolYear>` (plain async function, kein Hook — aufrufbar aus Mutation-Funktionen). Wird von Task 5 (`SchoolYearProvider`) und Task 6 (`useClasses.createClass`) konsumiert.

- [ ] **Step 1: Hook schreiben**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import { deriveDefaultSchoolYearLabel } from "../lib/schoolYear";
import type { SchoolYear } from "../lib/supabase/types";

const queryKey = ["school-years"];

export const useSchoolYears = () => {
  const queryClient = useQueryClient();

  const schoolYearsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_years")
        .select("*")
        .order("label", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as SchoolYear[];
    },
  });

  const createSchoolYear = useMutation({
    mutationFn: async ({ label }: { label: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht eingeloggt.");
      }

      const { data, error } = await supabase
        .from("school_years")
        .insert({ teacher_id: user.id, label, is_current: false })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as SchoolYear;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...schoolYearsQuery,
    createSchoolYear,
  };
};

export const useCurrentSchoolYear = () =>
  useQuery({
    queryKey: ["school-years", "current"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_years")
        .select("*")
        .eq("is_current", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return (data as SchoolYear | null) ?? null;
    },
  });

export const ensureCurrentSchoolYear = async (teacherId: string): Promise<SchoolYear> => {
  const { data: existing, error: existingError } = await supabase
    .from("school_years")
    .select("*")
    .eq("teacher_id", teacherId)
    .eq("is_current", true)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as SchoolYear;
  }

  const { data, error } = await supabase
    .from("school_years")
    .insert({
      teacher_id: teacherId,
      label: deriveDefaultSchoolYearLabel(new Date()),
      is_current: true,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as SchoolYear;
};
```

- [ ] **Step 2: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSchoolYears.ts
git commit -m "$(cat <<'EOF'
Ergänze useSchoolYears-Hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `SchoolYearProvider`, `useSchoolYear`, `SchoolYearSwitcher`, AppShell-Verdrahtung

**Files:**
- Create: `src/components/layout/SchoolYearContext.tsx`
- Create: `src/components/layout/SchoolYearSwitcher.tsx`
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `useSchoolYears`, `useCurrentSchoolYear` aus `src/hooks/useSchoolYears.ts` (Task 4), `Menu`/`MenuItem` aus `src/components/ui/Menu.tsx`
- Produces: `SchoolYearProvider` (Context-Provider, analog `ToastProvider`), `useSchoolYear(): { schoolYears, currentSchoolYear, selectedSchoolYear, selectSchoolYear, isCurrentYearSelected }` — wird von Task 6, 7, 8, 9, 10, 11 konsumiert.

- [ ] **Step 1: `SchoolYearContext.tsx` schreiben**

```tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCurrentSchoolYear, useSchoolYears } from "../../hooks/useSchoolYears";
import type { SchoolYear } from "../../lib/supabase/types";

interface SchoolYearContextValue {
  schoolYears: SchoolYear[];
  currentSchoolYear: SchoolYear | null;
  selectedSchoolYear: SchoolYear | null;
  selectSchoolYear: (id: string) => void;
  isCurrentYearSelected: boolean;
}

const SchoolYearContext = createContext<SchoolYearContextValue | null>(null);

export const SchoolYearProvider = ({ children }: { children: ReactNode }) => {
  const schoolYearsQuery = useSchoolYears();
  const currentSchoolYearQuery = useCurrentSchoolYear();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const schoolYears = schoolYearsQuery.data ?? [];
  const currentSchoolYear = currentSchoolYearQuery.data ?? null;

  useEffect(() => {
    if (!selectedId && currentSchoolYear) {
      setSelectedId(currentSchoolYear.id);
    }
  }, [selectedId, currentSchoolYear]);

  const selectedSchoolYear = useMemo(
    () => schoolYears.find((year) => year.id === selectedId) ?? currentSchoolYear,
    [schoolYears, selectedId, currentSchoolYear],
  );

  const value = useMemo<SchoolYearContextValue>(
    () => ({
      schoolYears,
      currentSchoolYear,
      selectedSchoolYear,
      selectSchoolYear: setSelectedId,
      isCurrentYearSelected:
        !selectedSchoolYear || !currentSchoolYear
          ? true
          : selectedSchoolYear.id === currentSchoolYear.id,
    }),
    [schoolYears, currentSchoolYear, selectedSchoolYear],
  );

  return <SchoolYearContext.Provider value={value}>{children}</SchoolYearContext.Provider>;
};

export const useSchoolYear = () => {
  const context = useContext(SchoolYearContext);
  if (!context) {
    throw new Error("useSchoolYear muss innerhalb von <SchoolYearProvider> verwendet werden.");
  }

  return context;
};
```

- [ ] **Step 2: `SchoolYearSwitcher.tsx` schreiben**

```tsx
import { Menu } from "../ui/Menu";
import type { MenuItem } from "../ui/Menu";
import { useSchoolYear } from "./SchoolYearContext";

export const SchoolYearSwitcher = () => {
  const { schoolYears, selectedSchoolYear, currentSchoolYear, selectSchoolYear } = useSchoolYear();

  if (schoolYears.length === 0) {
    return null;
  }

  const items: MenuItem[] = schoolYears.map((year) => ({
    kind: "action",
    label: year.id === currentSchoolYear?.id ? `${year.label} (aktuell)` : year.label,
    onSelect: () => selectSchoolYear(year.id),
  }));

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm font-medium text-ink-2 sm:inline">
        {selectedSchoolYear?.label ?? "Schuljahr"}
      </span>
      <Menu items={items} label="Schuljahr wechseln" align="left" />
    </div>
  );
};
```

- [ ] **Step 3: `AppShell.tsx` restrukturieren — Provider einhängen, Switcher im Header anzeigen**

`src/components/layout/AppShell.tsx` komplett ersetzen durch:

```tsx
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useClasses } from "../../hooks/useClasses";
import { AccountMenu } from "./AccountMenu";
import { BottomNav } from "./BottomNav";
import { SchoolYearProvider } from "./SchoolYearContext";
import { SchoolYearSwitcher } from "./SchoolYearSwitcher";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-accent-soft text-accent-strong before:absolute before:inset-y-1.5 before:-left-2 before:w-1 before:rounded-full before:bg-accent"
      : "text-ink-2 hover:bg-sunken hover:text-ink"
  }`;

const AppShellInner = ({ email }: { email: string }) => {
  const classesQuery = useClasses();
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
```

Hinweis: Die Sidebar-Klassenliste in `AppShellInner` bleibt in diesem Task noch ungefiltert (zeigt weiter alle Klassen aller Jahre) — die Jahres-Filterung der Klassenliste folgt in Task 6, sobald `useClasses` den optionalen `schoolYearId`-Parameter unterstützt. Dieser Task führt nur Provider und Umschalter ein, ohne bestehendes Verhalten zu ändern (Build muss grün bleiben, keine sichtbare Regression).

- [ ] **Step 4: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/SchoolYearContext.tsx src/components/layout/SchoolYearSwitcher.tsx src/components/layout/AppShell.tsx
git commit -m "$(cat <<'EOF'
Ergänze SchoolYearProvider und Schuljahr-Umschalter in der Navigation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `useClasses` — Schuljahr bei Anlage setzen, optionaler Jahres-Filter

**Files:**
- Modify: `src/hooks/useClasses.ts`
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `ensureCurrentSchoolYear` aus `src/hooks/useSchoolYears.ts` (Task 4), `useSchoolYear` aus `src/components/layout/SchoolYearContext.tsx` (Task 5)
- Produces: `useClasses(schoolYearId?: string)` — bestehende Signatur bleibt kompatibel (Parameter optional), wird von Task 8 (ClassesPage, DashboardPage) konsumiert.

- [ ] **Step 1: `useClasses.ts` anpassen**

`src/hooks/useClasses.ts` komplett ersetzen durch:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import { ensureCurrentSchoolYear } from "./useSchoolYears";
import type { SchoolClass } from "../lib/supabase/types";

export const useClasses = (schoolYearId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["classes", schoolYearId ?? "all"];

  const classesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      let request = supabase
        .from("classes")
        .select("*")
        .order("created_at", { ascending: false });

      if (schoolYearId) {
        request = request.eq("school_year_id", schoolYearId);
      }

      const { data, error } = await request;

      if (error) {
        throw error;
      }

      return (data ?? []) as SchoolClass[];
    },
  });

  const createClass = useMutation({
    mutationFn: async (name: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht eingeloggt.");
      }

      const schoolYear = await ensureCurrentSchoolYear(user.id);

      const { data, error } = await supabase
        .from("classes")
        .insert({
          name,
          teacher_id: user.id,
          school_year_id: schoolYear.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as SchoolClass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["school-years"] });
    },
  });

  const updateClass = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("classes").update({ name }).eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });

  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });

  return {
    ...classesQuery,
    createClass,
    updateClass,
    deleteClass,
  };
};

export const useClassById = (classId?: string) =>
  useQuery({
    queryKey: ["classes", classId],
    enabled: Boolean(classId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .single();

      if (error) {
        throw error;
      }

      return data as SchoolClass;
    },
  });
```

Änderungen gegenüber vorher: `createClass` ruft `ensureCurrentSchoolYear` auf (damit auch der allererste Klassen-Anlage-Aufruf aus dem Onboarding automatisch ein aktuelles Schuljahr anlegt — `OnboardingPage.tsx` braucht dafür keine eigene Änderung). Die Liste akzeptiert optional `schoolYearId`. Die bisherige `setQueryData`-Optimistic-Update in `createClass.onSuccess` entfällt zugunsten von `invalidateQueries({ queryKey: ["classes"] })` (Präfix-Match invalidiert alle Varianten mit unterschiedlichem `schoolYearId`) — das bedeutet ein kurzer Refetch statt eines sofortigen State-Updates, ist aber notwendig, weil nicht mehr eindeutig ist, in welchen der parallel offenen `["classes", X]`-Query-Caches das neue Element eingefügt werden müsste.

- [ ] **Step 2: `AppShellInner`-Sidebar auf ausgewähltes Schuljahr filtern**

In `src/components/layout/AppShell.tsx`, `AppShellInner` anpassen:

```tsx
import { useSchoolYear } from "./SchoolYearContext";
```

ergänzen zu den Imports, und die Zeile

```tsx
const classesQuery = useClasses();
```

ersetzen durch:

```tsx
const { selectedSchoolYear } = useSchoolYear();
const classesQuery = useClasses(selectedSchoolYear?.id);
```

- [ ] **Step 3: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 4: Manuell verifizieren (Hinweis, kein automatisierter Schritt)**

Nach Anwendung der Migration (Task 1) gegen ein echtes Supabase-Projekt: neuen Nutzer registrieren, ersten Klassennamen im Onboarding eintragen, prüfen dass die Klasse erscheint und ein `school_years`-Eintrag mit `is_current = true` existiert.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useClasses.ts src/components/layout/AppShell.tsx
git commit -m "$(cat <<'EOF'
Verknüpfe Klassen mit dem aktuellen Schuljahr

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `useStudents` — Einschreibung mit Schuljahr, optionaler Jahres-Filter

**Files:**
- Modify: `src/hooks/useStudents.ts`

**Interfaces:**
- Consumes: nichts Neues (bestehende Imports)
- Produces: `useAllStudents(schoolYearId?: string)`, `useStudentById(studentId?: string, schoolYearId?: string)` — beide Parameter optional, bestehende Aufrufer bleiben unverändert lauffähig. Wird von Task 8 konsumiert.

- [ ] **Step 1: `createStudent` — `school_year_id` der Ziel-Klasse für die Einschreibung verwenden**

In `src/hooks/useStudents.ts`, den `createStudent`-Mutation-Body ersetzen durch:

```ts
  const createStudent = useMutation({
    mutationFn: async ({
      first_name,
      last_name,
      notes,
      classId: targetClassId,
    }: {
      first_name: string;
      last_name: string;
      notes?: string;
      classId: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht eingeloggt.");
      }

      const { data: targetClass, error: classError } = await supabase
        .from("classes")
        .select("school_year_id")
        .eq("id", targetClassId)
        .single();

      if (classError) {
        throw classError;
      }

      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert({
          teacher_id: user.id,
          first_name,
          last_name,
          notes: notes || null,
        })
        .select()
        .single();

      if (studentError) {
        throw studentError;
      }

      const { error: enrollmentError } = await supabase.from("enrollments").insert({
        teacher_id: user.id,
        class_id: targetClassId,
        student_id: student.id,
        school_year_id: targetClass.school_year_id,
      });

      if (enrollmentError) {
        await supabase.from("students").delete().eq("id", student.id);
        throw enrollmentError;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
```

(Nur der `mutationFn`-Body ändert sich — Lade des Ziel-Klassen-Schuljahrs zwischen User-Check und Schüler-Insert eingefügt, `school_year_id` im Enrollment-Insert ergänzt. Rest der Datei unverändert.)

- [ ] **Step 2: `useAllStudents` und `useStudentById` um optionalen Jahres-Filter erweitern**

Am Ende der Datei, die beiden Exporte ersetzen durch:

```ts
export const useAllStudents = (schoolYearId?: string) =>
  useQuery({
    queryKey: ["students", "all", schoolYearId ?? "any"],
    queryFn: async () => {
      let request = supabase
        .from("students")
        .select("*, enrollments(id, class_id, student_id)")
        .order("last_name");

      if (schoolYearId) {
        request = request.eq("enrollments.school_year_id", schoolYearId);
      }

      const { data, error } = await request;

      if (error) {
        throw error;
      }

      return (data ?? []).map(normalizeStudent);
    },
  });

export const useStudentById = (studentId?: string, schoolYearId?: string) =>
  useQuery({
    queryKey: ["student", studentId, schoolYearId ?? "any"],
    enabled: Boolean(studentId),
    queryFn: async () => {
      let request = supabase
        .from("students")
        .select("*, enrollments(id, class_id, student_id)")
        .eq("id", studentId);

      if (schoolYearId) {
        request = request.eq("enrollments.school_year_id", schoolYearId);
      }

      const { data, error } = await request.single();

      if (error) {
        throw error;
      }

      return normalizeStudent(data);
    },
  });
```

Hintergrund: Da ein Schüler jetzt über mehrere Schuljahre hinweg mehrere `enrollments`-Zeilen haben kann (Task 1), liefert die eingebettete `enrollments`-Auswahl ohne Filter mehrere Zeilen zurück. Mehrere bestehende Seiten verlassen sich auf `enrollments[0]` als "die aktuelle Klasse des Schülers" — ohne diesen Filter würde `[0]` nach einem Schuljahr-Wechsel eine zufällige/falsche Klasse liefern. Die Verdrahtung in den aufrufenden Seiten folgt in Task 8.

- [ ] **Step 3: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useStudents.ts
git commit -m "$(cat <<'EOF'
Verknüpfe Einschreibungen mit dem Schuljahr der Zielklasse

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Ausgewähltes Schuljahr in bestehende Seiten verdrahten

**Files:**
- Modify: `src/pages/ClassesPage.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/StudentsPage.tsx`
- Modify: `src/pages/SubjectsPage.tsx`
- Modify: `src/pages/StudentDetailPage.tsx`
- Modify: `src/pages/StudentPrintPage.tsx`

**Interfaces:**
- Consumes: `useSchoolYear` aus `src/components/layout/SchoolYearContext.tsx` (Task 5), `useClasses(schoolYearId?)` (Task 6), `useAllStudents(schoolYearId?)`/`useStudentById(studentId?, schoolYearId?)` (Task 7)
- Produces: keine neuen Exporte — dieser Task verdrahtet nur bestehende, jetzt jahres-fähige Hooks in die UI.

Alle sechs Dateien bekommen dieselbe Art Änderung: `useSchoolYear` importieren, `selectedSchoolYear` daraus lesen, und an die bereits jahres-fähigen Hook-Aufrufe durchreichen. Betroffen sind alle Stellen, die `student.enrollments[0]` lesen (siehe Spec-Abschnitt "Datenmodell" — das war vor diesem Plan bereits mehrdeutig, sobald ein Schüler zwei Enrollments hat) sowie die beiden explizit in der Spec genannten Klassenlisten (Dashboard, Klassen).

- [ ] **Step 1: `ClassesPage.tsx`**

Import ergänzen:

```tsx
import { useSchoolYear } from "../components/layout/SchoolYearContext";
```

Zeile `const { data: classes, isLoading, error, createClass } = useClasses();` ersetzen durch:

```tsx
const { selectedSchoolYear } = useSchoolYear();
const { data: classes, isLoading, error, createClass } = useClasses(selectedSchoolYear?.id);
```

Zeile `const studentsQuery = useAllStudents();` ersetzen durch:

```tsx
const studentsQuery = useAllStudents(selectedSchoolYear?.id);
```

- [ ] **Step 2: `DashboardPage.tsx`**

Import ergänzen:

```tsx
import { useSchoolYear } from "../components/layout/SchoolYearContext";
```

Zeile `const { data: classes, isLoading: classesLoading, error: classesError, createClass } = useClasses();` ersetzen durch:

```tsx
const { selectedSchoolYear } = useSchoolYear();
const { data: classes, isLoading: classesLoading, error: classesError, createClass } =
  useClasses(selectedSchoolYear?.id);
```

Zeile `const { data: students, isLoading: studentsLoading, error: studentsError } = useAllStudents();` ersetzen durch:

```tsx
const { data: students, isLoading: studentsLoading, error: studentsError } =
  useAllStudents(selectedSchoolYear?.id);
```

- [ ] **Step 3: `StudentsPage.tsx`**

Import ergänzen:

```tsx
import { useSchoolYear } from "../components/layout/SchoolYearContext";
```

Im Funktionskörper von `StudentsPage`, nach `const classesQuery = useClasses();` ergänzen:

```tsx
const { selectedSchoolYear } = useSchoolYear();
```

Den Aufruf von `useAllStudents()` (siehe `import { useAllStudents, useStudents } from "../hooks/useStudents";`) auf `useAllStudents(selectedSchoolYear?.id)` umstellen — die genaue Zeile mit `grep -n "useAllStudents()" src/pages/StudentsPage.tsx` finden und ersetzen.

- [ ] **Step 4: `SubjectsPage.tsx`**

Import ergänzen:

```tsx
import { useSchoolYear } from "../components/layout/SchoolYearContext";
```

Die drei Zeilen

```tsx
const classesQuery = useClasses();
const studentsQuery = useAllStudents();
const subjectsQuery = useAllSubjects();
```

ersetzen durch:

```tsx
const { selectedSchoolYear } = useSchoolYear();
const classesQuery = useClasses(selectedSchoolYear?.id);
const studentsQuery = useAllStudents(selectedSchoolYear?.id);
const subjectsQuery = useAllSubjects();
```

(`useAllSubjects()` bleibt unverändert — Fächer werden bei einer Fortführung immer frisch kopiert und sind nie über Jahre hinweg geteilt, die Mehrdeutigkeits-Problematik von `enrollments[0]` betrifft sie nicht.)

- [ ] **Step 5: `StudentDetailPage.tsx`**

Import ergänzen:

```tsx
import { useSchoolYear } from "../components/layout/SchoolYearContext";
```

Zeilen

```tsx
const { classId: classIdParam, studentId = "" } = useParams();
const studentQuery = useStudentById(studentId);
const derivedClassId = classIdParam ?? studentQuery.data?.enrollments[0]?.class_id ?? "";
```

ersetzen durch:

```tsx
const { classId: classIdParam, studentId = "" } = useParams();
const { selectedSchoolYear } = useSchoolYear();
const studentQuery = useStudentById(studentId, selectedSchoolYear?.id);
const derivedClassId = classIdParam ?? studentQuery.data?.enrollments[0]?.class_id ?? "";
```

- [ ] **Step 6: `StudentPrintPage.tsx`**

Import ergänzen:

```tsx
import { useSchoolYear } from "../components/layout/SchoolYearContext";
```

Zeilen

```tsx
const studentQuery = useStudentById(studentId);
const derivedClassId = studentQuery.data?.enrollments[0]?.class_id ?? "";
```

ersetzen durch:

```tsx
const { currentSchoolYear } = useSchoolYear();
const studentQuery = useStudentById(studentId, currentSchoolYear?.id);
const derivedClassId = studentQuery.data?.enrollments[0]?.class_id ?? "";
```

Hinweis: `StudentPrintPage` ist eine eigenständige Route außerhalb von `AppShell` (`/students/:studentId/print`, siehe `src/router.tsx`) und liegt damit außerhalb des `SchoolYearProvider`, den Task 5 nur um den `AppShell`-Ausschnitt gelegt hat — das folgende Step behebt das.

- [ ] **Step 7: `SchoolYearProvider` für die Druckroute verfügbar machen**

`StudentPrintPage` wird nicht unter `AppShell` gerendert (eigene Top-Level-Route), braucht aber `useSchoolYear()`. In `src/router.tsx`:

```tsx
import { StudentPrintPage } from "./pages/StudentPrintPage";
```

bleibt, aber der Import wird ergänzt um:

```tsx
import { SchoolYearProvider } from "./components/layout/SchoolYearContext";
```

und der Routen-Eintrag

```tsx
{
  path: "/students/:studentId/print",
  element: <StudentPrintPage />,
},
```

wird ersetzt durch:

```tsx
{
  path: "/students/:studentId/print",
  element: (
    <SchoolYearProvider>
      <StudentPrintPage />
    </SchoolYearProvider>
  ),
},
```

- [ ] **Step 8: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 9: Commit**

```bash
git add src/pages/ClassesPage.tsx src/pages/DashboardPage.tsx src/pages/StudentsPage.tsx src/pages/SubjectsPage.tsx src/pages/StudentDetailPage.tsx src/pages/StudentPrintPage.tsx src/router.tsx
git commit -m "$(cat <<'EOF'
Verdrahte Schuljahr-Auswahl in Klassen-, Schüler- und Fächer-Ansichten

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `usePromoteClass`-Mutation

**Files:**
- Create: `src/hooks/usePromoteClass.ts`

**Interfaces:**
- Consumes: `computeCarryoverFundEntry` aus `src/lib/schoolYear.ts` (Task 2), `SchoolClass`, `Subject`, `ClassFundEntry` aus `src/lib/supabase/types.ts`
- Produces: `usePromoteClass(): UseMutationResult` mit `mutateAsync({ sourceClassId: string; targetSchoolYearLabel: string; newClassName: string; studentIds: string[] }): Promise<SchoolClass>`. Wird von Task 10 (`PromoteClassModal`) konsumiert.

- [ ] **Step 1: Hook schreiben**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import { computeCarryoverFundEntry } from "../lib/schoolYear";
import type { ClassFundEntry, SchoolClass, SchoolYear, Subject } from "../lib/supabase/types";

interface PromoteClassInput {
  sourceClassId: string;
  targetSchoolYearLabel: string;
  newClassName: string;
  studentIds: string[];
}

export const usePromoteClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceClassId,
      targetSchoolYearLabel,
      newClassName,
      studentIds,
    }: PromoteClassInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht eingeloggt.");
      }

      const { data: existingYear, error: existingYearError } = await supabase
        .from("school_years")
        .select("*")
        .eq("teacher_id", user.id)
        .eq("label", targetSchoolYearLabel)
        .maybeSingle();

      if (existingYearError) {
        throw existingYearError;
      }

      let targetYear = existingYear as SchoolYear | null;

      if (!targetYear) {
        const { data: createdYear, error: createYearError } = await supabase
          .from("school_years")
          .insert({ teacher_id: user.id, label: targetSchoolYearLabel, is_current: false })
          .select()
          .single();

        if (createYearError) {
          throw createYearError;
        }

        targetYear = createdYear as SchoolYear;
      }

      const { error: unsetCurrentError } = await supabase
        .from("school_years")
        .update({ is_current: false })
        .eq("teacher_id", user.id)
        .eq("is_current", true)
        .neq("id", targetYear.id);

      if (unsetCurrentError) {
        throw unsetCurrentError;
      }

      const { error: setCurrentError } = await supabase
        .from("school_years")
        .update({ is_current: true })
        .eq("id", targetYear.id);

      if (setCurrentError) {
        throw setCurrentError;
      }

      const { data: newClass, error: classError } = await supabase
        .from("classes")
        .insert({
          teacher_id: user.id,
          name: newClassName,
          school_year_id: targetYear.id,
          predecessor_class_id: sourceClassId,
        })
        .select()
        .single();

      if (classError) {
        throw classError;
      }

      const typedNewClass = newClass as SchoolClass;

      if (studentIds.length > 0) {
        const { error: enrollmentsError } = await supabase.from("enrollments").insert(
          studentIds.map((studentId) => ({
            teacher_id: user.id,
            class_id: typedNewClass.id,
            student_id: studentId,
            school_year_id: targetYear!.id,
          })),
        );

        if (enrollmentsError) {
          throw enrollmentsError;
        }
      }

      const { data: sourceSubjects, error: subjectsLoadError } = await supabase
        .from("subjects")
        .select("*")
        .eq("class_id", sourceClassId);

      if (subjectsLoadError) {
        throw subjectsLoadError;
      }

      const typedSubjects = (sourceSubjects ?? []) as Subject[];

      if (typedSubjects.length > 0) {
        const { error: subjectsInsertError } = await supabase.from("subjects").insert(
          typedSubjects.map((subject) => ({
            teacher_id: user.id,
            class_id: typedNewClass.id,
            name: subject.name,
            subject_type: subject.subject_type,
            grading_kind: subject.grading_kind,
            average_mode: subject.average_mode,
            default_weight: subject.default_weight,
            points_to_grade: subject.points_to_grade,
          })),
        );

        if (subjectsInsertError) {
          throw subjectsInsertError;
        }
      }

      const { data: fundEntries, error: fundLoadError } = await supabase
        .from("class_fund_entries")
        .select("*")
        .eq("class_id", sourceClassId);

      if (fundLoadError) {
        throw fundLoadError;
      }

      const balance = ((fundEntries ?? []) as ClassFundEntry[]).reduce(
        (sum, entry) => (entry.entry_type === "deposit" ? sum + entry.amount : sum - entry.amount),
        0,
      );

      const carryover = computeCarryoverFundEntry(balance);

      if (carryover) {
        const { error: carryoverError } = await supabase.from("class_fund_entries").insert({
          teacher_id: user.id,
          class_id: typedNewClass.id,
          entry_type: carryover.entry_type,
          amount: carryover.amount,
          entry_date: new Date().toISOString().slice(0, 10),
          note: "Übertrag aus Vorjahr",
        });

        if (carryoverError) {
          throw carryoverError;
        }
      }

      return typedNewClass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["class-fund"] });
      queryClient.invalidateQueries({ queryKey: ["school-years"] });
    },
  });
};
```

- [ ] **Step 2: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePromoteClass.ts
git commit -m "$(cat <<'EOF'
Ergänze usePromoteClass für die Klassen-Fortführung ins neue Schuljahr

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: `PromoteClassModal` + Verdrahtung in `ClassDetailPage`

**Files:**
- Create: `src/components/classes/PromoteClassModal.tsx`
- Modify: `src/pages/ClassDetailPage.tsx`

**Interfaces:**
- Consumes: `usePromoteClass` (Task 9), `incrementClassName`/`incrementSchoolYearLabel` aus `src/lib/schoolYear.ts` (Task 2), `Modal`/`Field`/`ErrorState` aus `src/components/ui/`, `SchoolClass`/`StudentWithEnrollment` aus `src/lib/supabase/types.ts`
- Produces: `PromoteClassModal`-Komponente mit Props `{ isOpen, onClose, schoolClass, currentLabel, students, onPromoted }`.

- [ ] **Step 1: `PromoteClassModal.tsx` schreiben**

```tsx
import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Field } from "../ui/Field";
import { ErrorState } from "../ui/ErrorState";
import { incrementClassName, incrementSchoolYearLabel } from "../../lib/schoolYear";
import { usePromoteClass } from "../../hooks/usePromoteClass";
import type { SchoolClass, StudentWithEnrollment } from "../../lib/supabase/types";

interface PromoteClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolClass: SchoolClass;
  currentLabel: string;
  students: StudentWithEnrollment[];
  onPromoted: (newClassId: string) => void;
}

export const PromoteClassModal = ({
  isOpen,
  onClose,
  schoolClass,
  currentLabel,
  students,
  onPromoted,
}: PromoteClassModalProps) => {
  const promoteClass = usePromoteClass();

  const [targetLabel, setTargetLabel] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTargetLabel(incrementSchoolYearLabel(currentLabel));
    setNewClassName(incrementClassName(schoolClass.name));
    setSelectedStudentIds(students.map((student) => student.id));
    setError(null);
  }, [isOpen, currentLabel, schoolClass.name, students]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!newClassName.trim()) {
      setError("Bitte einen Klassennamen angeben.");
      return;
    }

    if (!targetLabel.trim()) {
      setError("Bitte ein Ziel-Schuljahr angeben.");
      return;
    }

    try {
      const newClass = await promoteClass.mutateAsync({
        sourceClassId: schoolClass.id,
        targetSchoolYearLabel: targetLabel.trim(),
        newClassName: newClassName.trim(),
        studentIds: selectedStudentIds,
      });

      onPromoted(newClass.id);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Schuljahr-Wechsel konnte nicht durchgeführt werden.",
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ins neue Schuljahr übernehmen"
      description="Fächer-Konfiguration und Kassen-Saldo werden mitgenommen, Bewertungen starten leer."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="submit"
            form="promote-class-form"
            className="btn-primary"
            disabled={promoteClass.isPending}
          >
            {promoteClass.isPending ? "Wird übernommen..." : "Übernehmen"}
          </button>
        </>
      }
    >
      <form id="promote-class-form" className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Ziel-Schuljahr" htmlFor="promote-target-year" hint="Zum Beispiel 2026/2027.">
          <input
            id="promote-target-year"
            className="field"
            value={targetLabel}
            onChange={(event) => setTargetLabel(event.target.value)}
          />
        </Field>

        <Field label="Neuer Klassenname" htmlFor="promote-class-name">
          <input
            id="promote-class-name"
            className="field"
            value={newClassName}
            onChange={(event) => setNewClassName(event.target.value)}
          />
        </Field>

        <Field label="Schüler übernehmen" hint="Abwählen, wer nicht mit in die neue Klasse soll.">
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
            {students.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-ink-3">Keine Schüler in dieser Klasse.</p>
            ) : (
              students.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sunken"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  {student.first_name} {student.last_name}
                </label>
              ))
            )}
          </div>
        </Field>

        {error ? <ErrorState message={error} /> : null}
      </form>
    </Modal>
  );
};
```

- [ ] **Step 2: In `ClassDetailPage.tsx` einbinden**

Imports ergänzen (nach dem bestehenden `PageHeader`-Import):

```tsx
import { PromoteClassModal } from "../components/classes/PromoteClassModal";
import { useSchoolYear } from "../components/layout/SchoolYearContext";
```

Im Funktionskörper von `ClassDetailPage`, nach der bestehenden `useState`-Deklaration für `isFundModalOpen`/`fundCreateError` (siehe Zeile 79-80), ergänzen:

```tsx
const { schoolYears, currentSchoolYear } = useSchoolYear();
const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
const currentYearLabel =
  schoolYears.find((year) => year.id === classQuery.data?.school_year_id)?.label ?? "";
```

`PageHeader` (Zeile 252-264) um eine `actions`-Prop ergänzen — das bestehende Element

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
```

ersetzen durch:

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
        actions={
          classQuery.data && classQuery.data.school_year_id === currentSchoolYear?.id ? (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setIsPromoteModalOpen(true)}
            >
              Ins neue Schuljahr übernehmen
            </button>
          ) : undefined
        }
      />
```

Am Ende der Komponente, vor dem schließenden `</div>` des Wurzel-Elements (direkt nach dem letzten bestehenden `<Modal>`-Block für die Klassenkasse), ergänzen:

```tsx
      {classQuery.data ? (
        <PromoteClassModal
          isOpen={isPromoteModalOpen}
          onClose={() => setIsPromoteModalOpen(false)}
          schoolClass={classQuery.data}
          currentLabel={currentYearLabel}
          students={studentsQuery.data ?? []}
          onPromoted={(newClassId) => {
            setIsPromoteModalOpen(false);
            toast.success("Klasse wurde ins neue Schuljahr übernommen.");
            navigate(`/classes/${newClassId}`);
          }}
        />
      ) : null}
```

Dafür wird `useNavigate` aus `react-router-dom` benötigt — den bestehenden Import

```tsx
import { Link, useParams } from "react-router-dom";
```

ersetzen durch:

```tsx
import { Link, useNavigate, useParams } from "react-router-dom";
```

und im Funktionskörper, direkt nach `const { classId = "" } = useParams();`, ergänzen:

```tsx
const navigate = useNavigate();
```

- [ ] **Step 3: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 4: Commit**

```bash
git add src/components/classes/PromoteClassModal.tsx src/pages/ClassDetailPage.tsx
git commit -m "$(cat <<'EOF'
Ergänze Dialog zum Übernehmen einer Klasse ins neue Schuljahr

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Lese-Sperre für Klassen aus vergangenen Schuljahren

**Files:**
- Modify: `src/pages/ClassDetailPage.tsx`

**Interfaces:**
- Consumes: `useSchoolYear` (bereits importiert seit Task 10)
- Produces: keine neuen Exporte — deaktiviert Schreib-Aktionen, wenn die betrachtete Klasse nicht zum aktuellen Schuljahr gehört.

- [ ] **Step 1: `isArchived`-Flag ergänzen**

Im Funktionskörper von `ClassDetailPage`, direkt nach der in Task 10 ergänzten Zeile `const currentYearLabel = ...`, ergänzen:

```tsx
const isArchived = Boolean(
  classQuery.data && currentSchoolYear && classQuery.data.school_year_id !== currentSchoolYear.id,
);
```

- [ ] **Step 2: Die drei "Hinzufügen"-Buttons sperren**

Drei Stellen mit `disabled` und einem erklärenden `title` ergänzen:

Zeile ~295-301 (Schüler hinzufügen):

```tsx
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={isArchived}
                title={isArchived ? "Vergangene Schuljahre sind schreibgeschützt." : undefined}
                onClick={() => setIsStudentModalOpen(true)}
              >
                Schüler hinzufügen
              </button>
```

Analog bei der Zeile mit `onClick={() => setIsSubjectModalOpen(true)}` (~Zeile 422) `disabled={isArchived}` und dasselbe `title` ergänzen, und bei der Zeile mit `onClick={() => setIsFundModalOpen(true)}` (~Zeile 514) ebenso.

- [ ] **Step 3: Das "Ins neue Schuljahr übernehmen"-Aktionsfeld bleibt bereits korrekt**

Die in Task 10 geschriebene Bedingung `classQuery.data.school_year_id === currentSchoolYear?.id` blendet den Übernehmen-Button für archivierte Klassen bereits aus — kein weiterer Code nötig, nur verifizieren, dass beide Bedingungen (`isArchived` hier, die Button-Sichtbarkeit in Task 10) dasselbe Vergleichspaar (`classQuery.data.school_year_id` vs. `currentSchoolYear?.id`) verwenden, damit sie nicht auseinanderlaufen.

- [ ] **Step 4: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 5: Manuell verifizieren (Hinweis, kein automatisierter Schritt)**

Nach Anwendung von Task 1 gegen eine echte Datenbank: eine Klasse ins neue Schuljahr übernehmen (Task 9/10), dann über den Schuljahr-Umschalter zurück ins alte Jahr wechseln, die alte Klasse öffnen und prüfen, dass "Schüler hinzufügen", "Neues Fach", "Buchung erfassen" und "Ins neue Schuljahr übernehmen" alle deaktiviert bzw. ausgeblendet sind.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ClassDetailPage.tsx
git commit -m "$(cat <<'EOF'
Sperre Schreib-Aktionen für Klassen aus vergangenen Schuljahren

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review-Notizen (bereits behoben, zur Nachvollziehbarkeit dokumentiert)

- **Spec-Abdeckung**: Datenmodell (Task 1, 3), Onboarding-Auto-Anlage (Task 6, über `ensureCurrentSchoolYear` in `createClass` — keine separate Onboarding-Änderung nötig), Fortführungs-Flow inkl. Fächer-/Kassen-Übernahme (Task 9, 10), Umschalter + Archiv-Sperre (Task 5, 6, 8, 11) — alle Spec-Abschnitte haben einen zugehörigen Task.
- **Erweiterung über den wörtlichen Spec-Text hinaus**: Die Spec nennt explizit nur "Dashboard/Klassenliste" als vom Umschalter gefilterte Ansichten. Task 8 wendet den Filter zusätzlich auf `StudentsPage`, `SubjectsPage`, `StudentDetailPage` und `StudentPrintPage` an — nicht als Scope-Erweiterung der Umschalter-Funktion, sondern weil das Entfernen des `unique(student_id)`-Constraints (Kern der Spec) an genau diesen Stellen sonst zu falschen `enrollments[0]`-Zugriffen führt, sobald ein Schüler mehr als eine Einschreibung über die Jahre hat. Ohne Task 8 wäre das Datenmodell aus Task 1 korrekt, die UI an mehreren Stellen aber fehlerhaft.
