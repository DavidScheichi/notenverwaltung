import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AssessmentCreateDrawer } from "../components/grades/AssessmentCreateDrawer";
import { SubjectMobileList } from "../components/grades/SubjectMobileList";
import { useToast } from "../components/ui/ToastProvider";
import { GradeMatrix } from "../components/grades/GradeTable";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusLegend } from "../components/ui/StatusLegend";
import { useConfirm } from "../components/ui/useConfirm";
import { useSubjectAssessmentData } from "../hooks/useAssessmentDefinitions";
import { useClassById } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useSubjectById } from "../hooks/useSubjects";
import { calculateSubjectTotals, gradeFromPercent, resolveGradeBoundaries } from "../lib/subjectOverview";
import type {
  AssessmentDefinition,
  AssessmentInputMode,
  AssessmentResultStatus,
  AssessmentType,
} from "../lib/supabase/types";

const LoadingRows = () => (
  <div className="space-y-3">
    <div className="h-14 animate-pulse rounded-xl bg-sunken" />
    <div className="h-14 animate-pulse rounded-xl bg-sunken" />
  </div>
);

export const SubjectOverviewPage = () => {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { classId: classIdParam, subjectId = "" } = useParams();
  const subjectQuery = useSubjectById(subjectId);
  const derivedClassId = classIdParam ?? subjectQuery.data?.class_id ?? "";
  const classQuery = useClassById(derivedClassId);
  const studentsQuery = useStudents(derivedClassId);
  const matrixQuery = useSubjectAssessmentData(subjectId);

  const [drawerForm, setDrawerForm] = useState<{
    typeId: string;
    name: string;
    shortLabel: string;
    assessmentDate: string;
    maxPoints: string;
    weightMultiplier: string;
    inputMode: AssessmentInputMode;
    includeInTotal: boolean;
  }>({
    typeId: "",
    name: "",
    shortLabel: "",
    assessmentDate: "",
    maxPoints: "",
    weightMultiplier: "1",
    inputMode: "points",
    includeInTotal: true,
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState<"name" | "best" | "weakest">("name");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "makeup_pending" | "excused">("all");
  const [showDirectGrades, setShowDirectGrades] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const boundaries = useMemo(
    () => resolveGradeBoundaries(matrixQuery.data?.boundaries ?? [], subjectId),
    [matrixQuery.data?.boundaries, subjectId],
  );

  const assessmentTypes = matrixQuery.data?.assessmentTypes ?? [];
  const definitions = matrixQuery.data?.definitions ?? [];
  const sortedDefinitions = useMemo(() => {
    const typeMap = new Map(assessmentTypes.map((type) => [type.id, type]));

    return [...definitions].sort((left, right) => {
      const leftType = left.type_id ? typeMap.get(left.type_id)?.name ?? "Sonstiges" : "Sonstiges";
      const rightType = right.type_id ? typeMap.get(right.type_id)?.name ?? "Sonstiges" : "Sonstiges";

      if (leftType !== rightType) {
        return leftType.localeCompare(rightType, "de");
      }

      if (left.order_index !== right.order_index) {
        return left.order_index - right.order_index;
      }

      return left.name.localeCompare(right.name, "de");
    });
  }, [assessmentTypes, definitions]);
  const visibleDefinitions = useMemo(
    () =>
      sortedDefinitions.filter((definition) => {
        if (selectedTypeFilter === "all") {
          return true;
        }

        if (selectedTypeFilter === "") {
          return definition.type_id === null;
        }

        return definition.type_id === selectedTypeFilter;
      }),
    [selectedTypeFilter, sortedDefinitions],
  );
  const results = matrixQuery.data?.results ?? [];
  const students = useMemo(() => {
    const statusMatchesFilter = (status: AssessmentResultStatus | null | undefined) => {
      if (statusFilter === "all") {
        return true;
      }

      if (statusFilter === "open") {
        return (
          status === undefined ||
          status === null ||
          status === "missing" ||
          status === "makeup_pending" ||
          status === "absent_unexcused"
        );
      }

      if (statusFilter === "makeup_pending") {
        return status === "makeup_pending";
      }

      if (statusFilter === "excused") {
        return status === "excused";
      }

      return true;
    };

    const base = (studentsQuery.data ?? []).filter((student) => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    });

    const enriched = base.map((student) => {
      const rowResults = results.filter((entry) => entry.student_id === student.id);
      const totals = calculateSubjectTotals(visibleDefinitions, rowResults);
      const finalGrade = gradeFromPercent(totals.percent, boundaries);
      const incomplete = visibleDefinitions.some((definition) => {
        const hit = rowResults.find(
          (entry) => entry.assessment_definition_id === definition.id,
        );
        return !hit || hit.status !== "filled" || (hit.points === null && hit.grade === null);
      });
      const statusMatch = statusFilter === "all"
        ? true
        : visibleDefinitions.some((definition) => {
            const hit = rowResults.find(
              (entry) => entry.assessment_definition_id === definition.id,
            );
            return statusMatchesFilter(hit?.status);
          });

      return {
        student,
        finalGrade,
        incomplete,
        statusMatch,
      };
    });

    const filtered = enriched.filter((entry) => {
      if (onlyIncomplete && !entry.incomplete) {
        return false;
      }
      if (!entry.statusMatch) {
        return false;
      }
      return true;
    });

    filtered.sort((left, right) => {
      if (sortMode === "name") {
        const leftName = `${left.student.last_name} ${left.student.first_name}`;
        const rightName = `${right.student.last_name} ${right.student.first_name}`;
        return leftName.localeCompare(rightName, "de");
      }

      const leftGrade = left.finalGrade ?? 6;
      const rightGrade = right.finalGrade ?? 6;
      if (sortMode === "best") {
        return leftGrade - rightGrade;
      }
      return rightGrade - leftGrade;
    });

    return filtered.map((entry) => entry.student);
  }, [boundaries, onlyIncomplete, results, searchTerm, sortMode, statusFilter, studentsQuery.data, visibleDefinitions]);

  const getTypeMeta = (typeId: string | null) => {
    const type = assessmentTypes.find((entry) => entry.id === typeId);

    return {
      type,
      label: type?.name ?? "Sonstiges",
    };
  };

  const applyTypeDefaults = (type?: AssessmentType) => {
    setDrawerForm((prev) => ({
      ...prev,
      typeId: type?.id ?? "",
      inputMode: type?.default_input_mode ?? prev.inputMode,
      maxPoints:
        type?.default_max_points !== null && type?.default_max_points !== undefined
          ? String(type.default_max_points)
          : "",
      weightMultiplier: String(type?.default_weight_multiplier ?? 1),
    }));
  };

  const preferredTypeNames = [
    "Hausübung",
    "Mitarbeit",
    "Lernzielkontrolle",
    "Zusatzaufgabe",
    "Referat",
  ];
  const filterTypes = preferredTypeNames
    .map((label) => assessmentTypes.find((entry) => entry.name === label))
    .filter((entry): entry is AssessmentType => Boolean(entry));

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

  return (
    <div className="space-y-6">
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

      <section className="card-raised card-pad p-0">
        {studentsQuery.isLoading || matrixQuery.isLoading ? (
          <div className="p-5">
            <LoadingRows />
          </div>
        ) : students.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Keine Schüler in dieser Klasse"
              description="Lege zuerst mindestens einen Schüler an, damit Werte eingetragen werden können."
            />
          </div>
        ) : visibleDefinitions.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Keine Leistungsnachweise"
              description="Lege den ersten Leistungsnachweis an, um mit der Notenerfassung zu starten."
              actionLabel="+ Leistungsnachweis anlegen"
              onAction={() => setIsDrawerOpen(true)}
            />
          </div>
        ) : (
          <>
            <div className="lg:hidden p-4">
              <SubjectMobileList
                students={students}
                definitions={visibleDefinitions}
                boundaries={boundaries}
                typeLabel={(typeId) => getTypeMeta(typeId).label}
                results={results}
                showDirectGrades={showDirectGrades}
                onSave={async (payload) => {
                  try {
                    await matrixQuery.upsertResult.mutateAsync(payload);
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Speichern fehlgeschlagen.",
                    );
                    throw error;
                  }
                }}
              />
            </div>
            <div className="hidden lg:block">
              <GradeMatrix
                classId={derivedClassId}
                subjectId={subjectId}
                students={students}
                definitions={visibleDefinitions}
                boundaries={boundaries}
                typeLabel={(typeId) => getTypeMeta(typeId).label}
                results={results}
                showDirectGrades={showDirectGrades}
                onSave={async (payload) => {
                  try {
                    await matrixQuery.upsertResult.mutateAsync(payload);
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Speichern fehlgeschlagen.",
                    );
                    throw error;
                  }
                }}
                onToggleInclude={(definitionId, includeInTotal) =>
                  void matrixQuery.updateDefinition.mutate({
                    id: definitionId,
                    includeInTotal,
                  })
                }
                onDeleteDefinition={async (definitionId) => {
                  setDeleteError(null);

                  const confirmed = await confirm({
                    title: "Leistungsnachweis löschen?",
                    description:
                      "Alle eingetragenen Ergebnisse dieses Nachweises werden entfernt. Direkt danach kannst du die Aktion über „Rückgängig“ wiederherstellen.",
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
              />
              <div className="border-t border-line px-5 py-3">
                <StatusLegend />
              </div>
            </div>
          </>
        )}
      </section>
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
      <AssessmentCreateDrawer
        isOpen={isDrawerOpen}
        isSaving={matrixQuery.createDefinition.isPending}
        values={drawerForm}
        types={assessmentTypes}
        error={formError}
        onClose={() => {
          setIsDrawerOpen(false);
          setFormError(null);
        }}
        onChange={setDrawerForm}
        onApplyTypeDefaults={(typeId) =>
          applyTypeDefaults(assessmentTypes.find((entry) => entry.id === typeId))
        }
        onSave={async () => {
          setFormError(null);
          if (!drawerForm.name.trim()) {
            setFormError("Name für Leistungsnachweis fehlt.");
            return;
          }

          try {
            await matrixQuery.createDefinition.mutateAsync({
              subjectId,
              typeId: drawerForm.typeId || null,
              name: drawerForm.name.trim(),
              shortLabel: drawerForm.shortLabel.trim() || null,
              assessmentDate: drawerForm.assessmentDate || undefined,
              maxPoints: drawerForm.maxPoints ? Number(drawerForm.maxPoints) : null,
              weightMultiplier: Number(drawerForm.weightMultiplier || "1"),
              inputMode: drawerForm.inputMode as "points" | "grade" | "either",
              includeInTotal: drawerForm.includeInTotal,
              orderIndex: definitions.length + 1,
            });
            toast.success("Leistungsnachweis wurde erstellt.");
            setDrawerForm({
              typeId: "",
              name: "",
              shortLabel: "",
              assessmentDate: "",
              maxPoints: "",
              weightMultiplier: "1",
              inputMode: "points",
              includeInTotal: true,
            });
            setIsDrawerOpen(false);
          } catch (error) {
            toast.error("Leistungsnachweis konnte nicht gespeichert werden.");
            setFormError(
              error instanceof Error
                ? error.message
                : "Leistungsnachweis konnte nicht gespeichert werden.",
            );
          }
        }}
      />
      {confirmDialog}
    </div>
  );
};
