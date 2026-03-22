import { vi } from "vitest";

/**
 * Default mock Dynamic context with commonly used values.
 * Includes a primary wallet, user, and verified credentials.
 */
export const mockDynamicContext: any = {
  user: {
    userId: "test-user-123",
    email: "test@example.com",
    verifiedCredentials: [],
  },
  primaryWallet: {
    address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
    connector: {
      name: "Phantom",
    },
  },
  handleLogOut: vi.fn(),
};

/**
 * Creates a mock Dynamic context with custom overrides.
 * Useful for testing different authentication states.
 *
 * @param overrides - Partial context values to override defaults
 * @returns A complete mock Dynamic context
 *
 * @example
 * // Create context without wallet
 * const context = createMockDynamicContext({ primaryWallet: null });
 *
 * @example
 * // Create context with embedded wallet
 * const context = createMockDynamicContext({
 *   primaryWallet: {
 *     address: '0xabc...',
 *     connector: { name: 'EmbeddedWallet' }
 *   }
 * });
 */
export function createMockDynamicContext(overrides: any = {}): any {
  return {
    ...mockDynamicContext,
    ...overrides,
  };
}

/**
 * Sets up all Dynamic Labs mocks for testing.
 * Should be called in beforeEach or at the start of test suites using Dynamic.
 *
 * @example
 * beforeEach(() => {
 *   setupDynamicMocks();
 * });
 */
export function setupDynamicMocks(): void {
  vi.mock("@dynamic-labs/sdk-react-core", () => ({
    useDynamicContext: vi.fn(() => mockDynamicContext),
  }));
}
