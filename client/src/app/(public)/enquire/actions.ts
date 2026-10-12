"use server";

import { headers } from "next/headers";
import type { LeadCreatedResponse } from "@nextera/contracts";
import { callBackend } from "@/lib/backend/server";
import {
  ENQUIRY_HONEYPOT,
  backendLimitMessage,
  localLimitMessage,
  readEnquiry,
  submitLead,
  validateEnquiry,
} from "@/lib/enquiry";
import type { EnquiryErrors, EnquiryValues } from "@/lib/enquiry";
import { createRateLimiter } from "@/lib/rateLimit";
import { clientIp } from "@/lib/request";

export type EnquiryState = {
  status: "idle" | "ok" | "error";
  kind?: "validation" | "rate_limited" | "unavailable";
  ref?: string;
  message?: string;
  errors?: EnquiryErrors;
  values?: EnquiryValues;
};

const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000, maxKeys: 10000 });

export async function submitEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const values = readEnquiry(formData);
  const honeypot = formData.get(ENQUIRY_HONEYPOT);
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { status: "ok" };
  }

  const validation = validateEnquiry(values);
  if (!validation.ok) {
    return { status: "error", kind: "validation", errors: validation.errors, values };
  }

  const ip = clientIp(await headers()) ?? "unknown";
  const limit = limiter(ip);
  if (!limit.allowed) {
    return {
      status: "error",
      kind: "rate_limited",
      message: localLimitMessage(limit.retryAfterSeconds),
      values,
    };
  }

  const result = await submitLead(validation.lead, (path, json) =>
    callBackend<LeadCreatedResponse>(path, { method: "POST", json }),
  );

  if (result.status === "ok") return { status: "ok", ref: result.ref };
  if (result.status === "invalid") return { status: "error", kind: "validation", errors: result.errors, values };
  if (result.status === "rate_limited") {
    return {
      status: "error",
      kind: "rate_limited",
      message: backendLimitMessage(result.retryAfterSeconds),
      values,
    };
  }

  console.error("[enquiry] lead submission unavailable:", result.reason);
  return { status: "error", kind: "unavailable", values };
}
