import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JWTCredential } from '../types/jwt.types';

/**
 * Extracted user credentials from JWT
 */
export interface ExtractedUserCredentials {
  account: string;
  userCredentials: JWTCredential;
}

/**
 * Decorator to extract wallet account address from JWT credentials.
 *
 * Usage:
 * ```typescript
 * async someMethod(@AuthenticatedUser() { account }: ExtractedUserCredentials) {
 *   doSomething(account);
 * }
 * ```
 *
 * @throws UnauthorizedException if user credentials are invalid
 */
export const AuthenticatedUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ExtractedUserCredentials => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userCredentials: JWTCredential | undefined = request.userCredentials;

    if (!userCredentials) {
      throw new UnauthorizedException('No user credentials found');
    }

    const rawAccount: string | undefined =
      userCredentials.verified_credentials?.[0]?.address;
    if (!rawAccount) {
      throw new UnauthorizedException(
        'No authenticated address found in token',
      );
    }

    return {
      account: rawAccount,
      userCredentials,
    };
  },
);
