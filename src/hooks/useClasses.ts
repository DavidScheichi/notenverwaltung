import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import { ensureCurrentSchoolYear } from "./useSchoolYears";
import type { SchoolClass } from "../lib/supabase/types";

export const useClasses = (schoolYearId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["classes", schoolYearId ?? "all"];

  const classesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      let request = supabase
        .from("classes")
        .select("*")
        .order("created_at", { ascending: false });

      if (schoolYearId) {
        request = request.eq("school_year_id", schoolYearId);
      }

      const { data, error } = await request;

      if (error) {
        throw error;
      }

      return (data ?? []) as SchoolClass[];
    },
  });

  const createClass = useMutation({
    mutationFn: async (name: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht eingeloggt.");
      }

      const schoolYear = await ensureCurrentSchoolYear(user.id);

      const { data, error } = await supabase
        .from("classes")
        .insert({
          name,
          teacher_id: user.id,
          school_year_id: schoolYear.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as SchoolClass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["school-years"] });
    },
  });

  const updateClass = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("classes").update({ name }).eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });

  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });

  return {
    ...classesQuery,
    createClass,
    updateClass,
    deleteClass,
  };
};

export const useClassById = (classId?: string) =>
  useQuery({
    queryKey: ["classes", classId],
    enabled: Boolean(classId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .single();

      if (error) {
        throw error;
      }

      return data as SchoolClass;
    },
  });
