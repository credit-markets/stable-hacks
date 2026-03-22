import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ManagerCrudService } from './manager-crud.service';
import type { ManagerRow } from '../interfaces/manager-row.interface';

@Injectable()
export class ManagerPermissionService {
  private readonly logger = new Logger(ManagerPermissionService.name);

  constructor(private readonly managerCrudService: ManagerCrudService) {}

  async validateCreatePermission(owner_address: string): Promise<void> {
    const existingManager =
      await this.managerCrudService.existsByOwner(owner_address);

    if (existingManager) {
      throw new UnauthorizedException(
        'A manager profile already exists for this address',
      );
    }
  }

  validateOwnership(manager: ManagerRow, authenticatedAddress: string): void {
    if (manager.owner_address !== authenticatedAddress) {
      throw new UnauthorizedException(
        'You are not authorized to perform this action on this manager profile',
      );
    }
  }

  async checkUpdatePermission(id: string, authenticatedAddress: string) {
    const manager = await this.managerCrudService.findById(id);
    this.validateOwnership(manager, authenticatedAddress);
    return manager;
  }

  async checkDeletePermission(id: string, authenticatedAddress: string) {
    const manager = await this.managerCrudService.findById(id);
    this.validateOwnership(manager, authenticatedAddress);
    return manager;
  }
}
