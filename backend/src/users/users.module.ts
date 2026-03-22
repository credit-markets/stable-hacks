import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CommonModule } from '../common/common.module';
import { HttpModule } from '@nestjs/axios';
import { UserCrudService } from './services/user-crud.service';
import { UserDynamicService } from './services/user-dynamic.service';
import { UserKycService } from './services/user-kyc.service';
import { UserAggregations } from './aggregations/user.aggregations';

@Module({
  imports: [CommonModule, HttpModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserCrudService,
    UserDynamicService,
    UserKycService,
    UserAggregations,
  ],
  exports: [
    UsersService,
    UserCrudService,
    UserDynamicService,
    UserKycService,
    UserAggregations,
  ],
})
export class UsersModule {}
