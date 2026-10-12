import { describe, expect, it, vi } from "vitest";
import { GENERIC_MESSAGES } from "@/lib/safeErrors";
import { SUPPORT_MESSAGES, rateLimitMessage, supportFailure } from "./errors";
import { ATTACHMENT_MESSAGES } from "./validation";

vi.spyOn(console, "error").mockImplementation(() => {});

describe("rateLimitMessage", () => {
  it("keeps the backend wording and adds the wait when given", () => {
    expect(rateLimitMessage("You have sent many messages today. Please wait for our reply.", 3 * 3600)).toBe(
      "You have sent many messages today. Please wait for our reply. You can try again in about 3 hours.",
    );
    expect(rateLimitMessage("This ticket has reached its message limit. Please open a new ticket.", undefined)).toBe(
      "This ticket has reached its message limit. Please open a new ticket.",
    );
    expect(rateLimitMessage("", 30)).toBe(`${SUPPORT_MESSAGES.rateLimited} You can try again in 30 seconds.`);
  });
});

describe("supportFailure", () => {
  it("maps 429 rate_limited with the retry time", () => {
    const result = supportFailure(
      {
        code: "rate_limited",
        message: "You have opened many tickets today. Reply on an existing ticket or try again later.",
        retryAfterSeconds: 600,
      },
      429,
      "create",
    );
    expect(result).toEqual({
      ok: false,
      status: 429,
      code: "rate_limited",
      message:
        "You have opened many tickets today. Reply on an existing ticket or try again later. You can try again in about 10 minutes.",
      retryAfterSeconds: 600,
    });
  });

  it("maps backend field errors onto the form", () => {
    const result = supportFailure(
      {
        code: "validation",
        message: "Some fields are invalid",
        fields: { attachment: ["Attach a PDF, JPEG, PNG or WebP file"], other: ["x"] },
      },
      400,
      "reply",
    );
    expect(result).toEqual({
      ok: false,
      status: 400,
      code: "validation",
      message: SUPPORT_MESSAGES.invalid,
      fields: { attachment: ["Attach a PDF, JPEG, PNG or WebP file"] },
    });
  });

  it("maps body-limit and length errors without leaking internals", () => {
    expect(supportFailure({ code: "validation", message: "Request body is too large" }, 413, "create")).toMatchObject({
      status: 413,
      fields: { attachment: [ATTACHMENT_MESSAGES.tooLarge] },
    });
    expect(
      supportFailure({ code: "validation", message: "Uploads must send a Content-Length header" }, 411, "create"),
    ).toMatchObject({ message: GENERIC_MESSAGES.fallback });
  });

  it("explains closed tickets per action", () => {
    expect(supportFailure({ code: "conflict", message: "This ticket is closed." }, 409, "reply").message).toBe(
      SUPPORT_MESSAGES.closedReply,
    );
    expect(supportFailure({ code: "conflict", message: "already" }, 409, "close").message).toBe(
      SUPPORT_MESSAGES.alreadyClosed,
    );
  });

  it("keeps auth statuses so the client can sign out", () => {
    expect(supportFailure({ code: "unauthorized", message: "x" }, 401, "reply")).toMatchObject({
      status: 401,
      code: "unauthorized",
    });
    expect(supportFailure({ code: "account_blocked", message: "Blocked" }, 403, "reply")).toMatchObject({
      status: 403,
      code: "account_blocked",
    });
    expect(supportFailure({ code: "unavailable", message: "x" }, 503, "close")).toMatchObject({ status: 503 });
    expect(supportFailure({ code: "internal", message: "stack trace" }, 500, "create")).toMatchObject({
      status: 500,
      message: GENERIC_MESSAGES.fallback,
    });
  });
});
