import { IsOptional, IsString } from 'class-validator';

export class UserFilterDto {
  @IsOptional()
  @IsString()
  search?: string; // Search in account, dynamic_identifier

  @IsOptional()
  @IsString()
  wallet?: string; // Filter by wallet address
}
