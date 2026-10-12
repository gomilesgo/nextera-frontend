"use server";

import type { AdminCustomer, ManualAdjustmentResponse } from "@nextera/contracts";
import { customerBackendPath } from "@/lib/customers/api";
import { buildAdjustment } from "@/lib/customers/adjustment";
import type { AdjustmentFormValues } from "@/lib/customers/adjustment";
import { buildCustomerCreate, buildCustomerUpdate, buildStatusChange, isStatusAction, readCustomerForm } from "@/lib/customers/form";
import type { CustomerStatusAction } from "@/lib/customers/form";
import { adjustmentFailure, profileFailure, revokeSessionsFailure, statusFailure } from "@/lib/customers/messages";
import { CHECK_FIELDS, failure } from "@/lib/actions/outcome";
import type { ActionOutcome } from "@/lib/actions/outcome";
import { isAdjustmentResponse, isAdminCustomer, isCustomerId } from "@/lib/customers/shape";
import { authorizeAction, staffRequest } from "@/lib/session";

const missingCustomer = failure("not_found", "Customer not found");

function unexpected(what: string) {
  return failure("internal", `The server returned an unexpected ${what}`);
}

function customerFrom(data: unknown): ActionOutcome<AdminCustomer> {
  const customer = data && typeof data === "object" ? (data as { customer?: unknown }).customer : undefined;
  return isAdminCustomer(customer) ? { status: "ok", data: customer } : unexpected("customer");
}

export async function createCustomer(formData: FormData): Promise<ActionOutcome<AdminCustomer>> {
  const auth = await authorizeAction("customers.write");
  if (!auth.ok) return failure("forbidden", auth.message);

  const built = buildCustomerCreate(readCustomerForm(formData));
  if (!built.ok) return failure("validation", CHECK_FIELDS, built.errors);

  const result = await staffRequest<unknown>(auth.token, "/v1/admin/customers", { method: "POST", json: built.payload });
  return result.ok ? customerFrom(result.data) : profileFailure(result.error);
}

export async function updateCustomer(customerId: string, formData: FormData): Promise<ActionOutcome<AdminCustomer>> {
  const auth = await authorizeAction("customers.write");
  if (!auth.ok) return failure("forbidden", auth.message);
  if (!isCustomerId(customerId)) return missingCustomer;

  const values = readCustomerForm(formData);
  if (values.phone !== null && auth.staff.role !== "owner") {
    return failure("forbidden", "Only an owner can change a customer's mobile number", {
      phone: ["Only an owner can change a customer's mobile number"],
    });
  }
  const built = buildCustomerUpdate(values);
  if (!built.ok) return failure("validation", CHECK_FIELDS, built.errors);

  const result = await staffRequest<unknown>(auth.token, customerBackendPath(customerId), {
    method: "PATCH",
    json: built.payload,
  });
  return result.ok ? customerFrom(result.data) : profileFailure(result.error);
}

export async function changeCustomerStatus(
  customerId: string,
  action: CustomerStatusAction,
  reason: string,
): Promise<ActionOutcome<AdminCustomer>> {
  const auth = await authorizeAction("customers.write");
  if (!auth.ok) return failure("forbidden", auth.message);
  if (!isCustomerId(customerId)) return missingCustomer;
  if (!isStatusAction(action)) return failure("validation", "Unsupported action");

  const built = buildStatusChange(reason);
  if (!built.ok) return failure("validation", CHECK_FIELDS, built.errors);

  const result = await staffRequest<unknown>(auth.token, customerBackendPath(customerId, `/${action}`), {
    method: "POST",
    json: built.payload,
  });
  return result.ok ? customerFrom(result.data) : statusFailure(action, result.error);
}

export async function revokeCustomerSessions(customerId: string): Promise<ActionOutcome<null>> {
  const auth = await authorizeAction("customers.write");
  if (!auth.ok) return failure("forbidden", auth.message);
  if (!isCustomerId(customerId)) return missingCustomer;

  const result = await staffRequest<unknown>(auth.token, customerBackendPath(customerId, "/revoke-sessions"), {
    method: "POST",
  });
  if (result.ok) return { status: "ok", data: null };
  return revokeSessionsFailure(result.error);
}

export async function postManualAdjustment(
  customerId: string,
  values: AdjustmentFormValues,
): Promise<ActionOutcome<ManualAdjustmentResponse>> {
  const auth = await authorizeAction("ledger.adjust");
  if (!auth.ok) return failure("forbidden", auth.message);
  if (!isCustomerId(customerId)) return missingCustomer;

  const built = buildAdjustment({
    direction: String(values?.direction ?? ""),
    amount: String(values?.amount ?? ""),
    reason: String(values?.reason ?? ""),
    idempotencyKey: String(values?.idempotencyKey ?? ""),
  });
  if (!built.ok) return failure("validation", built.errors._?.join(" ") ?? CHECK_FIELDS, built.errors);

  const result = await staffRequest<unknown>(auth.token, customerBackendPath(customerId, "/adjustments"), {
    method: "POST",
    json: built.payload,
  });
  if (!result.ok) return adjustmentFailure(result.error);
  return isAdjustmentResponse(result.data) ? { status: "ok", data: result.data } : unexpected("adjustment");
}
