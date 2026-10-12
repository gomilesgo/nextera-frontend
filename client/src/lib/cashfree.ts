import type { CashfreeCheckoutResult } from "@cashfreepayments/cashfree-js";

export type CheckoutOutcome = "completed" | "closed" | "redirecting";

export function checkoutOutcome(result: CashfreeCheckoutResult | null | undefined): CheckoutOutcome {
  if (result?.paymentDetails) return "completed";
  if (result?.redirect) return "redirecting";
  return "closed";
}

export async function openCashfreeCheckout(paymentSessionId: string, mode: "sandbox" | "production"): Promise<CheckoutOutcome> {
  const { load } = await import("@cashfreepayments/cashfree-js");
  const cashfree = await load({ mode });
  if (!cashfree) throw new Error("Cashfree checkout is only available in the browser");
  return checkoutOutcome(await cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" }));
}
