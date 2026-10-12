declare module "@cashfreepayments/cashfree-js" {
  export type CashfreeCheckoutResult = {
    error?: { message?: string; code?: string; type?: string };
    redirect?: boolean;
    paymentDetails?: { paymentMessage?: string };
  };

  export type CashfreeCheckoutOptions = {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_top" | "_modal" | HTMLElement;
  };

  export type Cashfree = {
    checkout(options: CashfreeCheckoutOptions): Promise<CashfreeCheckoutResult>;
  };

  export function load(options: { mode: "sandbox" | "production" }): Promise<Cashfree | null>;
}
