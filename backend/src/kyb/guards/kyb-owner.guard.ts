import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { UserAuthService } from '../../common/services/user-auth.service';

@Injectable()
export class KybOwnerGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly userAuthService: UserAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params?: { id?: string };
      userCredentials?: {
        verified_credentials?: Array<{ address?: string }>;
      };
    }>();
    const submissionId = request.params?.id;
    const account = request.userCredentials?.verified_credentials?.[0]?.address;

    if (!account || !submissionId) {
      throw new ForbiddenException('Missing credentials or submission ID');
    }

    const user = await this.userAuthService.findByAuthorizedAddress(account);
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('kyb_submissions')
      .select('user_id')
      .eq('id', submissionId)
      .single();

    if (error || !data) {
      throw new ForbiddenException('Submission not found');
    }

    if (data.user_id !== user.id) {
      throw new ForbiddenException('You do not own this submission');
    }

    return true;
  }
}
