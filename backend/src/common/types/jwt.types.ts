import { DynamicVerifiedCredential } from '../../types/dynamic-labs';

export interface JWTCredential {
  /** Wallet address — may be empty after middleware if JWT lacks credentials; JwtAuthGuard resolves via DB before guards run */
  address: string;
  sub?: string;
  email?: string;
  userId?: string;
  token?: string;
  verified_credentials?: DynamicVerifiedCredential[];
  verified_account?: {
    address: string;
  };
  iat?: number;
  exp?: number;
}
