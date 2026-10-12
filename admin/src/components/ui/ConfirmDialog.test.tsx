import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const dialogProps = vi.hoisted(() => [] as Array<{ open: boolean; dismissible?: boolean; onClose: () => void }>);

vi.mock("./Dialog", () => ({
  Dialog: (props: { open: boolean; dismissible?: boolean; onClose: () => void; children: ReactNode }) => {
    dialogProps.push(props);
    return <div>{props.children}</div>;
  },
}));

const { ConfirmDialog } = await import("./ConfirmDialog");

function render(pending: boolean, onClose = vi.fn()) {
  dialogProps.length = 0;
  const html = renderToStaticMarkup(
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={vi.fn()}
      title="Approve?"
      confirmLabel="Approve"
      pendingLabel="Approving…"
      pending={pending}
      error="Only submitted KYC can be reviewed"
    />,
  );
  return { html, props: dialogProps[0] };
}

describe("ConfirmDialog", () => {
  it("cannot be dismissed while its action is pending", () => {
    const onClose = vi.fn();
    const { html, props } = render(true, onClose);
    expect(props?.dismissible).toBe(false);
    props?.onClose();
    expect(onClose).not.toHaveBeenCalled();
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Cancel<\/button>/);
    expect(html).toContain("Approving…");
  });

  it("is dismissible when idle and shows errors in the open dialog", () => {
    const onClose = vi.fn();
    const { html, props } = render(false, onClose);
    expect(props?.dismissible).toBe(true);
    props?.onClose();
    expect(onClose).toHaveBeenCalledOnce();
    expect(html).toContain("Only submitted KYC can be reviewed");
  });
});
