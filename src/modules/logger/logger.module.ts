import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

const serializers = {
  req(request: any) {
    return {
      method: request.method,
      url: request.url,
      headers: request.headers,
      remoteAddress: request.socket?.remoteAddress,
    };
  },
  res(response: any) {
    return {
      statusCode: response.statusCode,
      headers: response.getHeaders(),
    };
  },
};

function createPinoConfig(configService: ConfigService) {
  return {
    pinoHttp: {
      level: configService.get<string>('LOG_LEVEL') || 'info',
      transport:
        configService.get<string>('NODE_ENV') === 'development'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, singleLine: false },
            }
          : undefined,
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
