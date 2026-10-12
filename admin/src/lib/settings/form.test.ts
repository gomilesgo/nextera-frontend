import { describe, expect, it } from "vitest";
import { buildSettingsUpdate, settingsToValues } from "./form";

const current = { tdsRateBps: 1000, minWithdrawalPaise: 150_050 };

describe("settings form", () => {
  it("round-trips the current values", () => {
    expect(settingsToValues(current)).toEqual({ tdsRate: "10", minWithdrawal: "1500.5" });
    expect(buildSettingsUpdate(settingsToValues(current), current)).toEqual({ status: "unchanged" });
  });

  it("returns only the keys that differ", () => {
    expect(buildSettingsUpdate({ tdsRate: "10", minWithdrawal: "2000" }, current)).toEqual({
      status: "changed",
      payload: { minWithdrawalPaise: 200_000 },
    });
    expect(buildSettingsUpdate({ tdsRate: "0", minWithdrawal: "2000" }, current)).toEqual({
      status: "changed",
      payload: { tdsRateBps: 0, minWithdrawalPaise: 200_000 },
    });
  });

  it("reports invalid fields even when the other one is unchanged", () => {
    expect(buildSettingsUpdate({ tdsRate: "60", minWithdrawal: "1500.50" }, current)).toEqual({
      status: "invalid",
      errors: { tdsRate: ["TDS cannot exceed 50%"] },
    });
  });
});
