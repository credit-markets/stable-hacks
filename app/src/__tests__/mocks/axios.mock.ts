import type { AxiosError, AxiosResponse } from "axios";
import { vi } from "vitest";

/**
 * Mock axios instance with all HTTP methods.
 * Use this to mock API calls in tests.
 */
export const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  request: vi.fn(),
  create: vi.fn(() => mockAxios),
};

/**
 * Creates a mock successful Axios response.
 *
 * @param data - The response data
 * @param status - HTTP status code (default: 200)
 * @returns A mock AxiosResponse object
 *
 * @example
 * mockAxios.get.mockResolvedValue(mockAxiosSuccess({ userId: '123' }));
 */
export function mockAxiosSuccess<T = any>(
  data: T,
  status = 200,
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: "OK",
    headers: {},
    config: {} as any,
  };
}

/**
 * Creates a mock Axios error response.
 *
 * @param message - Error message
 * @param status - HTTP status code (default: 400)
 * @param data - Optional error response data
 * @returns A mock AxiosError object
 *
 * @example
 * mockAxios.get.mockRejectedValue(mockAxiosError('Not found', 404));
 */
export function mockAxiosError(
  message: string,
  status = 400,
  data?: any,
): Partial<AxiosError> {
  return {
    message,
    response: {
      data: data ?? { message },
      status,
      statusText: message,
      headers: {},
      config: {} as any,
    },
    isAxiosError: true,
  };
}

/**
 * Resets all axios mock implementations and call history.
 * Should be called in beforeEach or afterEach.
 *
 * @example
 * beforeEach(() => {
 *   resetAxiosMocks();
 * });
 */
export function resetAxiosMocks(): void {
  for (const mockFn of Object.values(mockAxios)) {
    if (typeof mockFn === "function" && "mockReset" in mockFn) {
      mockFn.mockReset();
    }
  }
}

/**
 * Sets up axios mocks for testing.
 * Should be called once in test setup or in beforeAll.
 *
 * @example
 * beforeAll(() => {
 *   setupAxiosMocks();
 * });
 */
export function setupAxiosMocks(): void {
  vi.mock("axios", () => ({
    default: mockAxios,
    create: vi.fn(() => mockAxios),
  }));

  vi.mock("@/services/api", () => ({
    api: mockAxios,
  }));
}
