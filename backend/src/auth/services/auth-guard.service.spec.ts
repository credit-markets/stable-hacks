import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AuthGuardService, AuthorizedCredential } from './auth-guard.service';
import { SupabaseService } from '../../database/supabase.service';
import { UserAuthService } from '../../common/services/user-auth.service';

describe('AuthGuardService', () => {
  let service: AuthGuardService;
  let userAuthService: jest.Mocked<UserAuthService>;
  let httpService: jest.Mocked<HttpService>;

  const mockDynamicApi = 'https://app.dynamic.xyz/api/v0';
  const mockDynamicEnvId = 'test-env-id-123';
  const mockDynamicToken = 'test-dynamic-token';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuardService,
        {
          provide: UserAuthService,
          useValue: {
            findByAuthorizedId: jest.fn(),
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, string> = {
                DYNAMIC_API: mockDynamicApi,
                DYNAMIC_ENVIRONMENT_ID: mockDynamicEnvId,
                DYNAMIC_TOKEN: mockDynamicToken,
              };
              return config[key];
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthGuardService>(AuthGuardService);
    userAuthService = module.get(UserAuthService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findUserAuthorizedCredentials', () => {
    it('should return credentials when user found by provider_id', async () => {
      const mockUser = {
        id: 'user-uuid',
        provider_id: 'dynamic-user-123',
        account: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        email: 'test@example.com',
      };

      userAuthService.findByAuthorizedId.mockResolvedValue(mockUser as any);

      const result =
        await service.findUserAuthorizedCredentials('dynamic-user-123');

      expect(result).toEqual([
        {
          id: 'dynamic-user-123',
          address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
          type: 'EOA',
        },
      ]);
      expect(userAuthService.findByAuthorizedId).toHaveBeenCalledWith(
        'dynamic-user-123',
      );
    });

    it('should return null when user not found', async () => {
      userAuthService.findByAuthorizedId.mockResolvedValue(null);

      const result =
        await service.findUserAuthorizedCredentials('nonexistent-user');

      expect(result).toBeNull();
    });

    it('should return null when user has no provider_id', async () => {
      const mockUser = {
        id: 'user-uuid',
        provider_id: null,
        account: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      };

      userAuthService.findByAuthorizedId.mockResolvedValue(mockUser as any);

      const result =
        await service.findUserAuthorizedCredentials('some-user-id');

      expect(result).toBeNull();
    });
  });

  describe('fetchCredentialsFromDynamic', () => {
    const userId = 'dynamic-user-456';
    const expectedUrl = `${mockDynamicApi}/environments/${mockDynamicEnvId}/users/${userId}/wallets`;

    it('should return credentials from Dynamic API (address field)', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          wallets: [
            {
              id: 'wallet-1',
              address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
              chain: 'solana',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      const result = await service.fetchCredentialsFromDynamic(userId);

      expect(result).toEqual([
        {
          id: 'wallet-1',
          address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          type: 'EOA',
        },
      ]);
      expect(httpService.get).toHaveBeenCalledWith(expectedUrl, {
        headers: {
          Authorization: `Bearer ${mockDynamicToken}`,
        },
        timeout: 5000,
      });
    });

    it('should return credentials from Dynamic API (publicKey field, no address)', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          wallets: [
            {
              id: 'wallet-2',
              publicKey: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
              chain: 'solana',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      const result = await service.fetchCredentialsFromDynamic(userId);

      expect(result).toEqual([
        {
          id: 'wallet-2',
          address: '5ZWj7a1f8tWkjBESHKgrLmYsNBpVapDR2qGXq4LWfLrT',
          type: 'EOA',
        },
      ]);
    });

    it('should return null when API returns empty wallets array', async () => {
      const mockResponse: AxiosResponse = {
        data: { wallets: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      const result = await service.fetchCredentialsFromDynamic(userId);

      expect(result).toBeNull();
    });

    it('should return null when Dynamic API config is missing', async () => {
      // Create a service instance with missing config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthGuardService,
          {
            provide: UserAuthService,
            useValue: { findByAuthorizedId: jest.fn() },
          },
          {
            provide: SupabaseService,
            useValue: { getClient: jest.fn() },
          },
          {
            provide: ConfigService,
            useValue: {
              getOrThrow: jest.fn((key: string) => {
                // Return empty strings to simulate missing config
                return '';
              }),
            },
          },
          {
            provide: HttpService,
            useValue: { get: jest.fn() },
          },
        ],
      }).compile();

      const serviceWithMissingConfig =
        module.get<AuthGuardService>(AuthGuardService);

      const result =
        await serviceWithMissingConfig.fetchCredentialsFromDynamic(userId);

      expect(result).toBeNull();
    });

    it('should return cached credentials within TTL', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          wallets: [
            {
              id: 'wallet-1',
              address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
              chain: 'solana',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      // First call — fetches from API
      const result1 = await service.fetchCredentialsFromDynamic(userId);
      expect(result1).toHaveLength(1);
      expect(httpService.get).toHaveBeenCalledTimes(1);

      // Second call — should use cache, no additional API call
      const result2 = await service.fetchCredentialsFromDynamic(userId);
      expect(result2).toEqual(result1);
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('should NOT return cached credentials after TTL expires', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          wallets: [
            {
              id: 'wallet-1',
              address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
              chain: 'solana',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      // First call — fetches from API
      await service.fetchCredentialsFromDynamic(userId);
      expect(httpService.get).toHaveBeenCalledTimes(1);

      // Manually expire the cache by accessing the private Map
      const cache = (service as any).dynamicCache as Map<
        string,
        { credentials: AuthorizedCredential[]; expiresAt: number }
      >;
      const entry = cache.get(userId);
      if (entry) {
        entry.expiresAt = Date.now() - 1; // Force expiration
      }

      // Second call — cache expired, should fetch again
      await service.fetchCredentialsFromDynamic(userId);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('should return null and log error on API failure (network error)', async () => {
      const networkError = new AxiosError(
        'Network Error',
        'ERR_NETWORK',
        undefined,
        undefined,
        undefined,
      );

      httpService.get.mockReturnValue(
        of(null as any).pipe(() => throwError(() => networkError)),
      );

      const result = await service.fetchCredentialsFromDynamic(userId);

      expect(result).toBeNull();
    });

    it('should return null and log warning on API 403/404', async () => {
      const axiosError = new AxiosError(
        'Forbidden',
        '403',
        undefined,
        undefined,
        {
          status: 403,
          statusText: 'Forbidden',
          data: {},
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        },
      );

      httpService.get.mockReturnValue(
        of(null as any).pipe(() => throwError(() => axiosError)),
      );

      const result = await service.fetchCredentialsFromDynamic(userId);

      expect(result).toBeNull();
    });

    it('should handle timeout (5 second timeout configured)', async () => {
      const timeoutError = new AxiosError(
        'timeout of 5000ms exceeded',
        'ECONNABORTED',
        undefined,
        undefined,
        undefined,
      );

      httpService.get.mockReturnValue(
        of(null as any).pipe(() => throwError(() => timeoutError)),
      );

      const result = await service.fetchCredentialsFromDynamic(userId);

      expect(result).toBeNull();
      // Verify the timeout is configured in the request
      expect(httpService.get).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({ timeout: 5000 }),
      );
    });

    it('should filter out wallets with no address or publicKey', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          wallets: [
            {
              id: 'wallet-valid',
              address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
              chain: 'solana',
            },
            {
              id: 'wallet-empty',
              // No address or publicKey
              chain: 'solana',
            },
            {
              id: 'wallet-null',
              address: '',
              publicKey: '',
              chain: 'solana',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      httpService.get.mockReturnValue(of(mockResponse));

      const result = await service.fetchCredentialsFromDynamic(userId);

      expect(result).toEqual([
        {
          id: 'wallet-valid',
          address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          type: 'EOA',
        },
      ]);
    });
  });
});
