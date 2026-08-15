import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import { deriveDefaultSchoolYearLabel } from "../lib/schoolYear";
import type { SchoolYear } from "../lib/supabase/types";

const queryKey = ["school-years"];

export const useSchoolYears = () => {
  const queryClient = useQueryClient();

  const schoolYearsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_years")
        .select("*")
        .order("label", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as SchoolYear[];
    },
  });

  const createSchoolYear = useMutation({
    mutationFn: async ({ label }: { label: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht eingeloggt.");
      }

      const { data, error } = await supabase
        .from("school_years")
        .insert({ teacher_id: user.id, label, is_current: false })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as SchoolYear;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...schoolYearsQuery,
    createSchoolYear,
  };
};

export const useCurrentSchoolYear = () =>
  useQuery({
    queryKey: ["school-years", "current"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_years")
        .select("*")
        .eq("is_current", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return (data as SchoolYear | null) ?? null;
    },
  });

export const ensureCurrentSchoolYear = async (teacherId: string): Promise<SchoolYear> => {
  const { data: existing, error: existingError } = await supabase
    .from("school_years")
    .select("*")
    .eq("teacher_id", teacherId)
    .eq("is_current", true)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as SchoolYear;
  }

  const { data, error } = await supabase
    .from("school_years")
    .insert({
      teacher_id: teacherId,
      label: deriveDefaultSchoolYearLabel(new Date()),
      is_current: true,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as SchoolYear;
};
