import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import type { AssessmentDefinition, AssessmentResult, Subject } from "../lib/supabase/types";

interface DeletedSubjectSnapshot {
  subject: Subject | null;
  definitions: AssessmentDefinition[];
  results: AssessmentResult[];
}

export const useSubjects = (classId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["subjects", classId];

  const subjectsQuery = useQuery({
    queryKey,
    enabled: Boolean(classId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("class_id", classId)
        .order("name");

      if (error) {
        throw error;
      }

      return (data ?? []) as Subject[];
    },
  });

  const createSubject = useMutation({
    mutationFn: async (payload: Omit<Subject, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("subjects").insert(payload);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateSubject = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<Subject> & { id: string }) => {
      const { error } = await supabase.from("subjects").update(payload).eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteSubject = useMutation({
    mutationFn: async (id: string) => {
      const { data: subjectData, error: subjectLoadError } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (subjectLoadError) {
        throw subjectLoadError;
      }

      const { data: definitions, error: definitionsError } = await supabase
        .from("assessment_definitions")
        .select("*")
        .eq("subject_id", id);

      if (definitionsError) {
        throw definitionsError;
      }

      const typedDefinitions = (definitions ?? []) as AssessmentDefinition[];
      const definitionIds = typedDefinitions.map((entry) => entry.id);
      let typedResults: AssessmentResult[] = [];

      if (definitionIds.length > 0) {
        const { data: resultsData, error: resultsLoadError } = await supabase
          .from("assessment_results")
          .select("*")
          .in("assessment_definition_id", definitionIds);

        if (resultsLoadError) {
          throw resultsLoadError;
        }

        typedResults = (resultsData ?? []) as AssessmentResult[];
      }

      const snapshot: DeletedSubjectSnapshot = {
        subject: (subjectData as Subject | null) ?? null,
        definitions: typedDefinitions,
        results: typedResults,
      };

      if (definitionIds.length > 0) {
        const { error: resultsError } = await supabase
          .from("assessment_results")
          .delete()
          .in("assessment_definition_id", definitionIds);

        if (resultsError) {
          throw resultsError;
        }

        const { error: deleteDefinitionsError } = await supabase
          .from("assessment_definitions")
          .delete()
          .in("id", definitionIds);

        if (deleteDefinitionsError) {
          throw deleteDefinitionsError;
        }
      }

      const { error } = await supabase.from("subjects").delete().eq("id", id);

      if (error) {
        throw error;
      }

      return snapshot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["subject"] });
      queryClient.invalidateQueries({ queryKey: ["subject-assessment-data"] });
    },
  });

  const restoreDeletedSubject = useMutation({
    mutationFn: async (snapshot: DeletedSubjectSnapshot) => {
      if (!snapshot.subject) {
        throw new Error("Kein Snapshot für Wiederherstellung vorhanden.");
      }

      const { error: subjectError } = await supabase
        .from("subjects")
        .insert(snapshot.subject);
      if (subjectError) {
        throw subjectError;
      }

      if (snapshot.definitions.length > 0) {
        const { error: definitionsError } = await supabase
          .from("assessment_definitions")
          .insert(snapshot.definitions);
        if (definitionsError) {
          throw definitionsError;
        }
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
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["subject"] });
      queryClient.invalidateQueries({ queryKey: ["subject-assessment-data"] });
      queryClient.invalidateQueries({ queryKey: ["student-assessment-overview"] });
    },
  });

  return {
    ...subjectsQuery,
    createSubject,
    updateSubject,
    deleteSubject,
    restoreDeletedSubject,
  };
};

export const useAllSubjects = () =>
  useQuery({
    queryKey: ["subjects", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      return (data ?? []) as Subject[];
    },
  });

export const useSubjectById = (subjectId?: string) =>
  useQuery({
    queryKey: ["subject", subjectId],
    enabled: Boolean(subjectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", subjectId)
        .single();

      if (error) {
        throw error;
      }

      return data as Subject;
    },
  });
