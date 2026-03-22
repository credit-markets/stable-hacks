# Testing Documentation

## Overview

The backend uses **Jest** with **ts-jest** for all testing. Tests are co-located with source files using the `*.spec.ts` naming convention. The test suite currently includes 31 spec files covering guards, services, controllers, and utilities.

---

## Commands

```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode (re-run on file changes)
pnpm test:cov       # Run with coverage report (output: ./coverage/)
pnpm test:debug     # Run with Node inspector for debugging
pnpm validate       # lint + test (pre-commit check)
pnpm validate:ci    # lint + test:cov (CI pipeline)
```

### Running Specific Tests

```bash
# Single file
pnpm test -- --testPathPattern=jwt-auth.guard.spec

# Single test by name
pnpm test -- -t "should throw UnauthorizedException"

# Specific directory
pnpm test -- --testPathPattern=auth/guards
```

---

## Coverage Requirements

| Area | Minimum Coverage |
|------|-----------------|
| Authentication / Security (guards, middleware, JWKS) | 90% |
| Business Logic (services with domain logic) | 80% |
| CRUD Services (database operations) | 70% |

Run `pnpm test:cov` and check `./coverage/lcov-report/index.html` for detailed results.

---

## Test Organization

Tests are co-located next to the code they test:

```
src/
├── auth/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── jwt-auth.guard.spec.ts      # Guard tests
│   │   ├── admin.guard.spec.ts
│   │   ├── pool-manager.guard.spec.ts
│   │   └── attester.guard.spec.ts
│   ├── middleware/
│   │   └── jwt.middleware.spec.ts       # Middleware tests
│   └── services/
│       ├── jwks-verification.service.spec.ts
│       └── auth-guard.service.spec.ts
├── pools/
│   └── services/
│       ├── pool-crud.service.spec.ts
│       └── pool-deployment.service.spec.ts
├── common/
│   ├── guards/
│   │   └── file-upload-rate-limit.guard.spec.ts
│   ├── services/__tests__/
│   │   └── supabase-storage.service.spec.ts
│   └── utils/
│       ├── error.util.spec.ts
│       ├── token-extraction.util.spec.ts
│       └── pagination.util.spec.ts
└── ...
```

---

## Test Structure Pattern

Follow Arrange-Act-Assert with descriptive nesting:

```typescript
describe('PoolsService', () => {
  let service: PoolsService;
  let supabaseService: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoolsService,
        {
          provide: SupabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PoolsService>(PoolsService);
    supabaseService = module.get(SupabaseService);
  });

  describe('findOne', () => {
    it('should return pool when found', async () => {
      // Arrange
      const mockPool = { id: '123', title: 'Test Pool' };
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockPool, error: null }),
            }),
          }),
        }),
      } as any);

      // Act
      const result = await service.findOne('123');

      // Assert
      expect(result).toEqual(mockPool);
    });

    it('should throw NotFoundException when pool not found', async () => {
      // Arrange
      supabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      } as any);

      // Act & Assert
      await expect(service.findOne('123')).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

## Mocking Patterns

### Supabase Client

The most common mock -- chain the query builder methods:

```typescript
const mockSupabase = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    }),
  }),
};

