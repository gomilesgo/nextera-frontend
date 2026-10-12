import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { qrMatrix } from "@/lib/team/qr";
import { credentials } from "@/test/fixtures";
import { CredentialsReveal } from "./CredentialsReveal";

const issued = { ...credentials, qr: qrMatrix(credentials.otpauthUrl) };

function render(purpose: "invite" | "reset" = "invite") {
  return renderToStaticMarkup(<CredentialsReveal credentials={issued} purpose={purpose} onDone={vi.fn()} />);
}

describe("CredentialsReveal", () => {
  it("shows the temporary password, setup key and a locally drawn QR code", () => {
    const html = render();
    expect(html).toContain(credentials.temporaryPassword);
    expect(html).toContain("JBSW Y3DP EHPK 3PXP");
    expect(html).toContain(`d="${issued.qr.path}"`);
    expect(html).toContain('role="img"');
    expect(html).toContain(`aria-label="Authenticator QR code for ${credentials.staff.email}"`);
    expect(html).not.toMatch(/<img|https?:\/\//);
  });

  it("warns that the credentials are shown once", () => {
    const html = render("reset");
    expect(html).toContain("shown once and cannot be retrieved later");
    expect(html).toContain("Reset for");
    expect(html).toContain('role="alert"');
  });

  it("keeps Done disabled until the owner confirms the hand-over", () => {
    const html = render();
    expect(html).toMatch(/<input type="checkbox"[^>]*>/);
    expect(html).not.toMatch(/<input type="checkbox"[^>]*checked/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Done<\/button>/);
  });

  it("offers labelled copy buttons for both secrets", () => {
    const html = render();
    expect(html).toContain('aria-label="Copy temporary password"');
    expect(html).toContain('aria-label="Copy authenticator setup key"');
  });
});
