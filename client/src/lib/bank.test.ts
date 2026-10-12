import { describe, expect, it } from "vitest";
import type { BankAccount } from "@nextera/contracts";
import {
  bankProgress,
  canBePrimary,
  ifscBankCode,
  isValidIfsc,
  mapBankFields,
  normalizeAccountNumber,
  normalizeIfsc,
  readBankForm,
  toBankAccount,
  toBankAccounts,
  validateBank,
} from "./bank";

const account: BankAccount = {
  id: "7f0c1c2e-1b7a-4d55-9a37-1f0f5b6a2c11",
  accountMasked: "XXXX9012",
  accountLast4: "9012",
  ifsc: "HDFC0001234",
  holderName: "Asha Rao",
  nameAtBank: "ASHA RAO",
  nameMatchResult: "DIRECT_MATCH",
  status: "verified",
  isPrimary: true,
  verifiedAt: "2026-10-11T06:00:00.000Z",
  reviewNote: null,
  createdAt: "2026-10-11T06:00:00.000Z",
};

describe("account numbers", () => {
  it("strips spaces and hyphens", () => {
    expect(normalizeAccountNumber("1234 5678-9012")).toBe("123456789012");
  });
});

describe("IFSC", () => {
  it("uppercases and removes spaces", () => {
    expect(normalizeIfsc(" hdfc 0001234 ")).toBe("HDFC0001234");
    expect(normalizeIfsc("ｈdfc​0001234")).toBe("HDFC0001234");
    expect(normalizeAccountNumber("1234​5678 9012")).toBe("123456789012");
  });

  it("checks the 4-letter bank code, the zero and the branch code", () => {
    expect(isValidIfsc("hdfc0001234")).toBe(true);
    expect(isValidIfsc("SBIN0ABC123")).toBe(true);
    expect(isValidIfsc("HDFC1001234")).toBe(false);
    expect(isValidIfsc("HDF00001234")).toBe(false);
    expect(isValidIfsc("HDFC000123")).toBe(false);
    expect(ifscBankCode("icic0000001")).toBe("ICIC");
    expect(ifscBankCode("nope")).toBeNull();
  });
});

describe("validateBank", () => {
  it("normalises the payload and drops the confirmation", () => {
    expect(validateBank({ accountNo: "1234 5678 9012", confirmAccountNo: "123456789012", ifsc: "hdfc0001234" })).toEqual({
      ok: true,
      payload: { accountNo: "123456789012", ifsc: "HDFC0001234" },
    });
  });

  it("requires a matching confirmation", () => {
    expect(validateBank({ accountNo: "123456789012", confirmAccountNo: "123456789013", ifsc: "HDFC0001234" })).toEqual({
      ok: false,
      errors: { confirmAccountNo: "The account numbers do not match" },
    });
    expect(validateBank({ accountNo: "123456789012", confirmAccountNo: "", ifsc: "HDFC0001234" })).toMatchObject({
      ok: false,
      errors: { confirmAccountNo: expect.any(String) },
    });
  });

  it("enforces 9 to 18 digits and the IFSC format", () => {
    for (const accountNo of ["12345678", "1234567890123456789", "12345678a9", ""]) {
      expect(validateBank({ accountNo, confirmAccountNo: accountNo, ifsc: "HDFC0001234" })).toMatchObject({
        ok: false,
        errors: { accountNo: expect.any(String) },
      });
    }
    expect(validateBank({ accountNo: "123456789", confirmAccountNo: "123456789", ifsc: "HDFC1234" })).toMatchObject({
      ok: false,
      errors: { ifsc: expect.stringMatching(/IFSC/) },
    });
  });

  it("reads the form fields", () => {
    const data = new FormData();
    data.set("accountNo", " 123 ");
    data.set("ifsc", "hdfc0001234");
    expect(readBankForm(data)).toEqual({ accountNo: "123", confirmAccountNo: "", ifsc: "hdfc0001234" });
  });

  it("maps backend field errors", () => {
    expect(mapBankFields({ accountNo: ["Bad"], ifsc: ["Bad IFSC"], name: ["x"] })).toEqual({
      accountNo: "Bad",
      ifsc: "Bad IFSC",
    });
  });
});

describe("toBankAccount", () => {
  it("accepts the backend shape", () => {
    expect(toBankAccount(account)).toEqual(account);
  });

  it("never keeps the name at the bank for accounts that are not verified", () => {
    for (const status of ["review", "rejected", "pending", "failed"]) {
      expect(toBankAccount({ ...account, status, nameAtBank: "STRANGER NAME" })?.nameAtBank).toBeNull();
    }
    expect(toBankAccount(account)?.nameAtBank).toBe("ASHA RAO");
  });

  it("rebuilds the mask from the last four digits only", () => {
    expect(toBankAccount({ ...account, accountMasked: "123456789012" })?.accountMasked).toBe("XXXX9012");
  });

  it("rejects malformed accounts", () => {
    expect(toBankAccount({ ...account, status: "gone" })).toBeNull();
    expect(toBankAccount({ ...account, accountLast4: "12" })).toBeNull();
    expect(toBankAccount({ ...account, isPrimary: "yes" })).toBeNull();
  });

  it("reads a list and drops malformed entries", () => {
    expect(toBankAccounts({ accounts: [account, { id: 1 }] })).toEqual([account]);
    expect(toBankAccounts({})).toBeNull();
  });
});

describe("bank progress", () => {
  it("is verified once any account is verified", () => {
    const review: BankAccount = { ...account, status: "review", isPrimary: false };
    expect(bankProgress([])).toBe("none");
    expect(bankProgress([review])).toBe("review");
    expect(bankProgress([review, account])).toBe("verified");
    expect(canBePrimary(account)).toBe(false);
    expect(canBePrimary({ ...account, isPrimary: false })).toBe(true);
    expect(canBePrimary(review)).toBe(false);
  });
});
