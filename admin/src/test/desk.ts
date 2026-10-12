import type {
  AdminLead,
  AdminTicketDetailResponse,
  AdminTicketMessage,
  AdminTicketSummary,
  CustomerProfile,
} from "@nextera/contracts";

export const leadId = "3c1d2e4f-5a6b-4c7d-8e9f-0a1b2c3d4e51";
export const ticketId = "4d2e3f5a-6b7c-4d8e-9f0a-1b2c3d4e5f62";
export const messageId = "5e3f4a6b-7c8d-4e9f-8a1b-2c3d4e5f6a73";
export const deskCustomerId = "6f4a5b7c-8d9e-4f0a-9b2c-3d4e5f6a7b84";
export const assigneeId = "1e5f8a3c-9f1d-4c55-8a0e-1b2c3d4e5f61";
export const planId = "7a5b6c8d-9e0f-4a1b-8c3d-4e5f6a7b8c95";

export const lead: AdminLead = {
  id: leadId,
  ref: "NXL-2610-0001",
  name: "Ravi Kumar",
  phone: "+919876543210",
  email: "ravi@example.com",
  interest: "Fixed return plan",
  planId,
  amountPaise: 50_000_000,
  message: "Please call after 6pm.\nThanks",
  source: "web",
  path: "/plans/secure-12",
  ip: "203.0.113.42",
  userAgent: "Mozilla/5.0 (Windows NT 10.0)",
  status: "new",
  notes: null,
  assignee: null,
  convertedCustomerId: null,
  convertedAt: null,
  createdAt: "2026-10-11T04:30:00.000Z",
  updatedAt: "2026-10-11T04:30:00.000Z",
};

export const customerProfile: CustomerProfile = {
  id: deskCustomerId,
  phone: "+919876543210",
  name: "Ravi Kumar",
  email: "ravi@example.com",
  status: "active",
  kycStatus: "none",
};

export const ticket: AdminTicketSummary = {
  id: ticketId,
  ref: "NXT-2610-0007",
  subject: "Payment not reflected",
  category: "payment",
  status: "open",
  priority: "high",
  lastMessageAt: "2026-10-12T03:00:00.000Z",
  closedAt: null,
  createdAt: "2026-10-12T03:00:00.000Z",
  updatedAt: "2026-10-12T03:00:00.000Z",
  customer: { id: deskCustomerId, phone: "+919876543210", name: "Ravi Kumar" },
  assignee: null,
  investmentId: null,
  withdrawalId: null,
};

export const customerMessage: AdminTicketMessage = {
  id: messageId,
  authorType: "customer",
  authorId: deskCustomerId,
  authorName: "Ravi Kumar",
  body: "I paid yesterday.\n<b>Not bold</b>",
  attachment: { name: "receipt.pdf", contentType: "application/pdf", sizeBytes: 2048 },
  internal: false,
  createdAt: "2026-10-12T03:00:00.000Z",
};

export const ticketDetail: AdminTicketDetailResponse = {
  ticket,
  customer: customerProfile,
  messages: [customerMessage],
};

export const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
export const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
