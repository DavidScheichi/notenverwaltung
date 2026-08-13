# Klassenkasse pro Schüler — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einzahlungen in die Klassenkasse können optional einem Schüler zugeordnet werden, damit im Klassenkasse-Tab sichtbar ist, wie viel jeder Schüler bisher eingezahlt hat.

**Architecture:** Eine neue nullable Spalte `student_id` auf `class_fund_entries` (nur für Einzahlungen relevant, Auszahlungen bleiben klassenweit). Validierung erzwingt die Deposit-only-Regel im Zod-Schema. Die Sch��lerübersicht wird rein clientseitig aus bereits geladenen Query-Daten berechnet — keine neue Datenabfrage.

**Tech Stack:** React 19, TypeScript, Vite 6, TailwindCSS 3.4, TanStack Query 5, Zod 3, Supabase (Postgres + RLS). Keine neuen Abhängigkeiten.

## Global Constraints

- **Nur Einzahlungen können einem Schüler zugeordnet werden.** Auszahlungen bleiben immer klassenweit ohne Schülerbezug ([2026-08-13-klassenkasse-pro-schueler-design.md](../specs/2026-08-13-klassenkasse-pro-schueler-design.md)).
- Die Schülerzuordnung ist **optional**, nicht Pflicht.
- **Kein Sollbetrag/Zielbetrag** — nur die Ist-Summe der bisherigen Einzahlungen wird angezeigt.
- Die Schülerübersicht erscheint **nur im Klassenkasse-Tab**, nicht zusätzlich auf der Schüler-Detailseite.
- **Kein Testframework vorhanden.** Statt TDD gilt pro Task: `npm run build` muss fehlerfrei durchlaufen, danach die im Task genannte manuelle Prüfung im Dev-Server (`npm run dev`). Erst dann committen.
- Migrationen werden manuell im Supabase SQL-Editor ausgeführt (kein lokales Supabase-CLI-Setup im Repo) — die SQL-Datei selbst ist die Quelle der Wahrheit und wird trotzdem committet.
- **Sprache:** Alle sichtbaren Texte auf Deutsch, Du-Form (wie bisher). Umlaute ausgeschrieben.
- **Branch:** `ui-ux-ueberarbeitung` (aktueller Branch).
- **Commit-Nachrichten:** Deutsch, Imperativ, mit `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` als letzte Zeile.

## Dateistruktur

**Neu:**

| Datei | Verantwortung |
|---|---|
| `supabase/migrations/20260813100000_class_fund_entries_student.sql` | Spalte `student_id`, Index, erweiterte RLS-Policies |

**Geändert:**

| Datei | Änderung |
|---|---|
| `src/lib/supabase/types.ts` | `ClassFundEntry.student_id: string \| null` |
| `src/schemas/classFund.ts` | `student_id` optional + Refine-Regel (kein Schüler bei Auszahlung) |
| `src/pages/ClassDetailPage.tsx` | Formularstate/-feld für Schülerauswahl, Submit-Payload, Buchungszeile mit Schülername, neue Sektion „Einzahlungen pro Schüler“ |

---

### Task 1: Datenbank-Migration und Typen

**Files:**
- Create: `supabase/migrations/20260813100000_class_fund_entries_student.sql`
- Modify: `src/lib/supabase/types.ts` (bei `ClassFundEntry`, aktuell um Zeile 1-40, siehe unten)

**Interfaces:**
- Consumes: nichts
- Produces: Spalte `class_fund_entries.student_id uuid null`; TypeScript-Typ `ClassFundEntry.student_id: string | null`

- [ ] **Step 1: Migration schreiben**

`supabase/migrations/20260813100000_class_fund_entries_student.sql` neu anlegen:

```sql
alter table public.class_fund_entries
  add column if not exists student_id uuid references public.students (id) on delete set null;

create index if not exists idx_class_fund_entries_student
  on public.class_fund_entries (student_id);

drop policy if exists "class_fund_entries_insert_own" on public.class_fund_entries;
create policy "class_fund_entries_insert_own"
on public.class_fund_entries for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.classes
    where classes.id = class_fund_entries.class_id
      and classes.owner_id = auth.uid()
  )
  and (
    class_fund_entries.student_id is null
    or exists (
      select 1 from public.students
      where students.id = class_fund_entries.student_id
        and students.owner_id = auth.uid()
    )
  )
);

drop policy if exists "class_fund_entries_update_own" on public.class_fund_entries;
create policy "class_fund_entries_update_own"
on public.class_fund_entries for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.classes
    where classes.id = class_fund_entries.class_id
      and classes.owner_id = auth.uid()
  )
  and (
    class_fund_entries.student_id is null
    or exists (
      select 1 from public.students
      where students.id = class_fund_entries.student_id
        and students.owner_id = auth.uid()
    )
  )
);
```

