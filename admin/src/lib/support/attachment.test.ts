import { describe, expect, it } from "vitest";
import { TICKET_ATTACHMENT_MAX_BYTES } from "@nextera/contracts";
import { pdfBytes, pngBytes } from "@/test/desk";
import {
  ATTACHMENT_EMPTY_ERROR,
  ATTACHMENT_SIZE_ERROR,
  ATTACHMENT_TYPE_ERROR,
  attachmentError,
  declaredType,
  isEmptyFileInput,
  safeFileName,
  sniffAttachmentType,
} from "./attachment";
import { formatBytes } from "@/lib/format";

describe("attachment rules", () => {
  it("allow PDF, JPEG, PNG and WebP up to the contract limit", () => {
    expect(attachmentError({ name: "a.pdf", size: 10, type: "application/pdf" })).toBeNull();
    expect(attachmentError({ name: "a.webp", size: TICKET_ATTACHMENT_MAX_BYTES, type: "image/webp" })).toBeNull();
    expect(attachmentError({ name: "a.JPG", size: 10, type: "" })).toBeNull();
    expect(attachmentError({ name: "a.png", size: TICKET_ATTACHMENT_MAX_BYTES + 1, type: "image/png" })).toBe(ATTACHMENT_SIZE_ERROR);
    expect(attachmentError({ name: "a.pdf", size: 0, type: "application/pdf" })).toBe(ATTACHMENT_EMPTY_ERROR);
    expect(attachmentError({ name: "a.html", size: 10, type: "text/html" })).toBe(ATTACHMENT_TYPE_ERROR);
    expect(attachmentError({ name: "a.pdf", size: 10, type: "text/html" })).toBe(ATTACHMENT_TYPE_ERROR);
    expect(attachmentError({ name: "a.svg", size: 10, type: "image/svg+xml" })).toBe(ATTACHMENT_TYPE_ERROR);
  });

  it("fall back to the extension only for generic types", () => {
    expect(declaredType({ name: "scan.jpeg", size: 1, type: "application/octet-stream" })).toBe("image/jpeg");
    expect(declaredType({ name: "scan.exe", size: 1, type: "" })).toBeNull();
    expect(declaredType({ name: "scan", size: 1, type: "application/pdf; charset=binary" })).toBe("application/pdf");
  });

  it("recognise an untouched file input", () => {
    expect(isEmptyFileInput({ name: "", size: 0, type: "application/octet-stream" })).toBe(true);
    expect(isEmptyFileInput({ name: "a.pdf", size: 0, type: "" })).toBe(false);
  });

  it("sniff types from leading bytes", () => {
    expect(sniffAttachmentType(pdfBytes)).toBe("application/pdf");
    expect(sniffAttachmentType(pngBytes)).toBe("image/png");
    expect(sniffAttachmentType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffAttachmentType(new TextEncoder().encode("RIFF1234WEBPVP8 "))).toBe("image/webp");
    expect(sniffAttachmentType(new TextEncoder().encode("<html>"))).toBeNull();
  });

  it("sanitize file names to safe ASCII", () => {
    expect(safeFileName("C:\\Users\\me\\Résumé final.pdf", "application/pdf")).toBe("Resume final.pdf");
    expect(safeFileName('../../x"; y.pdf', "application/pdf")).toBe("x__ y.pdf");
    expect(safeFileName("...", "image/png")).toBe("attachment.png");
    expect(safeFileName("", null)).toBe("attachment.bin");
    expect(safeFileName("a".repeat(300), null)).toHaveLength(120);
  });

  it("format sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
