import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  assetClass?: string;

  @IsOptional()
  @IsString()
  manager?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseFloat(value) : value,
  )
  minApy?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseFloat(value) : value,
  )
  maxApy?: number;

  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @IsOptional()
  @IsDateString()
  startDateTo?: string;
}

export enum SortOrder {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
}

export class QueryFilterDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) || 1 : 1,
  )
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) || 10 : 10,
  )
  pageSize: number = 10;

  @IsOptional()
  @IsString()
  sortBy: string = 'startTime';

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESCENDING;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => FilterDto)
  filter?: FilterDto;
}

// Helper class for pagination results
export class PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };

  constructor(data: T[], total: number, page: number, pageSize: number) {
    this.data = data;
    this.pagination = {
      total: total,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
