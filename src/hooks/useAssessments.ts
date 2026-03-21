import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import type { Assessment } from "../lib/supabase/types";

export const useAssessments = ({
  classId,
  studentId,
}: {
  classId?: string;
  studentId?: string;
}) => {
  const queryClient = useQueryClient();
  const queryKey = ["assessments", classId, studentId];

  const assessmentsQuery = useQuery({
    queryKey,
    enabled: Boolean(classId),
    queryFn: async () => {
      let query = supabase
        .from("assessments")
        .select("*")
        .eq("class_id", classId)
        .order("assessed_on", { ascending: false });

      if (studentId) {
        query = query.eq("student_id", studentId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data ?? []) as Assessment[];
    },
  });

  const createAssessment = useMutation({
    mutationFn: async (payload: Omit<Assessment, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("assessments").insert(payload);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assessments"] }),
  });

  const deleteAssessment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessments").delete().eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assessments"] }),
  });

  return {
    ...assessmentsQuery,
    createAssessment,
    deleteAssessment,
  };
};

