import { createTestWrapperWithClient } from "@/__tests__/utils/test-wrapper";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the underlying Solana transaction hook
const mockSignAndSend = vi.fn();
vi.mock("./useSolanaTransaction", () => ({
  useSolanaTransaction: () => ({
    signAndSend: mockSignAndSend,
    status: null,
    isLoading: false,
  }),
}));

import { useInvest } from "./useInvest";

describe("useInvest", () => {
  let wrapper: ReturnType<typeof createTestWrapperWithClient>["wrapper"];

  beforeEach(() => {
    vi.clearAllMocks();
    const setup = createTestWrapperWithClient();
    wrapper = setup.wrapper;
    mockSignAndSend.mockResolvedValue("mock-tx-signature");
  });

  it("should return requestDeposit, cancelDeposit, status, and isLoading", () => {
    const { result } = renderHook(() => useInvest("pool-123"), { wrapper });

    expect(result.current.requestDeposit).toBeInstanceOf(Function);
    expect(result.current.cancelDeposit).toBeInstanceOf(Function);
    expect(result.current.status).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should call signAndSend with correct endpoint and body (no investorAddress)", async () => {
    const { result } = renderHook(() => useInvest("pool-123"), { wrapper });

    await act(async () => {
      await result.current.requestDeposit(100);
    });

    expect(mockSignAndSend).toHaveBeenCalledWith(
      expect.stringContaining("/pools/pool-123/invest/build-tx"),
      { amount: 100_000_000 },
      expect.objectContaining({
        successEvent: "investment.requested",
      }),
    );
  });

  it("should convert USDC amount to lamports (6 decimals)", async () => {
    const { result } = renderHook(() => useInvest("pool-456"), { wrapper });

    await act(async () => {
      await result.current.requestDeposit(50.5);
    });

    const callArgs = mockSignAndSend.mock.calls[0];
    expect(callArgs[1].amount).toBe(50_500_000); // 50.5 * 1_000_000
  });

  it("should return the transaction signature on success", async () => {
    const { result } = renderHook(() => useInvest("pool-789"), { wrapper });

    let txSig: string | undefined;
    await act(async () => {
      txSig = await result.current.requestDeposit(100);
    });

    expect(txSig).toBe("mock-tx-signature");
  });
});