- [ ] **Step 2: Migration manuell gegen Supabase prüfen**

Falls ein Supabase-Projekt für dieses Repo verbunden ist: Inhalt der Datei im Supabase SQL-Editor ausführen und bestätigen, dass keine Fehler auftreten (`alter table ... add column if not exists` ist idempotent, kann gefahrlos erneut laufen). Falls kein Projekt verbunden ist, diesen Schritt überspringen und im Commit vermerken, dass die Migration noch nicht angewendet wurde — sie bleibt Teil des Repos für den nächsten Deploy.

- [ ] **Step 3: `ClassFundEntry`-Typ erweitern**

In `src/lib/supabase/types.ts:70-79` das bestehende `ClassFundEntry`-Interface ersetzen (nur `student_id` direkt nach `class_id` neu einfügen, alle anderen Felder bleiben exakt gleich):

```ts
export interface ClassFundEntry {
  id: string;
  teacher_id: string;
  class_id: string;
  student_id: string | null;
  entry_type: FundEntryType;
  amount: number;
  entry_date: string;
  note: string | null;
  created_at: string;
}
```

- [ ] **Step 4: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler (die neue Property ist optional in der Nutzung, da bisher nirgendwo `ClassFundEntry` vollständig literal konstruiert wird außer über Supabase-Responses).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260813100000_class_fund_entries_student.sql src/lib/supabase/types.ts
git commit -m "$(cat <<'EOF'
Ergänze student_id für Klassenkassen-Buchungen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Validierungsschema

**Files:**
- Modify: `src/schemas/classFund.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `classFundEntrySchema` akzeptiert jetzt `student_id?: string`; `ClassFundEntryInput` enthält `student_id?: string`. Bei `entry_type === "withdrawal"` mit gesetztem `student_id` liefert `safeParse` einen Fehler mit `path: ["student_id"]`.

- [ ] **Step 1: Schema erweitern**

`src/schemas/classFund.ts` komplett ersetzen:

```ts
import { z } from "zod";

export const classFundEntrySchema = z
  .object({
    entry_type: z.enum(["deposit", "withdrawal"]),
    amount: z.coerce.number().positive("Betrag muss positiv sein."),
    entry_date: z.string().min(1, "Datum fehlt."),
    note: z.string().max(300).optional().or(z.literal("")),
    student_id: z.string().uuid().optional().or(z.literal("")),
  })
  .refine((data) => data.entry_type === "deposit" || !data.student_id, {
    message: "Auszahlungen können keinem Schüler zugeordnet werden.",
    path: ["student_id"],
  });

export type ClassFundEntryInput = z.infer<typeof classFundEntrySchema>;
```

- [ ] **Step 2: Manuell im Dev-Server prüfen**

Run: `npm run dev`, dann im Browser das bestehende Klassenkasse-Formular öffnen (noch ohne UI-Änderung aus Task 3/4) und eine normale Einzahlung ohne Schülerbezug speichern — muss weiterhin funktionieren, da `student_id` optional ist und der Payload aus `handleCreateFundEntry` (Task 3 ändert diesen erst) noch kein `student_id`-Feld enthält.

- [ ] **Step 3: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 4: Commit**

```bash
git add src/schemas/classFund.ts
git commit -m "$(cat <<'EOF'
Erlaube optionale Schülerzuordnung im Klassenkassen-Schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Buchungsformular — Schülerauswahl

**Files:**
- Modify: `src/pages/ClassDetailPage.tsx` (Formularstate ~Zeile 72-77, `handleCreateFundEntry` ~Zeile 198-231, Formularfelder im Fund-Modal ~Zeile 635-684)

