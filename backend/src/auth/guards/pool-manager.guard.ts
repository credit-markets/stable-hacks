import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../../database/supabase.service';

@Injectable()
export class PoolManagerGuard implements CanActivate {
  private readonly logger = new Logger(PoolManagerGuard.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const wallet = request.userCredentials?.address;

    if (!wallet) {
      throw new ForbiddenException('No wallet address in credentials');
    }

    const poolId = request.params.id || request.params.poolId;
    if (!poolId) {
      throw new BadRequestException(
        'Pool ID required in route params (:id or :poolId)',
      );
    }

    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(poolId)) {
      throw new ForbiddenException('Invalid pool ID');
    }

    const supabase = this.supabaseService.getClient();
    const { data: pool, error } = await supabase
      .from('pools')
      .select('manager_address')
      .eq('id', poolId)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('Database error during pool manager check', {
        poolId,
        error: error.message,
      });
      throw new InternalServerErrorException('Unable to verify pool access');
    }
    if (!pool) {
      this.logger.warn(`Pool ${poolId} not found for manager check`);
      throw new ForbiddenException('Pool not found or access denied');
    }

    if (pool.manager_address !== wallet) {
      throw new ForbiddenException('Not the manager of this pool');
    }

    return true;
  }
}
