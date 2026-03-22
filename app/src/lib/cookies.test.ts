import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAMES, getDeleteCookieOptions } from "./cookies";

describe("Cookie Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.unstubAllEnvs();
  });

  describe("COOKIE_NAMES", () => {
    it("should have correct cookie name constant", () => {
      expect(COOKIE_NAMES.DYNAMIC_AUTH).toBe("DYNAMIC_JWT_TOKEN");
    });
  });

  describe("getDeleteCookieOptions", () => {
    it("should return options with epoch expiration date", () => {
      const options = getDeleteCookieOptions();

      expect(options.expires).toBeInstanceOf(Date);
      expect((options.expires as Date).getTime()).toBe(0);
    });

    it("should return non-production settings by default", () => {
      vi.stubEnv("NODE_ENV", "development");

      const options = getDeleteCookieOptions();

      expect(options.path).toBe("/");
      expect(options.sameSite).toBe("lax");
      expect(options.secure).toBe(false);
    });

    it("should return production settings when NODE_ENV is production", () => {
      vi.stubEnv("NODE_ENV", "production");

      const options = getDeleteCookieOptions();

      expect(options.sameSite).toBe("strict");
      expect(options.secure).toBe(true);
    });
  });
});
