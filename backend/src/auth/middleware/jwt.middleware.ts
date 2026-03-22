import {
  Injectable,
  NestMiddleware,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwksVerificationService } from '../services/jwks-verification.service';
import { extractToken, logError } from '../../common/utils';
import { JWTCredential } from '../../common/types/jwt.types';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtMiddleware.name);

  constructor(
    private readonly jwksVerificationService: JwksVerificationService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      const tokenString = extractToken(req);

      if (!tokenString) {
        this.logger.warn('Authentication attempted without token', {
          path: req.path,
          method: req.method,
        });
        throw new UnauthorizedException('Missing auth token');
      }

      const decoded =
        await this.jwksVerificationService.verifyToken(tokenString);

      // Dynamic Labs JWT payload uses snake_case for all fields.
      // SDK v4+ JWTs may omit verified_credentials entirely —
      // JwtAuthGuard handles the DB fallback for wallet resolution.
      const verifiedCredentials = decoded.verified_credentials;
      const verifiedAccount = decoded.verified_account;

      const address =
        verifiedCredentials?.[0]?.address || verifiedAccount?.address;

      req.userCredentials = {
        ...decoded,
        address: address ?? '',
        verified_credentials: verifiedCredentials || [],
        verified_account: verifiedAccount,
        sub: decoded.sub,
        email: decoded.email,
      } as JWTCredential;
      req.token = tokenString;

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      logError(this.logger, 'Unexpected error in JWT middleware', error, {
        path: req.path,
      });

      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }
}
