import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { ACTION_UNREACHABLE, fieldErrors, invalidFields, mutationMessage, unwrapAction, waitText } from "./actionResult";

describe("unwrapAction", () => {
  it("returns successful results", () => {
    expect(unwrapAction({ status: "ok" as const, value: 1 })).toEqual({ status: "ok", value: 1 });
  });

  it("throws an ApiError the query client understands", () => {
    try {
      unwrapAction({
        status: "error",
        httpStatus: 401,
        code: "unauthorized",
        message: "Signed out",
        retryAfterSeconds: 3,
        fields: { pan: ["Bad"] },
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 401, code: "unauthorized", message: "Signed out", retryAfterSeconds: 3 });
      expect(fieldErrors(error)).toEqual({ pan: "Bad" });
    }
  });
});

describe("invalidFields", () => {
  it("builds a validation failure and skips empty messages", () => {
    expect(invalidFields({ pan: "Bad", dob: undefined })).toEqual({
      status: "error",
      httpStatus: 400,
      code: "validation",
      message: "Please check the highlighted fields.",
      fields: { pan: ["Bad"] },
    });
  });
});

describe("mutationMessage", () => {
  it("shows API messages and a fallback for transport failures", () => {
    expect(mutationMessage(null)).toBeNull();
    expect(mutationMessage(new ApiError(409, "conflict", "Already added"))).toBe("Already added");
    expect(mutationMessage(new TypeError("Failed to fetch"))).toBe(ACTION_UNREACHABLE);
    expect(fieldErrors(new Error("x"))).toEqual({});
  });
});

describe("waitText", () => {
  it("rounds to seconds, minutes or hours", () => {
    expect(waitText(undefined)).toBe("Please try again later.");
    expect(waitText(30)).toBe("Please try again in 30 seconds.");
    expect(waitText(600)).toBe("Please try again in about 10 minutes.");
    expect(waitText(3600)).toBe("Please try again in about 1 hour.");
    expect(waitText(86_000)).toBe("Please try again in about 24 hours.");
  });
});
