import { PartialType } from '@nestjs/swagger';
import { AddUboDto } from './add-ubo.dto';

export class UpdateUboDto extends PartialType(AddUboDto) {}
