import { describe, expect, it } from "vitest";
import { backdropDismiss, cancelBlocked, nativeClosed, syncNative } from "./dialog";

describe("syncNative", () => {
  it("reopens the native dialog whenever it closed while the parent still wants it open", () => {
    expect(syncNative(true, false)).toBe("show");
    expect(syncNative(false, true)).toBe("close");
    expect(syncNative(true, true)).toBeNull();
    expect(syncNative(false, false)).toBeNull();
  });

  it("blocks Escape only when the dialog is not dismissible", () => {
    expect(cancelBlocked(false)).toBe(true);
    expect(cancelBlocked(true)).toBe(false);
  });
});

describe("nativeClosed", () => {
  it("tells a dismissible parent and resyncs so a refused close reopens the dialog", () => {
    expect(nativeClosed(true, true)).toEqual({ notify: true, resync: true });
  });

  it("reopens a busy dialog that the browser closed on a repeated Escape without telling the parent", () => {
    expect(nativeClosed(true, false)).toEqual({ notify: false, resync: true });
  });

  it("ignores the close event that follows the parent closing the dialog", () => {
    expect(nativeClosed(false, true)).toEqual({ notify: false, resync: false });
    expect(nativeClosed(false, false)).toEqual({ notify: false, resync: false });
  });
});

describe("backdropDismiss", () => {
  it("closes only when the press and the click both landed on the backdrop", () => {
    expect(backdropDismiss(true, true, true)).toBe(true);
    expect(backdropDismiss(false, true, true)).toBe(false);
    expect(backdropDismiss(true, false, true)).toBe(false);
  });

  it("never closes a dialog that is not dismissible", () => {
    expect(backdropDismiss(true, true, false)).toBe(false);
  });
});
