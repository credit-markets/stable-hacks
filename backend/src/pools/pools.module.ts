import { Module } from '@nestjs/common';
import { PoolsService } from './pools.service';
import { PoolCrudService } from './services/pool-crud.service';
import { PoolDeploymentService } from './services/pool-deployment.service';
import { PoolOnChainService } from './services/pool-onchain.service';
import { PoolsController } from './pools.controller';
import { CommonModule } from '../common/common.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';
import { ManagersModule } from '../managers/managers.module';
import { AuthModule } from '../auth/auth.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [
    CommonModule,
    ConfigModule,
    UsersModule,
    ManagersModule,
    AuthModule,
    RiskModule,
  ],
  providers: [
    PoolsService,
    PoolCrudService,
    PoolDeploymentService,
    PoolOnChainService,
  ],
  controllers: [PoolsController],
  exports: [
    PoolsService,
    PoolCrudService,
    PoolDeploymentService,
    PoolOnChainService,
  ],
})
export class PoolsModule {}
