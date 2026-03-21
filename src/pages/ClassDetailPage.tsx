import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StudentCreateModal } from "../components/ui/StudentCreateModal";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { useToast } from "../components/ui/ToastProvider";
import { useAssessments } from "../hooks/useAssessments";
import { useClassFund } from "../hooks/useClassFund";
import { useClassById, useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { computeSubjectAverage } from "../lib/grades";
import { formatCurrency, formatDate } from "../lib/utils";
import { classFundEntrySchema } from "../schemas/classFund";
import { parsePointsMapping, subjectSchema } from "../schemas/subjects";

const tabs = ["students", "subjects", "fund"] as const;
type TabKey = (typeof tabs)[number];

export const ClassDetailPage = () => {
  const toast = useToast();
  const { classId = "" } = useParams();
  const [tab, setTab] = useState<TabKey>("students");

  const classQuery = useClassById(classId);
  const classesQuery = useClasses();
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

  const [subjectForm, setSubjectForm] = useState({
    class_id: classId,
    name: "",
    subject_type: "normal",
    grading_kind: "grade",
    average_mode: "mean",
    default_weight: "1",
    points_to_grade_raw: '{ "90": 1, "80": 2, "65": 3, "50": 4, "0": 5 }',
  });

  const [fundForm, setFundForm] = useState({
    entry_type: "deposit",
    amount: "",
    entry_date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const currentTeacherId = classQuery.data?.teacher_id ?? "";

  const fundBalance = useMemo(
    () =>
      (fundQuery.data ?? []).reduce((sum, entry) => {
        return entry.entry_type === "deposit" ? sum + entry.amount : sum - entry.amount;
      }, 0),
    [fundQuery.data],
  );

  const studentOptions = studentsQuery.data ?? [];
  const subjectOptions = subjectsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Klasse</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {classQuery.data?.name ?? "Wird geladen..."}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button
                key={item}
                type="button"
                className={item === tab ? "button-primary" : "button-secondary"}
                onClick={() => setTab(item)}
              >
                {item === "students" && "Schüler"}
                {item === "subjects" && "Fächer"}
                {item === "fund" && "Klassenkasse"}
              </button>
            ))}
          </div>
        </div>
        {classQuery.error ? <ErrorState message={classQuery.error.message} /> : null}
      </section>

      {tab === "students" ? (
        <>
          <section className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Schülerliste</h3>
              <button
                type="button"
                className="button-primary"
                onClick={() => setIsStudentModalOpen(true)}
              >
                + Schüler
              </button>
            </div>
            {studentsQuery.error ? <ErrorState message={studentsQuery.error.message} /> : null}
            {studentsQuery.data?.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Noch keine Schüler"
                  description="Lege den ersten Schüler für diese Klasse an."
                  actionLabel="+ Schüler hinzufügen"
                  onAction={() => setIsStudentModalOpen(true)}
                />
              </div>
            ) : null}
            <div className="mt-4 grid gap-3">
              {studentsQuery.data?.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="text-sm text-slate-500">{student.notes || "Keine Notiz"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/classes/${classId}/students/${student.id}`}
                      className="button-primary"
                    >
                      Details
                    </Link>
                    <select
                      className="field min-w-36"
                      defaultValue={classId}
                      onChange={(event) =>
                        void studentsQuery.moveStudent.mutateAsync({
                          enrollmentId: student.enrollments[0]?.id ?? "",
                          newClassId: event.target.value,
                        })
                      }
                    >
                      {classesQuery.data?.map((schoolClass) => (
                        <option key={schoolClass.id} value={schoolClass.id}>
                          {schoolClass.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="button-danger"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          "Diesen Schüler wirklich löschen?\nAlle zugehörigen Ergebnisse werden entfernt.\nDu kannst die Aktion danach über „Rückgängig“ wiederherstellen.",
                        );
                        if (!confirmed) {
                          return;
                        }
                        try {
                          const snapshot = await studentsQuery.deleteStudent.mutateAsync(student.id);
                          toast.undoable("Schüler gelöscht.", async () => {
                            await studentsQuery.restoreDeletedStudent.mutateAsync(snapshot);
                            toast.success("Schüler wurde wiederhergestellt.");
                          });
                        } catch {
                          toast.error("Schüler konnte nicht gelöscht werden.");
                        }
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="panel">
            <h3 className="text-lg font-semibold text-slate-900">Fach anlegen</h3>
            <form
              className="mt-4 space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const result = subjectSchema.safeParse(subjectForm);
                if (!result.success || !currentTeacherId) {
                  return;
                }

                try {
                  await subjectsQuery.createSubject.mutateAsync({
                    teacher_id: currentTeacherId,
                    class_id: subjectForm.class_id || classId,
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
                } catch {
                  toast.error("Fach konnte nicht angelegt werden.");
                  return;
                }

                setSubjectForm((prev) => ({ ...prev, class_id: classId, name: "" }));
              }}
            >
              <select
                className="field"
                value={subjectForm.class_id}
                onChange={(event) =>
                  setSubjectForm((prev) => ({ ...prev, class_id: event.target.value }))
                }
              >
                {classesQuery.data?.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
              <input
                className="field"
                placeholder="Mathematik"
                value={subjectForm.name}
                onChange={(event) =>
                  setSubjectForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <select
                className="field"
                value={subjectForm.subject_type}
                onChange={(event) =>
                  setSubjectForm((prev) => ({ ...prev, subject_type: event.target.value }))
                }
              >
                <option value="normal">Normales Fach</option>
                <option value="class_fund">Klassenkasse-Fach</option>
              </select>
              <select
                className="field"
                value={subjectForm.grading_kind}
                onChange={(event) =>
                  setSubjectForm((prev) => ({ ...prev, grading_kind: event.target.value }))
                }
              >
                <option value="grade">Direkte Note</option>
                <option value="points">Punkte mit Mapping</option>
              </select>
              <select
                className="field"
                value={subjectForm.average_mode}
                onChange={(event) =>
                  setSubjectForm((prev) => ({ ...prev, average_mode: event.target.value }))
                }
              >
                <option value="mean">Mittelwert</option>
                <option value="weighted">Gewichteter Durchschnitt</option>
              </select>
              <input
                className="field"
                type="number"
                step="0.1"
                value={subjectForm.default_weight}
                onChange={(event) =>
                  setSubjectForm((prev) => ({ ...prev, default_weight: event.target.value }))
                }
                placeholder="Standardgewicht"
              />
              {subjectForm.grading_kind === "points" ? (
                <textarea
                  className="field min-h-28 font-mono text-xs"
                  value={subjectForm.points_to_grade_raw}
                  onChange={(event) =>
                    setSubjectForm((prev) => ({
                      ...prev,
                      points_to_grade_raw: event.target.value,
                    }))
                  }
                />
              ) : null}
              <button
                type="submit"
                className="button-primary w-full min-w-[180px]"
                disabled={subjectsQuery.createSubject.isPending}
              >
                {subjectsQuery.createSubject.isPending ? "Wird gespeichert..." : "Fach speichern"}
              </button>
            </form>
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold text-slate-900">Fächer</h3>
            {subjectsQuery.data?.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Keine Fächer"
                  description="Lege links das erste Fach an."
                />
              </div>
            ) : null}
            <div className="mt-4 grid gap-3">
              {subjectsQuery.data?.map((subject) => {
                const linkedAssessments = (assessmentsQuery.data ?? []).filter(
                  (assessment) => assessment.subject_id === subject.id,
                );
                const average = computeSubjectAverage(subject, linkedAssessments);

                return (
                  <div
                    key={subject.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{subject.name}</p>
                        <p className="text-sm text-slate-500">
                          {subject.grading_kind === "points" ? "Punkte" : "Note"} ·{" "}
                          {subject.average_mode === "weighted"
                            ? "gewichtet"
                            : "Mittelwert"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/classes/${classId}/subjects/${subject.id}`}
                          className="button-secondary"
                        >
                          Notenübersicht
                        </Link>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              "Dieses Fach wirklich löschen?\nAlle zugehörigen Leistungsnachweise und Ergebnisse werden entfernt.\nDu kannst die Aktion danach über „Rückgängig“ wiederherstellen.",
                            );
                            if (!confirmed) {
                              return;
                            }
                            try {
                              const snapshot = await subjectsQuery.deleteSubject.mutateAsync(subject.id);
                              toast.undoable("Fach gelöscht.", async () => {
                                await subjectsQuery.restoreDeletedSubject.mutateAsync(snapshot);
                                toast.success("Fach wurde wiederhergestellt.");
                              });
                            } catch {
                              toast.error("Fach konnte nicht gelöscht werden.");
                            }
                          }}
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      Aktueller Schnitt:{" "}
                      <span className="font-semibold">
                        {average === null ? "Noch keine Daten" : average.toFixed(2)}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "fund" ? (
        <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="panel">
            <h3 className="text-lg font-semibold text-slate-900">Klassenkasse</h3>
            <p className="mt-1 text-sm text-slate-500">
              Aktueller Saldo: <span className="font-semibold">{formatCurrency(fundBalance)}</span>
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const result = classFundEntrySchema.safeParse(fundForm);
                if (!result.success || !currentTeacherId) {
                  return;
                }

                await fundQuery.createEntry.mutateAsync({
                  teacher_id: currentTeacherId,
                  class_id: classId,
                  entry_type: result.data.entry_type,
                  amount: result.data.amount,
                  entry_date: result.data.entry_date,
                  note: result.data.note || null,
                });

                setFundForm((prev) => ({ ...prev, amount: "", note: "" }));
              }}
            >
              <select
                className="field"
                value={fundForm.entry_type}
                onChange={(event) =>
                  setFundForm((prev) => ({ ...prev, entry_type: event.target.value }))
                }
              >
                <option value="deposit">Einzahlung</option>
                <option value="withdrawal">Auszahlung</option>
              </select>
              <input
                className="field"
                type="number"
                step="0.01"
                placeholder="Betrag"
                value={fundForm.amount}
                onChange={(event) =>
                  setFundForm((prev) => ({ ...prev, amount: event.target.value }))
                }
              />
              <input
                className="field"
                type="date"
                value={fundForm.entry_date}
                onChange={(event) =>
                  setFundForm((prev) => ({ ...prev, entry_date: event.target.value }))
                }
              />
              <textarea
                className="field min-h-24"
                placeholder="Notiz"
                value={fundForm.note}
                onChange={(event) =>
                  setFundForm((prev) => ({ ...prev, note: event.target.value }))
                }
              />
              <button
                type="submit"
                className="button-primary w-full min-w-[180px]"
                disabled={fundQuery.createEntry.isPending}
              >
                {fundQuery.createEntry.isPending ? "Wird gespeichert..." : "Buchung speichern"}
              </button>
            </form>
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold text-slate-900">Buchungen</h3>
            {fundQuery.data?.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Keine Buchungen"
                  description="Noch keine Ein- oder Auszahlungen vorhanden."
                />
              </div>
            ) : null}
            <div className="mt-4 grid gap-3">
              {fundQuery.data?.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {entry.entry_type === "deposit" ? "Einzahlung" : "Auszahlung"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDate(entry.entry_date)} · {entry.note || "Keine Notiz"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(
                        entry.entry_type === "deposit" ? entry.amount : -entry.amount,
                      )}
                    </span>
                    <button
                      type="button"
                      className="button-danger"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          "Diese Buchung wirklich löschen?",
                        );
                        if (!confirmed) {
                          return;
                        }
                        await fundQuery.deleteEntry.mutateAsync(entry.id);
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};
