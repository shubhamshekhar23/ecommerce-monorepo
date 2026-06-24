import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer;

  constructor() {
    const kafka = new Kafka({
      clientId: 'backend',
      brokers: (process.env.KAFKA_BROKERS ?? 'redpanda:9092').split(','),
      retry: { retries: 5 },
    });
    this.producer = kafka.producer();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');
    } catch (err) {
      /*
       - Kafka is an optional analytics dependency. If the broker is unavailable
       - (e.g. Contabo single-node where Redpanda is not deployed), log a warning
       - and continue. publish() calls will fail at runtime but won't crash the app.
       */
      this.logger.warn(
        `Kafka producer could not connect: ${String(err)}. Analytics events will be dropped.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  async publish(topic: string, value: unknown): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(value) }],
    });
  }
}
