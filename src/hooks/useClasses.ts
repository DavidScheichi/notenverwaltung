import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import type { SchoolClass } from "../lib/supabase/types";

const queryKey = ["classes"];

export const useClasses = () => {
  const queryClient = useQueryClient();

  const classesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("created_at", { ascending: false });

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

      const { data, error } = await supabase
        .from("classes")
        .insert({
          name,
          teacher_id: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as SchoolClass;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<SchoolClass[]>(queryKey, (old) => [data, ...(old ?? [])]);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateClass = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("classes").update({ name }).eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
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

