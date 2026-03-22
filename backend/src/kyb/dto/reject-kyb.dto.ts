import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectKybDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  rejection_reason: string;
}
