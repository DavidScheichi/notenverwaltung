import { z } from "zod";

export const assessmentSchema = z.object({
  student_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  value_number: z.coerce.number(),
  value_text: z.string().max(80).optional().or(z.literal("")),
  weight: z.coerce.number().min(0.1).max(20),
  assessed_on: z.string().min(1, "Datum fehlt."),
  comment: z.string().max(500).optional().or(z.literal("")),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;

