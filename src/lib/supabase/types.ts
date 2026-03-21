export type SubjectType = "normal" | "class_fund";
export type GradingKind = "points" | "grade";
export type AverageMode = "mean" | "weighted";
export type FundEntryType = "deposit" | "withdrawal";
export type AssessmentInputMode = "points" | "grade" | "either";
export type AssessmentAggregationMode = "mean" | "sum" | "last_n" | "best_n";
export type AssessmentResultStatus =
  | "filled"
  | "missing"
  | "excused"
  | "absent_unexcused"
  | "makeup_pending"
  | "exempt";

export interface SchoolClass {
  id: string;
  teacher_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  teacher_id: string;
  first_name: string;
  last_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  teacher_id: string;
  class_id: string;
  student_id: string;
  created_at: string;
}

export interface Subject {
  id: string;
  teacher_id: string;
  class_id: string;
  name: string;
  subject_type: SubjectType;
  grading_kind: GradingKind;
  average_mode: AverageMode;
  default_weight: number;
  points_to_grade: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  teacher_id: string;
  class_id: string;
  student_id: string;
  subject_id: string;
  value_number: number;
  value_text: string | null;
  weight: number;
  assessed_on: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassFundEntry {
  id: string;
  teacher_id: string;
  class_id: string;
  entry_type: FundEntryType;
  amount: number;
  entry_date: string;
  note: string | null;
  created_at: string;
}

export interface StudentWithEnrollment extends Student {
  enrollments: Pick<Enrollment, "id" | "class_id" | "student_id">[];
}

export interface AssessmentDefinition {
  id: string;
  owner_id: string;
  subject_id: string;
  type_id: string | null;
  name: string;
  short_label: string | null;
  assessment_date: string | null;
  max_points: number | null;
  weight_multiplier: number;
  input_mode: AssessmentInputMode;
  include_in_total: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AssessmentResult {
  id: string;
  owner_id: string;
  assessment_definition_id: string;
  student_id: string;
  status: AssessmentResultStatus;
  points: number | null;
  grade: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface GradeBoundary {
  id: string;
  owner_id: string;
  subject_id: string | null;
  grade: number;
  min_percent: number;
  created_at: string;
}

export interface AssessmentType {
  id: string;
  owner_id: string;
  name: string;
  default_input_mode: AssessmentInputMode;
  default_max_points: number | null;
  default_weight_multiplier: number;
  aggregation_mode: AssessmentAggregationMode;
  created_at: string;
}
