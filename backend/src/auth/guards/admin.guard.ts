import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);
  private readonly authorityAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.authorityAddress = this.configService.getOrThrow<string>('AUTHORITY');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const wallet = request.userCredentials?.address;

    if (!wallet) {
      throw new ForbiddenException('No wallet address in credentials');
    }

    if (wallet !== this.authorityAddress) {
      this.logger.warn('Unauthorized admin access attempt', {
        wallet,
        authorityAddress: this.authorityAddress,
      });
      throw new ForbiddenException('Not an admin');
    }

    return true;
  }
}
