import { z } from "zod";
import { adminPageQuerySchema, blankQueryToUndefined, dateRangeIsOrdered } from "./customers-admin";
import type { AdminPage } from "./customers-admin";
import { isoDateSchema } from "./kyc";

export const auditActorTypes = ["staff", "customer", "system"] as const;
export type AuditActorType = (typeof auditActorTypes)[number];

const optionalText = (max: number) => z.preprocess(blankQueryToUndefined, z.string().trim().max(max).optional());

export const auditLogQuerySchema = adminPageQuerySchema
  .extend({
    actorType: z.preprocess(blankQueryToUndefined, z.enum(auditActorTypes).optional()),
    actorId: z.preprocess(blankQueryToUndefined, z.string().uuid().optional()),
    action: optionalText(100),
    entity: optionalText(100),
    entityId: optionalText(200),
    from: z.preprocess(blankQueryToUndefined, isoDateSchema.optional()),
    to: z.preprocess(blankQueryToUndefined, isoDateSchema.optional()),
  })
  .refine((query) => dateRangeIsOrdered(query.from, query.to), {
    message: "The end date must not be before the start date",
    path: ["to"],
  });

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export type AuditLogEntry = {
  id: string;
  actorType: AuditActorType;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  at: string;
};

export type AuditLogDetail = AuditLogEntry & {
  before: unknown;
  after: unknown;
};

export type AuditLogPage = AdminPage<AuditLogEntry>;

export type AuditLogDetailResponse = {
  entry: AuditLogDetail;
};
