import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HeliusWebhookController } from './helius-webhook.controller';
import { HeliusWebhookService } from './helius-webhook.service';

describe('HeliusWebhookController', () => {
  let controller: HeliusWebhookController;
  let service: HeliusWebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeliusWebhookController],
      providers: [
        {
          provide: HeliusWebhookService,
          useValue: { processTransaction: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    controller = module.get(HeliusWebhookController);
    service = module.get(HeliusWebhookService);
  });

  it('rejects invalid webhook secret', async () => {
    await expect(
      controller.handleWebhook([], 'Bearer wrong'),
    ).rejects.toThrow();
  });

  it('processes valid transactions', async () => {
    const result = await controller.handleWebhook(
      [{ signature: 'abc', timestamp: 0 }],
      'Bearer test-secret',
    );
    expect(result.received).toBe(1);

    expect(service.processTransaction).toHaveBeenCalledTimes(1);
  });
});
