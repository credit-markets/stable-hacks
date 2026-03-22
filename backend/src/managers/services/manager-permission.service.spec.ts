import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ManagerPermissionService } from './manager-permission.service';
import { ManagerCrudService } from './manager-crud.service';
import type { ManagerRow } from '../interfaces/manager-row.interface';

describe('ManagerPermissionService', () => {
  let service: ManagerPermissionService;
  let managerCrudService: jest.Mocked<
    Pick<ManagerCrudService, 'existsByOwner' | 'findById'>
  >;

  beforeEach(async () => {
    managerCrudService = {
      existsByOwner: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagerPermissionService,
        {
          provide: ManagerCrudService,
          useValue: managerCrudService,
        },
      ],
    }).compile();

    service = module.get<ManagerPermissionService>(ManagerPermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateCreatePermission', () => {
    it('should pass when no existing manager for address', async () => {
      managerCrudService.existsByOwner.mockResolvedValue(false);

      await expect(
        service.validateCreatePermission(
          '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        ),
      ).resolves.toBeUndefined();

      expect(managerCrudService.existsByOwner).toHaveBeenCalledWith(
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      );
    });

    it('should throw UnauthorizedException when manager already exists', async () => {
      managerCrudService.existsByOwner.mockResolvedValue(true);

      await expect(
        service.validateCreatePermission(
          '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        ),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.validateCreatePermission(
          '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        ),
      ).rejects.toThrow('A manager profile already exists for this address');
    });
  });

  describe('validateOwnership', () => {
    it('should pass when owner_address matches authenticatedAddress', () => {
      const manager = {
        owner_address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      } as ManagerRow;

      expect(() =>
        service.validateOwnership(
          manager,
          '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        ),
      ).not.toThrow();
    });

    it('should throw UnauthorizedException when owner_address does not match', () => {
      const manager = {
        owner_address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      } as ManagerRow;

      expect(() =>
        service.validateOwnership(
          manager,
          '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        ),
      ).toThrow(UnauthorizedException);

      expect(() =>
        service.validateOwnership(
          manager,
          '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        ),
      ).toThrow(
        'You are not authorized to perform this action on this manager profile',
      );
    });

    it('should be case-sensitive — different casing must fail (base58 addresses)', () => {
      const manager = {
        owner_address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      } as ManagerRow;

      // Intentionally change a single char casing
      expect(() =>
        service.validateOwnership(
          manager,
          '7eCDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        ),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('checkUpdatePermission', () => {
    it('should return manager when ownership is valid', async () => {
      const mockManager = {
        id: 'mgr-1',
        owner_address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      } as ManagerRow;

      managerCrudService.findById.mockResolvedValue(mockManager as any);

      const result = await service.checkUpdatePermission(
        'mgr-1',
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      );

      expect(result).toEqual(mockManager);
      expect(managerCrudService.findById).toHaveBeenCalledWith('mgr-1');
    });

    it('should throw UnauthorizedException when ownership check fails', async () => {
      const mockManager = {
        id: 'mgr-1',
        owner_address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      } as ManagerRow;

      managerCrudService.findById.mockResolvedValue(mockManager as any);

      await expect(
        service.checkUpdatePermission(
          'mgr-1',
          '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should propagate NotFoundException from findById', async () => {
      managerCrudService.findById.mockRejectedValue(
        new NotFoundException('Manager profile not found with id: mgr-999'),
      );

      await expect(
        service.checkUpdatePermission(
          'mgr-999',
          '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        ),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.checkUpdatePermission(
          'mgr-999',
          '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        ),
      ).rejects.toThrow('Manager profile not found with id: mgr-999');
    });
  });
});
