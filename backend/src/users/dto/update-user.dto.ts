import {
  IsString,
  IsOptional,
  ValidateNested,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  transactions?: boolean;

  @IsOptional()
  @IsBoolean()
  opportunities?: boolean;

  @IsOptional()
  @IsBoolean()
  news?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  referred_by?: string;

  @IsOptional()
  @IsNumber()
  kyc_id?: number;

  @IsOptional()
  @IsString()
  kyc_attestation?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateNotificationSettingsDto)
  notifications?: UpdateNotificationSettingsDto;
}
