import { Module, Global } from '@nestjs/common';
import { SupabaseStorageService } from './services/supabase-storage.service';
import { LocalStorageService } from './services/local-storage.service';
import { UserQueryService } from './services/user-query.service';
import { UserAuthService } from './services/user-auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../database/supabase.module';

@Global()
@Module({
  imports: [ConfigModule, AuthModule, SupabaseModule],
  controllers: [],
  providers: [
    SupabaseStorageService,
    LocalStorageService,
    UserQueryService,
    UserAuthService,
    // Provide Supabase Storage as the storage service for all environments
    {
      provide: 'STORAGE_SERVICE',
      useFactory: (
        configService: ConfigService,
        supabaseStorageService: SupabaseStorageService,
        localService: LocalStorageService,
      ) => {
        const env = configService.get<string>('NODE_ENV');
        return env === 'production' ? supabaseStorageService : localService;
      },
      inject: [ConfigService, SupabaseStorageService, LocalStorageService],
    },
    {
      provide: 'USER_LOOKUP_SERVICE',
      useExisting: UserQueryService,
    },
  ],
  exports: [
    AuthModule,
    SupabaseStorageService,
    LocalStorageService,
    UserQueryService,
    UserAuthService,
    'STORAGE_SERVICE',
    'USER_LOOKUP_SERVICE',
  ],
})
export class CommonModule {}
