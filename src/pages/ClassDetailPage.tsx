import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { StudentCreateModal } from "../components/ui/StudentCreateModal";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field } from "../components/ui/Field";
import { GradeBadge } from "../components/ui/GradeBadge";
import { Menu } from "../components/ui/Menu";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { PromoteClassModal } from "../components/classes/PromoteClassModal";
import { useSchoolYear } from "../components/layout/SchoolYearContext";
import { useConfirm } from "../components/ui/useConfirm";
import { useToast } from "../components/ui/ToastProvider";
import { SubjectFormFields } from "../components/subjects/SubjectFormFields";
import type { SubjectFormValues } from "../components/subjects/SubjectFormFields";
import { useAssessments } from "../hooks/useAssessments";
import { useClassFund } from "../hooks/useClassFund";
import { useClassById, useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { computeSubjectAverage } from "../lib/grades";
import { formatCurrency, formatDate } from "../lib/utils";
import { classFundEntrySchema } from "../schemas/classFund";
import { parsePointsMapping, subjectSchema } from "../schemas/subjects";

const tabs = [
  { key: "students", label: "Schüler" },
  { key: "subjects", label: "Fächer" },
  { key: "fund", label: "Klassenkasse" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const LoadingRows = () => (
  <div className="space-y-3 p-5">
    <div className="h-14 animate-pulse rounded-xl bg-sunken" />
    <div className="h-14 animate-pulse rounded-xl bg-sunken" />
  </div>
);

export const ClassDetailPage = () => {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { classId = "" } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("students");

  const classQuery = useClassById(classId);
  const { schoolYears, selectedSchoolYear, selectSchoolYear } = useSchoolYear();
  const classesQuery = useClasses(selectedSchoolYear?.id);
  const allClassesQuery = useClasses();
  const studentsQuery = useStudents(classId);
  const subjectsQuery = useSubjects(classId);
  const assessmentsQuery = useAssessments({ classId });
  const fundQuery = useClassFund(classId);

  const [studentForm, setStudentForm] = useState({
    first_name: "",
    last_name: "",
    notes: "",
  });
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentCreateError, setStudentCreateError] = useState<string | null>(null);

  const [subjectForm, setSubjectForm] = useState<SubjectFormValues>({
    class_id: classId,
    name: "",
    subject_type: "normal",
    grading_kind: "grade",
    average_mode: "mean",
    default_weight: "1",
    points_to_grade_raw: '{"90":1,"80":2,"65":3,"50":4,"0":5}',
  });
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectCreateError, setSubjectCreateError] = useState<string | null>(null);

  const [fundForm, setFundForm] = useState({
    entry_type: "deposit",
    amount: "",
    entry_date: new Date().toISOString().slice(0, 10),
    note: "",
    student_id: "",
  });
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [fundCreateError, setFundCreateError] = useState<string | null>(null);

  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const currentYearLabel =
    schoolYears.find((year) => year.id === classQuery.data?.school_year_id)?.label ?? "";

  // Ob DIESE Klasse bereits ins nächste Schuljahr übernommen wurde — unabhängig
  // vom global ausgewählten/aktuellen Schuljahr. Sonst würde das Promoten der
  // ersten Klasse eines Lehrers Geschwister-Klassen im selben (noch nicht
  // übernommenen) Schuljahr fälschlich als archiviert markieren.
  const hasSuccessor = Boolean(
    allClassesQuery.data?.some((c) => c.predecessor_class_id === classQuery.data?.id),
  );

  const isArchived = hasSuccessor;

  const currentTeacherId = classQuery.data?.teacher_id ?? "";

  const fundBalance = useMemo(
    () =>
      (fundQuery.data ?? []).reduce((sum, entry) => {
        return entry.entry_type === "deposit" ? sum + entry.amount : sum - entry.amount;
      }, 0),
    [fundQuery.data],
  );

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

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    const confirmed = await confirm({
      title: `${studentName} löschen?`,
      description:
        "Alle Ergebnisse dieses Schülers werden entfernt. Direkt danach kannst du die Aktion über „Rückgängig\" wiederherstellen.",
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

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    const confirmed = await confirm({
      title: `„${subjectName}\" löschen?`,
      description:
        "Alle Leistungsnachweise und eingetragenen Ergebnisse dieses Fachs werden entfernt. Direkt danach kannst du die Aktion über „Rückgängig\" wiederherstellen.",
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

  const handleCreateSubject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = subjectSchema.safeParse({ ...subjectForm, class_id: classId });
    if (!result.success || !currentTeacherId) {
      setSubjectCreateError("Bitte prüfe deine Eingaben.");
      return;
    }

    try {
      await subjectsQuery.createSubject.mutateAsync({
        teacher_id: currentTeacherId,
        class_id: classId,
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
        class_id: classId,
        name: "",
        subject_type: "normal",
        grading_kind: "grade",
        average_mode: "mean",
        default_weight: "1",
        points_to_grade_raw: '{"90":1,"80":2,"65":3,"50":4,"0":5}',
      });
      setSubjectCreateError(null);
      setIsSubjectModalOpen(false);
    } catch (error) {
      toast.error("Fach konnte nicht angelegt werden.");
      setSubjectCreateError(
        error instanceof Error ? error.message : "Fach konnte nicht angelegt werden.",
      );
    }
  };

  const handleCreateFundEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = classFundEntrySchema.safeParse(fundForm);
    if (!result.success) {
      setFundCreateError(
        result.error.issues[0]?.message ?? "Bitte prüfe deine Eingaben.",
      );
      return;
    }
    if (!currentTeacherId) {
      setFundCreateError("Klasse konnte nicht ermittelt werden.");
      return;
    }

    try {
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
      setFundCreateError(null);
      setIsFundModalOpen(false);
      toast.success("Buchung gespeichert.");
    } catch (error) {
      toast.error("Buchung konnte nicht gespeichert werden.");
      setFundCreateError(
        error instanceof Error ? error.message : "Buchung konnte nicht gespeichert werden.",
      );
    }
  };

  return (
    <div className="space-y-6">
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
          classQuery.data && !hasSuccessor ? (
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

      {tab === "students" ? (
        <>
          <section className="card-raised">
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
                disabled={isArchived}
                title={isArchived ? "Vergangene Schuljahre sind schreibgeschützt." : undefined}
                onClick={() => setIsStudentModalOpen(true)}
              >
                Schüler hinzufügen
              </button>
            </div>

            {studentsQuery.error ? (
              <div className="p-5">
                <ErrorState message={studentsQuery.error.message} />
              </div>
            ) : studentsQuery.isLoading ? (
              <LoadingRows />
            ) : studentsQuery.data?.length === 0 ? (
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

          <StudentCreateModal
            isOpen={isStudentModalOpen}
            isSaving={studentsQuery.createStudent.isPending}
            values={studentForm}
            error={studentCreateError}
            onChange={setStudentForm}
            onClose={() => {
              setIsStudentModalOpen(false);
              setStudentCreateError(null);
            }}
            onSave={async (values) => {
              setStudentCreateError(null);
              try {
                await studentsQuery.createStudent.mutateAsync({
                  ...values,
                  classId,
                });
                toast.success("Schüler wurde erstellt.");
                setStudentForm({ first_name: "", last_name: "", notes: "" });
                setIsStudentModalOpen(false);
              } catch (error) {
                toast.error("Schüler konnte nicht angelegt werden.");
                setStudentCreateError(
                  error instanceof Error
                    ? error.message
                    : "Schüler konnte nicht angelegt werden.",
                );
              }
            }}
          />
        </>
      ) : null}

      {tab === "subjects" ? (
        <section className="card-raised">
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
              disabled={isArchived}
              title={isArchived ? "Vergangene Schuljahre sind schreibgeschützt." : undefined}
              onClick={() => setIsSubjectModalOpen(true)}
            >
              Fach anlegen
            </button>
          </div>

          {subjectsQuery.error ? (
            <div className="p-5">
              <ErrorState message={subjectsQuery.error.message} />
            </div>
          ) : subjectsQuery.isLoading ? (
            <LoadingRows />
          ) : subjectsQuery.data?.length === 0 ? (
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

      {tab === "fund" ? (
        <section className="card-raised">
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
              disabled={isArchived}
              title={isArchived ? "Vergangene Schuljahre sind schreibgeschützt." : undefined}
              onClick={() => setIsFundModalOpen(true)}
            >
              Buchung erfassen
            </button>
          </div>

          {studentTotals.length > 0 && !fundQuery.isLoading && !fundQuery.error ? (
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

          {fundQuery.error ? (
            <div className="p-5">
              <ErrorState message={fundQuery.error.message} />
            </div>
          ) : fundQuery.isLoading ? (
            <LoadingRows />
          ) : fundQuery.data?.length === 0 ? (
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
            </div>
          )}
        </section>
      ) : null}

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

      <Modal
        isOpen={isFundModalOpen}
        onClose={() => {
          setIsFundModalOpen(false);
          setFundCreateError(null);
        }}
        title="Buchung erfassen"
        description="Trage eine Ein- oder Auszahlung für die Klassenkasse ein."
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsFundModalOpen(false);
                setFundCreateError(null);
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              form="class-fund-form"
              className="btn-primary"
              disabled={fundQuery.createEntry.isPending}
            >
              {fundQuery.createEntry.isPending ? "Wird gespeichert..." : "Buchung speichern"}
            </button>
          </>
        }
      >
        <form id="class-fund-form" className="space-y-5" onSubmit={handleCreateFundEntry}>
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
          <Field
            label="Schüler"
            htmlFor="class-fund-student"
            hint="Optional. Nur bei Einzahlungen wählbar."
          >
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
          <Field label="Betrag" htmlFor="class-fund-amount">
            <input
              id="class-fund-amount"
              className="field"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={fundForm.amount}
              onChange={(event) =>
                setFundForm((prev) => ({ ...prev, amount: event.target.value }))
              }
            />
          </Field>
          <Field label="Datum" htmlFor="class-fund-date">
            <input
              id="class-fund-date"
              className="field"
              type="date"
              value={fundForm.entry_date}
              onChange={(event) =>
                setFundForm((prev) => ({ ...prev, entry_date: event.target.value }))
              }
            />
          </Field>
          <Field label="Notiz" htmlFor="class-fund-note" hint="Optional.">
            <textarea
              id="class-fund-note"
              className="field min-h-24"
              placeholder="z. B. Klassenfahrt, Materialkauf …"
              value={fundForm.note}
              onChange={(event) =>
                setFundForm((prev) => ({ ...prev, note: event.target.value }))
              }
            />
          </Field>
          {fundCreateError ? <ErrorState message={fundCreateError} /> : null}
        </form>
      </Modal>

      {classQuery.data ? (
        <PromoteClassModal
          isOpen={isPromoteModalOpen}
          onClose={() => setIsPromoteModalOpen(false)}
          schoolClass={classQuery.data}
          currentLabel={currentYearLabel}
          students={studentsQuery.data ?? []}
          onPromoted={(newClass) => {
            setIsPromoteModalOpen(false);
            selectSchoolYear(newClass.school_year_id);
            toast.success("Klasse wurde ins neue Schuljahr übernommen.");
            navigate(`/classes/${newClass.id}`);
          }}
        />
      ) : null}

      {confirmDialog}
    </div>
  );
};
