import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWalletPolling } from "./useWalletPolling";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { logger } from "@/lib/logger";

interface EmailUser {
  userId: string;
  email: string;
  verifiedCredentials?: Array<{
    address: string;
  }>;
}

describe("useWalletPolling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Successful polling", () => {
    it("should return wallet address immediately if already present", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: [
          { address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" },
        ],
      };

      let walletAddress: string | null = null;

      await act(async () => {
        walletAddress = await result.current.pollForWalletAddress(emailUser);
      });

      expect(walletAddress).toBe("7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV");
      expect(logger.debug).toHaveBeenCalledWith(
        "Starting wallet address polling",
        {
          userId: "test-user-123",
          userEmail: "test@example.com",
          maxAttempts: 10,
          intervalMs: 100,
        },
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "Wallet address found",
        expect.objectContaining({
          userId: "test-user-123",
          userEmail: "test@example.com",
          address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
          attemptNumber: 1,
        }),
      );
    });

    it("should use custom maxAttempts parameter", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: undefined,
      };

      let walletAddress: string | null = null;

      await act(async () => {
        walletAddress = await result.current.pollForWalletAddress(
          emailUser,
          3,
          10,
        );
      });

      expect(walletAddress).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Wallet address polling timeout",
        undefined,
        expect.objectContaining({
          userId: "test-user-123",
          userEmail: "test@example.com",
          maxAttempts: 3,
          totalTimeMs: 30,
        }),
      );
    });

    it("should use custom intervalMs parameter", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: [
          { address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" },
        ],
      };

      await act(async () => {
        await result.current.pollForWalletAddress(emailUser, 2, 20);
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Starting wallet address polling",
        expect.objectContaining({
          intervalMs: 20,
        }),
      );
    });

    it("should find first address in credentials array", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: [
          { address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" },
          { address: "5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT" },
        ],
      };

      const walletAddress = await act(async () => {
        return result.current.pollForWalletAddress(emailUser);
      });

      expect(walletAddress).toBe(
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      );
    });
  });

  describe("Polling timeout", () => {
    it("should return null after max attempts reached", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: undefined,
      };

      let walletAddress: string | null = null;

      await act(async () => {
        walletAddress = await result.current.pollForWalletAddress(
          emailUser,
          2,
          10,
        );
      });

      expect(walletAddress).toBeNull();
    });

    it("should log timeout error with context", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: undefined,
      };

      await act(async () => {
        await result.current.pollForWalletAddress(emailUser, 5, 10);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Wallet address polling timeout",
        undefined,
        {
          userId: "test-user-123",
          userEmail: "test@example.com",
          maxAttempts: 5,
          totalTimeMs: 50,
          credentialsPresent: false,
          credentialsLength: 0,
        },
      );
    });

    it("should log credentials info when present but empty", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: [], // Empty array
      };

      await act(async () => {
        await result.current.pollForWalletAddress(emailUser, 2, 10);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Wallet address polling timeout",
        undefined,
        expect.objectContaining({
          credentialsPresent: true,
          credentialsLength: 0,
        }),
      );
    });
  });

  describe("Logging", () => {
    it("should log polling start with correct parameters", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: [
          { address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" },
        ],
      };

      await act(async () => {
        await result.current.pollForWalletAddress(emailUser, 15, 200);
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Starting wallet address polling",
        {
          userId: "test-user-123",
          userEmail: "test@example.com",
          maxAttempts: 15,
          intervalMs: 200,
        },
      );
    });

    it("should calculate total time correctly in timeout log", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: undefined,
      };

      await act(async () => {
        await result.current.pollForWalletAddress(emailUser, 4, 25);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Wallet address polling timeout",
        undefined,
        expect.objectContaining({
          totalTimeMs: 100, // 4 attempts * 25ms
        }),
      );
    });
  });

  describe("Default parameters", () => {
    it("should use default maxAttempts of 10", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: undefined,
      };

      await act(async () => {
        await result.current.pollForWalletAddress(emailUser);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Wallet address polling timeout",
        undefined,
        expect.objectContaining({
          maxAttempts: 10,
        }),
      );
    });

    it("should use default intervalMs of 100", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: undefined,
      };

      await act(async () => {
        await result.current.pollForWalletAddress(emailUser, 2);
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Wallet address polling timeout",
        undefined,
        expect.objectContaining({
          maxAttempts: 2,
          totalTimeMs: 200,
        }),
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle empty email", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "",
        verifiedCredentials: [
          { address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" },
        ],
      };

      await act(async () => {
        await result.current.pollForWalletAddress(emailUser);
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Starting wallet address polling",
        expect.objectContaining({
          userEmail: "",
        }),
      );
    });

    it("should handle verifiedCredentials with no address", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: [{ address: "" }],
      };

      const walletAddress = await act(async () => {
        return result.current.pollForWalletAddress(emailUser, 2, 10);
      });

      expect(walletAddress).toBeNull();
    });

    it("should handle maxAttempts of 1", async () => {
      const { result } = renderHook(() => useWalletPolling());

      const emailUser: EmailUser = {
        userId: "test-user-123",
        email: "test@example.com",
        verifiedCredentials: undefined,
      };

      const walletAddress = await act(async () => {
        return result.current.pollForWalletAddress(emailUser, 1, 10);
      });

      expect(walletAddress).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Wallet address polling timeout",
        undefined,
        expect.objectContaining({
          maxAttempts: 1,
        }),
      );
    });
  });
});
