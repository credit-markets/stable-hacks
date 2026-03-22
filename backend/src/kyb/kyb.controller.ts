import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Inject,
  Logger,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttesterGuard } from '../auth/guards/attester.guard';
import {
  AuthenticatedUser,
  ExtractedUserCredentials,
} from '../common/decorators/authenticated-user.decorator';
import { UserAuthService } from '../common/services/user-auth.service';
import { IStorageService } from '../common/interfaces/storage.interface';
import { FileUploadRateLimitGuard } from '../common/guards/file-upload-rate-limit.guard';
import { genericUploadOptions } from '../common/config/file-upload.config';
import { MulterFile } from '../common/types/multer.types';
import {
  validateFile,
  sanitizeFilename,
} from '../common/utils/file-validation.util';
import { performSecurityValidation } from '../common/utils/file-security.util';
import { KybCrudService } from './services/kyb-crud.service';
import { KybWorkflowService } from './services/kyb-workflow.service';
import { KybOnchainService } from './services/kyb-onchain.service';
import { KybOwnerGuard } from './guards/kyb-owner.guard';
import { UpdateKybDto } from './dto/update-kyb.dto';
import { AddUboDto } from './dto/add-ubo.dto';
import { UpdateUboDto } from './dto/update-ubo.dto';
import { AddWalletDto } from './dto/add-wallet.dto';
import { ReviewKybDto } from './dto/review-kyb.dto';
import { RejectKybDto } from './dto/reject-kyb.dto';
import { RequestResubmissionDto } from './dto/request-resubmission.dto';

@ApiTags('kyb')
@ApiBearerAuth('JWT-auth')
@Controller('kyb')
export class KybController {
  private readonly logger = new Logger(KybController.name);

  constructor(
    private readonly kybCrudService: KybCrudService,
    private readonly kybWorkflowService: KybWorkflowService,
    private readonly kybOnchainService: KybOnchainService,
    private readonly userAuthService: UserAuthService,
    @Inject('STORAGE_SERVICE')
    private readonly storageService: IStorageService,
  ) {}

