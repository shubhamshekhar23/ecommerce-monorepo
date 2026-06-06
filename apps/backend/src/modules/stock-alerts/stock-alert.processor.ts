import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { MailService } from '@/modules/mail/mail.service';

interface StockAlertJobData {
  alertId: string;
  email: string;
  productName: string;
  productSlug: string;
}

const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 30_000;

// Jitter prevents the thundering herd: if 1000 alerts all fail and retry at
// exactly the same interval, they simultaneously hammer the SMTP server again.
// Adding ±30% randomness staggers the retries across a window.
function backoffWithJitter(attemptsMade: number): number {
  const delay = Math.min(BASE_DELAY_MS * 2 ** attemptsMade, MAX_DELAY_MS);
  return Math.floor(delay + delay * Math.random() * 0.3);
}

@Processor(QUEUE_NAMES.STOCK_ALERTS, {
  concurrency: 5,
  settings: { backoffStrategy: backoffWithJitter },
})
export class StockAlertProcessor extends WorkerHost {
  private readonly logger = new Logger(StockAlertProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<StockAlertJobData>): Promise<void> {
    const { email, productName, productSlug } = job.data;
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const productUrl = `${appUrl}/products/${productSlug}`;

    this.logger.log(`Stock alert job=${job.id} product=${productName} email=${email}`);
    await this.mailService.sendStockAlertEmail(email, productName, productUrl);
    this.logger.log(`Stock alert sent job=${job.id}`);
  }
}
