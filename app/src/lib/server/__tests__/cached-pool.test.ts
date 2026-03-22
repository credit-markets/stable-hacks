import { getPool } from "@/services/poolService";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return { ...actual, cache: (fn: unknown) => fn };
});

vi.mock("axios", () => ({
  default: { isAxiosError: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

vi.mock("@/services/poolService", () => ({
  getPool: vi.fn(),
}));

import { logger } from "@/lib/logger";
import { getCachedPool } from "../cached-pool";

function createAxiosError(
  status: number,
  data?: Record<string, string>,
): {
  response: { status: number; data?: Record<string, string> };
  isAxiosError: true;
} {
  return {
    response: { status, ...(data && { data }) },
    isAxiosError: true,
  };
}

function mockAxiosError(
  status: number,
  data?: Record<string, string>,
): ReturnType<typeof createAxiosError> {
  const error = createAxiosError(status, data);
  vi.mocked(axios.isAxiosError).mockReturnValue(true);
  vi.mocked(getPool).mockRejectedValue(error);
  return error;
}

describe("getCachedPool", () => {
  const mockPool = {
    id: "pool123",
    title: "Test Pool",
    target_return_rate: 10.5,
    manager_address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
    manager_name: "Test Manager",
    status: "open",
    asset_class: "credit",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful fetches", () => {
    it.each([
      ["pool ID", "pool123"],
      ["blockchain address", "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV"],
    ])("should fetch pool by %s", async (_description, poolId) => {
      vi.mocked(getPool).mockResolvedValue(mockPool as never);

      const result = await getCachedPool(poolId);

      expect(result).toEqual(mockPool);
      expect(getPool).toHaveBeenCalledWith(poolId);
    });
  });

  describe("axios error handling", () => {
    it("should throw PoolNotFoundError for 404 status", async () => {
      const axiosError = mockAxiosError(404, { message: "Pool not found" });

      await expect(getCachedPool("nonexistent-pool")).rejects.toThrow(
        "Pool not found: nonexistent-pool",
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch pool",
        axiosError,
        { poolIdOrAddress: "nonexistent-pool", isBlockchainAddress: false },
      );
    });

    it.each([
      [500, "Internal server error"],
      [503, "Service unavailable"],
    ])(
      "should throw PoolServerError for %d status",
      async (status, message) => {
        mockAxiosError(status, { message });

        await expect(getCachedPool("pool123")).rejects.toThrow(
          "Server error while loading pool",
        );
      },
    );

    it("should identify blockchain addresses by base58 format", async () => {
      const axiosError = mockAxiosError(404);

      await expect(
        getCachedPool("7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV"),
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch pool",
        axiosError,
        {
          poolIdOrAddress: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
          isBlockchainAddress: true,
        },
      );
    });

    it("should pass through unhandled axios status codes", async () => {
      mockAxiosError(403, { message: "Forbidden" });

      await expect(getCachedPool("pool123")).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("error name verification", () => {
    it.each([
      [404, "PoolNotFoundError", "Pool not found: pool123"],
      [500, "PoolServerError", "Server error while loading pool"],
    ])(
      "should set error name to %s for status %d",
      async (status, expectedName, expectedMessage) => {
        mockAxiosError(status);

        await expect(getCachedPool("pool123")).rejects.toMatchObject({
          name: expectedName,
          message: expectedMessage,
        });
      },
    );
  });

  describe("generic error handling", () => {
    it("should add context to generic errors", async () => {
      const genericError = new Error("Network timeout");
      vi.mocked(getPool).mockRejectedValue(genericError);

      await expect(getCachedPool("pool123")).rejects.toThrow(
        "Failed to load pool pool123: Network timeout",
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch pool",
        genericError,
        { poolIdOrAddress: "pool123", isBlockchainAddress: false },
      );
    });

    it("should handle non-Error objects", async () => {
      const nonErrorObject = { weird: "error object" };
      vi.mocked(getPool).mockRejectedValue(nonErrorObject);

      await expect(getCachedPool("pool123")).rejects.toEqual(nonErrorObject);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch pool",
        nonErrorObject,
        expect.any(Object),
      );
    });
  });

  describe("caching behavior", () => {
    it("should work with React.cache() wrapper", async () => {
      vi.mocked(getPool).mockResolvedValue(mockPool as never);

      const result1 = await getCachedPool("pool123");
      const result2 = await getCachedPool("pool123");

      expect(result1).toEqual(mockPool);
      expect(result2).toEqual(mockPool);
      // In tests without React context, cache is bypassed
      expect(getPool).toHaveBeenCalledTimes(2);
    });
  });
});
