import { z } from "zod";

export const planStatuses = ["draft", "active", "archived"] as const;
export type PlanStatus = (typeof planStatuses)[number];

const planFields = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens"),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000),
  rateBps: z.number().int().min(1, "Rate must be above zero").max(3600),
  tenureMonths: z.number().int().min(1).max(120),
  minPaise: z.number().int().min(100, "Minimum must be at least ₹1"),
  maxPaise: z.number().int().max(Number.MAX_SAFE_INTEGER),
});

export const planInputSchema = planFields
  .extend({
    description: planFields.shape.description.default(""),
    status: z.enum(["draft", "active"]).default("draft"),
  })
  .refine((plan) => plan.maxPaise >= plan.minPaise, {
    message: "Maximum must be at least the minimum",
    path: ["maxPaise"],
  });

export const planUpdateSchema = planFields
  .partial()
  .extend({ status: z.enum(planStatuses).optional() })
  .refine((patch) => Object.keys(patch).length > 0, { message: "Nothing to update" });

export type PlanInput = z.infer<typeof planInputSchema>;
export type PlanUpdate = z.infer<typeof planUpdateSchema>;

export type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  rateBps: number;
  tenureMonths: number;
  minPaise: number;
  maxPaise: number;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
};
