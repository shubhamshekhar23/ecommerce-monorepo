import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { register } from 'prom-client';
import { Public } from '@/common/decorators';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  async getMetrics(@Res() response: Response): Promise<void> {
    response.set('Content-Type', register.contentType);
    response.end(await register.metrics());
  }
}
