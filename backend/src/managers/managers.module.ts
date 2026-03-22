import { Module } from '@nestjs/common';
import { ManagersController } from './managers.controller';
import { ManagersService } from './managers.service';
import { CommonModule } from '../common/common.module';
import { ManagerCrudService, ManagerPermissionService } from './services';

@Module({
  imports: [CommonModule],
  controllers: [ManagersController],
  providers: [ManagersService, ManagerCrudService, ManagerPermissionService],
  exports: [ManagersService],
})
export class ManagersModule {}
