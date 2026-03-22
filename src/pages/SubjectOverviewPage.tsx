import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AssessmentCreateDrawer } from "../components/grades/AssessmentCreateDrawer";
import { SubjectMobileList } from "../components/grades/SubjectMobileList";
import { useToast } from "../components/ui/ToastProvider";
import { GradeMatrix } from "../components/grades/GradeTable";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
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

export const SubjectOverviewPage = () => {
  const toast = useToast();
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

  return (
    <div className="space-y-6">
      <section className="panel">
        <Link
          to={classIdParam ? `/classes/${derivedClassId}` : "/subjects"}
          className="text-sm font-medium text-brand-700"
        >
          ← {classIdParam ? "Zurück zur Klasse" : "Zurück zu den Fächern"}
        </Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">{classQuery.data?.name ?? "Klasse"}</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {subjectQuery.data?.name ?? "Fachübersicht"}
            </h2>
          </div>
        </div>
        <div className="mt-4 space-y-3 lg:hidden">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
              {students.length} Schüler
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
              {visibleDefinitions.length} Leistungsnachweise
            </span>
          </div>
          <div className="flex gap-2">
            <input
              className="field"
              placeholder="Schüler suchen"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button
              type="button"
              className="button-secondary shrink-0"
              onClick={() => setIsMobileFilterOpen(true)}
            >
              Filter
            </button>
          </div>
          <button type="button" className="button-primary w-full" onClick={() => setIsDrawerOpen(true)}>
            + Leistungsnachweis
          </button>
        </div>
        <div className="mt-4 hidden gap-3 md:grid-cols-2 xl:grid-cols-6 lg:grid">
          <input
            className="field"
            placeholder="Schüler suchen"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            className="field"
            value={selectedTypeFilter}
            onChange={(event) => setSelectedTypeFilter(event.target.value)}
          >
            <option value="all">Alle</option>
            {filterTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
            <option value="">Sonstiges</option>
          </select>
          <select
            className="field"
            value={sortMode}
            onChange={(event) =>
              setSortMode(event.target.value as "name" | "best" | "weakest")
            }
          >
            <option value="name">Name</option>
            <option value="best">Beste zuerst</option>
            <option value="weakest">Schwächste zuerst</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={onlyIncomplete}
              onChange={(event) => setOnlyIncomplete(event.target.checked)}
            />
            Nur unvollständige
          </label>
          <select
            className="field"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | "open" | "makeup_pending" | "excused",
              )
            }
          >
            <option value="all">Status: Alle</option>
            <option value="open">Status: Offen/Fehlend</option>
            <option value="makeup_pending">Status: Nachtrag offen</option>
            <option value="excused">Status: Entschuldigt</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showDirectGrades}
              onChange={(event) => setShowDirectGrades(event.target.checked)}
            />
            Direkte Noten anzeigen
          </label>
          <button type="button" className="button-primary xl:col-span-1" onClick={() => setIsDrawerOpen(true)}>
            + Leistungsnachweis
          </button>
        </div>
        {formError ? <div className="mt-3"><ErrorState message={formError} /></div> : null}
        {deleteError ? <div className="mt-3"><ErrorState message={deleteError} /></div> : null}
        {matrixQuery.error ? (
          <div className="mt-3">
            <ErrorState message={matrixQuery.error.message} />
          </div>
        ) : null}
      </section>

      <section className="panel overflow-hidden p-0">
        {students.length === 0 ? (
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
                  try {
                    const snapshot = await matrixQuery.deleteDefinition.mutateAsync(definitionId);
                    toast.undoable("Leistungsnachweis gelöscht.", async () => {
                      await matrixQuery.restoreDeletedDefinition.mutateAsync(snapshot);
                      toast.success("Leistungsnachweis wurde wiederhergestellt.");
                    });
                  } catch (error) {
                    const message = error instanceof Error
                      ? error.message
                      : "Leistungsnachweis konnte nicht gelöscht werden.";
                    toast.error(message);
                    setDeleteError(message);
                    throw error;
                  }
                }}
              />
            </div>
          </>
        )}
      </section>
      {isMobileFilterOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden" onClick={() => setIsMobileFilterOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Filter</h3>
              <button type="button" className="button-secondary" onClick={() => setIsMobileFilterOpen(false)}>
                Schließen
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <select
                className="field"
                value={selectedTypeFilter}
                onChange={(event) => setSelectedTypeFilter(event.target.value)}
              >
                <option value="all">Alle Typen</option>
                {filterTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
                <option value="">Sonstiges</option>
              </select>
              <select
                className="field"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as "name" | "best" | "weakest")}
              >
                <option value="name">Nach Name</option>
                <option value="best">Beste zuerst</option>
                <option value="weakest">Schwächste zuerst</option>
              </select>
              <select
                className="field"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | "open" | "makeup_pending" | "excused")
                }
              >
                <option value="all">Alle Status</option>
                <option value="open">Offen / fehlend</option>
                <option value="makeup_pending">Nachtrag offen</option>
                <option value="excused">Entschuldigt</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyIncomplete}
                  onChange={(event) => setOnlyIncomplete(event.target.checked)}
                />
                Nur unvollständige
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={showDirectGrades}
                  onChange={(event) => setShowDirectGrades(event.target.checked)}
                />
                Direkte Noten anzeigen
              </label>
            </div>
          </div>
        </div>
      ) : null}
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
    </div>
  );
};
