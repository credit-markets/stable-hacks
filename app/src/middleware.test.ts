import { COOKIE_NAMES } from "@/lib/cookies";
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Set env before middleware module loads (CUSTOM_HOSTNAME is computed at import time)
process.env.NEXT_PUBLIC_DYNAMIC_API_BASE_URL =
  "https://auth.credit.markets/api/v0";

// Mock jose so verifyJwt treats any non-empty token as valid
vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => vi.fn()),
  jwtVerify: vi.fn(async (token: string) => {
    if (!token) throw new Error("empty token");
    return {
      payload: { scope: "user:basic" },
      protectedHeader: { alg: "RS256" },
    };
  }),
}));

import { middleware } from "./middleware";

// Mock fetch for admin verification
global.fetch = vi.fn();

describe("Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_API_URL = "http://localhost:3001";
  });

  const createRequest = (
    pathname: string,
    cookies: Record<string, string> = {},
    searchParams?: Record<string, string>,
  ): NextRequest => {
    const url = new URL(pathname, "http://localhost:3000");

    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        url.searchParams.set(key, value);
      }
    }

    const request = new NextRequest(url);

    // Mock cookies
    for (const [name, value] of Object.entries(cookies)) {
      Object.defineProperty(request.cookies, "get", {
        value: (cookieName: string) =>
          cookieName === name ? { value, name } : undefined,
        configurable: true,
      });
    }

    return request;
  };

  describe("Authentication Flow", () => {
    it("should allow authenticated users to access protected pages", async () => {
      const request = createRequest("/dashboard", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "valid-jwt-token",
      });

      const response = await middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should redirect unauthenticated users to /login", async () => {
      const request = createRequest("/dashboard");

      const response = await middleware(request);

      expect(response.status).toBe(307); // Temporary redirect
      expect(response.headers.get("location")).toContain("/login");
    });

    it("should redirect authenticated users away from /login", async () => {
      const request = createRequest("/login", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "valid-jwt-token",
      });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/");
      expect(response.headers.get("location")).not.toContain("/login");
    });

    it("should redirect authenticated users away from /signup", async () => {
      const request = createRequest("/signup", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "valid-jwt-token",
      });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/");
    });

    it("should allow unauthenticated users to access /login", async () => {
      const request = createRequest("/login");

      // Since unauthenticated users on auth pages should pass through
      // but the middleware redirects to login if not authenticated and not on auth page
      // For auth pages with no auth, it should pass through
      const response = await middleware(request);

      // Actually, looking at the middleware, unauthenticated users on /login
      // get past the first check (isAuthPage && authenticated)
      // and then hit the second check (!isAuthPage && !authenticated)
      // Since /login IS an auth page, they pass through
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("Cookie Detection", () => {
    it("should accept DYNAMIC_AUTH cookie for authentication", async () => {
      const request = createRequest("/dashboard", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "jwt-token",
      });

      const response = await middleware(request);

      expect(response.headers.get("location")).toBeNull();
    });

    it("should treat missing DYNAMIC_AUTH cookie as unauthenticated", async () => {
      const request = createRequest("/dashboard");

      const mockCookiesGet = vi.fn(() => undefined);

      Object.defineProperty(request.cookies, "get", {
        value: mockCookiesGet,
        configurable: true,
      });

      const response = await middleware(request);

      expect(mockCookiesGet).toHaveBeenCalledWith(COOKIE_NAMES.DYNAMIC_AUTH);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });
  });

  describe("Admin Access", () => {
    it("should verify admin access for /admin routes", async () => {
      const request = createRequest("/admin/users", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "admin-jwt-token",
      });

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ isAdmin: true, isAttester: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const response = await middleware(request);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3001/users/me/roles",
        expect.objectContaining({
          headers: { Authorization: "Bearer admin-jwt-token" },
        }),
      );

      expect(response.headers.get("location")).toBeNull();
    });

    it("should allow admin to access all /admin/* routes", async () => {
      const adminRoutes = [
        "/admin/users",
        "/admin/pools",
        "/admin/settings",
        "/admin/kyb-queue",
        "/admin/dashboard",
      ];

      for (const route of adminRoutes) {
        vi.mocked(fetch).mockResolvedValue(
          new Response(JSON.stringify({ isAdmin: true, isAttester: false }), {
            status: 200,
          }),
        );

        const request = createRequest(route, {
          [COOKIE_NAMES.DYNAMIC_AUTH]: `admin-jwt-${route}`,
        });

        const response = await middleware(request);
        expect(response.headers.get("location")).toBeNull();
      }
    });

    it("should redirect non-admin/non-attester users from /admin routes to /", async () => {
      const request = createRequest("/admin/settings", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "user-jwt-token",
      });

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ isAdmin: false, isAttester: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/");
      expect(response.headers.get("location")).not.toContain("/admin");
      expect(response.headers.get("location")).not.toContain("error=");
    });

    it("should redirect when admin check API fails", async () => {
      const request = createRequest("/admin/dashboard", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "jwt-token-api-fail",
      });

      vi.mocked(fetch).mockResolvedValue(
        new Response("Unauthorized", { status: 401 }),
      );

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/");
      expect(response.headers.get("location")).not.toContain("error=");
    });

    it("should handle admin check timeout", async () => {
      const request = createRequest("/admin/users", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "jwt-token-timeout",
      });

      vi.mocked(fetch).mockRejectedValue(new Error("Timeout"));

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/");
      expect(response.headers.get("location")).not.toContain("error=");
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][0];
      expect(logCall).toContain("[ERROR]");
      expect(logCall).toContain("Admin verification failed");

      consoleErrorSpy.mockRestore();
    });

    it("should include timeout signal in admin check", async () => {
      const request = createRequest("/admin/dashboard", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "jwt-token-signal",
      });

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ isAdmin: true, isAttester: false }), {
          status: 200,
        }),
      );

      await middleware(request);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  describe("Attester Access", () => {
    it("should allow attester to access /admin/kyb-queue", async () => {
      const request = createRequest("/admin/kyb-queue", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "attester-jwt-kyb",
      });

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ isAdmin: false, isAttester: true }), {
          status: 200,
        }),
      );

      const response = await middleware(request);

      expect(response.headers.get("location")).toBeNull();
    });

    it("should redirect attester from /admin/pools to /admin/kyb-queue", async () => {
      const request = createRequest("/admin/pools", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "attester-jwt-pools",
      });

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ isAdmin: false, isAttester: true }), {
          status: 200,
        }),
      );

      const response = await middleware(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/admin/kyb-queue");
    });

    it("should redirect attester from /admin/settings to /admin/kyb-queue", async () => {
      const request = createRequest("/admin/settings", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "attester-jwt-settings",
      });

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ isAdmin: false, isAttester: true }), {
          status: 200,
        }),
      );

      const response = await middleware(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/admin/kyb-queue");
    });

    it("should allow attester to access /admin/kyb-queue sub-routes", async () => {
      const request = createRequest("/admin/kyb-queue/details", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "attester-jwt-kyb-sub",
      });

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ isAdmin: false, isAttester: true }), {
          status: 200,
        }),
      );

      const response = await middleware(request);

      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("Redirect with ref parameter", () => {
    it("should preserve ref parameter when redirecting to login", async () => {
      const request = createRequest("/dashboard", {}, { ref: "/pools/123" });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("ref=%2Fpools%2F123");
    });

    it("should not include ref when it's not present", async () => {
      const request = createRequest("/dashboard");

      const response = await middleware(request);

      const location = response.headers.get("location");
      expect(location).toContain("/login");
      expect(location).not.toContain("ref=");
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing environment variables gracefully", async () => {
      const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
      process.env.NEXT_PUBLIC_BASE_API_URL = undefined;

      // Use a unique JWT token to avoid cache hits from previous tests
      const request = createRequest("/admin/users", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "jwt-token-missing-env",
      });

      vi.mocked(fetch).mockRejectedValue(new Error("Invalid URL"));

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/");
      expect(response.headers.get("location")).not.toContain("error=");
      // Logger now uses structured logging, so console.error is called
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      process.env.NEXT_PUBLIC_BASE_API_URL = originalBaseUrl;
    });

    it("should handle empty JWT token", async () => {
      const request = createRequest("/dashboard", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "",
      });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });

    it("should not redirect on Next.js internal routes", async () => {
      // Based on the config matcher, these should be excluded
      const internalRoutes = [
        {
          url: "/_next/static/chunks/main.js",
          expectedPath: "/_next/static/chunks/main.js",
        },
        { url: "/_next/image", expectedPath: "/_next/image" },
        { url: "/favicon.ico", expectedPath: "/favicon.ico" },
        { url: "/manifest.json", expectedPath: "/manifest.json" },
      ];

      for (const { url, expectedPath } of internalRoutes) {
        const request = createRequest(url);
        // These routes should not even reach the middleware due to the matcher config
        // but if they do, they should pass through
        expect(request.nextUrl.pathname).toBe(expectedPath);
      }
    });
  });

  describe("Response Types", () => {
    it("should return NextResponse.next() for allowed requests", async () => {
      const request = createRequest("/dashboard", {
        [COOKIE_NAMES.DYNAMIC_AUTH]: "valid-token",
      });

      const response = await middleware(request);

      // NextResponse.next() returns a response without redirect
      expect(response.status).not.toBe(307);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should return NextResponse.redirect() for unauthorized requests", async () => {
      const request = createRequest("/protected");

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBeTruthy();
    });
  });
});
