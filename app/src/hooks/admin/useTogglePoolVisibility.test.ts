import { createTestWrapperWithClient } from "@/__tests__/utils/test-wrapper";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
  api: {
    patch: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { api } from "@/services/api";
import toast from "react-hot-toast";
import { useTogglePoolVisibility } from "./useTogglePoolVisibility";

describe("useTogglePoolVisibility", () => {
  let queryClient: ReturnType<
    typeof createTestWrapperWithClient
  >["queryClient"];
  let wrapper: ReturnType<typeof createTestWrapperWithClient>["wrapper"];

  beforeEach(() => {
    vi.clearAllMocks();
    const setup = createTestWrapperWithClient();
    queryClient = setup.queryClient;
    wrapper = setup.wrapper;
  });

  it("should invalidate adminPools, pools, and manager-pools on success", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useTogglePoolVisibility(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ poolId: "pool-1", isVisible: true });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["adminPools"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["pools"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["manager-pools"] });
  });

  it("should show success toast on success", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useTogglePoolVisibility(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ poolId: "pool-1", isVisible: false });
    });

    expect(toast.success).toHaveBeenCalledWith("Pool visibility updated");
  });

  it("should show error toast with server message on error", async () => {
    const error = {
      message: "Request failed",
      response: { data: { message: "Pool not found" } },
    };
    vi.mocked(api.patch).mockRejectedValue(error);

    const { result } = renderHook(() => useTogglePoolVisibility(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ poolId: "pool-1", isVisible: true });
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to update visibility: Pool not found",
      );
    });
  });

  it("should fall back to error.message when response.data is absent", async () => {
    const error = {
      message: "Network Error",
    };
    vi.mocked(api.patch).mockRejectedValue(error);

    const { result } = renderHook(() => useTogglePoolVisibility(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ poolId: "pool-1", isVisible: true });
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to update visibility: Network Error",
      );
    });
  });
});
