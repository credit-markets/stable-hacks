import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../database/supabase.module';
import { RiskAlertsService } from './risk-alerts.service';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [RiskController],
  providers: [RiskService, RiskAlertsService],
  exports: [RiskService, RiskAlertsService],
})
export class RiskModule {}
