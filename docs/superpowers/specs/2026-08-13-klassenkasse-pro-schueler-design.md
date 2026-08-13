# Klassenkasse pro Schüler – Design

## Kontext

Die Klassenkasse (`class_fund_entries`) trackt aktuell nur klassenweite Ein-
und Auszahlungen mit Gesamtsaldo. Es ist nicht ersichtlich, welcher Schüler
welchen Betrag eingezahlt hat. Ziel: Einzahlungen können optional einem
Schüler zugeordnet werden, damit pro Schüler nachvollziehbar ist, wie viel
er/sie bisher eingezahlt hat.

## Entscheidungen (aus Brainstorming)

- Nur **Einzahlungen** können einem Schüler zugeordnet werden. Auszahlungen
  bleiben immer klassenweit ohne Schülerbezug (typischer Fall: Schüler
  zahlen ein, Lehrer gibt für die ganze Klasse aus).
- Die Schülerzuordnung bei Einzahlungen ist **optional** (Dropdown mit
  "Kein Schüler / Klasse allgemein"), damit allgemeine Einnahmen (z.B.
  Kuchenverkauf) weiterhin ohne Schülerbezug erfasst werden können.
- Es gibt **keinen Sollbetrag** pro Schüler – nur die Ist-Summe der
  bisherigen Einzahlungen wird angezeigt, kein Soll/Ist-Abgleich.
- Die Schülerübersicht erscheint **nur im Klassenkasse-Tab** (nicht
  zusätzlich auf der Schüler-Detailseite).

## Datenmodell

Neue Migration ergänzt `public.class_fund_entries`:

```sql
alter table public.class_fund_entries
  add column if not exists student_id uuid references public.students (id) on delete set null;

create index if not exists idx_class_fund_entries_student
  on public.class_fund_entries (student_id);
```

Bestehende Zeilen bleiben mit `student_id = null` gültig.

### RLS

`class_fund_entries_insert_own` und `class_fund_entries_update_own` werden
um eine zusätzliche Bedingung erweitert (Muster identisch zu
`assessments_insert_own`): wenn `student_id` gesetzt ist, muss der
referenzierte Schüler `owner_id = auth.uid()` gehören.

```sql
and (
  class_fund_entries.student_id is null
  or exists (
    select 1 from public.students
    where students.id = class_fund_entries.student_id
      and students.owner_id = auth.uid()
  )
)
```

Es gibt bewusst **keine** Prüfung, dass der Schüler auch in der
Zielklasse eingeschrieben ist (Konsistenz mit dem bestehenden
`assessments`-Muster, das ebenfalls nur Owner prüft, nicht Enrollment).

## Typen

`src/lib/supabase/types.ts`: `ClassFundEntry` bekommt
`student_id: string | null`.

## Schema/Validierung

`src/schemas/classFund.ts`: `classFundEntrySchema` bekommt
`student_id: z.string().uuid().optional().or(z.literal(""))` plus eine
`.refine(...)`-Regel, die einen gesetzten `student_id`-Wert bei
`entry_type === "withdrawal"` ablehnt (Fehlermeldung z.B. "Auszahlungen
können keinem Schüler zugeordnet werden.").

## UI: Buchungsformular (`ClassDetailPage.tsx`)

Im "Buchung erfassen"-Modal wird ein neues Dropdown "Schüler" ergänzt:

- Optionen: "Kein Schüler / Klasse allgemein" (leerer Wert) + alle Schüler
  der aktuellen Klasse (`studentsQuery.data`), sortiert wie in der
  bestehenden Schülerliste.
- Das Dropdown ist nur aktiv/sichtbar, wenn `entry_type === "deposit"`
  gewählt ist. Beim Wechsel zu "Auszahlung" wird ein bereits gewählter
  Schüler im Formularstate zurückgesetzt.

## UI: Buchungsliste

Zeilen für Einzahlungen mit `student_id` zeigen zusätzlich den
Schülernamen an, z.B. `Einzahlung · Max Mustermann` statt nur
`Einzahlung`. Einzahlungen ohne Schülerbezug bleiben wie bisher
(`Einzahlung`). Auszahlungen sind unverändert.

## UI: Neue Sektion "Einzahlungen pro Schüler"

Im Klassenkasse-Tab, direkt unterhalb des Gesamtsaldos, eine kompakte
Liste aller Schüler der Klasse mit der Summe ihrer bisherigen
Einzahlungen (`0,00 €`, falls noch keine Einzahlung erfasst wurde).

Berechnung rein clientseitig via `useMemo` aus bereits geladenen Daten
(`fundQuery.data`, `studentsQuery.data`) — kein neuer Query/Endpoint:

```ts
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

Darstellung: einfache Liste (Name links, Betrag rechts, `tabular-nums`),
analog zum bestehenden Buchungslisten-Stil. Kein Ladezustand nötig, da
beide Queries bereits im Tab geladen sind (bestehende Loading/Error-States
der jeweiligen Query greifen).

## Hook

`useClassFund` bleibt inhaltlich unverändert — `select("*")` liefert die
neue Spalte automatisch mit; `createEntry` reicht `student_id` als Teil
des Payloads durch, keine Signaturänderung nötig.

## Out of Scope

- Sollbetrag/Zielbetrag pro Schüler oder Klasse.
- Schülerbezug für Auszahlungen.
- Anzeige der Einzahlungssumme auf der Schüler-Detailseite.
- Historisierung bei Klassenwechsel eines Schülers (bestehende
  MVP-Einschränkung, nicht Teil dieses Features).
