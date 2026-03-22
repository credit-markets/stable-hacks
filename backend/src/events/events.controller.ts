import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ExecutionEventService } from './events.service';
import { QueryEventsDto } from './dto/query-events.dto';

@ApiTags('events')
@ApiBearerAuth('JWT-auth')
@Controller('events')
export class EventsController {
  private static readonly ALLOWED_TARGET_TYPES = [
    'pool',
    'fund',
    'investment',
    'withdrawal',
  ];

  constructor(private readonly eventsService: ExecutionEventService) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'List all execution events (admin, paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated execution events' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAdminEvents(@Query() dto: QueryEventsDto) {
    return this.eventsService.findAllPaginated(dto);
  }

  @Get(':targetType/:targetId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get execution events for a target entity' })
  @ApiParam({
    name: 'targetType',
    description: 'Target entity type (pool, fund, investment, withdrawal)',
  })
  @ApiParam({ name: 'targetId', description: 'Target entity ID' })
  @ApiResponse({ status: 200, description: 'Events for target entity' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid target type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getByTarget(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ) {
    if (!EventsController.ALLOWED_TARGET_TYPES.includes(targetType)) {
      throw new BadRequestException(
        `Invalid targetType. Allowed: ${EventsController.ALLOWED_TARGET_TYPES.join(', ')}`,
      );
    }
    return this.eventsService.findByTarget(targetType, targetId);
  }
}
