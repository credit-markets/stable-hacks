import { Module } from '@nestjs/common';
import { FileUploadsController } from './file-uploads.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    CommonModule, // For storage service
  ],
  controllers: [FileUploadsController],
  providers: [],
})
export class FileUploadsModule {}
