import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { SupabaseModule } from './database/supabase.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { PoolsModule } from './pools/pools.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { CommonModule } from './common/common.module';
import { SolanaModule } from './blockchain/solana.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ManagersModule } from './managers/managers.module';
import { JwtMiddleware } from './auth/middleware/jwt.middleware';
import { NotaFiscalItemsModule } from './nota-fiscal-items/nota-fiscal-items.module';
import { FileUploadsModule } from './file-uploads/file-uploads.module';
import { KybModule } from './kyb/kyb.module';
import { throttlerConfig } from './common/config/throttler.config';
import { HealthModule } from './health/health.module';
import { EventsModule } from './events/events.module';
import { RiskModule } from './risk/risk.module';

@Module({
  imports: [
    ConfigModule,
    SupabaseModule,
    EventsModule,
    RiskModule,
    ThrottlerModule.forRoot(throttlerConfig),
    UsersModule,
    EmailModule,
    AuthModule,
    PoolsModule,
    MarketplaceModule,
    CommonModule,
    SolanaModule,
    PortfolioModule,
    ManagersModule,
    NotaFiscalItemsModule,
    FileUploadsModule,
    KybModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtMiddleware)
      .exclude('auth/(.*)', 'users/public', 'marketplace/tvl')
      .forRoutes(
        'users/profile',
        'users/me',
        'marketplace/*',
        'portfolio/*',
        'managers/*',
        'kyb/*',
        'kyb',
      );
  }
}
