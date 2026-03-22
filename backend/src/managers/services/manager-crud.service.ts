import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateManagerDto, UpdateManagerDto, ManagerFilterDto } from '../dto';
import { sanitizeSearchTerm } from '../../common/utils/search-sanitize.util';
import type {
  ManagerRow,
  ManagerUpdate,
} from '../interfaces/manager-row.interface';

@Injectable()
export class ManagerCrudService {
  private readonly logger = new Logger(ManagerCrudService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async create(createManagerDto: CreateManagerDto, owner_address: string) {
    this.logger.log(`Creating manager profile for address: ${owner_address}`);

    const client = this.supabase.getClient();

    // Create the actor first
    const { data: actor, error: actorError } = await client
      .from('actors')
      .insert({
        name: createManagerDto.company_name,
        type: 'company',
        wallet_address: owner_address,
      })
      .select()
      .single();

    if (actorError) {
      this.logger.error('Failed to create actor', actorError);
      throw new InternalServerErrorException('Failed to create actor');
    }

    // Create the manager
    const { data: manager, error } = await client
      .from('managers')
      .insert({
        actor_id: actor.id,
        company_name: createManagerDto.company_name,
        overview: createManagerDto.overview,
        logo_path: createManagerDto.logo_path,
        website: createManagerDto.website,
        owner_address: owner_address,
      })
      .select()
      .single();

    if (error) {
      // Clean up orphaned actor
      const { error: cleanupError } = await client
        .from('actors')
        .delete()
        .eq('id', actor.id);
      if (cleanupError) {
        this.logger.error(
          `Failed to clean up orphaned actor ${actor.id}`,
          cleanupError,
        );
      }
      this.logger.error('Failed to create manager, rolled back actor', error);
      throw new InternalServerErrorException('Failed to create manager');
    }

    return manager;
  }

  async findById(id: string) {
    this.logger.log(`Finding manager profile by ID: ${id}`);

    const client = this.supabase.getClient();
    const { data: manager, error } = await client
      .from('managers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !manager) {
      throw new NotFoundException(`Manager profile not found with id: ${id}`);
    }

    return manager;
  }

  async findByOwner(owner_address: string) {
    this.logger.log(`Finding manager profile for owner: ${owner_address}`);

    const client = this.supabase.getClient();
    const { data: manager, error } = await client
      .from('managers')
      .select('*')
      .eq('owner_address', owner_address)
      .maybeSingle();

    if (error) {
      this.logger.error('Failed to find manager by owner', error);
      throw new InternalServerErrorException('Failed to find manager by owner');
    }

    return manager;
  }

  async existsByOwner(owner_address: string): Promise<boolean> {
    const client = this.supabase.getClient();
    const { count, error } = await client
      .from('managers')
      .select('*', { count: 'exact', head: true })
      .eq('owner_address', owner_address);

    if (error) {
      this.logger.error('Failed to check manager existence', error);
      throw new InternalServerErrorException(
        'Failed to check manager existence',
      );
    }

    return (count ?? 0) > 0;
  }

  async findAll(
    filter: ManagerFilterDto,
  ): Promise<{ managers: ManagerRow[]; total: number }> {
    this.logger.log('Fetching manager profiles with pagination');

    const {
      page = 1,
      pageSize = 10,
      search,
      owner_address,
      sortBy = 'created_at',
      sortOrder = 'descending',
    } = filter;

    const client = this.supabase.getClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Map camelCase sortBy to snake_case column names
    const sortByMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      company_name: 'company_name',
      created_at: 'created_at',
      updated_at: 'updated_at',
    };
    const sortColumn = sortByMap[sortBy] || 'created_at';

    let query = client.from('managers').select('*', { count: 'exact' });

    if (search) {
      const safeSearch = sanitizeSearchTerm(search);
      query = query.ilike('company_name', `%${safeSearch}%`);
    }

    if (owner_address) {
      query = query.eq('owner_address', owner_address);
    }

    const {
      data: managers,
      count,
      error,
    } = await query
      .order(sortColumn, { ascending: sortOrder === 'ascending' })
      .range(from, to);

    if (error) {
      this.logger.error('Failed to fetch managers', error);
      throw new InternalServerErrorException('Failed to fetch managers');
    }

    return { managers: managers || [], total: count ?? 0 };
  }

  async update(id: string, updateManagerDto: UpdateManagerDto) {
    this.logger.log(`Updating manager profile with ID: ${id}`);

    const client = this.supabase.getClient();

    // Map camelCase DTO fields to snake_case columns
    const updateData: ManagerUpdate = {};
    if (updateManagerDto.company_name !== undefined)
      updateData.company_name = updateManagerDto.company_name;
    if (updateManagerDto.overview !== undefined)
      updateData.overview = updateManagerDto.overview;
    if (updateManagerDto.logo_path !== undefined)
      updateData.logo_path = updateManagerDto.logo_path;
    if (updateManagerDto.website !== undefined)
      updateData.website = updateManagerDto.website;

    const { data: updatedManager, error } = await client
      .from('managers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedManager) {
      throw new NotFoundException(`Manager profile not found with id: ${id}`);
    }

    return updatedManager;
  }

  async remove(id: string) {
    this.logger.log(`Removing manager profile with ID: ${id}`);

    const client = this.supabase.getClient();

    // Fetch manager first to return it after deletion
    const manager = await this.findById(id);

    const { error } = await client.from('managers').delete().eq('id', id);

    if (error) {
      throw new NotFoundException(`Manager profile not found with id: ${id}`);
    }

    return manager;
  }

  async registerByAdmin(walletAddress: string) {
    this.logger.log(`Admin registering manager for wallet: ${walletAddress}`);

    const client = this.supabase.getClient();
    const normalizedWallet = walletAddress;

    // 1. Create actor record
    const { data: actor, error: actorError } = await client
      .from('actors')
      .insert({
        name: normalizedWallet,
        type: 'company',
        wallet_address: normalizedWallet,
      })
      .select()
      .single();

    if (actorError) {
      this.logger.error(
        'Failed to create actor for admin registration',
        actorError,
      );
      throw new InternalServerErrorException('Failed to create actor');
    }

    // 2. Create manager record
    const { data: manager, error: managerError } = await client
      .from('managers')
      .insert({
        actor_id: actor.id,
        owner_address: normalizedWallet,
        company_name: normalizedWallet,
      })
      .select()
      .single();

    if (managerError) {
      // Clean up orphaned actor
      const { error: cleanupError } = await client
        .from('actors')
        .delete()
        .eq('id', actor.id);
      if (cleanupError) {
        this.logger.error(
          `Failed to clean up orphaned actor ${actor.id}`,
          cleanupError,
        );
      }
      this.logger.error(
        'Failed to create manager for admin registration',
        managerError,
      );
      throw new InternalServerErrorException('Failed to create manager');
    }

    return manager;
  }

  async updateImagePath(
    managerId: string,
    field: 'logo_path',
    imagePath: string,
  ) {
    const client = this.supabase.getClient();
    const updatePayload: ManagerUpdate = { [field]: imagePath };
    const { data: manager, error } = await client
      .from('managers')
      .update(updatePayload)
      .eq('id', managerId)
      .select()
      .single();

    if (error || !manager) {
      throw new NotFoundException(
        `Manager profile not found with id: ${managerId}`,
      );
    }

    return manager;
  }
}
