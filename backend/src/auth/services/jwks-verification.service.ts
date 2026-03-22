import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

// Dynamic Labs JWT payload uses snake_case for all fields
interface VerifiedCredential {
  address: string;
  chain?: string;
  id?: string;
  wallet_name?: string;
  wallet_provider?: string;
  [key: string]: unknown;
}

export interface VerifiedJwtPayload {
  sub: string;
  email?: string;
  verified_credentials?: VerifiedCredential[];
  verified_account?: {
    address: string;
  };
  scope?: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
}

@Injectable()
export class JwksVerificationService {
  private readonly logger = new Logger(JwksVerificationService.name);
  private jwksClient: JwksClient;

  constructor(private configService: ConfigService) {
    const dynamicEnvId = this.configService.get<string>(
      'DYNAMIC_ENVIRONMENT_ID',
    );

    if (!dynamicEnvId) {
      this.logger.error('DYNAMIC_ENVIRONMENT_ID not configured');
      throw new Error(
        'DYNAMIC_ENVIRONMENT_ID is required for JWKS verification',
      );
    }

    const jwksUri = `https://app.dynamic.xyz/api/v0/sdk/${dynamicEnvId}/.well-known/jwks`;
    this.logger.log(`Initializing JWKS client with URI: ${jwksUri}`);

    this.jwksClient = new JwksClient({
      jwksUri,
      rateLimit: true,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    });
  }

  async verifyToken(token: string): Promise<VerifiedJwtPayload> {
    try {
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Invalid token format');
      }

      const kid = decoded.header.kid;
      if (!kid || typeof kid !== 'string') {
        this.logger.error('JWT header missing or invalid kid', {
          kid,
          algorithm: decoded.header.alg,
        });
        throw new UnauthorizedException(
          'Invalid token: missing key identifier',
        );
      }

      this.logger.debug('Fetching signing key', { kid });
      const signingKey = await this.jwksClient.getSigningKey(kid);
      const publicKey = signingKey.getPublicKey();

      const verified = jwt.verify(token, publicKey, {
        ignoreExpiration: false,
        algorithms: ['RS256'],
      });

      if (typeof verified === 'string') {
        throw new UnauthorizedException('Invalid token format');
      }

      // Check Dynamic Labs scope claim (space-delimited string)
      const payload = verified;
      const scope = typeof payload.scope === 'string' ? payload.scope : '';
      if (scope.split(' ').includes('requiresAdditionalAuth')) {
        throw new UnauthorizedException('MFA required');
      }

      return verified as VerifiedJwtPayload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (
        error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.TokenExpiredError
      ) {
        this.logger.warn('JWT verification failed', {
          errorType: error.constructor.name,
          errorMessage: error.message,
        });
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Type guard for unknown error
      const errorInfo =
        error instanceof Error
          ? {
              errorType: error.constructor.name,
              errorMessage: error.message,
              stack: error.stack,
            }
          : {
              errorType: 'Unknown',
              errorMessage: 'Unknown error',
              stack: undefined,
            };

      this.logger.error('JWKS verification infrastructure failure', errorInfo);

      throw new InternalServerErrorException(
        'Authentication service temporarily unavailable',
      );
    }
  }
}
