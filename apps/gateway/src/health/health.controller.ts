import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ServiceHealth {
  status: 'up' | 'down';
  latencyMs?: number;
}

interface GatewayHealthResponse {
  gateway: 'up';
  services: Record<string, ServiceHealth>;
}

async function ping(url: string, path = '/health'): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(2000) });
    return res.ok ? { status: 'up', latencyMs: Date.now() - start } : { status: 'down' };
  } catch {
    return { status: 'down' };
  }
}

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  async check(): Promise<GatewayHealthResponse> {
    const up = this.config.get<Record<string, string>>('upstreams')!;

    const [backend, auth, search, notification] = await Promise.all([
      ping(up['backend'], '/api/health/live'), // backend uses /api prefix
      ping(up['auth']),
      ping(up['search']),
      ping(up['notification']),
    ]);

    return {
      gateway: 'up',
      services: { backend, auth, search, notification },
    };
  }
}
