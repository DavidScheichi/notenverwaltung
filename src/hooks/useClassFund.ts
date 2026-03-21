import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import type { ClassFundEntry } from "../lib/supabase/types";

export const useClassFund = (classId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["class-fund", classId];

  const entriesQuery = useQuery({
    queryKey,
    enabled: Boolean(classId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_fund_entries")
        .select("*")
        .eq("class_id", classId)
        .order("entry_date", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as ClassFundEntry[];
    },
  });

  const createEntry = useMutation({
    mutationFn: async (
      payload: Omit<ClassFundEntry, "id" | "created_at">,
    ) => {
      const { error } = await supabase.from("class_fund_entries").insert(payload);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("class_fund_entries")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...entriesQuery,
    createEntry,
    deleteEntry,
  };
};

