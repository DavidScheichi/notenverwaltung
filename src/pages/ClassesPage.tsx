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

      {error ? (
        <ErrorState message={error.message} />
      ) : isLoading ? (
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
