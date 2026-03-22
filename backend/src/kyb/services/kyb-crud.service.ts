import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { IStorageService } from '../../common/interfaces/storage.interface';
import { Database } from '../../database/database.types';

type KybDocumentCategory = Database['public']['Enums']['kyb_document_category'];
type KybStatus = Database['public']['Enums']['kyb_status'];
import { UpdateKybDto } from '../dto/update-kyb.dto';
import { AddUboDto } from '../dto/add-ubo.dto';
import { UpdateUboDto } from '../dto/update-ubo.dto';
import { AddWalletDto } from '../dto/add-wallet.dto';

@Injectable()
export class KybCrudService {
  private readonly logger = new Logger(KybCrudService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject('STORAGE_SERVICE')
    private readonly storageService: IStorageService,
  ) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  async getDocumentById(docId: string) {
    const { data, error } = await this.client
      .from('kyb_documents')
      .select('storage_path, file_name')
      .eq('id', docId)
      .single();
    if (error || !data) throw new NotFoundException('Document not found');
    return data;
  }

  // --- Submissions ---

  async createDraft(userId: string) {
    // Check for existing submission
    const { data: existing, error: existingError } = await this.client
      .from('kyb_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      this.logger.error('Failed to query KYB submission', existingError);
      throw new InternalServerErrorException('KYB lookup failed');
    }

    if (existing) {
      if (existing.status === 'draft')
        return this.getFullSubmission(existing.id);
      if (['submitted', 'under_review', 'approved'].includes(existing.status)) {
        throw new ConflictException(
          'You already have an active KYB submission',
        );
      }
    }

    const { data, error } = await this.client
      .from('kyb_submissions')
      .insert({ user_id: userId })
      .select()
      .single();

    // Handle race condition: unique partial index prevents duplicate active submissions
    if (error?.code === '23505') {
      throw new ConflictException('You already have an active KYB submission');
    }
    if (error) throw error;
    return this.getFullSubmission(data.id);
  }

  async getMySubmission(userId: string) {
    const { data, error } = await this.client
      .from('kyb_submissions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error('Failed to query KYB submission', error);
      throw new InternalServerErrorException('KYB lookup failed');
    }

    if (!data) return null;
    return this.getFullSubmission(data.id);
  }

  async getFullSubmission(submissionId: string) {
    const { data: submission, error } = await this.client
      .from('kyb_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (error || !submission)
      throw new NotFoundException('Submission not found');

    const [ubosResult, documentsResult, walletsResult] = await Promise.all([
      this.client
        .from('kyb_ubos')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at'),
      this.client
        .from('kyb_documents')
        .select('*')
        .eq('submission_id', submissionId)
        .order('uploaded_at'),
      this.client
        .from('kyb_wallet_declarations')
        .select('*')
        .eq('submission_id', submissionId)
        .order('declared_at'),
    ]);

    if (ubosResult.error || documentsResult.error || walletsResult.error) {
      const failedTable = ubosResult.error
        ? 'kyb_ubos'
        : documentsResult.error
          ? 'kyb_documents'
          : 'kyb_wallet_declarations';
      throw new InternalServerErrorException(
        `Failed to fetch ${failedTable} for submission ${submissionId}`,
      );
    }

    return {
      ...submission,
      attestation_confirmed: submission.attestation_tx !== null,
      ubos: ubosResult.data ?? [],
      documents: documentsResult.data ?? [],
      wallets: walletsResult.data ?? [],
    };
  }

  async updateSubmission(submissionId: string, dto: UpdateKybDto) {
    const { data, error } = await this.client
      .from('kyb_submissions')
      .update(dto)
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // --- UBOs ---

  async addUbo(submissionId: string, dto: AddUboDto) {
    const { data, error } = await this.client
      .from('kyb_ubos')
      .insert({
        submission_id: submissionId,
        full_name: dto.full_name ?? '',
        date_of_birth: dto.date_of_birth ?? '2000-01-01',
        nationality: dto.nationality ?? '',
        country_of_residence: dto.country_of_residence ?? '',
        role: dto.role,
        source_of_wealth: dto.source_of_wealth ?? '',
        ownership_percentage: dto.ownership_percentage ?? null,
        is_pep: dto.is_pep ?? false,
        pep_details: dto.pep_details ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateUbo(submissionId: string, uboId: string, dto: UpdateUboDto) {
    const { data, error } = await this.client
      .from('kyb_ubos')
      .update(dto)
      .eq('id', uboId)
      .eq('submission_id', submissionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteUbo(submissionId: string, uboId: string) {
    const { error } = await this.client
      .from('kyb_ubos')
      .delete()
      .eq('id', uboId)
      .eq('submission_id', submissionId);
    if (error) throw error;
  }

  // --- Wallets ---

  async addWallet(submissionId: string, dto: AddWalletDto) {
    const { data, error } = await this.client
      .from('kyb_wallet_declarations')
      .insert({ submission_id: submissionId, ...dto })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteWallet(submissionId: string, walletId: string) {
    const { error } = await this.client
      .from('kyb_wallet_declarations')
      .delete()
      .eq('id', walletId)
      .eq('submission_id', submissionId);
    if (error) throw error;
  }

  // --- Documents ---

  async addDocument(params: {
    submissionId: string;
    uboId?: string;
    category: string;
    fileName: string;
    storagePath: string;
    mimeType: string;
  }) {
    const { data, error } = await this.client
      .from('kyb_documents')
      .insert({
        submission_id: params.submissionId,
        ubo_id: params.uboId ?? null,
        category: params.category as KybDocumentCategory,
        file_name: params.fileName,
        storage_path: params.storagePath,
        mime_type: params.mimeType,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteDocument(submissionId: string, docId: string) {
    const { data, error: fetchError } = await this.client
      .from('kyb_documents')
      .select('storage_path')
      .eq('id', docId)
      .eq('submission_id', submissionId)
      .maybeSingle();

    if (fetchError) {
      this.logger.error('Failed to query KYB document', fetchError);
      throw new InternalServerErrorException('KYB document lookup failed');
    }

    if (data?.storage_path) {
      await this.storageService.deleteFile(data.storage_path);
    }

    const { error } = await this.client
      .from('kyb_documents')
      .delete()
      .eq('id', docId)
      .eq('submission_id', submissionId);
    if (error) throw error;
  }

  // --- Queue (attester) ---

  async getQueue(filters: {
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, page = 1, pageSize = 20 } = filters;
    let query = this.client
      .from('kyb_submissions')
      .select(
        'id, user_id, legal_name, trading_name, entity_type, jurisdiction, status, risk_score, risk_band, created_at, users!kyb_submissions_user_id_fkey(account)',
        { count: 'exact' },
      )
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status) {
      query = query.eq('status', status as KybStatus);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], total: count ?? 0, page, pageSize };
  }
}
