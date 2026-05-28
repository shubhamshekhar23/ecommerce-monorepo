import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import configuration from './config/configuration';
import { SearchModule } from './search/search.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Declares the product.events exchange so it exists before consumers bind queues.
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
        exchanges: [{ name: 'product.events', type: 'topic' }],
        connectionInitOptions: { wait: true },
      }),
    }),

    SearchModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
