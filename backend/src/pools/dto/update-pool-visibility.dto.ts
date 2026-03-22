import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePoolVisibilityDto {
  @ApiProperty({ description: 'Whether pool is visible on marketplace' })
  @IsBoolean()
  is_visible: boolean;
}