**Interfaces:**
- Consumes: `classFundEntrySchema` aus Task 2, `studentsQuery.data` (Typ `StudentWithEnrollment[]`, Felder `id`, `first_name`, `last_name`, bereits nach `last_name` sortiert), `fundQuery.createEntry` aus `useClassFund`
- Produces: `fundForm.student_id: string`; `handleCreateFundEntry` sendet `student_id: result.data.student_id || null` an `createEntry.mutateAsync`

- [ ] **Step 1: Formularstate um `student_id` erweitern**

In `src/pages/ClassDetailPage.tsx` den `fundForm`-State-Initialwert anpassen:

```tsx
const [fundForm, setFundForm] = useState({
  entry_type: "deposit",
  amount: "",
  entry_date: new Date().toISOString().slice(0, 10),
  note: "",
  student_id: "",
});
```

- [ ] **Step 2: `handleCreateFundEntry` anpassen**

Im `createEntry.mutateAsync`-Aufruf (aktuell ohne `student_id`) das Feld ergänzen, und beim Reset nach erfolgreichem Speichern `student_id` mit zurücksetzen:

```tsx
await fundQuery.createEntry.mutateAsync({
  teacher_id: currentTeacherId,
  class_id: classId,
  student_id: result.data.entry_type === "deposit" && result.data.student_id
    ? result.data.student_id
    : null,
  entry_type: result.data.entry_type,
  amount: result.data.amount,
  entry_date: result.data.entry_date,
  note: result.data.note || null,
});
setFundForm((prev) => ({ ...prev, amount: "", note: "", student_id: "" }));
```

- [ ] **Step 3: Dropdown-Feld ins Formular einfügen und Auszahlung zurücksetzt Schüler**

Das `entry_type`-Select-`onChange` so anpassen, dass beim Wechsel zu `withdrawal` der gewählte Schüler zurückgesetzt wird:

```tsx
<Field label="Art der Buchung" htmlFor="class-fund-type">
  <select
    id="class-fund-type"
    className="field"
    value={fundForm.entry_type}
    onChange={(event) =>
      setFundForm((prev) => ({
        ...prev,
        entry_type: event.target.value,
        student_id: event.target.value === "withdrawal" ? "" : prev.student_id,
      }))
    }
  >
    <option value="deposit">Einzahlung</option>
    <option value="withdrawal">Auszahlung</option>
  </select>
</Field>
```

