import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import type {
  AssessmentDefinition,
  AssessmentInputMode,
  AssessmentResult,
  AssessmentResultStatus,
  AssessmentType,
  GradeBoundary,
} from "../lib/supabase/types";

interface DeletedDefinitionSnapshot {
  definition: AssessmentDefinition | null;
  results: AssessmentResult[];
}

export const useSubjectAssessmentData = (subjectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["subject-assessment-data", subjectId];

  const query = useQuery({
    queryKey,
    enabled: Boolean(subjectId),
    queryFn: async () => {
      const { data: definitionsData, error: definitionsError } = await supabase
        .from("assessment_definitions")
        .select("*")
        .eq("subject_id", subjectId)
        .order("order_index")
        .order("created_at");

      if (definitionsError) {
        throw definitionsError;
      }

      const definitions = (definitionsData ?? []) as AssessmentDefinition[];
      const definitionIds = definitions.map((entry) => entry.id);

      let results: AssessmentResult[] = [];

      if (definitionIds.length > 0) {
        const { data: resultsData, error: resultsError } = await supabase
          .from("assessment_results")
          .select("*")
          .in("assessment_definition_id", definitionIds);

        if (resultsError) {
          throw resultsError;
        }

        results = (resultsData ?? []) as AssessmentResult[];
      }

      const { data: boundariesData, error: boundariesError } = await supabase
        .from("grade_boundaries")
        .select("*")
        .or(`subject_id.eq.${subjectId},subject_id.is.null`)
        .order("min_percent", { ascending: false });

      if (boundariesError) {
        throw boundariesError;
      }

      const { data: typesData, error: typesError } = await supabase
        .from("assessment_types")
        .select("*")
        .order("name");

      return {
        definitions,
        results,
        boundaries: (boundariesData ?? []) as GradeBoundary[],
        assessmentTypes: typesError ? ([] as AssessmentType[]) : ((typesData ?? []) as AssessmentType[]),
      };
    },
  });

  const createDefinition = useMutation({
    mutationFn: async (payload: {
      subjectId: string;
      name: string;
      shortLabel?: string | null;
      assessmentDate?: string;
      maxPoints?: number | null;
      weightMultiplier?: number;
      inputMode: AssessmentInputMode;
      typeId?: string | null;
      includeInTotal?: boolean;
      orderIndex: number;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht eingeloggt.");
      }

      const { error } = await supabase.from("assessment_definitions").insert({
        owner_id: user.id,
        subject_id: payload.subjectId,
        type_id: payload.typeId ?? null,
        name: payload.name,
        short_label: payload.shortLabel ?? null,
        assessment_date: payload.assessmentDate || null,
        max_points: payload.maxPoints ?? null,
        weight_multiplier: payload.weightMultiplier ?? 1,
        input_mode: payload.inputMode,
        include_in_total: payload.includeInTotal ?? true,
        order_index: payload.orderIndex,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const upsertResult = useMutation({
    mutationFn: async (payload: {
      assessmentDefinitionId: string;
      studentId: string;
      points?: number | null;
      grade?: number | null;
      status?: AssessmentResultStatus;
      comment?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht eingeloggt.");
      }

      const nextPoints = payload.points ?? null;
      const nextGrade = payload.grade ?? null;
      const nextStatus = payload.status ?? "filled";

      if (nextStatus === "filled" && nextPoints === null && nextGrade === null) {
        const { error } = await supabase
          .from("assessment_results")
          .delete()
          .eq("assessment_definition_id", payload.assessmentDefinitionId)
          .eq("student_id", payload.studentId);

        if (error) {
          throw error;
        }

        return;
      }

      const { error } = await supabase.from("assessment_results").upsert(
        {
          owner_id: user.id,
          assessment_definition_id: payload.assessmentDefinitionId,
          student_id: payload.studentId,
          status: nextStatus,
          points: nextPoints,
          grade: nextGrade,
          comment: payload.comment ?? null,
        },
        {
          onConflict: "assessment_definition_id,student_id",
        },
      );

      if (error) {
        throw error;
      }
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{
        definitions: AssessmentDefinition[];
        results: AssessmentResult[];
        boundaries: GradeBoundary[];
        assessmentTypes: AssessmentType[];
      }>(queryKey);

      if (!previous) {
        return { previous };
      }

      const nextPoints = payload.points ?? null;
      const nextGrade = payload.grade ?? null;
      const nextStatus = payload.status ?? "filled";
      const nextResults = [...previous.results];
      const existingIndex = nextResults.findIndex(
        (entry) =>
          entry.assessment_definition_id === payload.assessmentDefinitionId &&
          entry.student_id === payload.studentId,
      );

      if (nextStatus === "filled" && nextPoints === null && nextGrade === null) {
        if (existingIndex >= 0) {
          nextResults.splice(existingIndex, 1);
        }
      } else if (existingIndex >= 0) {
        nextResults[existingIndex] = {
          ...nextResults[existingIndex],
          status: nextStatus,
          points: nextPoints,
          grade: nextGrade,
          updated_at: new Date().toISOString(),
        };
      } else {
        nextResults.push({
          id: `optimistic-${payload.assessmentDefinitionId}-${payload.studentId}`,
          owner_id: "",
          assessment_definition_id: payload.assessmentDefinitionId,
          student_id: payload.studentId,
          status: nextStatus,
          points: nextPoints,
          grade: nextGrade,
          comment: payload.comment ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      queryClient.setQueryData(queryKey, {
        ...previous,
        results: nextResults,
      });

      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateDefinition = useMutation({
    mutationFn: async ({
      id,
      includeInTotal,
    }: {
      id: string;
      includeInTotal: boolean;
    }) => {
      const { error } = await supabase
        .from("assessment_definitions")
        .update({ include_in_total: includeInTotal })
        .eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteDefinition = useMutation({
    mutationFn: async (definitionId: string) => {
      const { data: definitionData, error: definitionLoadError } = await supabase
        .from("assessment_definitions")
        .select("*")
        .eq("id", definitionId)
        .maybeSingle();

      if (definitionLoadError) {
        throw definitionLoadError;
      }

      const { data: resultsData, error: resultsLoadError } = await supabase
        .from("assessment_results")
        .select("*")
        .eq("assessment_definition_id", definitionId);

      if (resultsLoadError) {
        throw resultsLoadError;
      }

      const snapshot: DeletedDefinitionSnapshot = {
        definition: (definitionData as AssessmentDefinition | null) ?? null,
        results: (resultsData ?? []) as AssessmentResult[],
      };

      const { error: resultsError } = await supabase
        .from("assessment_results")
        .delete()
        .eq("assessment_definition_id", definitionId);

      if (resultsError) {
        throw resultsError;
      }

      const { error } = await supabase
        .from("assessment_definitions")
        .delete()
        .eq("id", definitionId);

      if (error) {
        throw error;
      }

      return snapshot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["student-assessment-overview"] });
    },
  });

  const restoreDeletedDefinition = useMutation({
    mutationFn: async (snapshot: DeletedDefinitionSnapshot) => {
      if (!snapshot.definition) {
        throw new Error("Kein Snapshot für Wiederherstellung vorhanden.");
      }

      const { error: definitionError } = await supabase
        .from("assessment_definitions")
        .insert(snapshot.definition);
      if (definitionError) {
        throw definitionError;
      }

      if (snapshot.results.length > 0) {
        const { error: resultsError } = await supabase
          .from("assessment_results")
          .insert(snapshot.results);
        if (resultsError) {
          throw resultsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["student-assessment-overview"] });
    },
  });

  return {
    ...query,
    createDefinition,
    upsertResult,
    updateDefinition,
    deleteDefinition,
    restoreDeletedDefinition,
  };
};

export const useStudentAssessmentOverview = (
  subjectIds?: string[],
  studentId?: string,
) => {
  const normalizedSubjectIds = subjectIds ?? [];

  return useQuery({
    queryKey: ["student-assessment-overview", studentId, normalizedSubjectIds.join(",")],
    enabled: Boolean(studentId) && normalizedSubjectIds.length > 0,
    queryFn: async () => {
      const { data: definitionsData, error: definitionsError } = await supabase
        .from("assessment_definitions")
        .select("*")
        .in("subject_id", normalizedSubjectIds)
        .order("order_index")
        .order("created_at");

      if (definitionsError) {
        throw definitionsError;
      }

      const definitions = (definitionsData ?? []) as AssessmentDefinition[];
      const definitionIds = definitions.map((entry) => entry.id);

      if (definitionIds.length === 0) {
        return {
          definitions,
          results: [] as AssessmentResult[],
          boundaries: [] as GradeBoundary[],
        };
      }

      const { data: resultsData, error: resultsError } = await supabase
        .from("assessment_results")
        .select("*")
        .in("assessment_definition_id", definitionIds)
        .eq("student_id", studentId);

      if (resultsError) {
        throw resultsError;
      }

      const { data: boundariesData, error: boundariesError } = await supabase
        .from("grade_boundaries")
        .select("*")
        .order("min_percent", { ascending: false });

      if (boundariesError) {
        throw boundariesError;
      }

      return {
        definitions,
        results: (resultsData ?? []) as AssessmentResult[],
        boundaries: (boundariesData ?? []) as GradeBoundary[],
      };
    },
  });
};
