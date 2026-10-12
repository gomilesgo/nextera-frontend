import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("accepts a complete environment and defaults the timeout", () => {
    expect(
      parseServerEnv({
        NEXTERA_BACKEND_URL: "http://localhost:4000",
        NEXTERA_ADMIN_SERVICE_KEY: "a".repeat(32),
      }),
    ).toEqual({
      NEXTERA_BACKEND_URL: "http://localhost:4000",
      NEXTERA_ADMIN_SERVICE_KEY: "a".repeat(32),
      NEXTERA_BACKEND_TIMEOUT_MS: 10000,
    });
  });

  it("names every missing variable", () => {
    expect(() => parseServerEnv({})).toThrow(
      "Invalid admin environment: NEXTERA_BACKEND_URL is required; NEXTERA_ADMIN_SERVICE_KEY is required",
    );
  });

  it("rejects short keys and relative URLs", () => {
    expect(() =>
      parseServerEnv({ NEXTERA_BACKEND_URL: "/api", NEXTERA_ADMIN_SERVICE_KEY: "short" }),
    ).toThrow(/absolute URL.*at least 16/);
  });
});
