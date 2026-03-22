import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SupabaseService } from '../../database/supabase.service';
import { logError } from '../../common/utils';

@Injectable()
export class AttesterGuard implements CanActivate {
  private readonly logger = new Logger(AttesterGuard.name);
  private readonly authorityAddress: string;
  private readonly cache = new Map<
    string,
    { result: boolean; expiresAt: number }
  >();
  private static readonly CACHE_TTL_MS = 60_000;
  private static readonly MAX_CACHE_SIZE = 1_000;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.authorityAddress = this.configService.getOrThrow<string>('AUTHORITY');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const wallet = request.userCredentials?.address;

    if (!wallet) {
      throw new ForbiddenException('No wallet address in credentials');
    }

    // Check cache first
    const cached = this.cache.get(wallet);
    if (cached && Date.now() < cached.expiresAt) {
      if (!cached.result) {
        throw new ForbiddenException('Not an attester');
      }
      return true;
    }

    const supabase = this.supabaseService.getClient();
    const { data: attesterPools, error } = await supabase
      .from('pools')
      .select('id')
      .eq('attester_address', wallet)
      .limit(1);

    if (error) {
      logError(this.logger, 'Failed to query attester pools', error, {
        wallet,
      });
      throw new InternalServerErrorException(
        'Unable to verify attester status',
      );
    }

    const isAttester = !!attesterPools && attesterPools.length > 0;

    this.setCacheEntry(wallet, isAttester);

    if (!isAttester) {
      throw new ForbiddenException('Not an attester');
    }

    return true;
  }

  clearCacheForWallet(wallet: string): void {
    this.cache.delete(wallet);
  }

  private setCacheEntry(wallet: string, result: boolean): void {
    if (this.cache.size >= AttesterGuard.MAX_CACHE_SIZE) {
      const now = Date.now();
      for (const [key, val] of this.cache) {
        if (now > val.expiresAt) this.cache.delete(key);
      }
      if (this.cache.size >= AttesterGuard.MAX_CACHE_SIZE) {
        const entries = [...this.cache.entries()];
        entries
          .sort((a, b) => a[1].expiresAt - b[1].expiresAt)
          .slice(0, Math.floor(entries.length / 2))
          .forEach(([key]) => this.cache.delete(key));
      }
    }
    this.cache.set(wallet, {
      result,
      expiresAt: Date.now() + AttesterGuard.CACHE_TTL_MS,
    });
  }
}
