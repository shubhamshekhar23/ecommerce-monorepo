import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Order } from '@prisma/client';
import { MailService } from '@/modules/mail/mail.service';
import { QUEUE_NAMES } from '../queue.constants';
import type { NotificationJobPayload } from '../dto/notification-job.dto';

// Why exponential backoff matters: if the mail SMTP server is temporarily down,
// immediate retries hammer a sick service. Exponential backoff (1s → 2s → 4s …)
// gives it time to recover. BullMQ handles all of this automatically — we just
// set `attempts` and `backoff` on the job when it is enqueued (in OutboxService).
// After `attempts` are exhausted the job moves to the "failed" set — our DLQ.
@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    this.logger.log(`Processing: type=${job.data.type} jobId=${job.id}`);

    if (job.data.type === 'order-confirmation') {
      await this.handleOrderConfirmation(job.data);
    } else {
      this.logger.warn(`Unknown notification type: ${job.data.type}`);
    }
  }

  private async handleOrderConfirmation(data: NotificationJobPayload): Promise<void> {
    // Build the minimal Order-shaped object MailService expects.
    // We use a snapshot from the job payload so that even if the DB record
    // changes later (status update, soft-delete), the email is still correct.
    const orderLike = {
      orderNumber: data.orderNumber,
      createdAt: new Date(data.createdAt),
      status: 'CONFIRMED',
      totalPrice: { toString: () => String(data.totalPrice) },
    } as unknown as Order;

    const user = { email: data.userEmail, firstName: data.firstName, lastName: null };
    const address = {
      firstName: '',
      lastName: '',
      addressLine1: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    };

    await this.mailService.sendOrderConfirmation(orderLike, user, data.items, address);
    this.logger.log(`Confirmation email sent: orderId=${data.orderId}`);
  }
}
