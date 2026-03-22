import type { Database } from '../../database/database.types';

/**
 * Type aliases for the `managers` table, derived from the auto-generated
 * Supabase types so they stay in sync with the live schema.
 */
export type ManagerRow = Database['public']['Tables']['managers']['Row'];
export type ManagerInsert = Database['public']['Tables']['managers']['Insert'];
export type ManagerUpdate = Database['public']['Tables']['managers']['Update'];
