import { UserDocument } from '../../users/schemas/user.schema';

export interface IUserLookupService {
  findByAuthorizedAddress(address: string): Promise<UserDocument | null>;
  findById(id: string): Promise<UserDocument | null>;
  findByAuthorizedId(id: string): Promise<UserDocument | null>;
  findAll(
    page: number,
    pageSize: number,
    filter?: Record<string, unknown>,
    sortBy?: string,
    sortOrder?: 'ascending' | 'descending',
  ): Promise<{ users: UserDocument[]; total: number }>;
}
