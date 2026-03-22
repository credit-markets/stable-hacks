import { createTestWrapperWithClient } from "@/__tests__/utils/test-wrapper";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHandleLogOut = vi.hoisted(() => vi.fn());

vi.mock("@dynamic-labs/sdk-react-core", () => ({
  useDynamicContext: vi.fn(() => ({
    user: { userId: "user-1", email: "test@example.com" },
    handleLogOut: mockHandleLogOut,
  })),
}));

vi.mock("@/services/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

import { api } from "@/services/api";
import { useUserCreation } from "./useUserCreation";

describe("useUserCreation", () => {
  let queryClient: ReturnType<
    typeof createTestWrapperWithClient
  >["queryClient"];
  let wrapper: ReturnType<typeof createTestWrapperWithClient>["wrapper"];

  beforeEach(() => {
    vi.clearAllMocks();
    const setup = createTestWrapperWithClient();
    queryClient = setup.queryClient;
    wrapper = setup.wrapper;

    // Reset URL
    Object.defineProperty(window, "location", {
      value: { search: "" },
      writable: true,
    });
  });

  it("should invalidate currentUser and userRoles on success", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: "new-user" } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUserCreation(), { wrapper });

    await act(async () => {
      await result.current.createUser.mutateAsync("WalletAddress123");
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["currentUser"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["userRoles"] });
  });

  it("should call handleLogOut only on 401 error", async () => {
    const error401 = Object.assign(new Error("Unauthorized"), {
      response: { status: 401 },
    });
    vi.mocked(api.post).mockRejectedValue(error401);

    const { result } = renderHook(() => useUserCreation(), { wrapper });

    await act(async () => {
      try {
        await result.current.createUser.mutateAsync("WalletAddress123");
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(mockHandleLogOut).toHaveBeenCalled();
    });
  });

  it("should not call handleLogOut on non-401 errors", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useUserCreation(), { wrapper });

    await act(async () => {
      try {
        await result.current.createUser.mutateAsync("WalletAddress123");
      } catch {
        // Expected
      }
    });

    expect(mockHandleLogOut).not.toHaveBeenCalled();
  });

  it("should include referred_by when ref param is present in URL", async () => {
    Object.defineProperty(window, "location", {
      value: { search: "?ref=abc123" },
      writable: true,
    });
    vi.mocked(api.post).mockResolvedValue({ data: { id: "new-user" } });

    const { result } = renderHook(() => useUserCreation(), { wrapper });

    await act(async () => {
      await result.current.createUser.mutateAsync("WalletAddress123");
    });

    expect(api.post).toHaveBeenCalledWith(
      "/users",
      expect.objectContaining({ referred_by: "abc123" }),
    );
  });

  it("should not include referred_by when ref param is absent", async () => {
    Object.defineProperty(window, "location", {
      value: { search: "" },
      writable: true,
    });
    vi.mocked(api.post).mockResolvedValue({ data: { id: "new-user" } });

    const { result } = renderHook(() => useUserCreation(), { wrapper });

    await act(async () => {
      await result.current.createUser.mutateAsync("WalletAddress123");
    });

    const callData = vi.mocked(api.post).mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(callData).not.toHaveProperty("referred_by");
  });
});
