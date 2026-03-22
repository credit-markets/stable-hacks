import { Database } from '../../database/database.types';

/** User type derived from the Supabase database schema */
export type User = Database['public']['Tables']['users']['Row'];

export type UserDocument = User;
