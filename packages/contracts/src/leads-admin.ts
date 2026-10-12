import { z } from "zod";
import type { CustomerProfile } from "./auth";
import { isoDateSchema } from "./kyc";
import { LEAD_LIMITS } from "./leads";

export const leadStatuses = ["new", "contacted", "qualified", "converted", "lost"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const leadSources = ["web", "admin"] as const;
export type LeadSource = (typeof leadSources)[number];

export const editableLeadStatuses = ["new", "contacted", "qualified", "lost"] as const;

export const LEAD_NOTES_MAX = 4000;

export const listCursorSchema = z
  .string()
  .trim()
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid cursor");

export const adminLeadListQuerySchema = z
  .object({
    status: z.enum(leadStatuses).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    assigneeId: z.union([z.string().uuid(), z.literal("none")]).optional(),
    cursor: listCursorSchema.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "The start date must be on or before the end date",
    path: ["from"],
  });

export const adminLeadCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter the lead's name").max(LEAD_LIMITS.name, "Name is too long"),
  phone: z.string().trim().min(8, "Enter the mobile number").max(LEAD_LIMITS.phone),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(LEAD_LIMITS.email).optional(),
  interest: z.string().trim().min(1).max(LEAD_LIMITS.interest).optional(),
  planId: z.string().uuid().optional(),
  amountPaise: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  message: z.string().trim().max(LEAD_LIMITS.message, "Message is too long").optional(),
  notes: z.string().trim().max(LEAD_NOTES_MAX, "Notes are too long").optional(),
  assigneeId: z.string().uuid().optional(),
});

export const adminLeadUpdateSchema = z
  .object({
    status: z.enum(editableLeadStatuses).optional(),
    notes: z.string().trim().max(LEAD_NOTES_MAX, "Notes are too long").nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "Change at least one field",
    path: ["_"],
  });

export type AdminLeadListQuery = z.infer<typeof adminLeadListQuerySchema>;
export type AdminLeadCreate = z.infer<typeof adminLeadCreateSchema>;
export type AdminLeadUpdate = z.infer<typeof adminLeadUpdateSchema>;

export type StaffRef = {
  id: string;
  name: string;
};

export type AdminLead = {
  id: string;
  ref: string;
  name: string;
  phone: string;
  email: string | null;
  interest: string | null;
  planId: string | null;
  amountPaise: number | null;
  message: string | null;
  source: LeadSource;
  path: string | null;
  ip: string | null;
  userAgent: string | null;
  status: LeadStatus;
  notes: string | null;
  assignee: StaffRef | null;
  convertedCustomerId: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminLeadListResponse = {
  items: AdminLead[];
  nextCursor: string | null;
};

export type AdminLeadResponse = {
  lead: AdminLead;
};

export type LeadConvertResponse = {
  lead: AdminLead;
  customer: CustomerProfile;
  created: boolean;
};
