export const TICKET_ID = "8f14e45f-ceea-467f-a0e6-2b8c6c1b3a11";
export const MESSAGE_ID = "c9f0f895-fb98-4b91-9f0a-7d5c2f1e6a22";

export const summary = {
  id: TICKET_ID,
  ref: "NXT-2610-0001",
  subject: "Payout not received",
  category: "withdrawal",
  status: "open",
  priority: "normal",
  lastMessageAt: "2026-10-12T05:30:00.000Z",
  closedAt: null,
  createdAt: "2026-10-12T05:30:00.000Z",
  updatedAt: "2026-10-12T05:30:00.000Z",
} as const;

export const message = {
  id: MESSAGE_ID,
  authorType: "customer",
  body: "My withdrawal from last week has not arrived.",
  attachment: { name: "statement.pdf", contentType: "application/pdf", sizeBytes: 2048 },
  createdAt: "2026-10-12T05:30:00.000Z",
} as const;

export const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
export const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

export function file(bytes: Uint8Array<ArrayBuffer> | number, name: string, type: string): File {
  const content = typeof bytes === "number" ? new Uint8Array(bytes) : bytes;
  return new File([content], name, { type });
}
