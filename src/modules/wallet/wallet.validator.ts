import { z } from "zod";

export const topupSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be positive")
    .max(10000, "Maximum top-up is 10,000 points"),
});

export type TopupDTO = z.infer<typeof topupSchema>;
