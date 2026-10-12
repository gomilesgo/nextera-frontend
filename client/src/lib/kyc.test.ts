import { describe, expect, it } from "vitest";
import {
  canSubmitKyc,
  dobProblem,
  kycFormDefaults,
  latestAdultDob,
  mapKycFields,
  readKycForm,
  toKycResponse,
  toPortalKyc,
  validateKyc,
} from "./kyc";
import type { KycValues } from "./kyc";

const today = "2026-10-12";

const valid: KycValues = {
  pan: "ABCDE1234F",
  panName: "Asha Rao",
  dob: "1990-05-17",
  line1: "12 Lake View Road",
  line2: "",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "500034",
  consent: "yes",
};

const profile = {
  panMasked: "XXXXXX234F",
  panName: "Asha Rao",
  dob: "1990-05-17",
  address: { line1: "12 Lake View Road", line2: "", city: "Hyderabad", state: "Telangana", pincode: "500034" },
  submittedAt: "2026-10-10T05:00:00.000Z",
  verifiedAt: null,
  rejectionReason: "PAN name does not match the document",
};

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("readKycForm", () => {
  it("trims, uppercases the PAN and compacts the PIN code", () => {
    const values = readKycForm(form({ ...valid, pan: " abcde 1234f ", pincode: "500 034", panName: "  Asha Rao " }));
    expect(values.pan).toBe("ABCDE1234F");
    expect(values.pincode).toBe("500034");
    expect(values.panName).toBe("Asha Rao");
  });

  it("folds full-width characters and strips invisible characters before validation", () => {
    const values = readKycForm(form({ ...valid, pan: "ａbcde​1234f‮", panName: "Asha‍ Rao" }));
    expect(values.pan).toBe("ABCDE1234F");
    expect(values.panName).toBe("Asha Rao");
    expect(validateKyc(values, today).ok).toBe(true);
  });

  it("ignores files and missing fields", () => {
    const data = new FormData();
    data.set("pan", new Blob(["x"]), "pan.txt");
    expect(readKycForm(data).pan).toBe("");
  });
});

describe("validateKyc", () => {
  it("builds the backend payload", () => {
    expect(validateKyc(valid, today)).toEqual({
      ok: true,
      payload: {
        pan: "ABCDE1234F",
        panName: "Asha Rao",
        dob: "1990-05-17",
        address: { line1: "12 Lake View Road", line2: "", city: "Hyderabad", state: "Telangana", pincode: "500034" },
        consentVersion: "kyc-2026-10",
      },
    });
  });

  it("reports every invalid field by form name", () => {
    const result = validateKyc(
      {
        pan: "ABC",
        panName: "1",
        dob: "17/05/1990",
        line1: "",
        line2: "",
        city: "",
        state: "Gondwana",
        pincode: "012345",
        consent: "",
      },
      today,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["city", "consent", "dob", "line1", "pan", "panName", "pincode", "state"]);
  });

  it("requires consent", () => {
    expect(validateKyc({ ...valid, consent: "" }, today)).toEqual({
      ok: false,
      errors: { consent: expect.stringMatching(/confirm/i) },
    });
    expect(validateKyc({ ...valid, consent: "on" }, today).ok).toBe(false);
  });

  it("refuses minors and future dates like the backend does", () => {
    expect(validateKyc({ ...valid, dob: "2008-10-13" }, today)).toMatchObject({
      ok: false,
      errors: { dob: expect.stringMatching(/18/) },
    });
    expect(validateKyc({ ...valid, dob: "2008-10-12" }, today).ok).toBe(true);
    expect(validateKyc({ ...valid, dob: "2027-01-01" }, today)).toMatchObject({
      ok: false,
      errors: { dob: expect.stringMatching(/future/) },
    });
  });
});

describe("dates", () => {
  it("gives the latest date of birth for an adult", () => {
    expect(latestAdultDob(today)).toBe("2008-10-12");
    expect(latestAdultDob("2026-02-28")).toBe("2008-02-28");
    expect(dobProblem("2008-10-12", today)).toBeNull();
  });
});

describe("mapKycFields", () => {
  it("maps backend paths onto form fields", () => {
    expect(mapKycFields({ pan: ["Taken"], "address.pincode": ["Bad PIN"], dob: ["Too young"], other: ["x"] })).toEqual({
      pan: "Taken",
      pincode: "Bad PIN",
      dob: "Too young",
    });
    expect(mapKycFields(undefined)).toEqual({});
  });
});

describe("toKycResponse", () => {
  it("accepts a masked profile", () => {
    expect(toKycResponse({ kycStatus: "rejected", profile })).toEqual({ kycStatus: "rejected", profile });
    expect(toKycResponse({ kycStatus: "none", profile: null })).toEqual({ kycStatus: "none", profile: null });
  });

  it("re-masks a full PAN and rejects malformed shapes", () => {
    expect(
      toKycResponse({ kycStatus: "submitted", profile: { ...profile, panMasked: "ABCDE1234F" } })?.profile?.panMasked,
    ).toBe("XXXXXX234F");
    expect(toKycResponse({ kycStatus: "done", profile: null })).toBeNull();
    expect(toKycResponse({ kycStatus: "submitted", profile: { ...profile, address: null } })).toBeNull();
    expect(toKycResponse({ kycStatus: "submitted", profile: { ...profile, panMasked: "1234" } })).toBeNull();
    expect(toKycResponse(null)).toBeNull();
  });
});

describe("toPortalKyc", () => {
  it("keeps date of birth and address only while the form is editable", () => {
    expect(toPortalKyc({ kycStatus: "rejected", profile })).toEqual({ kycStatus: "rejected", profile });
    for (const kycStatus of ["submitted", "verified"] as const) {
      const projected = toPortalKyc({ kycStatus, profile });
      expect(projected.profile).toMatchObject({ panMasked: "XXXXXX234F", panName: "Asha Rao", dob: null, address: null });
      expect(JSON.stringify(projected)).not.toContain("Lake View");
      expect(JSON.stringify(projected)).not.toContain("1990-05-17");
    }
    expect(toPortalKyc({ kycStatus: "none", profile: null })).toEqual({ kycStatus: "none", profile: null });
  });

  it("prefills only the name when the address was withheld", () => {
    const projected = toPortalKyc({ kycStatus: "submitted", profile });
    expect(kycFormDefaults(projected.profile)).toMatchObject({ panName: "Asha Rao", line1: "", dob: "" });
  });
});

describe("kyc form helpers", () => {
  it("prefills everything except the PAN and consent for a resubmission", () => {
    const defaults = kycFormDefaults(profile);
    expect(defaults.pan).toBe("");
    expect(defaults.panName).toBe("Asha Rao");
    expect(defaults.pincode).toBe("500034");
    expect(defaults.consent).toBe("");
  });

  it("allows submission only before review or after rejection", () => {
    expect(canSubmitKyc("none")).toBe(true);
    expect(canSubmitKyc("rejected")).toBe(true);
    expect(canSubmitKyc("submitted")).toBe(false);
    expect(canSubmitKyc("verified")).toBe(false);
  });
});
