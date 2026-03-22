import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { KybWorkflowService } from './kyb-workflow.service';
import { KybCrudService } from './kyb-crud.service';
import { SupabaseService } from '../../database/supabase.service';

/**
 * Helper: builds a mock Supabase client with chainable query builder.
 */
function createMockSupabaseClient() {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    from: jest.fn().mockReturnValue(queryBuilder),
    __queryBuilder: queryBuilder,
  };
}

describe('KybWorkflowService', () => {
  let service: KybWorkflowService;
  let kybCrudService: jest.Mocked<Pick<KybCrudService, 'getFullSubmission'>>;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    kybCrudService = {
      getFullSubmission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KybWorkflowService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockClient),
          },
        },
        {
          provide: KybCrudService,
          useValue: kybCrudService,
        },
      ],
    }).compile();

    service = module.get<KybWorkflowService>(KybWorkflowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── submitForReview ──────────────────────────────────────────────

  describe('submitForReview', () => {
    it('should throw ForbiddenException if submission is not in draft or resubmission_requested status', async () => {
      kybCrudService.getFullSubmission.mockResolvedValue({
        status: 'submitted',
      } as unknown as Awaited<ReturnType<KybCrudService['getFullSubmission']>>);

      await expect(service.submitForReview('sub-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for approved status', async () => {
      kybCrudService.getFullSubmission.mockResolvedValue({
        status: 'approved',
      } as unknown as Awaited<ReturnType<KybCrudService['getFullSubmission']>>);

      await expect(service.submitForReview('sub-1')).rejects.toThrow(
        'Submission cannot be submitted in current state',
      );
    });

    it('should throw BadRequestException if submission is incomplete (draft)', async () => {
      kybCrudService.getFullSubmission.mockResolvedValue({
        status: 'draft',
        // Missing required fields to trigger validateCompleteness
        entity_type: null,
        jurisdiction: null,
        is_regulated: null,
        legal_name: null,
        registration_number: null,
        date_of_incorporation: null,
        registered_address: null,
        business_activity: null,
        ubos: [],
        documents: [],
        wallets: [],
        source_of_funds: null,
        source_of_wealth: null,
        has_pep: null,
        has_rca: null,
        sanctions_declaration: null,
        adverse_media_declaration: null,
        authorized_signatory_declaration: null,
        accuracy_declaration: null,
        ongoing_reporting_declaration: null,
      } as unknown as Awaited<ReturnType<KybCrudService['getFullSubmission']>>);

      await expect(service.submitForReview('sub-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update status to submitted for a valid draft submission', async () => {
      const completeSubmission = {
        status: 'draft',
        entity_type: 'llc',
        jurisdiction: 'US',
        is_regulated: false,
        legal_name: 'Acme Corp',
        registration_number: 'REG-123',
        date_of_incorporation: '2020-01-01',
        registered_address: '123 Main St',
        business_activity: 'Lending',
        ubos: [
          {
            id: 'ubo-1',
            full_name: 'John Doe',
            role: 'Director',
            nationality: 'US',
          },
        ],
        documents: [
          { category: 'certificate_of_incorporation', ubo_id: null },
          { category: 'ubo_id_document', ubo_id: 'ubo-1' },
        ],
        wallets: [{ address: 'wallet-1' }],
        source_of_funds: 'Revenue',
        source_of_wealth: 'Business',
        has_pep: false,
        has_rca: false,
        sanctions_declaration: true,
        adverse_media_declaration: true,
        authorized_signatory_declaration: true,
        accuracy_declaration: true,
        ongoing_reporting_declaration: true,
      } as unknown as Awaited<ReturnType<KybCrudService['getFullSubmission']>>;

      kybCrudService.getFullSubmission.mockResolvedValue(completeSubmission);
      // Mock update to succeed
      mockClient.__queryBuilder.eq.mockReturnValue({
        ...mockClient.__queryBuilder,
        then: (resolve: (value: { error: null }) => void) =>
          resolve({ error: null }),
      });
      // For the final getFullSubmission call after update
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: null,
        error: null,
      });

      // Re-resolve the getFullSubmission on second call (after update)
      kybCrudService.getFullSubmission
        .mockResolvedValueOnce(completeSubmission)
        .mockResolvedValueOnce({
          ...completeSubmission,
          status: 'submitted',
        } as unknown as Awaited<
          ReturnType<KybCrudService['getFullSubmission']>
        >);

      const result = await service.submitForReview('sub-1');

      expect(mockClient.from).toHaveBeenCalledWith('kyb_submissions');
      expect(mockClient.__queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'submitted' }),
      );
      expect(result.status).toBe('submitted');
    });

    it('should clear resubmission_items when resubmitting from resubmission_requested', async () => {
      const submission = {
        status: 'resubmission_requested',
        entity_type: 'llc',
        jurisdiction: 'US',
        is_regulated: false,
        legal_name: 'Acme Corp',
        registration_number: 'REG-123',
        date_of_incorporation: '2020-01-01',
        registered_address: '123 Main St',
        business_activity: 'Lending',
        ubos: [
          {
            id: 'ubo-1',
            full_name: 'John Doe',
            role: 'Director',
            nationality: 'US',
          },
        ],
        documents: [
          { category: 'certificate_of_incorporation', ubo_id: null },
          { category: 'ubo_id_document', ubo_id: 'ubo-1' },
        ],
        wallets: [{ address: 'wallet-1' }],
        source_of_funds: 'Revenue',
        source_of_wealth: 'Business',
        has_pep: false,
        has_rca: false,
        sanctions_declaration: true,
        adverse_media_declaration: true,
        authorized_signatory_declaration: true,
        accuracy_declaration: true,
        ongoing_reporting_declaration: true,
      } as unknown as Awaited<ReturnType<KybCrudService['getFullSubmission']>>;

      kybCrudService.getFullSubmission
        .mockResolvedValueOnce(submission)
        .mockResolvedValueOnce({
          ...submission,
          status: 'submitted',
        } as unknown as Awaited<
          ReturnType<KybCrudService['getFullSubmission']>
        >);

      await service.submitForReview('sub-1');

      expect(mockClient.__queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'submitted',
          resubmission_items: null,
        }),
      );
    });
  });

  // ─── approve ──────────────────────────────────────────────────────

  describe('approve', () => {
    it('should throw ForbiddenException if submission is not under_review or submitted', async () => {
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: { status: 'draft', attestation_tx: null },
        error: null,
      });

      await expect(service.approve('sub-1', 'attester-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if submission is not found', async () => {
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(service.approve('sub-1', 'attester-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update reviewed_by and reviewed_at for under_review submissions', async () => {
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: { status: 'under_review', attestation_tx: null },
        error: null,
      });

      kybCrudService.getFullSubmission.mockResolvedValue({
        status: 'under_review',
      } as unknown as Awaited<ReturnType<KybCrudService['getFullSubmission']>>);

      await service.approve('sub-1', 'attester-1');

      expect(mockClient.__queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'under_review',
          reviewed_by: 'attester-1',
        }),
      );
    });
  });

  // ─── reject ───────────────────────────────────────────────────────

  describe('reject', () => {
    it('should throw ForbiddenException if submission is not under_review', async () => {
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: { status: 'submitted' },
        error: null,
      });

      await expect(
        service.reject('sub-1', 'Bad docs', 'attester-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if submission is not found', async () => {
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        service.reject('sub-1', 'Bad docs', 'attester-1'),
      ).rejects.toThrow('Cannot reject submission in current state');
    });

    it('should update status to rejected with reason for under_review submissions', async () => {
      mockClient.__queryBuilder.single.mockResolvedValue({
        data: { status: 'under_review' },
        error: null,
      });

      await service.reject('sub-1', 'Insufficient documentation', 'att-1');

      expect(mockClient.__queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
          rejection_reason: 'Insufficient documentation',
          reviewed_by: 'att-1',
        }),
      );
    });
  });

  // ─── confirmAttestation ───────────────────────────────────────────

  describe('confirmAttestation', () => {
    it('should update attestation_tx and status to approved', async () => {
      await service.confirmAttestation('sub-1', 'tx-sig-abc123');

      expect(mockClient.from).toHaveBeenCalledWith('kyb_submissions');
      expect(mockClient.__queryBuilder.update).toHaveBeenCalledWith({
        attestation_tx: 'tx-sig-abc123',
        status: 'approved',
      });
      expect(mockClient.__queryBuilder.eq).toHaveBeenCalledWith('id', 'sub-1');
    });
  });
});
