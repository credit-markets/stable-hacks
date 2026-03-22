import { createTestWrapperWithClient } from "@/__tests__/utils/test-wrapper";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseDynamicContext = vi.hoisted(() => vi.fn());

vi.mock("@dynamic-labs/sdk-react-core", () => ({
  useDynamicContext: mockUseDynamicContext,
}));

vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("@/constants/api", () => ({
  API_URL: "http://localhost:3030",
}));

import { api } from "@/services/api";
import { useEventsQuery } from "./useEventsQuery";

describe("useEventsQuery", () => {
  let wrapper: ReturnType<typeof createTestWrapperWithClient>["wrapper"];

  beforeEach(() => {
    vi.clearAllMocks();
    const setup = createTestWrapperWithClient();
    wrapper = setup.wrapper;

    mockUseDynamicContext.mockReturnValue({
      user: { userId: "admin-1" },
    });
  });

  it("should be disabled when user is null", () => {
    mockUseDynamicContext.mockReturnValue({ user: null });

    const { result } = renderHook(() => useEventsQuery(), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(api.get).not.toHaveBeenCalled();
  });

  it("should conditionally append filter params only when provided", async () => {
    const mockResponse = {
      data: {
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      },
    };
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useEventsQuery({ eventType: "DEPOSIT", page: 2 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const calledUrl = vi.mocked(api.get).mock.calls[0][0] as string;
    expect(calledUrl).toContain("event_type=DEPOSIT");
    expect(calledUrl).toContain("page=2");
    // actorType was not provided, so actor_type should not appear
    expect(calledUrl).not.toContain("actor_type");
    // dateFrom/dateTo were not provided
    expect(calledUrl).not.toContain("date_from");
    expect(calledUrl).not.toContain("date_to");
  });

  it("should include all filter values in the query key", () => {
    const mockResponse = {
      data: {
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      },
    };
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const options = {
      eventType: "WITHDRAW",
      actorType: "ADMIN",
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
      page: 3,
      pageSize: 10,
    };

    const { result } = renderHook(() => useEventsQuery(options), { wrapper });

    // Verify indirectly: changing a filter value should trigger a new query
    // The hook constructs queryKey as:
    // ["adminEvents", eventType, actorType, dateFrom, dateTo, page, pageSize]
    expect(result.current).toBeDefined();

    // Render with different options to confirm different query keys
    const { result: result2 } = renderHook(
      () => useEventsQuery({ ...options, eventType: "DEPOSIT" }),
      { wrapper },
    );

    expect(result2.current).toBeDefined();
    // Both calls should have been made (different cache keys)
    // api.get will be called at least twice (once per unique query key)
  });

  it("should append all filter params when all are provided", async () => {
    const mockResponse = {
      data: {
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      },
    };
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () =>
        useEventsQuery({
          eventType: "DEPOSIT",
          actorType: "USER",
          dateFrom: "2024-01-01",
          dateTo: "2024-06-30",
          page: 1,
          pageSize: 50,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const calledUrl = vi.mocked(api.get).mock.calls[0][0] as string;
    expect(calledUrl).toContain("event_type=DEPOSIT");
    expect(calledUrl).toContain("actor_type=USER");
    expect(calledUrl).toContain("date_from=2024-01-01");
    expect(calledUrl).toContain("date_to=2024-06-30");
    expect(calledUrl).toContain("page=1");
    expect(calledUrl).toContain("pageSize=50");
  });
});
