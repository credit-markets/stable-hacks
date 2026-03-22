export interface ManagerQueryFilter {
  $or?: Array<{
    entityName?: { $regex: string; $options: string };
    email?: { $regex: string; $options: string };
  }>;
  owner_address?: string;
}
