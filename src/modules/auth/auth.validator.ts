import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  inviteCode: z.string().min(1, "Invite code is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  inviteCode: z.string().min(1, "Invite code is required"),
});

export const sendInviteSchema = z.object({
  friendEmail: z.string().email("Invalid email address"),
});

export type SignupDTO = z.infer<typeof signupSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type SendInviteDTO = z.infer<typeof sendInviteSchema>;
