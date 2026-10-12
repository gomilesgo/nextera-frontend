import { z } from "zod";
import type { CustomerProfile } from "./auth";
import { listCursorSchema } from "./leads-admin";
import type { StaffRef } from "./leads-admin";

export const TICKET_REF_PATTERN = /^NXT-\d{4}-\d{4,}$/;

export const ticketCategories = ["payment", "withdrawal", "kyc", "investment", "other"] as const;
export type TicketCategory = (typeof ticketCategories)[number];

export const ticketStatuses = ["open", "pending_customer", "resolved", "closed"] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export const ticketPriorities = ["low", "normal", "high", "urgent"] as const;
export type TicketPriority = (typeof ticketPriorities)[number];

export const staffReplyStatuses = ["open", "pending_customer", "resolved"] as const;

export const TICKET_LIMITS = {
  subject: 160,
  body: 5000,
  attachmentName: 120,
} as const;

export const TICKET_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
export const TICKET_ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type TicketAttachmentType = (typeof TICKET_ATTACHMENT_TYPES)[number];
export const TICKET_ATTACHMENT_FIELD = "attachment";

const subjectSchema = z.string().trim().min(3, "Enter a subject").max(TICKET_LIMITS.subject, "Subject is too long");
const bodySchema = z.string().trim().min(1, "Write a message").max(TICKET_LIMITS.body, "Message is too long");

export const ticketCreateSchema = z.object({
  subject: subjectSchema,
  category: z.enum(ticketCategories),
  body: bodySchema,
});

export const ticketReplySchema = z.object({
  body: bodySchema,
});

export const staffTicketReplySchema = z.object({
  body: bodySchema,
  internal: z.boolean().default(false),
  status: z.enum(staffReplyStatuses).optional(),
});

export const ticketListQuerySchema = z.object({
  status: z.enum(ticketStatuses).optional(),
  cursor: listCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminTicketListQuerySchema = z.object({
  status: z.enum(ticketStatuses).optional(),
  category: z.enum(ticketCategories).optional(),
  priority: z.enum(ticketPriorities).optional(),
  assigneeId: z.union([z.string().uuid(), z.literal("none")]).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  cursor: listCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const adminTicketUpdateSchema = z
  .object({
    status: z.enum(ticketStatuses).optional(),
    priority: z.enum(ticketPriorities).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "Change at least one field",
    path: ["_"],
  });

export type TicketCreate = z.infer<typeof ticketCreateSchema>;
export type TicketReply = z.infer<typeof ticketReplySchema>;
export type StaffTicketReply = z.infer<typeof staffTicketReplySchema>;
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
export type AdminTicketListQuery = z.infer<typeof adminTicketListQuerySchema>;
export type AdminTicketUpdate = z.infer<typeof adminTicketUpdateSchema>;

export type TicketAttachment = {
  name: string;
  contentType: string;
  sizeBytes: number;
};

export type TicketMessage = {
  id: string;
  authorType: "customer" | "staff";
  body: string;
  attachment: TicketAttachment | null;
  createdAt: string;
};

export type AdminTicketMessage = TicketMessage & {
  authorId: string;
  authorName: string | null;
  internal: boolean;
};

export type TicketSummary = {
  id: string;
  ref: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  lastMessageAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminTicketSummary = TicketSummary & {
  customer: { id: string; phone: string; name: string | null };
  assignee: StaffRef | null;
  investmentId: string | null;
  withdrawalId: string | null;
};

export type TicketListResponse = {
  items: TicketSummary[];
  nextCursor: string | null;
};

export type AdminTicketListResponse = {
  items: AdminTicketSummary[];
  nextCursor: string | null;
};

export type TicketDetailResponse = {
  ticket: TicketSummary;
  messages: TicketMessage[];
};

export type AdminTicketDetailResponse = {
  ticket: AdminTicketSummary;
  customer: CustomerProfile;
  messages: AdminTicketMessage[];
};

export type TicketResponse = {
  ticket: TicketSummary;
};

export type AdminTicketResponse = {
  ticket: AdminTicketSummary;
};

export type TicketMessageResponse = {
  ticket: TicketSummary;
  message: TicketMessage;
};

export type AdminTicketMessageResponse = {
  ticket: AdminTicketSummary;
  message: AdminTicketMessage;
};
