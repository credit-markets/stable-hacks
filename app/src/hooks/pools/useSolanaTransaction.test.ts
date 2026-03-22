import { createTestWrapperWithClient } from "@/__tests__/utils/test-wrapper";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────

// Mock @dynamic-labs/sdk-react-core
const mockPrimaryWallet = vi.hoisted(() => ({
  address: "FakeWallet111111111111111111111111111111111",
  getSigner: vi.fn(),
}));
vi.mock("@dynamic-labs/sdk-react-core", () => ({
  useDynamicContext: () => ({
    primaryWallet: mockPrimaryWallet,
  }),
}));

// Mock @dynamic-labs/solana-core
vi.mock("@dynamic-labs/solana-core", () => ({
  isSolanaWallet: () => true,
}));

// Mock @solana/web3.js
vi.mock("@solana/web3.js", () => {
  const MockConnection = function MockConnection() {
    return {
      sendRawTransaction: vi.fn().mockResolvedValue("mock-sig"),
      confirmTransaction: vi.fn().mockResolvedValue({}),
    };
  };
  return {
    Connection: MockConnection,
    Transaction: {
      from: vi.fn().mockReturnValue({
        serialize: vi.fn().mockReturnValue(new Uint8Array(0)),
      }),
    },
  };
});

// Mock @supabase/supabase-js
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  }),
}));

// Mock API service
const mockApiPost = vi.hoisted(() => vi.fn());
vi.mock("@/services/api", () => ({
  api: {
    post: mockApiPost,
  },
}));

// Mock Solana config
vi.mock("@/config/solana", () => ({
  SOLANA_RPC_URL: "https://api.devnet.solana.com",
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock parseSolanaError
vi.mock("@/lib/utils/solana-transactions", () => ({
  parseSolanaError: (err: any) => err?.message || "Transaction failed",
  isUserRejection: () => false,
}));

// Mock react-hot-toast
const mockToast = vi.hoisted(() =>
  Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
);
vi.mock("react-hot-toast", () => ({
  default: mockToast,
}));

// Import after mocks
import { useSolanaTransaction } from "./useSolanaTransaction";

describe("useSolanaTransaction", () => {
  let wrapper: ReturnType<typeof createTestWrapperWithClient>["wrapper"];

  beforeEach(() => {
    vi.clearAllMocks();
    const setup = createTestWrapperWithClient();
    wrapper = setup.wrapper;
  });

  it("should return signAndSend function and initial state", () => {
    const { result } = renderHook(() => useSolanaTransaction(), { wrapper });

    expect(result.current.signAndSend).toBeInstanceOf(Function);
    expect(result.current.status).toBe("idle");
    expect(result.current.isLoading).toBe(false);
  });

  it("should set error status when API call fails", async () => {
    mockApiPost.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSolanaTransaction(), { wrapper });

    await act(async () => {
      try {
        await result.current.signAndSend(
          "/pools/pool-1/invest/build-tx",
          { amount: 100_000_000 },
          {
            successEvent: "investment.requested",
            successMessage: "Investment submitted",
            invalidateKeys: [["pools"]],
          },
        );
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isLoading).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith("Network error");
  });

  it("should show toast error when wallet is not connected", async () => {
    // Temporarily set primaryWallet.address to null
    const originalAddress = mockPrimaryWallet.address;
    mockPrimaryWallet.address = null as unknown as string;

    const { result } = renderHook(() => useSolanaTransaction(), { wrapper });

    await act(async () => {
      const sig = await result.current.signAndSend(
        "/test/build-tx",
        {},
        {
          successEvent: "test.event",
          successMessage: "Success",
          invalidateKeys: [],
        },
      );
      expect(sig).toBeUndefined();
    });

    expect(mockToast.error).toHaveBeenCalledWith("Please connect your wallet");

    // Restore
    mockPrimaryWallet.address = originalAddress;
  });

  it("should call API with correct build URL and body", async () => {
    mockApiPost.mockResolvedValue({
      data: {
        transaction: Buffer.from("fake-tx").toString("base64"),
        correlationId: "corr-123",
      },
    });

    mockPrimaryWallet.getSigner.mockResolvedValue({
      signTransaction: vi.fn().mockResolvedValue({
        serialize: vi.fn().mockReturnValue(new Uint8Array(0)),
      }),
    });

    const { result } = renderHook(() => useSolanaTransaction(), { wrapper });

    await act(async () => {
      await result.current.signAndSend(
        "/pools/pool-1/invest/build-tx",
        { amount: 50_000_000 },
        {
          successEvent: "investment.requested",
          successMessage: "Deposit submitted",
          invalidateKeys: [["pools", "pool-1"]],
        },
      );
    });

    expect(mockApiPost).toHaveBeenCalledWith("/pools/pool-1/invest/build-tx", {
      amount: 50_000_000,
    });
  });
});