Direkt danach (vor dem „Betrag"-Feld) das neue Dropdown einfügen, nur aktiv bei Einzahlung:

```tsx
<Field label="Schüler" htmlFor="class-fund-student" hint="Optional. Nur bei Einzahlungen wählbar.">
  <select
    id="class-fund-student"
    className="field"
    value={fundForm.student_id}
    disabled={fundForm.entry_type === "withdrawal"}
    onChange={(event) =>
      setFundForm((prev) => ({ ...prev, student_id: event.target.value }))
    }
  >
    <option value="">Kein Schüler / Klasse allgemein</option>
    {(studentsQuery.data ?? []).map((student) => (
      <option key={student.id} value={student.id}>
        {student.first_name} {student.last_name}
      </option>
    ))}
  </select>
</Field>
```

- [ ] **Step 4: Manuell im Dev-Server prüfen**

Run: `npm run dev`. Im Klassenkasse-Tab „Buchung erfassen" öffnen:
1. „Einzahlung" wählen, einen Schüler auswählen, Betrag/Datum ausfüllen, speichern → muss ohne Fehler funktionieren.
2. Erneut öffnen, „Einzahlung" mit „Kein Schüler / Klasse allgemein" speichern → muss weiterhin funktionieren (Bestandsverhalten).
3. Erneut öffnen, „Auszahlung" wählen → Schüler-Dropdown muss deaktiviert und auf „Kein Schüler" zurückgesetzt sein; speichern muss funktionieren.

- [ ] **Step 5: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ClassDetailPage.tsx
git commit -m "$(cat <<'EOF'
Ergänze Schülerauswahl im Klassenkassen-Buchungsformular

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Buchungsliste mit Schülername und Sektion „Einzahlungen pro Schüler“

**Files:**
- Modify: `src/pages/ClassDetailPage.tsx` (Buchungsliste ~Zeile 518-554, Fund-Tab-Header ~Zeile 480-501)

**Interfaces:**
- Consumes: `fundQuery.data: ClassFundEntry[]` (mit `student_id` aus Task 1), `studentsQuery.data: StudentWithEnrollment[]`
- Produces: `studentTotals: { student: StudentWithEnrollment; total: number }[]`, berechnet via `useMemo`

- [ ] **Step 1: `studentTotals` berechnen**

In `src/pages/ClassDetailPage.tsx` direkt nach der bestehenden `fundBalance`-`useMemo` (Zeile ~83-89) ergänzen:

```tsx
const studentTotals = useMemo(() => {
  const totals = new Map<string, number>();
  for (const entry of fundQuery.data ?? []) {
    if (entry.entry_type === "deposit" && entry.student_id) {
      totals.set(entry.student_id, (totals.get(entry.student_id) ?? 0) + entry.amount);
    }
  }
  return (studentsQuery.data ?? []).map((student) => ({
    student,
    total: totals.get(student.id) ?? 0,
  }));
}, [fundQuery.data, studentsQuery.data]);
```

- [ ] **Step 2: Schülername in Buchungszeile anzeigen**

In der Buchungsliste (Zeile ~522-529) die Labelzeile für Einzahlungen mit Schülerbezug erweitern. Dazu vor dem `.map` einen Lookup bauen und in der Zeile verwenden:

```tsx
{fundQuery.data?.map((entry) => {
  const entryStudent = entry.student_id
    ? (studentsQuery.data ?? []).find((student) => student.id === entry.student_id)
    : undefined;
  return (
    <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          {entry.entry_type === "deposit" ? "Einzahlung" : "Auszahlung"}
          {entryStudent ? ` · ${entryStudent.first_name} ${entryStudent.last_name}` : ""}
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
  );
})}
```

Das ersetzt den bestehenden `{fundQuery.data?.map((entry) => ( ... ))}`-Block 1:1 (gleiche JSX-Struktur, nur die Labelzeile und der neue `entryStudent`-Lookup kommen dazu).

- [ ] **Step 3: Sektion „Einzahlungen pro Schüler“ einfügen**

Im Fund-Tab-Header-Bereich (nach dem schließenden `</div>` des Saldo-/Button-Headers, Zeile ~501, vor dem `{fundQuery.error ? ... }`-Block für die Buchungsliste) eine neue Unterbereich-Sektion einfügen:

```tsx
{studentTotals.length > 0 ? (
  <div className="border-b border-line px-5 py-4">
    <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">
      Einzahlungen pro Schüler
    </h3>
    <div className="mt-2 divide-y divide-line">
      {studentTotals.map(({ student, total }) => (
        <div
          key={student.id}
          className="flex items-center justify-between gap-4 py-2 text-sm"
        >
          <span className="text-ink">
            {student.first_name} {student.last_name}
          </span>
          <span className="font-semibold tabular-nums text-ink">
            {formatCurrency(total)}
          </span>
        </div>
      ))}
    </div>
  </div>
) : null}
```

- [ ] **Step 4: Manuell im Dev-Server prüfen**

Run: `npm run dev`. Im Klassenkasse-Tab:
1. Prüfen, dass „Einzahlungen pro Schüler" alle Schüler der Klasse mit `0,00 €` zeigt, wenn noch nichts eingezahlt wurde.
2. Eine Einzahlung für einen Schüler A erfassen (aus Task 3) → Summe bei Schüler A muss sich um den Betrag erhöhen, alle anderen bei `0,00 €` bleiben.
3. Eine zweite Einzahlung für denselben Schüler A erfassen → Summe muss sich addieren (nicht überschreiben).
4. Eine Auszahlung erfassen → darf keine der Schülersummen verändern, nur den Gesamtsaldo oben.
5. In der Buchungsliste prüfen, dass die Einzahlung mit Schülerbezug den Namen zeigt (`Einzahlung · Vorname Nachname`) und Einzahlungen ohne Schülerbezug weiterhin nur „Einzahlung" zeigen.
6. Eine Buchung mit Schülerbezug löschen → Summe des Schülers muss sich entsprechend reduzieren.

- [ ] **Step 5: Build prüfen**

Run: `npm run build`
Erwartet: Kein TypeScript-Fehler.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ClassDetailPage.tsx
git commit -m "$(cat <<'EOF'
Zeige Schülername in Buchungen und Summen pro Schüler in der Klassenkasse

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
