import { Global, Module } from '@nestjs/common';
import { SolanaService } from './solana.service';
import { HeliusWebhookController } from './helius-webhook.controller';
import { HeliusWebhookService } from './helius-webhook.service';
import { AuthModule } from '../auth/auth.module';
import { PoolOnChainService } from '../pools/services/pool-onchain.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [HeliusWebhookController],
  providers: [SolanaService, HeliusWebhookService, PoolOnChainService],
  exports: [SolanaService, HeliusWebhookService, PoolOnChainService],
})
export class SolanaModule {}
