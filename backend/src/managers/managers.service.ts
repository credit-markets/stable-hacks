import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CreateManagerDto, UpdateManagerDto, ManagerFilterDto } from './dto';
import { ManagerCrudService, ManagerPermissionService } from './services';
import { logError } from '../common/utils';
import type { ManagerRow } from './interfaces/manager-row.interface';

/**
 * Main orchestrator service for manager operations
 * Delegates to specialized services for specific functionality
 */
@Injectable()
export class ManagersService {
  private readonly logger = new Logger(ManagersService.name);

  constructor(
    private readonly managerCrudService: ManagerCrudService,
    private readonly managerPermissionService: ManagerPermissionService,
  ) {}

  async create(createManagerDto: CreateManagerDto, owner_address: string) {
    // Validate permissions
    await this.managerPermissionService.validateCreatePermission(owner_address);

    // Create the manager
    return this.managerCrudService.create(createManagerDto, owner_address);
  }

  async findByOwner(owner_address: string) {
    const manager = await this.managerCrudService.findByOwner(owner_address);

    if (!manager) {
      throw new NotFoundException(
        `Manager profile not found for address: ${owner_address}`,
      );
    }

    return manager;
  }

  async findById(id: string) {
    return this.managerCrudService.findById(id);
  }

  async findAll(
    filter: ManagerFilterDto,
  ): Promise<{ managers: ManagerRow[]; total: number }> {
    return this.managerCrudService.findAll(filter);
  }

  async update(
    id: string,
    updateManagerDto: UpdateManagerDto,
    authenticatedAddress: string,
  ) {
    // Check permissions
    await this.managerPermissionService.checkUpdatePermission(
      id,
      authenticatedAddress,
    );

    // Update the manager
    return this.managerCrudService.update(id, updateManagerDto);
  }

  async remove(id: string, authenticatedAddress: string) {
    // Check permissions
    await this.managerPermissionService.checkDeletePermission(
      id,
      authenticatedAddress,
    );

    // Delete the manager
    return this.managerCrudService.remove(id);
  }

  /**
   * Admin-only: register a new manager by wallet address
   */
  async registerByAdmin(walletAddress: string) {
    return this.managerCrudService.registerByAdmin(walletAddress);
  }

  /**
   * Admin-only: remove a manager by ID (skips ownership check)
   */
  async removeByAdmin(id: string) {
    return this.managerCrudService.remove(id);
  }

  /**
   * Find a manager by their user address
   */
  async findByUserAddress(owner_address: string) {
    this.logger.log(`Finding manager by user address: ${owner_address}`);

    try {
      return await this.managerCrudService.findByOwner(owner_address);
    } catch (error) {
      logError(this.logger, 'Error finding manager by user address', error, {
        owner_address,
      });
      return null;
    }
  }
}
