import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

const serializers = {
  req(request: any) {
    return {
      method: request.method,
      url: request.url,
      remoteAddress: request.socket?.remoteAddress,
    };
  },
  res(response: any) {
    return {
      statusCode: response.statusCode,
    };
  },
};

function createPinoConfig(configService: ConfigService) {
  // const isDevelopment = configService.get<string>('NODE_ENV') === 'development';

  return {
    pinoHttp: {
      level: configService.get<string>('LOG_LEVEL') || 'info',
      // Note: pino-pretty transport requires 'npm install pino-pretty --save-dev'
      // For now, logs are output in JSON format (works in both dev and prod)
      // To enable pretty printing in development, install pino-pretty and uncomment below:
      // transport: isDevelopment ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
      genReqId: (req: any) => req.headers['x-request-id'] || uuidv4(),
      customProps: (req: any) => ({ requestId: req.id }),
      serializers,
    },
  };
}

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createPinoConfig,
    }),
  ],
})
export class LoggerModule {}
