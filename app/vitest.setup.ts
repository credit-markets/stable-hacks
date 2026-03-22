import "@testing-library/jest-dom";
import { expect, vi } from "vitest";

// Mock Next.js environment variables
if (!process.env.NEXT_PUBLIC_BASE_API_URL) {
  process.env.NEXT_PUBLIC_BASE_API_URL = "http://localhost:3030";
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}
if (!process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID) {
  process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID = "test-dynamic-env-id";
}
if (!process.env.NEXT_PUBLIC_APP_MODE) {
  process.env.NEXT_PUBLIC_APP_MODE = "testnet";
}

// BigInt serialization for snapshots
expect.addSnapshotSerializer({
  test: (val) => typeof val === "bigint",
  serialize: (val) => `BigInt(${val})`,
});

// Mock react-hot-toast globally
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
}));

// Mock Next.js cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Setup DOM APIs for file upload testing
if (typeof global.URL.createObjectURL === "undefined") {
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
}
if (typeof global.URL.revokeObjectURL === "undefined") {
  global.URL.revokeObjectURL = vi.fn();
}
