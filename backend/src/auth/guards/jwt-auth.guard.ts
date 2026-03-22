import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { AuthGuardService } from '../services/auth-guard.service';
import { JwksVerificationService } from '../services/jwks-verification.service';
// Wallet type constants matching DB schema values
const WalletType = {
  EOA: 'EOA' as const,
  Email: 'Email' as const,
};
import { extractToken, logError } from '../../common/utils';
import {
  DEFAULT_CHAIN,
  WALLET_NAMES,
  WALLET_PROVIDERS,
} from '../../common/constants';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwksVerificationService: JwksVerificationService,
    private readonly reflector: Reflector,
    private readonly authGuardService: AuthGuardService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route is public, allow access
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      // Reuse middleware-verified payload when available (avoids double RSA verification)
      const payload = request.userCredentials?.sub
        ? request.userCredentials
        : await this.jwksVerificationService.verifyToken(token);

      // If verified_credentials are missing, fetch from database
      let verifiedCredentials = payload.verified_credentials;

      if (!verifiedCredentials || verifiedCredentials.length === 0) {
        const id = payload.sub;
        if (!id) {
          throw new UnauthorizedException('Missing user ID in token');
        }

        // 1. Try local DB (fast path for existing users)
        let authorizedCredentials =
          await this.authGuardService.findUserAuthorizedCredentials(id);

        // 2. Fallback: fetch from Dynamic API (for new users not yet in platform DB)
        if (!authorizedCredentials || authorizedCredentials.length === 0) {
          authorizedCredentials =
            await this.authGuardService.fetchCredentialsFromDynamic(id);
        }

        if (!authorizedCredentials || authorizedCredentials.length === 0) {
          throw new UnauthorizedException('Missing verified credentials');
        }

        // Map Authorized[] to the expected JWT credential format
        verifiedCredentials = authorizedCredentials.map((auth) => ({
          address: auth.address,
          chain: DEFAULT_CHAIN,
          id: auth.id,
          wallet_name:
            auth.type === WalletType.EOA
              ? WALLET_NAMES.EOA
              : WALLET_NAMES.EMAIL,
          wallet_provider:
            auth.type === WalletType.EOA
              ? WALLET_PROVIDERS.EOA
              : WALLET_PROVIDERS.EMAIL,
        })) as typeof verifiedCredentials;
      }

      // Extract address from verified credentials or verified account (after fallback)
      const address =
        verifiedCredentials?.[0]?.address || payload.verified_account?.address;

      if (!address) {
        throw new UnauthorizedException(
          'Authentication token missing wallet address',
        );
      }

      // Attach the user credentials to the request object
      request.userCredentials = {
        ...payload,
        address,
        verified_credentials: verifiedCredentials,
        sub: payload.sub,
        email: payload.email,
      };

      request.token = token;
      return true;
    } catch (error) {
      // Re-throw authentication errors (401)
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Infrastructure errors should be logged and thrown as 500
      logError(this.logger, 'JwtAuthGuard infrastructure failure', error, {
        userId: request.userCredentials?.sub,
      });

      throw new InternalServerErrorException(
        'Authentication service temporarily unavailable',
      );
    }
  }
}
