import { COOKIE_NAMES } from "@/lib/cookies";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Next.js cookies before importing
const mockSet = vi.fn();
const mockCookies = vi.fn(async () => ({
  set: mockSet,
}));

vi.mock("next/headers", async () => ({
  cookies: mockCookies,
}));

// Import after mocking
const { clearAuthCookies } = await import("./auth");

describe("clearAuthCookies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockSet to default behavior
    mockSet.mockImplementation(() => {});
  });

  it("should clear the auth cookie successfully", async () => {
    await clearAuthCookies();

    // Verify the auth cookie was cleared
    expect(mockSet).toHaveBeenCalledTimes(1);

    // Check DYNAMIC_AUTH cookie
    expect(mockSet).toHaveBeenCalledWith(
      COOKIE_NAMES.DYNAMIC_AUTH,
      "",
      expect.objectContaining({
        path: "/",
        expires: expect.any(Date),
      }),
    );
  });

  it("should set expiration date to epoch (Jan 1, 1970) to delete cookies", async () => {
    await clearAuthCookies();

    const calls = mockSet.mock.calls;
    for (const call of calls) {
      const [, , options] = call;
      const expiresDate = options.expires;
      expect(expiresDate.getTime()).toBe(0); // Unix epoch
    }
  });

  it("should not throw error when cookie clearing fails", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const mockError = new Error("Cookie operation failed");
    mockSet.mockImplementation(() => {
      throw mockError;
    });

    // Should NOT throw - logout must always succeed
    await expect(clearAuthCookies()).resolves.toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("should handle async cookies() call", async () => {
    await clearAuthCookies();

    expect(mockCookies).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalled();
  });

  it("should use empty string as cookie value for deletion", async () => {
    await clearAuthCookies();

    const calls = mockSet.mock.calls;
    for (const call of calls) {
      expect(call[1]).toBe("");
    }
  });

  it("should log warning but not throw when clearing fails", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const mockError = new Error("Failed to clear cookies");

    mockSet.mockImplementation(() => {
      throw mockError;
    });

    // Should NOT throw - logout must always succeed
    await expect(clearAuthCookies()).resolves.toBeUndefined();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Cookie deletion failed during logout:",
      mockError,
    );

    consoleWarnSpy.mockRestore();
  });

  it("should succeed even if cookie doesn't exist", async () => {
    // Cookies.set() doesn't fail if cookie doesn't exist
    mockSet.mockImplementation(() => {});

    await clearAuthCookies();

    expect(mockSet).toHaveBeenCalledTimes(1);
  });
});
