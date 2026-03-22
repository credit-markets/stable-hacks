import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { logError } from '../common/utils';
import { PaginatedResult } from '../common/dto/query-filter.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { Database, Json } from '../database/database.types';
import * as crypto from 'crypto';

type ExecutionEventInsert =
  Database['public']['Tables']['execution_events']['Insert'];
type ExecutionEventRow =
  Database['public']['Tables']['execution_events']['Row'];

export interface ExecutionEvent {
  event_type: string;
  correlation_id: string;
  actor_id: string;
  actor_type:
    | 'investor'
    | 'manager'
    | 'admin'
    | 'system'
    | 'partner'
    | 'attester'
    | 'oracle';
  target_type: string;
  target_id: string;
  payload: Record<string, unknown>;
  chain_tx_id?: string;
  chain_confirmed?: boolean;
}

@Injectable()
export class ExecutionEventService {
  private readonly logger = new Logger(ExecutionEventService.name);

  constructor(private supabase: SupabaseService) {}

  async emit(event: ExecutionEvent): Promise<void> {
    const insertData: ExecutionEventInsert = {
      event_type: event.event_type,
      correlation_id: event.correlation_id || crypto.randomUUID(),
      actor_id: event.actor_id,
      actor_type: event.actor_type,
      target_type: event.target_type,
      target_id: event.target_id,
      payload: event.payload as unknown as Json,
      chain_tx_id: event.chain_tx_id,
      chain_confirmed: event.chain_confirmed,
    };

    const query = this.supabase.getClient().from('execution_events');
    const { error } = event.chain_tx_id
      ? await query.upsert(insertData, {
          onConflict: 'chain_tx_id',
          ignoreDuplicates: true,
        })
      : await query.insert(insertData);

    if (error) {
      logError(this.logger, 'Failed to emit execution event', error, {
        event_type: event.event_type,
        target_id: event.target_id,
      });
      throw error;
    }
  }

  async findByCorrelation(correlationId: string): Promise<ExecutionEventRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('execution_events')
      .select('*')
      .eq('correlation_id', correlationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async findByTarget(
    targetType: string,
    targetId: string,
  ): Promise<ExecutionEventRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('execution_events')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async findByEventType(
    eventType: string,
    targetId?: string,
  ): Promise<ExecutionEventRow[]> {
    let query = this.supabase
      .getClient()
      .from('execution_events')
      .select('*')
      .eq('event_type', eventType)
      .order('created_at', { ascending: false });

    if (targetId) {
      query = query.eq('target_id', targetId);
    }

    const { data, error } = await query;
    if (error) {
      logError(this.logger, 'Failed to query events by type', error, {
        eventType,
        targetId,
      });
      throw error;
    }
    return data ?? [];
  }

  async findResolutionsByCorrelationIds(
    correlationIds: string[],
    resolutionEventTypes: string[],
  ): Promise<Pick<ExecutionEventRow, 'correlation_id' | 'event_type'>[]> {
    if (correlationIds.length === 0) return [];

    const { data, error } = await this.supabase
      .getClient()
      .from('execution_events')
      .select('correlation_id, event_type')
      .in('correlation_id', correlationIds)
      .in('event_type', resolutionEventTypes);

    if (error) {
      logError(this.logger, 'Failed to query resolution events', error);
      throw error;
    }
    return data ?? [];
  }

  async confirmChainTx(eventId: string, chainTxId: string): Promise<void> {
    // We can't UPDATE execution_events (append-only trigger prevents it).
    // Instead, emit a confirmation event.
    await this.emit({
      event_type: 'chain.confirmed',
      correlation_id: eventId,
      actor_id: 'system',
      actor_type: 'system',
      target_type: 'execution_event',
      target_id: eventId,
      payload: { chain_tx_id: chainTxId },
      chain_tx_id: chainTxId,
      chain_confirmed: true,
    });
  }

  async findAllPaginated(
    dto: QueryEventsDto,
  ): Promise<PaginatedResult<ExecutionEventRow>> {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .getClient()
      .from('execution_events')
      .select('*', { count: 'exact' });

    if (dto.event_type) query = query.eq('event_type', dto.event_type);
    if (dto.actor_type) query = query.eq('actor_type', dto.actor_type);
    if (dto.date_from) query = query.gte('created_at', dto.date_from);
    if (dto.date_to) query = query.lte('created_at', dto.date_to);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logError(this.logger, 'Failed to query paginated events', error, {
        event_type: dto.event_type,
        actor_type: dto.actor_type,
        page,
        pageSize,
      });
      throw error;
    }
    return new PaginatedResult(data ?? [], count ?? 0, page, pageSize);
  }
}
