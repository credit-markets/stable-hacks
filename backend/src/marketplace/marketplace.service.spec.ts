import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { SupabaseService } from '../database/supabase.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;

  const mockSupabase = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTVLDayData', () => {
    it('should return totalTVL and tvldayDatas from RPC functions', async () => {
      const mockClient = {
        rpc: jest.fn(),
      };

      // First call: get_current_tvl
      mockClient.rpc.mockResolvedValueOnce({
        data: [{ total_tvl: 1500000.5 }],
        error: null,
      });

      // Second call: get_daily_tvl
      mockClient.rpc.mockResolvedValueOnce({
        data: [
          { tvl: 1200000, day: '2026-03-18' },
          { tvl: 1500000.5, day: '2026-03-19' },
        ],
        error: null,
      });

      mockSupabase.getClient.mockReturnValue(mockClient);

      const result = await service.getTVLDayData();

      expect(result.totalTVL).toBe('1500000.5');
      expect(result.tvldayDatas).toHaveLength(2);
      expect(result.tvldayDatas[0].id).toBe('0');
      expect(result.tvldayDatas[0].tvl).toBe('1200000');
      expect(result.tvldayDatas[1].id).toBe('1');
      expect(result.tvldayDatas[1].tvl).toBe('1500000.5');

      expect(mockClient.rpc).toHaveBeenCalledWith('get_current_tvl');
      expect(mockClient.rpc).toHaveBeenCalledWith('get_daily_tvl');
    });

    it('should return totalTVL: "0" and empty array when no snapshots exist', async () => {
      const mockClient = {
        rpc: jest.fn(),
      };

      // get_current_tvl returns empty array (no snapshots)
      mockClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // get_daily_tvl returns empty array
      mockClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      mockSupabase.getClient.mockReturnValue(mockClient);

      const result = await service.getTVLDayData();

      expect(result.totalTVL).toBe('0');
      expect(result.tvldayDatas).toEqual([]);
    });

    it('should throw InternalServerErrorException when get_current_tvl fails', async () => {
      const mockClient = {
        rpc: jest.fn(),
      };

      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Function not found' },
      });

      mockSupabase.getClient.mockReturnValue(mockClient);

      await expect(service.getTVLDayData()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException when get_daily_tvl fails', async () => {
      const mockClient = {
        rpc: jest.fn(),
      };

      // get_current_tvl succeeds
      mockClient.rpc.mockResolvedValueOnce({
        data: [{ total_tvl: 100 }],
        error: null,
      });

      // get_daily_tvl fails
      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' },
      });

      mockSupabase.getClient.mockReturnValue(mockClient);

      await expect(service.getTVLDayData()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should format timestamps correctly (epoch seconds as string)', async () => {
      const mockClient = {
        rpc: jest.fn(),
      };

      mockClient.rpc.mockResolvedValueOnce({
        data: [{ total_tvl: 500 }],
        error: null,
      });

      // Use a known date to verify epoch conversion
      const knownDate = '2026-03-19T12:00:00.000Z';
      const expectedEpochSeconds = String(new Date(knownDate).getTime() / 1000);

      mockClient.rpc.mockResolvedValueOnce({
        data: [{ tvl: 500, day: knownDate }],
        error: null,
      });

      mockSupabase.getClient.mockReturnValue(mockClient);

      const result = await service.getTVLDayData();

      expect(result.tvldayDatas[0].timestamp).toBe(expectedEpochSeconds);
    });
  });
});
