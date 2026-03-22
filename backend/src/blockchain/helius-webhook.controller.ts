import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import {
  HeliusWebhookService,
  HeliusTransaction,
} from './helius-webhook.service';

@ApiTags('webhooks')
@Controller('webhooks/helius')
export class HeliusWebhookController {
  private readonly logger = new Logger(HeliusWebhookController.name);

  constructor(
    private heliusService: HeliusWebhookService,
    private configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Helius on-chain transaction webhooks' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid webhook secret',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleWebhook(
    @Body() body: HeliusTransaction[],
    @Headers('authorization') authHeader: string,
  ) {
    const secret = this.configService.getOrThrow<string>(
      'HELIUS_WEBHOOK_SECRET',
    );
    const expected = Buffer.from(`Bearer ${secret}`);
    const received = Buffer.from(authHeader || '');
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    this.logger.log(`Received ${body.length} Helius transaction(s)`);

    for (const tx of body) {
      await this.heliusService.processTransaction(tx);
    }

    return { received: body.length };
  }
}
