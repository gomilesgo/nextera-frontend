import { ApiError } from "@/lib/api/errors";
import type { InvestFailure } from "@/lib/invest";

export function throwOnAuthLoss<T extends { ok: boolean }>(result: T): T {
  if (result.ok) return result;
  const failure = result as unknown as InvestFailure;
  if (failure.code === "signed_out") throw new ApiError(401, "unauthorized", failure.message);
  if (failure.code === "blocked") throw new ApiError(403, "account_blocked", failure.message);
  return result;
}
