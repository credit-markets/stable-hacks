import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { SupabaseService } from '../../database/supabase.service';
import { UserAuthService } from '../../common/services/user-auth.service';
import { logError } from '../../common/utils';

export interface AuthorizedCredential {
  id: string;
  address: string;
  type: string;
  email?: string;
}

const DYNAMIC_CACHE_TTL_MS = 60 * 1000; // 1 minute

@Injectable()
export class AuthGuardService {
  private readonly logger = new Logger(AuthGuardService.name);
  private readonly dynamicApi: string;
  private readonly dynamicEnvId: string;
  private readonly dynamicToken: string;
  private readonly dynamicCache = new Map<
    string,
    { credentials: AuthorizedCredential[]; expiresAt: number }
  >();

  constructor(
    private readonly userAuthService: UserAuthService,
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.dynamicApi = this.configService.getOrThrow<string>('DYNAMIC_API');
    this.dynamicEnvId = this.configService.getOrThrow<string>(
      'DYNAMIC_ENVIRONMENT_ID',
    );
    this.dynamicToken = this.configService.getOrThrow<string>('DYNAMIC_TOKEN');
  }

  /**
   * Find user by Dynamic ID and return their credential.
   * Queries `users` table directly (no user_wallets).
   */
  async findUserAuthorizedCredentials(
    id: string,
  ): Promise<AuthorizedCredential[] | null> {
    const user = await this.userAuthService.findByAuthorizedId(id);
    if (!user || !user.provider_id) return null;

    return [
      {
        id: user.provider_id,
        address: user.account,
        type: 'EOA',
      },
    ];
  }

  /**
   * Fallback: fetch wallet addresses from Dynamic Labs API when user
   * is not yet registered in the platform DB.
   */
  async fetchCredentialsFromDynamic(
    userId: string,
  ): Promise<AuthorizedCredential[] | null> {
    if (!this.dynamicApi || !this.dynamicEnvId || !this.dynamicToken) {
      this.logger.warn(
        'Dynamic API not configured — cannot resolve credentials',
      );
      return null;
    }

    const cached = this.dynamicCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.credentials;
    }
    this.dynamicCache.delete(userId);

    try {
      const url = `${this.dynamicApi}/environments/${this.dynamicEnvId}/users/${userId}/wallets`;
      const response = await firstValueFrom(
        this.httpService
          .get<{
            wallets: Array<{
              id?: string;
              address?: string;
              publicKey?: string;
              chain?: string;
            }>;
          }>(url, {
            headers: {
              Authorization: `Bearer ${this.dynamicToken}`,
            },
            timeout: 5000,
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.warn(
                `Dynamic API returned ${error.response?.status ?? 'network error'} for user ${userId}`,
              );
              throw error;
            }),
          ),
      );

      const wallets = response.data?.wallets ?? [];
      if (wallets.length === 0) return null;

      const credentials = wallets
        .filter((w) => !!(w.address || w.publicKey))
        .map((w) => ({
          id: w.id ?? userId,
          address: (w.address || w.publicKey)!,
          type: 'EOA',
        }));

      if (credentials.length > 0) {
        this.dynamicCache.set(userId, {
          credentials,
          expiresAt: Date.now() + DYNAMIC_CACHE_TTL_MS,
        });
      }

      return credentials;
    } catch (error) {
      logError(
        this.logger,
        `Failed to fetch credentials from Dynamic API for user ${userId}`,
        error,
      );
      return null;
    }
  }
}
