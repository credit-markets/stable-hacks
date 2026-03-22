import axios from "axios";

export const queryConfigs = {
  retry: (failureCount: number, error: unknown) => {
    // Don't retry client errors (4xx) except rate limiting (429)
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) {
        return false; // Don't retry 400, 401, 403, 404, etc.
      }
    }

    // Retry network errors and 5xx up to 3 times
    return failureCount < 3;
  },
  retryDelay: (attemptIndex: number) => {
    // Exponential backoff: 1s, 2s, 4s, capped at 30s
    return Math.min(1000 * 2 ** attemptIndex, 30000);
  },
  staleTime: 1000 * 60 * 5, // 5 minutes
};
