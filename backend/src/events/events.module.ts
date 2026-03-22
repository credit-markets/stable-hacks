import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsController } from './events.controller';
import { ExecutionEventService } from './events.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [EventsController],
  providers: [ExecutionEventService],
  exports: [ExecutionEventService],
})
export class EventsModule {}
