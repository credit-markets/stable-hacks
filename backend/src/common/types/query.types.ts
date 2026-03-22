/**
 * Common query-related type definitions
 */

/**
 * Sort options type
 * Allows sorting by any field in ascending (1) or descending (-1) order
 */
export interface SortOptions {
  [key: string]: 1 | -1;
}

/**
 * Database query filter type
 * Flexible query object that can contain various filter operators
 */
export interface QueryFilter {
  [key: string]: any;
  $or?: Array<Record<string, any>>;
  $and?: Array<Record<string, any>>;
  $in?: any[];
  $ne?: any;
  $gt?: any;
  $gte?: any;
  $lt?: any;
  $lte?: any;
  $regex?: RegExp | string;
  $options?: string;
}

/**
 * Attestation type for blockchain attestations
 */
export interface Attestation {
  id?: string;
  attestationUid?: string;
  kycId?: string;
  kycLevel?: number;
  schemaId?: string;
  attester?: string;
  recipient?: string;
  time?: bigint;
  expirationTime?: bigint;
  revocationTime?: bigint;
  data?: any;
}
