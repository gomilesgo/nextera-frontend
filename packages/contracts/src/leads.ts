import { z } from "zod";

export const LEAD_REF_PATTERN = /^NXL-\d{4}-\d{4,}$/;

export const LEAD_LIMITS = {
  name: 120,
  phone: 20,
  email: 254,
  interest: 80,
  message: 2000,
  path: 200,
} as const;

export const leadCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(LEAD_LIMITS.name, "Name is too long"),
  phone: z.string().trim().min(8, "Enter your mobile number").max(LEAD_LIMITS.phone),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(LEAD_LIMITS.email).optional(),
  interest: z.string().trim().min(1).max(LEAD_LIMITS.interest).optional(),
  message: z.string().trim().max(LEAD_LIMITS.message, "Message is too long").optional(),
  path: z.string().trim().startsWith("/").max(LEAD_LIMITS.path),
});

export type LeadCreate = z.infer<typeof leadCreateSchema>;

export type LeadCreatedResponse = {
  ref: string;
};
