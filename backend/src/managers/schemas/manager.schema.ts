import { Database } from '../../database/database.types';

export type Manager = Database['public']['Tables']['managers']['Row'];
export type ManagerInsert = Database['public']['Tables']['managers']['Insert'];
export type ManagerUpdate = Database['public']['Tables']['managers']['Update'];
export type ManagerDocument = Manager;
