import type { AdminBankAccount, AdminCustomerKyc, KycQueueItem, StaffMember } from "@nextera/contracts";

export const customerId = "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11";
export const accountId = "7a2d2f9f-4d3c-4b5f-8b62-1e7f7d2f1b22";
export const memberId = "8b3e3a0a-5e4d-4c6a-9c73-2f8a8e3a2c33";

export const queueItem: KycQueueItem = {
  customerId,
  phone: "+919800000001",
  name: "Asha Rao",
  kycStatus: "submitted",
  panMasked: "XXXXXX234F",
  panName: "Asha Rao",
  dob: "1990-04-12",
  submittedAt: "2026-10-10T09:00:00.000Z",
  verifiedAt: null,
  rejectionReason: null,
};

export const bankAccount: AdminBankAccount = {
  id: accountId,
  customerId,
  accountMasked: "XXXXXX6789",
  accountLast4: "6789",
  ifsc: "HDFC0001234",
  holderName: "Asha Rao",
  nameAtBank: "A RAO",
  nameMatchResult: "POOR_PARTIAL_MATCH",
  nameMatchScore: "48.00",
  status: "review",
  isPrimary: false,
  verifiedAt: null,
  reviewNote: null,
  createdAt: "2026-10-11T09:00:00.000Z",
  pennyDropRef: "ref-1",
  failureReason: null,
  holdReason: null,
  reviewedBy: null,
};

export const customerKyc: AdminCustomerKyc = {
  customer: {
    id: customerId,
    phone: "+919800000001",
    name: "Asha Rao",
    email: null,
    status: "active",
    kycStatus: "submitted",
  },
  kycStatus: "submitted",
  profile: {
    panMasked: "XXXXXX234F",
    panName: "Asha Rao",
    dob: "1990-04-12",
    address: { line1: "12 MG Road", line2: "", city: "Bengaluru", state: "Karnataka", pincode: "560001" },
    submittedAt: "2026-10-10T09:00:00.000Z",
    verifiedAt: null,
    rejectionReason: null,
    reviewedBy: null,
  },
  bankAccounts: [bankAccount],
};

export const member: StaffMember = {
  id: memberId,
  email: "new@srahira.com",
  name: "New Person",
  role: "support",
  mustChangePassword: true,
  disabledAt: null,
  lockedUntil: null,
  createdAt: "2026-10-12T09:00:00.000Z",
};

export const credentials = {
  staff: member,
  temporaryPassword: "Zq8xY2mN4pL6tR0vW3sK",
  totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
  otpauthUrl:
    "otpauth://totp/Nextera%20Admin:new%40srahira.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Nextera%20Admin",
};
