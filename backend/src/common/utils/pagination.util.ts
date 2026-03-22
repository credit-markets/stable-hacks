import { PaginatedResult } from '../dto/query-filter.dto';

/**
 * Enhances a paginated result by transforming each item using a provided enhancement function.
 * This utility is particularly useful for adding computed data, lifecycle states, or on-chain data
 * to paginated database query results.
 *
 * @template TInput - The type of items in the input paginated result
 * @template TOutput - The type of items in the output paginated result
 * @param result - The original paginated result to enhance
 * @param enhanceFn - Function that transforms each item (can be sync or async)
 * @returns A new PaginatedResult with enhanced items, preserving pagination metadata
 *
 * @example
 * // Enhance pools with lifecycle state (synchronous)
 * const enhanced = await enhancePaginatedResult(
 *   poolsResult,
 *   (pool) => this.enhancePoolWithData(pool)
 * );
 *
 * @example
 * // Enhance with on-chain data (asynchronous)
 * const enhanced = await enhancePaginatedResult(
 *   poolsResult,
 *   async (pool) => {
 *     const onChainData = await this.getOnChainData(pool.address);
 *     return this.enhancePoolWithData(pool, onChainData);
 *   }
 * );
 */
export async function enhancePaginatedResult<TInput, TOutput>(
  result: PaginatedResult<TInput>,
  enhanceFn: (item: TInput) => TOutput | Promise<TOutput>,
): Promise<PaginatedResult<TOutput>> {
  const enhancedItems = await Promise.all(
    result.data.map((item) => enhanceFn(item)),
  );

  return new PaginatedResult<TOutput>(
    enhancedItems,
    result.pagination.total,
    result.pagination.page,
    result.pagination.pageSize,
  );
}

/**
 * Enhances a paginated result with batch-fetched contextual data.
 * This optimization fetches data for all items in a single batch operation before enhancement,
 * which is more efficient than fetching data individually for each item.
 *
 * @template TInput - The type of items in the input paginated result
 * @template TContext - The type of the context data (e.g., Map of on-chain data)
 * @template TOutput - The type of items in the output paginated result
 * @param result - The original paginated result to enhance
 * @param fetchContextFn - Async function that fetches batch context data from all items
 * @param enhanceFn - Function that transforms each item using the fetched context
 * @returns A new PaginatedResult with enhanced items, preserving pagination metadata
 *
 * @example
 * // Enhance pools with batched on-chain data
 * const enhanced = await enhancePaginatedResultWithContext(
 *   poolsResult,
 *   async (pools) => {
 *     const addresses = pools.filter(p => p.address).map(p => p.address);
 *     return this.poolOnChainService.fetchMultiplePoolsOnChainData(addresses);
 *   },
 *   (pool, onChainDataMap) => {
 *     const onChainData = pool.address
 *       ? onChainDataMap.get(pool.address)
 *       : undefined;
 *     return this.enhancePoolWithData(pool, onChainData);
 *   }
 * );
 */
export async function enhancePaginatedResultWithContext<
  TInput,
  TContext,
  TOutput,
>(
  result: PaginatedResult<TInput>,
  fetchContextFn: (items: TInput[]) => Promise<TContext>,
  enhanceFn: (item: TInput, context: TContext) => TOutput | Promise<TOutput>,
): Promise<PaginatedResult<TOutput>> {
  const context = await fetchContextFn(result.data);
  const enhancedItems = await Promise.all(
    result.data.map((item) => enhanceFn(item, context)),
  );

  return new PaginatedResult<TOutput>(
    enhancedItems,
    result.pagination.total,
    result.pagination.page,
    result.pagination.pageSize,
  );
}
