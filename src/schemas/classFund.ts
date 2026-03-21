import { z } from "zod";

export const classFundEntrySchema = z.object({
  entry_type: z.enum(["deposit", "withdrawal"]),
  amount: z.coerce.number().positive("Betrag muss positiv sein."),
  entry_date: z.string().min(1, "Datum fehlt."),
  note: z.string().max(300).optional().or(z.literal("")),
});

export type ClassFundEntryInput = z.infer<typeof classFundEntrySchema>;

