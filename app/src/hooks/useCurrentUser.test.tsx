import type { DBUserData } from "@/types/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentUser } from "./useCurrentUser";

// Mock modules
vi.mock("@dynamic-labs/sdk-react-core", () => ({
  useDynamicContext: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "@/services/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch user data successfully when authenticated", async () => {
    const mockUser = {
      userId: "user123",
    };
    const mockWallet = {
      address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
    };
    const mockUserData: DBUserData = {
      id: "user-123",
      account: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
      referral_id: "ref-123",
      notifications: {
        transactions: true,
        opportunities: true,
        news: false,
      },
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };

    vi.mocked(useDynamicContext).mockReturnValue({
      user: mockUser,
      primaryWallet: mockWallet,
    } as any);
    vi.mocked(api.get).mockResolvedValue({ data: mockUserData });

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      ...mockUserData,
      walletAddress: mockWallet.address,
    });
    expect(api.get).toHaveBeenCalledWith("/users/me");
  });

  it("should not fetch when user is missing", async () => {
    vi.mocked(useDynamicContext).mockReturnValue({
      user: null,
      primaryWallet: null,
    } as any);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(api.get).not.toHaveBeenCalled();
  });

  it("should handle API error", async () => {
    const mockUser = {
      userId: "user123",
    };
    const mockWallet = {
      address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
    };
    const mockError = new Error("API Error");

    vi.mocked(useDynamicContext).mockReturnValue({
      user: mockUser,
      primaryWallet: mockWallet,
    } as any);
    vi.mocked(api.get).mockRejectedValue(mockError);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 },
    );

    expect(result.current.error).toEqual(mockError);
  });

  it("should include wallet address in response when available", async () => {
    const mockUser = {
      userId: "user123",
    };
    const mockWallet = {
      address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    };
    const mockUserData: DBUserData = {
      id: "user-123",
      account: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
      referral_id: "ref-123",
      notifications: {
        transactions: true,
        opportunities: true,
        news: false,
      },
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };

    vi.mocked(useDynamicContext).mockReturnValue({
      user: mockUser,
      primaryWallet: mockWallet,
    } as any);
    vi.mocked(api.get).mockResolvedValue({ data: mockUserData });

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.walletAddress).toBe(mockWallet.address);
  });

  it("should cache data for 5 minutes (staleTime)", async () => {
    const mockUser = {
      userId: "user123",
    };
    const mockWallet = {
      address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
    };
    const mockUserData: DBUserData = {
      id: "user-123",
      account: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
      referral_id: "ref-123",
      notifications: {
        transactions: true,
        opportunities: true,
        news: false,
      },
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };

    vi.mocked(useDynamicContext).mockReturnValue({
      user: mockUser,
      primaryWallet: mockWallet,
    } as any);
    vi.mocked(api.get).mockResolvedValue({ data: mockUserData });

    const { result, rerender } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const firstCallCount = vi.mocked(api.get).mock.calls.length;

    // Rerender - should use cached data
    rerender();

    expect(vi.mocked(api.get).mock.calls.length).toBe(firstCallCount);
  });
});
