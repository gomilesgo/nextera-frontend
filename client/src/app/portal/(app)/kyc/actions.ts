"use server";

import { fieldArrays, invalidFields } from "@/lib/actionResult";
import type { ActionFailure } from "@/lib/actionResult";
import { todayInIndia } from "@/lib/dates";
import { mapKycFields, readKycForm, toKycResponse, toPortalKyc, validateKyc } from "@/lib/kyc";
import type { PortalKyc } from "@/lib/kyc";
import { actionFailure, portalCall, unexpectedResponse } from "@/lib/portalAction";

export type KycSubmitResult = { status: "ok"; kyc: PortalKyc } | ActionFailure;

const PAN_TAKEN = "This PAN is already registered to another Nextera account. Contact us if you think this is a mistake.";
const LOCKED = "Your KYC is under review or already verified, so it cannot be changed right now.";

export async function submitKycAction(formData: FormData): Promise<KycSubmitResult> {
  const validation = validateKyc(readKycForm(formData), todayInIndia());
  if (!validation.ok) return invalidFields(validation.errors);

  const result = await portalCall<unknown>("/v1/kyc", { method: "PUT", json: validation.payload }, "kyc");
  if (!result.ok) {
    const { error } = result;
    if (error.code === "conflict" && error.fields?.pan) {
      return { ...invalidFields({ pan: PAN_TAKEN }), httpStatus: 409, code: "conflict" };
    }
    const fields = error.code === "validation" ? fieldArrays(mapKycFields(error.fields)) : undefined;
    return actionFailure("kyc", result, { conflict: LOCKED }, fields);
  }

  const kyc = toKycResponse(result.data);
  return kyc ? { status: "ok", kyc: toPortalKyc(kyc) } : unexpectedResponse("kyc");
}
