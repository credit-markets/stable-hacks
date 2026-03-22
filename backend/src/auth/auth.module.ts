import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { PoolManagerGuard } from './guards/pool-manager.guard';
import { AttesterGuard } from './guards/attester.guard';
import {
  AuthValidationService,
  JwksVerificationService,
  AuthGuardService,
} from './services';
import { JwtMiddleware } from './middleware/jwt.middleware';
import { AuthController } from './auth.controller';

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [AuthController],
  providers: [
    AuthValidationService,
    JwksVerificationService,
    JwtAuthGuard,
    AdminGuard,
    PoolManagerGuard,
    AttesterGuard,
    JwtMiddleware,
    AuthGuardService,
  ],
  exports: [
    JwtAuthGuard,
    AdminGuard,
    PoolManagerGuard,
    AttesterGuard,
    JwtMiddleware,
    JwksVerificationService,
    AuthGuardService,
  ],
})
export class AuthModule {}