const supabaseService = {
  getClient: jest.fn().mockReturnValue(mockSupabase),
};
```

### Solana Service

```typescript
const solanaService = {
  getConnection: jest.fn().mockReturnValue({
    getSlot: jest.fn().mockResolvedValue(12345),
  }),
  getProgram: jest.fn().mockReturnValue({
    account: {
      creditVault: { fetch: jest.fn() },
    },
    methods: {},
  }),
  findPda: jest.fn().mockReturnValue([new PublicKey('...'), 255]),
};
```

### Config Service

```typescript
const configService = {
  get: jest.fn((key: string) => {
    const config = {
      AUTHORITY: 'AdminWalletAddress123',
      NODE_ENV: 'test',
    };
    return config[key];
  }),
  getOrThrow: jest.fn((key: string) => {
    const config = {
      DYNAMIC_ENVIRONMENT_ID: 'test-env-id',
      SUPABASE_URL: 'https://test.supabase.co',
    };
    const value = config[key];
    if (!value) throw new Error(`Missing: ${key}`);
    return value;
  }),
};
```

### Guard Testing

Guards are tested by creating mock `ExecutionContext`:

```typescript
const createMockExecutionContext = (request = mockRequest): ExecutionContext => ({
  switchToHttp: jest.fn().mockReturnValue({
    getRequest: jest.fn().mockReturnValue(request),
  }),
  getHandler: jest.fn(),
  getClass: jest.fn(),
  getArgs: jest.fn(),
  getArgByIndex: jest.fn(),
  switchToRpc: jest.fn(),
  switchToWs: jest.fn(),
  getType: jest.fn(),
});
```

### Storage Service

```typescript
const storageService = {
  uploadFile: jest.fn().mockResolvedValue('path/to/file.pdf'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getFile: jest.fn().mockResolvedValue(Buffer.from('content')),
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.url'),
  getFileUrl: jest.fn().mockResolvedValue('https://file.url'),
  fileExists: jest.fn().mockResolvedValue(true),
};
```

---

## Testing Different Module Types

### Guards

Test both positive and negative paths:

```typescript
describe('AdminGuard', () => {
  it('should allow admin wallet', () => {
    request.userCredentials = { address: 'AdminWallet' };
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException for non-admin', () => {
    request.userCredentials = { address: 'OtherWallet' };
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when no credentials', () => {
    request.userCredentials = undefined;
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
```

### Services with Supabase

Mock the Supabase client chain and verify correct query construction:

```typescript
it('should filter by status', async () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data: [], count: 0, error: null }),
  };
  mockSupabase.from.mockReturnValue(mockQuery);

  await service.findAll(1, 10, 'created_at', 'descending', { status: 'open' });

  expect(mockQuery.eq).toHaveBeenCalledWith('status', 'open');
});
```

### Controllers

Test endpoint behavior including error handling:

```typescript
describe('getUserByAddress', () => {
  it('should return user when requesting own profile', async () => {
    const mockUser = { id: '1', account: 'Wallet123' };
    usersService.findByAddress.mockResolvedValue(mockUser);

    const result = await controller.getUserByAddress('Wallet123', {
      account: 'Wallet123',
      userCredentials: {} as any,
    });

    expect(result).toEqual(mockUser);
  });

  it('should throw ForbiddenException when accessing other profile', async () => {
    await expect(
      controller.getUserByAddress('OtherWallet', {
        account: 'MyWallet',
        userCredentials: {} as any,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

### Utility Functions

Pure functions are the easiest to test:

```typescript
describe('getErrorMessage', () => {
  it('should extract message from Error instance', () => {
    expect(getErrorMessage(new Error('test'))).toBe('test');
  });

  it('should convert non-Error to string', () => {
    expect(getErrorMessage('string error')).toBe('string error');
  });

  it('should handle null/undefined', () => {
    expect(getErrorMessage(null)).toBe('Unknown error');
  });
});
```

---

## Jest Configuration

From `package.json`:

```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

---

## CI Integration

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. Install pnpm and Node.js 20
2. `pnpm install --frozen-lockfile`
3. `pnpm lint` (continue on error)
4. `pnpm test --coverage` with `NODE_ENV=test`
5. Upload coverage to Codecov

---

## Before Committing

```bash
pnpm test              # All tests pass?
pnpm test:cov          # Coverage acceptable?
pnpm lint              # No lint errors?
```

Or use the combined command:

```bash
pnpm validate          # lint + test
```

---

## Existing Test Files

```
src/app.controller.spec.ts
src/auth/guards/jwt-auth.guard.spec.ts
src/auth/guards/admin.guard.spec.ts
src/auth/guards/pool-manager.guard.spec.ts
src/auth/guards/attester.guard.spec.ts
src/auth/middleware/jwt.middleware.spec.ts
src/auth/services/jwks-verification.service.spec.ts
src/auth/services/auth-guard.service.spec.ts
src/blockchain/solana.service.spec.ts
src/blockchain/helius-webhook.controller.spec.ts
src/blockchain/helius-webhook.service.tvl.spec.ts
src/common/guards/file-upload-rate-limit.guard.spec.ts
src/common/services/__tests__/supabase-storage.service.spec.ts
src/common/utils/error.util.spec.ts
src/common/utils/token-extraction.util.spec.ts
src/common/utils/pagination.util.spec.ts
src/events/events.service.spec.ts
src/file-uploads/file-uploads.spec.ts
src/kyb/guards/kyb-owner.guard.spec.ts
src/kyb/services/kyb-crud.service.spec.ts
src/kyb/services/kyb-workflow.service.spec.ts
src/managers/services/manager-crud.service.spec.ts
src/managers/services/manager-permission.service.spec.ts
src/marketplace/marketplace.service.spec.ts
src/nota-fiscal-items/nota-fiscal-items.service.spec.ts
src/pools/services/pool-crud.service.spec.ts
src/pools/services/pool-deployment.service.spec.ts
src/portfolio/portfolio.service.spec.ts
src/risk/risk.service.spec.ts
src/users/users.controller.spec.ts
src/users/users.controller.getCurrentUser.spec.ts
```
