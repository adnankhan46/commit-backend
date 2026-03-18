import { z } from "zod";

export const createCommitmentSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100, "Title too long"),
    description: z.string().max(500, "Description too long").optional(),
    habitPrompt: z
      .string()
      .max(500, "Habit prompt too long")
      .optional()
      .describe("Custom AI verification criteria"),
    dailyStake: z
      .number({ invalid_type_error: "dailyStake must be a number" })
      .positive("Daily stake must be positive")
      .max(10000, "Daily stake cannot exceed 10,000 points"),
    payoutType: z.enum(["friend", "donate"], {
      errorMap: () => ({ message: "payoutType must be 'friend' or 'donate'" }),
    }),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
    checkinHourIst: z
      .number()
      .int()
      .min(0)
      .max(23, "checkinHourIst must be 0-23"),
    deadlineHourIst: z
      .number()
      .int()
      .min(0)
      .max(23, "deadlineHourIst must be 0-23"),
    partnerIds: z
      .array(z.string().uuid("Invalid partner ID"))
      .min(1, "At least one partner is required"),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  })
  .refine((d) => d.deadlineHourIst > d.checkinHourIst, {
    message: "deadlineHourIst must be after checkinHourIst",
    path: ["deadlineHourIst"],
  });

export type CreateCommitmentDTO = z.infer<typeof createCommitmentSchema>;
