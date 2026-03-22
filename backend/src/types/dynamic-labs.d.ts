/**
 * Type definitions for Dynamic Labs SDK
 *
 * These types are based on actual Dynamic Labs API responses.
 * Dynamic Labs JWT payloads use snake_case for all fields.
 * The client-side SDK uses camelCase, but that's handled by the frontend.
 *
 * @see https://docs.dynamic.xyz/api-reference
 */

/**
 * Verified credential from Dynamic Labs (wallet/address information)
 *
 * Reliable fields:
 * - address: Always present when user has connected wallet
 * - chain: Usually present (e.g., "EVM", "ethereum")
 * - id: Unique identifier for this credential
 *
 * Unreliable/Optional fields:
 * - All name_service fields (not always populated)
 * - wallet_name and wallet_provider (depends on wallet type)
 * - embedded_wallet_id (only for embedded wallets)
 */
export interface DynamicVerifiedCredential {
  /**
   * Wallet address (lowercase normalized)
   * Required when credential is verified
   */
  address: string;

  /**
   * Blockchain chain identifier (e.g., "EVM", "ethereum", "polygon")
   */
  chain?: string;

  /**
   * Unique identifier for this verified credential
   */
  id?: string;

  /**
   * Name service information (ENS, etc.) - often null
   */
  name_service?: {
    avatar?: string;
    [key: string]: unknown;
  };

  /**
   * Wallet name (e.g., "MetaMask", "External Wallet", "Email")
   */
  wallet_name?: string;

  /**
   * Wallet provider (e.g., "browserExtension", "metamask", "dynamic")
   */
  wallet_provider?: string;

  /**
   * Format of the credential (usage varies)
   */
  format?: string;

  /**
   * ID of embedded wallet (only present for embedded wallets)
   */
  embedded_wallet_id?: string;

  /**
   * Additional fields that may be present in API responses
   */
  [key: string]: unknown;
}

/**
 * Dynamic Labs user object from API responses
 *
 * Reliable fields:
 * - userId: Always present (unique identifier)
 * - verified_credentials: Usually present (array of wallets)
 *
 * Unreliable/Optional fields:
 * - email: Only if user registered with email
 * - All profile fields (firstName, lastName, etc.) - user may not have filled them
 * - metadata: Completely dynamic structure
 */
export interface DynamicUser {
  /**
   * Unique user identifier from Dynamic
   * Also available as 'id' in some responses
   */
  userId?: string;
  id?: string; // Alternative field name

  /**
   * User's email address (if registered with email)
   */
  email?: string;

  /**
   * User's display alias/username
   */
  alias?: string;

  /**
   * User's first name
   */
  firstName?: string;

  /**
   * User's last name
   */
  lastName?: string;

  /**
   * User's job title
   */
  jobTitle?: string;

  /**
   * User's t-shirt size (for swag/events)
   */
  tShirtSize?: string;

  /**
   * User's team identifier
   */
  team?: string;

  /**
   * User's country
   */
  country?: string;

  /**
   * Array of verified wallet credentials (snake_case in JWT payloads)
   */
  verified_credentials?: DynamicVerifiedCredential[];

  /**
   * Timestamp of last activity
   */
  lastSeenAt?: string | Date;

  /**
   * List memberships
   */
  lists?: string[];

  /**
   * Custom metadata (completely dynamic structure)
   */
  metadata?: Record<string, unknown>;

  /**
   * Fields that are missing/not yet filled by user
   */
  missingFields?: string[];

  /**
   * Whether this is a newly created user
   */
  newUser?: boolean;

  /**
   * Dynamic environment/project identifier
   */
  projectEnvironmentId?: string;

  /**
   * Additional fields that may be present in API responses
   */
  [key: string]: unknown;
}

/**
 * Dynamic Labs API client methods
 *
 * These match the API endpoints used in the codebase:
 * - GET /users/:userId
 * - PATCH /users/:userId
 * - DELETE /users/:userId
 */
export interface DynamicApiClient {
  /**
   * Get user by ID
   * @param userId - Dynamic user ID
   * @returns User object or null if not found
   */
  getUser?(userId: string): Promise<DynamicUser | null>;

  /**
   * Update user information
   * @param userId - Dynamic user ID
   * @param updates - Partial user object with fields to update
   * @returns Updated user object
   */
  updateUser?(
    userId: string,
    updates: Partial<DynamicUser>,
  ): Promise<DynamicUser>;

  /**
   * Delete user
   * @param userId - Dynamic user ID
   * @returns Success indicator
   */
  deleteUser?(userId: string): Promise<boolean>;
}

/**
 * Dynamic Labs API response wrapper
 * Most API endpoints return data wrapped in this structure
 */
export interface DynamicApiResponse<T = unknown> {
  /**
   * Response data payload
   */
  data?: T;

  /**
   * User object (in responses that return user data)
   */
  user?: DynamicUser;

  /**
   * Status code
   */
  status?: number;

  /**
   * Success indicator
   */
  success?: boolean;

  /**
   * Error information (if request failed)
   */
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };

  /**
   * Error code at root level (alternative structure)
   */
  code?: string;

  /**
   * Additional fields that may be present
   */
  [key: string]: unknown;
}

/**
 * Dynamic Labs wallet creation response
 */
export interface DynamicWalletResponse {
  /**
   * Created wallet information
   */
  wallet?: DynamicVerifiedCredential;

  /**
   * Updated user object with new wallet
   */
  user?: DynamicUser;

  /**
   * Additional fields
   */
  [key: string]: unknown;
}

/**
 * Dynamic Labs embedded wallet creation request
 */
export interface DynamicEmbeddedWalletRequest {
  /**
   * Type of identifier (usually 'id' for user ID)
   */
  type?: string;

  /**
   * User identifier
   */
  identifier?: string;

  /**
   * Chain for wallet (e.g., 'EVM')
   */
  chain?: string;
}

/**
 * Dynamic Labs EOA wallet linking request
 */
export interface DynamicLinkWalletRequest {
  /**
   * Public wallet address to link
   */
  publicWalletAddress?: string;

  /**
   * Chain identifier
   */
  chain?: string;

  /**
   * Wallet name (e.g., 'MetaMask')
   */
  walletName?: string;

  /**
   * Wallet provider (e.g., 'browserExtension')
   */
  walletProvider?: string;
}

/**
 * Module augmentation for axios responses to include Dynamic types
 */
declare module 'axios' {
  export interface AxiosResponse<T = any> {
    data: T;
  }
}
