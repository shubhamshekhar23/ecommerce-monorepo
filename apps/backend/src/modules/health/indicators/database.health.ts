import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      // Perform a simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      return this.getStatus('database', true);
    } catch (error) {
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus('database', false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