  // ── Investor Endpoints ──────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create KYB draft submission' })
  @ApiResponse({
    status: 201,
    description: 'Draft created or existing returned',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createDraft(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    const user = await this.userAuthService.getAuthenticatedUser(account);
    return this.kybCrudService.createDraft(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my KYB submission' })
  @ApiResponse({ status: 200, description: 'Current submission or null' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getMySubmission(
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    const user = await this.userAuthService.getAuthenticatedUser(account);
    return this.kybCrudService.getMySubmission(user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, KybOwnerGuard)
  @ApiOperation({ summary: 'Update KYB submission (step-by-step save)' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiBody({ type: UpdateKybDto })
  @ApiResponse({ status: 200, description: 'Submission updated' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires KYB owner',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateSubmission(@Param('id') id: string, @Body() dto: UpdateKybDto) {
    await this.ensureEditable(id);
    return this.kybCrudService.updateSubmission(id, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, KybOwnerGuard)
  @ApiOperation({ summary: 'Submit KYB for review' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiResponse({ status: 200, description: 'Submission sent for review' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires KYB owner',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async submitForReview(@Param('id') id: string) {
    return this.kybWorkflowService.submitForReview(id);
  }

  // ── UBOs ────────────────────────────────────────────────────────

  @Post(':id/ubos')
  @UseGuards(JwtAuthGuard, KybOwnerGuard)
  @ApiOperation({ summary: 'Add UBO to submission' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiBody({ type: AddUboDto })
  @ApiResponse({ status: 201, description: 'UBO added' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires KYB owner',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async addUbo(@Param('id') id: string, @Body() dto: AddUboDto) {
    await this.ensureEditable(id);
    return this.kybCrudService.addUbo(id, dto);
  }

  @Patch(':id/ubos/:uboId')
  @UseGuards(JwtAuthGuard, KybOwnerGuard)
  @ApiOperation({ summary: 'Update UBO' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiParam({ name: 'uboId', description: 'UBO ID' })
  @ApiBody({ type: UpdateUboDto })
  @ApiResponse({ status: 200, description: 'UBO updated' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires KYB owner',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateUbo(
    @Param('id') id: string,
    @Param('uboId') uboId: string,
    @Body() dto: UpdateUboDto,
  ) {
    await this.ensureEditable(id);
    return this.kybCrudService.updateUbo(id, uboId, dto);
  }

  @Delete(':id/ubos/:uboId')
  @UseGuards(JwtAuthGuard, KybOwnerGuard)
  @ApiOperation({ summary: 'Delete UBO' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiParam({ name: 'uboId', description: 'UBO ID' })
  @ApiResponse({ status: 200, description: 'UBO deleted' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires KYB owner',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteUbo(@Param('id') id: string, @Param('uboId') uboId: string) {
    await this.ensureEditable(id);
    return this.kybCrudService.deleteUbo(id, uboId);
  }

  // ── Documents ───────────────────────────────────────────────────

  @Post(':id/documents')
  @UseGuards(JwtAuthGuard, KybOwnerGuard, FileUploadRateLimitGuard)
  @UseInterceptors(FileInterceptor('file', genericUploadOptions))
  @ApiOperation({ summary: 'Upload KYB document' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or category' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires KYB owner',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: MulterFile,
    @Body('category') category: string,
    @Body('ubo_id') uboId?: string,
  ) {
    await this.ensureEditable(id);

    // 0. Validate category against allowed enum values
    if (!KybController.VALID_DOCUMENT_CATEGORIES.includes(category)) {
      throw new BadRequestException(`Invalid document category: ${category}`);
    }

    // 1. Security validation
    performSecurityValidation(file);

    // 2. Validate file type (PDF/PNG/JPG, 10MB max)
    validateFile(file, {
      allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
      maxFileSize: 10 * 1024 * 1024,
    });

    // 3. Sanitize filename
    const safeName = sanitizeFilename(file.originalname);

    // 4. Upload to storage
    const storagePath = `kyb/${id}/${category}/${safeName}`;
    await this.storageService.uploadFile(
      storagePath,
      file.buffer,
      file.mimetype,
    );

    // 5. Record in DB
    return this.kybCrudService.addDocument({
      submissionId: id,
      uboId,
      category,
      fileName: file.originalname,
      storagePath,
      mimeType: file.mimetype,
    });
  }

  @Delete(':id/documents/:docId')
  @UseGuards(JwtAuthGuard, KybOwnerGuard)
  @ApiOperation({ summary: 'Delete KYB document' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiParam({ name: 'docId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires KYB owner',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteDocument(@Param('id') id: string, @Param('docId') docId: string) {
    await this.ensureEditable(id);
    return this.kybCrudService.deleteDocument(id, docId);
  }

  // ── Wallets ─────────────────────────────────────────────────────

  @Post(':id/wallets')
  @UseGuards(JwtAuthGuard, KybOwnerGuard)
  @ApiOperation({ summary: 'Add wallet declaration' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiBody({ type: AddWalletDto })
  @ApiResponse({ status: 201, description: 'Wallet declaration added' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires KYB owner',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async addWallet(@Param('id') id: string, @Body() dto: AddWalletDto) {
    await this.ensureEditable(id);
    return this.kybCrudService.addWallet(id, dto);
  }

  @Delete(':id/wallets/:walletId')
  @UseGuards(JwtAuthGuard, KybOwnerGuard)
  @ApiOperation({ summary: 'Delete wallet declaration' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiParam({ name: 'walletId', description: 'Wallet declaration ID' })
  @ApiResponse({ status: 200, description: 'Wallet declaration deleted' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires KYB owner',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteWallet(
    @Param('id') id: string,
    @Param('walletId') walletId: string,
  ) {
    await this.ensureEditable(id);
    return this.kybCrudService.deleteWallet(id, walletId);
  }

  // ── Attester Endpoints ──────────────────────────────────────────

  @Get('queue')
  @UseGuards(JwtAuthGuard, AttesterGuard)
  @ApiOperation({ summary: 'Get KYB submissions queue' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by KYB status' })
  @ApiQuery({ name: 'page', required: false, type: String, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, type: String, description: 'Page size' })
  @ApiResponse({ status: 200, description: 'Paginated queue' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires attester role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getQueue(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.kybCrudService.getQueue({
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id/review')
  @UseGuards(JwtAuthGuard, AttesterGuard)
  @ApiOperation({ summary: 'Get submission for review' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiResponse({ status: 200, description: 'Full submission data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires attester role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getReview(@Param('id') id: string) {
    return this.kybCrudService.getFullSubmission(id);
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, AttesterGuard)
  @ApiOperation({ summary: 'Update review (risk scoring, notes)' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiBody({ type: ReviewKybDto })
  @ApiResponse({ status: 200, description: 'Review updated' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires attester role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateReview(
    @Param('id') id: string,
    @Body() dto: ReviewKybDto,
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    const user = await this.userAuthService.getAuthenticatedUser(account);
    return this.kybWorkflowService.updateReview(id, dto, user.id);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, AttesterGuard)
  @ApiOperation({ summary: 'Approve submission and build attestation tx' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiResponse({
    status: 200,
    description: 'Approval + unsigned attestation tx',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires attester role',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - attestation PDA already exists',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async approve(
    @Param('id') id: string,
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    const user = await this.userAuthService.getAuthenticatedUser(account);
    const submission = await this.kybCrudService.getFullSubmission(id);

    // Check if attestation PDA already exists (create_attestation uses init)
    if (submission.wallets?.length > 0) {
      const investorWallet = submission.wallets[0].wallet_address;
      const exists = await this.kybOnchainService.checkAttestationExists(
        account,
        investorWallet,
      );
      if (exists) {
        throw new ConflictException(
          'Attestation PDA already exists for this investor. Cannot create duplicate.',
        );
      }
    }

    const approved = await this.kybWorkflowService.approve(id, user.id);

    // Build attestation tx if investor has wallet declarations
    if (approved.wallets?.length > 0) {
      const investorWallet = approved.wallets[0].wallet_address;
      const txData = await this.kybOnchainService.buildAttestationTx({
        attesterWallet: account,
        investorWallet,
        jurisdiction: approved.jurisdiction || 'XX',
      });
      return { submission: approved, ...txData, correlationId: id };
    }

    return { submission: approved };
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, AttesterGuard)
  @ApiOperation({ summary: 'Reject submission' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiBody({ type: RejectKybDto })
  @ApiResponse({ status: 200, description: 'Submission rejected' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires attester role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectKybDto,
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    const user = await this.userAuthService.getAuthenticatedUser(account);
    return this.kybWorkflowService.reject(id, dto.rejection_reason, user.id);
  }

  @Post(':id/request-resubmission')
  @UseGuards(JwtAuthGuard, AttesterGuard)
  @ApiOperation({ summary: 'Request resubmission with checklist' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiBody({ type: RequestResubmissionDto })
  @ApiResponse({ status: 200, description: 'Resubmission requested' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires attester role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async requestResubmission(
    @Param('id') id: string,
    @Body() dto: RequestResubmissionDto,
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    const user = await this.userAuthService.getAuthenticatedUser(account);
    return this.kybWorkflowService.requestResubmission(
      id,
      dto.resubmission_items,
      user.id,
    );
  }

  @Post(':id/revoke')
  @UseGuards(JwtAuthGuard, AttesterGuard)
  @ApiOperation({ summary: 'Revoke attestation and build revoke tx' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiResponse({ status: 200, description: 'Revocation + unsigned revoke tx' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires attester role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async revoke(
    @Param('id') id: string,
    @AuthenticatedUser() { account }: ExtractedUserCredentials,
  ) {
    const user = await this.userAuthService.getAuthenticatedUser(account);
    const revoked = await this.kybWorkflowService.revoke(id, user.id);

    // Build revoke tx if investor has wallet declarations
    if (revoked.wallets?.length > 0) {
      const investorWallet = revoked.wallets[0].wallet_address;
      const txData = await this.kybOnchainService.buildRevokeTx({
        attesterWallet: account,
        investorWallet,
      });
      return { submission: revoked, ...txData, correlationId: id };
    }

    return { submission: revoked };
  }

  @Patch(':id/attestation-tx')
  @UseGuards(JwtAuthGuard, AttesterGuard)
  @ApiOperation({ summary: 'Confirm attestation tx signature' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiBody({ schema: { type: 'object', properties: { attestation_tx: { type: 'string' } }, required: ['attestation_tx'] } })
  @ApiResponse({ status: 200, description: 'Attestation confirmed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires attester role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async confirmAttestation(
    @Param('id') id: string,
    @Body('attestation_tx') txSignature: string,
  ) {
    return this.kybWorkflowService.confirmAttestation(id, txSignature);
  }

  @Get(':id/documents/:docId/preview')
  @UseGuards(JwtAuthGuard, AttesterGuard)
  @ApiOperation({ summary: 'Get document preview URL (inline)' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiParam({ name: 'docId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Signed preview URL' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires attester role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getDocumentPreview(
    @Param('id') _id: string,
    @Param('docId') docId: string,
  ) {
    const doc = await this.getDocStoragePath(docId);
    const url = await this.storageService.getSignedUrl(doc.storage_path, 3600);
    return { url };
  }

  @Get(':id/documents/:docId/download')
  @UseGuards(JwtAuthGuard, AttesterGuard)
  @ApiOperation({ summary: 'Get document download URL' })
  @ApiParam({ name: 'id', description: 'KYB submission ID' })
  @ApiParam({ name: 'docId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Signed download URL' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires attester role',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getDocumentDownload(
    @Param('id') _id: string,
    @Param('docId') docId: string,
  ) {
    const doc = await this.getDocStoragePath(docId);
    const url = await this.storageService.getSignedUrl(doc.storage_path, 3600);
    return { url, fileName: doc.file_name };
  }

  private static readonly VALID_DOCUMENT_CATEGORIES = [
    'certificate_of_incorporation',
    'proof_of_address',
    'register_of_directors',
    'register_of_shareholders',
    'ubo_id_document',
    'financial_statements',
    'regulatory_license',
    'source_of_funds_evidence',
    'authority_evidence',
    'sanctions_screening_evidence',
    'wallet_screening_evidence',
    'other',
  ];

  // ── Private Helpers ─────────────────────────────────────────────

  private async ensureEditable(submissionId: string) {
    const submission =
      await this.kybCrudService.getFullSubmission(submissionId);
    if (!['draft', 'resubmission_requested'].includes(submission.status)) {
      throw new ForbiddenException(
        'Submission cannot be edited in current state',
      );
    }
  }

  private async getDocStoragePath(docId: string) {
    return this.kybCrudService.getDocumentById(docId);
  }
}
