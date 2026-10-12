import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionError } from "@/lib/actions/outcome";
import type { ActivationAvailability } from "@/lib/payments/resolve";

vi.mock("@/app/(console)/payment-flags/actions", () => ({ resolvePaymentFlag: vi.fn() }));

const { ResolveForm } = await import("./ResolveFlag");

function render(activation: ActivationAvailability, mutation: Record<string, unknown> = {}) {
  const fake = { isPending: false, isError: false, error: null, reset: vi.fn(), mutate: vi.fn(), ...mutation };
  return renderToStaticMarkup(
    <ResolveForm mutation={fake as never} activation={activation} onCancel={vi.fn()} onResolved={vi.fn()} />,
  );
}

function radio(html: string, value: string): string {
  return html.match(new RegExp(`<input[^>]*value="${value}"[^>]*>`))?.[0] ?? "";
}

describe("ResolveForm", () => {
  it("offers every resolution type and a required note", () => {
    const html = render("available");
    expect(radio(html, "refunded")).not.toContain("disabled");
    expect(radio(html, "posted_manually")).not.toContain("disabled");
    expect(radio(html, "activated")).not.toContain("disabled");
    expect(html).toContain("<legend");
    expect(html).toMatch(/<textarea[^>]*name="note"[^>]*required/);
  });

  it("disables activated when the payment was not paid", () => {
    const html = render("unavailable");
    expect(radio(html, "activated")).toContain("disabled");
    expect(html).toContain("has not been paid and activated");
  });

  it("leaves activated to the server check when the payment is unknown", () => {
    const html = render("unknown");
    expect(radio(html, "activated")).not.toContain("disabled");
    expect(html).toContain("The server checks");
  });

  it("locks the form while resolving and shows server errors", () => {
    const error = new ActionError("This flag is already resolved", { code: "conflict" });
    const pending = render("available", { isPending: true });
    expect(pending).toMatch(/<fieldset[^>]*disabled/);
    expect(pending).toContain("Resolving…");
    expect(pending).toMatch(/<button[^>]*disabled=""[^>]*>Cancel<\/button>/);

    const failed = render("available", { isError: true, error });
    expect(failed).toContain("This flag is already resolved");
    expect(failed).toContain('aria-live="polite"');
  });
});
