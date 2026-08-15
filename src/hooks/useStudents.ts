import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase/client";
import type {
  AssessmentResult,
  Enrollment,
  Student,
  StudentWithEnrollment,
} from "../lib/supabase/types";

interface DeletedStudentSnapshot {
  student: Student | null;
  enrollments: Enrollment[];
  results: AssessmentResult[];
  fundEntryIds: string[];
}

const normalizeStudent = (student: unknown): StudentWithEnrollment => {
  const typedStudent = student as StudentWithEnrollment & {
    enrollments?: StudentWithEnrollment["enrollments"] | StudentWithEnrollment["enrollments"][number];
  };

  const enrollments = Array.isArray(typedStudent.enrollments)
    ? typedStudent.enrollments
    : typedStudent.enrollments
      ? [typedStudent.enrollments]
      : [];

  return {
    ...typedStudent,
    enrollments,
  };
};

export const useStudents = (classId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["students", classId];

  const studentsQuery = useQuery({
    queryKey,
    enabled: Boolean(classId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, enrollments!inner(id, class_id, student_id)")
        .eq("enrollments.class_id", classId)
        .order("last_name");

      if (error) {
        throw error;
      }

      return (data ?? []).map(normalizeStudent);
    },
  });

  const createStudent = useMutation({
    mutationFn: async ({
      first_name,
      last_name,
      notes,
      classId: targetClassId,
    }: {
      first_name: string;
      last_name: string;
      notes?: string;
      classId: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht eingeloggt.");
      }

      const { data: targetClass, error: classError } = await supabase
        .from("classes")
        .select("school_year_id")
        .eq("id", targetClassId)
        .single();

      if (classError) {
        throw classError;
      }

      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert({
          teacher_id: user.id,
          first_name,
          last_name,
          notes: notes || null,
        })
        .select()
        .single();

      if (studentError) {
        throw studentError;
      }

      const { error: enrollmentError } = await supabase.from("enrollments").insert({
        teacher_id: user.id,
        class_id: targetClassId,
        student_id: student.id,
        school_year_id: targetClass.school_year_id,
      });

      if (enrollmentError) {
        await supabase.from("students").delete().eq("id", student.id);
        throw enrollmentError;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });

  const moveStudent = useMutation({
    mutationFn: async ({
      enrollmentId,
      newClassId,
    }: {
      enrollmentId: string;
      newClassId: string;
    }) => {
      const { error } = await supabase
        .from("enrollments")
        .update({ class_id: newClassId })
        .eq("id", enrollmentId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });

  const deleteStudent = useMutation({
    mutationFn: async (studentId: string) => {
      const { data: studentData, error: studentLoadError } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .maybeSingle();

      if (studentLoadError) {
        throw studentLoadError;
      }

      const { data: enrollmentsData, error: enrollmentsLoadError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", studentId);

      if (enrollmentsLoadError) {
        throw enrollmentsLoadError;
      }

      const { data: resultsData, error: resultsLoadError } = await supabase
        .from("assessment_results")
        .select("*")
        .eq("student_id", studentId);

      if (resultsLoadError) {
        throw resultsLoadError;
      }

      const { data: fundEntriesData, error: fundEntriesLoadError } = await supabase
        .from("class_fund_entries")
        .select("id")
        .eq("student_id", studentId);

      if (fundEntriesLoadError) {
        throw fundEntriesLoadError;
      }

      const snapshot: DeletedStudentSnapshot = {
        student: (studentData as Student | null) ?? null,
        enrollments: (enrollmentsData ?? []) as Enrollment[],
        results: (resultsData ?? []) as AssessmentResult[],
        fundEntryIds: (fundEntriesData ?? []).map((entry) => entry.id as string),
      };

      const { error: resultsError } = await supabase
        .from("assessment_results")
        .delete()
        .eq("student_id", studentId);

      if (resultsError) {
        throw resultsError;
      }

      const { error: enrollmentsError } = await supabase
        .from("enrollments")
        .delete()
        .eq("student_id", studentId);

      if (enrollmentsError) {
        throw enrollmentsError;
      }

      const { error } = await supabase.from("students").delete().eq("id", studentId);

      if (error) {
        throw error;
      }

      return snapshot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student"] });
      queryClient.invalidateQueries({ queryKey: ["student-assessment-overview"] });
      queryClient.invalidateQueries({ queryKey: ["subject-assessment-data"] });
      queryClient.invalidateQueries({ queryKey: ["class-fund"] });
    },
  });

  const restoreDeletedStudent = useMutation({
    mutationFn: async (snapshot: DeletedStudentSnapshot) => {
      if (!snapshot.student) {
        throw new Error("Kein Snapshot für Wiederherstellung vorhanden.");
      }

      const { error: studentError } = await supabase
        .from("students")
        .insert(snapshot.student);
      if (studentError) {
        throw studentError;
      }

      if (snapshot.enrollments.length > 0) {
        const { error: enrollmentsError } = await supabase
          .from("enrollments")
          .insert(snapshot.enrollments);
        if (enrollmentsError) {
          throw enrollmentsError;
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

      if (snapshot.fundEntryIds.length > 0) {
        const { error: fundEntriesError } = await supabase
          .from("class_fund_entries")
          .update({ student_id: snapshot.student.id })
          .in("id", snapshot.fundEntryIds);
        if (fundEntriesError) {
          throw fundEntriesError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student"] });
      queryClient.invalidateQueries({ queryKey: ["student-assessment-overview"] });
      queryClient.invalidateQueries({ queryKey: ["subject-assessment-data"] });
      queryClient.invalidateQueries({ queryKey: ["class-fund"] });
    },
  });

  return {
    ...studentsQuery,
    createStudent,
    moveStudent,
    deleteStudent,
    restoreDeletedStudent,
  };
};

export const useAllStudents = (schoolYearId?: string) =>
  useQuery({
    queryKey: ["students", "all", schoolYearId ?? "any"],
    queryFn: async () => {
      let request = supabase
        .from("students")
        .select("*, enrollments(id, class_id, student_id)")
        .order("last_name");

      if (schoolYearId) {
        request = request.eq("enrollments.school_year_id", schoolYearId);
      }

      const { data, error } = await request;

      if (error) {
        throw error;
      }

      return (data ?? []).map(normalizeStudent);
    },
  });

export const useStudentById = (studentId?: string, schoolYearId?: string) =>
  useQuery({
    queryKey: ["student", studentId, schoolYearId ?? "any"],
    enabled: Boolean(studentId),
    queryFn: async () => {
      let request = supabase
        .from("students")
        .select("*, enrollments(id, class_id, student_id)")
        .eq("id", studentId);

      if (schoolYearId) {
        request = request.eq("enrollments.school_year_id", schoolYearId);
      }

      const { data, error } = await request.single();

      if (error) {
        throw error;
      }

      return normalizeStudent(data);
    },
  });
