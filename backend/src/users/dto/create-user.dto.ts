import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEmail,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AuthorizedDto {
  @IsString()
  id: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  default?: boolean;
}

export class NotificationSettingsDto {
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

export class CreateUserDto {
  @IsOptional()
  @IsString()
  referred_by?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;

  /**
   * @deprecated MongoDB-era field. With Supabase + JWT auth, the wallet address
   * is extracted from the JWT token via the @AuthenticatedUser() decorator.
   * Kept optional for backward compatibility with existing clients.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuthorizedDto)
  authorized?: AuthorizedDto[];
}
