import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import { computeCarryoverFundEntry } from "../lib/schoolYear";
import type { ClassFundEntry, SchoolClass, SchoolYear, Subject } from "../lib/supabase/types";

interface PromoteClassInput {
  sourceClassId: string;
  targetSchoolYearLabel: string;
  newClassName: string;
  studentIds: string[];
}

export const usePromoteClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceClassId,
      targetSchoolYearLabel,
      newClassName,
      studentIds,
    }: PromoteClassInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht eingeloggt.");
      }

      const { data: existingYear, error: existingYearError } = await supabase
        .from("school_years")
        .select("*")
        .eq("teacher_id", user.id)
        .eq("label", targetSchoolYearLabel)
        .maybeSingle();

      if (existingYearError) {
        throw existingYearError;
      }

      let targetYear = existingYear as SchoolYear | null;

      if (!targetYear) {
        const { data: createdYear, error: createYearError } = await supabase
          .from("school_years")
          .insert({ teacher_id: user.id, label: targetSchoolYearLabel, is_current: false })
          .select()
          .single();

        if (createYearError) {
          throw createYearError;
        }

        targetYear = createdYear as SchoolYear;
      }

      const { error: unsetCurrentError } = await supabase
        .from("school_years")
        .update({ is_current: false })
        .eq("teacher_id", user.id)
        .eq("is_current", true)
        .neq("id", targetYear.id);

      if (unsetCurrentError) {
        throw unsetCurrentError;
      }

      const { error: setCurrentError } = await supabase
        .from("school_years")
        .update({ is_current: true })
        .eq("id", targetYear.id);

      if (setCurrentError) {
        throw setCurrentError;
      }

      const { data: newClass, error: classError } = await supabase
        .from("classes")
        .insert({
          teacher_id: user.id,
          name: newClassName,
          school_year_id: targetYear.id,
          predecessor_class_id: sourceClassId,
        })
        .select()
        .single();

      if (classError) {
        throw classError;
      }

      const typedNewClass = newClass as SchoolClass;

      if (studentIds.length > 0) {
        const { error: enrollmentsError } = await supabase.from("enrollments").insert(
          studentIds.map((studentId) => ({
            teacher_id: user.id,
            class_id: typedNewClass.id,
            student_id: studentId,
            school_year_id: targetYear!.id,
          })),
        );

        if (enrollmentsError) {
          throw enrollmentsError;
        }
      }

      const { data: sourceSubjects, error: subjectsLoadError } = await supabase
        .from("subjects")
        .select("*")
        .eq("class_id", sourceClassId);

      if (subjectsLoadError) {
        throw subjectsLoadError;
      }

      const typedSubjects = (sourceSubjects ?? []) as Subject[];

      if (typedSubjects.length > 0) {
        const { error: subjectsInsertError } = await supabase.from("subjects").insert(
          typedSubjects.map((subject) => ({
            teacher_id: user.id,
            class_id: typedNewClass.id,
            name: subject.name,
            subject_type: subject.subject_type,
            grading_kind: subject.grading_kind,
            average_mode: subject.average_mode,
            default_weight: subject.default_weight,
            points_to_grade: subject.points_to_grade,
          })),
        );

        if (subjectsInsertError) {
          throw subjectsInsertError;
        }
      }

      const { data: fundEntries, error: fundLoadError } = await supabase
        .from("class_fund_entries")
        .select("*")
        .eq("class_id", sourceClassId);

      if (fundLoadError) {
        throw fundLoadError;
      }

      const balance = ((fundEntries ?? []) as ClassFundEntry[]).reduce(
        (sum, entry) => (entry.entry_type === "deposit" ? sum + entry.amount : sum - entry.amount),
        0,
      );

      const carryover = computeCarryoverFundEntry(balance);

      if (carryover) {
        const { error: carryoverError } = await supabase.from("class_fund_entries").insert({
          teacher_id: user.id,
          class_id: typedNewClass.id,
          entry_type: carryover.entry_type,
          amount: carryover.amount,
          entry_date: new Date().toISOString().slice(0, 10),
          note: "Übertrag aus Vorjahr",
        });

        if (carryoverError) {
          throw carryoverError;
        }
      }

      return typedNewClass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student"] });
      queryClient.invalidateQueries({ queryKey: ["class-fund"] });
      queryClient.invalidateQueries({ queryKey: ["school-years"] });
    },
  });
};
