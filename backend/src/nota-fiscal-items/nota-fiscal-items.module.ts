import { Module } from '@nestjs/common';
import { NotaFiscalItemsController } from './nota-fiscal-items.controller';
import { NotaFiscalItemsService } from './nota-fiscal-items.service';
import { SupabaseModule } from '../database/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [NotaFiscalItemsController],
  providers: [NotaFiscalItemsService],
  exports: [NotaFiscalItemsService],
})
export class NotaFiscalItemsModule {}
