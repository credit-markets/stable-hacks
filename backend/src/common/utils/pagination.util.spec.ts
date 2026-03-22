/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import 'reflect-metadata';
import {
  enhancePaginatedResult,
  enhancePaginatedResultWithContext,
} from './pagination.util';
import { PaginatedResult } from '../dto/query-filter.dto';

describe('Pagination Utils', () => {
  describe('enhancePaginatedResult', () => {
    it('should enhance paginated result with synchronous function', async () => {
      // Arrange
      const inputData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];
      const paginatedInput = new PaginatedResult(inputData, 3, 1, 10);

      const enhanceFn = (item: { id: number; name: string }) => ({
        ...item,
        enhanced: true,
        displayName: item.name.toUpperCase(),
      });

      // Act
      const result = await enhancePaginatedResult(paginatedInput, enhanceFn);

      // Assert
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({
        id: 1,
        name: 'Item 1',
        enhanced: true,
        displayName: 'ITEM 1',
      });
      expect(result.pagination).toEqual({
        total: 3,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });

    it('should enhance paginated result with asynchronous function', async () => {
      // Arrange
      const inputData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      const paginatedInput = new PaginatedResult(inputData, 2, 1, 10);

      const enhanceFn = async (item: { id: number; name: string }) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          ...item,
          asyncData: `async-${item.id}`,
        };
      };

      // Act
      const result = await enhancePaginatedResult(paginatedInput, enhanceFn);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 1,
        name: 'Item 1',
        asyncData: 'async-1',
      });
      expect(result.data[1]).toEqual({
        id: 2,
        name: 'Item 2',
        asyncData: 'async-2',
      });
    });

    it('should preserve pagination metadata correctly', async () => {
      // Arrange
      const inputData = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const paginatedInput = new PaginatedResult(inputData, 50, 2, 3);

      const enhanceFn = (item: { id: number }) => ({ ...item, enhanced: true });

      // Act
      const result = await enhancePaginatedResult(paginatedInput, enhanceFn);

      // Assert
      expect(result.pagination).toEqual({
        total: 50,
        page: 2,
        pageSize: 3,
        totalPages: 17, // Math.ceil(50 / 3)
      });
    });

    it('should handle empty data array', async () => {
      // Arrange
      const paginatedInput = new PaginatedResult([], 0, 1, 10);
      const enhanceFn = (item: any) => ({ ...item, enhanced: true });

      // Act
      const result = await enhancePaginatedResult(paginatedInput, enhanceFn);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('enhancePaginatedResultWithContext', () => {
    it('should enhance with batched context data', async () => {
      // Arrange
      interface Item {
        id: number;
        userId: number;
      }
      interface UserContext {
        [userId: number]: { name: string; email: string };
      }

      const inputData: Item[] = [
        { id: 1, userId: 10 },
        { id: 2, userId: 20 },
        { id: 3, userId: 10 },
      ];
      const paginatedInput = new PaginatedResult(inputData, 3, 1, 10);

      // Simulate fetching user data in batch
      const fetchContextFn = async (items: Item[]) => {
        const userIds = [...new Set(items.map((item) => item.userId))];
        const userContext: UserContext = {};
        userIds.forEach((userId) => {
          userContext[userId] = {
            name: `User ${userId}`,
            email: `user${userId}@example.com`,
          };
        });
        return userContext;
      };

      const enhanceFn = (item: Item, context: UserContext) => ({
        ...item,
        userName: context[item.userId].name,
        userEmail: context[item.userId].email,
      });

      // Act
      const result = await enhancePaginatedResultWithContext(
        paginatedInput,
        fetchContextFn,
        enhanceFn,
      );

      // Assert
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({
        id: 1,
        userId: 10,
        userName: 'User 10',
        userEmail: 'user10@example.com',
      });
      expect(result.data[1]).toEqual({
        id: 2,
        userId: 20,
        userName: 'User 20',
        userEmail: 'user20@example.com',
      });
      expect(result.data[2]).toEqual({
        id: 3,
        userId: 10,
        userName: 'User 10',
        userEmail: 'user10@example.com',
      });
    });

    it('should work with Map as context', async () => {
      // Arrange
      interface Pool {
        address: string;
        name: string;
      }

      const inputData: Pool[] = [
        {
          address: 'So11111111111111111111111111111111111111112',
          name: 'Pool A',
        },
        {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          name: 'Pool B',
        },
      ];
      const paginatedInput = new PaginatedResult(inputData, 2, 1, 10);

      // Simulate fetching on-chain data
      const fetchContextFn = async (pools: Pool[]) => {
        const onChainData = new Map<string, { balance: number }>();
        pools.forEach((pool, index) => {
          onChainData.set(pool.address, {
            balance: 1000 * (index + 1),
          });
        });
        return onChainData;
      };

      const enhanceFn = (
        pool: Pool,
        context: Map<string, { balance: number }>,
      ) => ({
        ...pool,
        onChainBalance: context.get(pool.address)?.balance || 0,
      });

      // Act
      const result = await enhancePaginatedResultWithContext(
        paginatedInput,
        fetchContextFn,
        enhanceFn,
      );

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        address: 'So11111111111111111111111111111111111111112',
        name: 'Pool A',
        onChainBalance: 1000,
      });
      expect(result.data[1]).toEqual({
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        name: 'Pool B',
        onChainBalance: 2000,
      });
    });

    it('should preserve pagination metadata with context', async () => {
      // Arrange
      const inputData = [{ id: 1 }, { id: 2 }];
      const paginatedInput = new PaginatedResult(inputData, 100, 5, 2);

      const fetchContextFn = async () => ({ sharedData: 'test' });
      const enhanceFn = (item: any, context: any) => ({
        ...item,
        context: context.sharedData,
      });

      // Act
      const result = await enhancePaginatedResultWithContext(
        paginatedInput,
        fetchContextFn,
        enhanceFn,
      );

      // Assert
      expect(result.pagination).toEqual({
        total: 100,
        page: 5,
        pageSize: 2,
        totalPages: 50,
      });
    });

    it('should handle empty data with context', async () => {
      // Arrange
      const paginatedInput = new PaginatedResult([], 0, 1, 10);
      const fetchContextFn = async () => ({ data: 'test' });
      const enhanceFn = (item: any, context: any) => ({ ...item, context });

      // Act
      const result = await enhancePaginatedResultWithContext(
        paginatedInput,
        fetchContextFn,
        enhanceFn,
      );

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle async enhancement function with context', async () => {
      // Arrange
      const inputData = [{ id: 1 }, { id: 2 }];
      const paginatedInput = new PaginatedResult(inputData, 2, 1, 10);

      const fetchContextFn = async () => ({ multiplier: 10 });
      const enhanceFn = async (
        item: { id: number },
        context: { multiplier: number },
      ) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return {
          ...item,
          computed: item.id * context.multiplier,
        };
      };

      // Act
      const result = await enhancePaginatedResultWithContext(
        paginatedInput,
        fetchContextFn,
        enhanceFn,
      );

      // Assert
      expect(result.data[0]).toEqual({ id: 1, computed: 10 });
      expect(result.data[1]).toEqual({ id: 2, computed: 20 });
    });
  });
});
