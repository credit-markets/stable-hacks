import { Module } from '@nestjs/common';
import { KybController } from './kyb.controller';
import { KybCrudService } from './services/kyb-crud.service';
import { KybWorkflowService } from './services/kyb-workflow.service';
import { KybOnchainService } from './services/kyb-onchain.service';
import { KybOwnerGuard } from './guards/kyb-owner.guard';
import { SupabaseModule } from '../database/supabase.module';
import { CommonModule } from '../common/common.module';
import { SolanaModule } from '../blockchain/solana.module';

@Module({
  imports: [SupabaseModule, CommonModule, SolanaModule],
  controllers: [KybController],
  providers: [
    KybCrudService,
    KybWorkflowService,
    KybOnchainService,
    KybOwnerGuard,
  ],
  exports: [KybCrudService, KybWorkflowService],
})
export class KybModule {}
