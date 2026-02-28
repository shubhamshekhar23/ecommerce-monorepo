import { Controller, Get } from '@nestjs/common';
import { Public } from '@/common/decorators';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics in text format' })
  getMetrics(): string {
    return 'Metrics exposed via /metrics endpoint';
  }
}
