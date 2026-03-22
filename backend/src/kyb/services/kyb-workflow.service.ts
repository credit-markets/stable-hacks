import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { Database } from '../../database/database.types';
import { KybCrudService } from './kyb-crud.service';
import { ReviewKybDto } from '../dto/review-kyb.dto';

type KybSubmissionRow = Database['public']['Tables']['kyb_submissions']['Row'];
type KybUboRow = Database['public']['Tables']['kyb_ubos']['Row'];
type KybDocumentRow = Database['public']['Tables']['kyb_documents']['Row'];
type KybWalletRow =
  Database['public']['Tables']['kyb_wallet_declarations']['Row'];

interface FullKybSubmission extends KybSubmissionRow {
  attestation_confirmed: boolean;
  ubos: KybUboRow[];
  documents: KybDocumentRow[];
  wallets: KybWalletRow[];
}

@Injectable()
export class KybWorkflowService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly kybCrudService: KybCrudService,
  ) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  async submitForReview(submissionId: string) {
    const submission =
      await this.kybCrudService.getFullSubmission(submissionId);

    if (!['draft', 'resubmission_requested'].includes(submission.status)) {
      throw new ForbiddenException(
        'Submission cannot be submitted in current state',
      );
    }

    const missing = this.validateCompleteness(submission);
    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'Incomplete submission',
        missing,
      });
    }

    const updateData: Record<string, unknown> = { status: 'submitted' };
    if (submission.status === 'resubmission_requested') {
      updateData.resubmission_items = null;
    }

    const { error } = await this.client
      .from('kyb_submissions')
      .update(updateData)
      .eq('id', submissionId);
    if (error) throw error;

    return this.kybCrudService.getFullSubmission(submissionId);
  }

  async updateReview(
    submissionId: string,
    dto: ReviewKybDto,
    _attesterId: string,
  ) {
    const { data: submission } = await this.client
      .from('kyb_submissions')
      .select('status')
      .eq('id', submissionId)
      .single();

    if (
      !submission ||
      !['submitted', 'under_review'].includes(submission.status)
    ) {
      throw new ForbiddenException('Cannot review submission in current state');
    }

    const updateData: Record<string, unknown> = { ...dto };
    if (submission.status === 'submitted') {
      updateData.status = 'under_review';
    }

    const { error } = await this.client
      .from('kyb_submissions')
      .update(updateData)
      .eq('id', submissionId);
    if (error) throw error;
  }

  /**
   * Attester approves the submission and builds the attestation tx.
   * Status stays 'under_review' until the on-chain attestation is confirmed
   * via confirmAttestation() — only then does it move to 'approved'.
   */
  async approve(submissionId: string, attesterId: string) {
    const { data: submission } = await this.client
      .from('kyb_submissions')
      .select('status, attestation_tx')
      .eq('id', submissionId)
      .single();

    // Allow retry if under_review (attestation tx not yet confirmed)
    if (
      !submission ||
      (submission.status !== 'under_review' &&
        submission.status !== 'submitted')
    ) {
      throw new ForbiddenException(
        'Cannot approve submission in current state',
      );
    }

    // Record the attester's review but keep status as under_review
    // Status will move to 'approved' only when attestation tx is confirmed on-chain
    const { error } = await this.client
      .from('kyb_submissions')
      .update({
        status: 'under_review',
        reviewed_by: attesterId,
        reviewed_at: new Date().toISOString(),
        attestation_expires_at: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .eq('id', submissionId);
    if (error) throw error;

    return this.kybCrudService.getFullSubmission(submissionId);
  }

  async reject(submissionId: string, reason: string, attesterId: string) {
    const { data: submission } = await this.client
      .from('kyb_submissions')
      .select('status')
      .eq('id', submissionId)
      .single();

    if (!submission || submission.status !== 'under_review') {
      throw new ForbiddenException('Cannot reject submission in current state');
    }

    const { error } = await this.client
      .from('kyb_submissions')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: attesterId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);
    if (error) throw error;
  }

  async requestResubmission(
    submissionId: string,
    items: string[],
    attesterId: string,
  ) {
    const { data: submission } = await this.client
      .from('kyb_submissions')
      .select('status')
      .eq('id', submissionId)
      .single();

    if (!submission || submission.status !== 'under_review') {
      throw new ForbiddenException(
        'Cannot request resubmission in current state',
      );
    }

    const { error } = await this.client
      .from('kyb_submissions')
      .update({
        status: 'resubmission_requested',
        resubmission_items: items,
        reviewed_by: attesterId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);
    if (error) throw error;
  }

  async revoke(submissionId: string, attesterId: string) {
    const { data: submission } = await this.client
      .from('kyb_submissions')
      .select('status')
      .eq('id', submissionId)
      .single();

    if (!submission || submission.status !== 'approved') {
      throw new ForbiddenException('Cannot revoke submission in current state');
    }

    const { error } = await this.client
      .from('kyb_submissions')
      .update({
        status: 'revoked',
        reviewed_by: attesterId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);
    if (error) throw error;

    return this.kybCrudService.getFullSubmission(submissionId);
  }

  /**
   * Called when the attestation tx is confirmed on-chain (via webhook or manual confirm).
   * This is the only path to 'approved' — ensures on-chain state matches DB state.
   */
  async confirmAttestation(submissionId: string, txSignature: string) {
    const { error } = await this.client
      .from('kyb_submissions')
      .update({
        attestation_tx: txSignature,
        status: 'approved',
      })
      .eq('id', submissionId);
    if (error) throw error;
  }

  private validateCompleteness(submission: FullKybSubmission): string[] {
    const missing: string[] = [];

    // Step 1
    if (!submission.entity_type) missing.push('entity_type');
    if (!submission.jurisdiction) missing.push('jurisdiction');
    if (
      submission.is_regulated === null ||
      submission.is_regulated === undefined
    )
      missing.push('is_regulated');

    // Step 2A
    if (!submission.legal_name) missing.push('legal_name');
    if (!submission.registration_number) missing.push('registration_number');
    if (!submission.date_of_incorporation)
      missing.push('date_of_incorporation');
    if (!submission.registered_address) missing.push('registered_address');
    if (!submission.business_activity) missing.push('business_activity');

    // Step 2B
    if (submission.ubos.length === 0) {
      missing.push('At least 1 UBO required');
    } else {
      for (const ubo of submission.ubos) {
        if (!ubo.role || !ubo.full_name || !ubo.nationality) {
          missing.push(
            `UBO "${ubo.full_name || 'unnamed'}": role, full_name, and nationality required`,
          );
        }
      }
    }

    // Step 2C
    if (!submission.source_of_funds) missing.push('source_of_funds');
    if (!submission.source_of_wealth) missing.push('source_of_wealth');

    // Step 2D-2F
    if (submission.has_pep === null || submission.has_pep === undefined)
      missing.push('has_pep');
    if (submission.has_rca === null || submission.has_rca === undefined)
      missing.push('has_rca');
    if (!submission.sanctions_declaration)
      missing.push('sanctions_declaration');
    if (!submission.adverse_media_declaration)
      missing.push('adverse_media_declaration');

    // Documents
    const docCategories = submission.documents.map((d) => d.category);
    if (!docCategories.includes('certificate_of_incorporation')) {
      missing.push('Document: certificate_of_incorporation');
    }
    for (const ubo of submission.ubos) {
      const uboHasIdDoc = submission.documents.some(
        (d) => d.ubo_id === ubo.id && d.category === 'ubo_id_document',
      );
      if (!uboHasIdDoc) {
        missing.push(`Document: ubo_id_document for ${ubo.full_name}`);
      }
    }

    // Step 4
    if (!submission.authorized_signatory_declaration)
      missing.push('authorized_signatory_declaration');
    if (!submission.accuracy_declaration) missing.push('accuracy_declaration');
    if (!submission.ongoing_reporting_declaration)
      missing.push('ongoing_reporting_declaration');

    // Wallets
    if (submission.wallets.length === 0) {
      missing.push('At least 1 wallet declaration required');
    }

    return missing;
  }
}
