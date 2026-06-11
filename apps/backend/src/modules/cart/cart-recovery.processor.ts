import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { MailService } from '@/modules/mail/mail.service';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';

interface CartRecoveryJobData {
  userId: string;
  cartId: string;
}

const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 30_000;

function backoffWithJitter(attemptsMade: number): number {
  const delay = Math.min(BASE_DELAY_MS * 2 ** attemptsMade, MAX_DELAY_MS);
  return Math.floor(delay + delay * Math.random() * 0.3);
}

@Processor(QUEUE_NAMES.CART_RECOVERY, {
  concurrency: 3,
  settings: { backoffStrategy: backoffWithJitter },
})
export class CartRecoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(CartRecoveryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<CartRecoveryJobData>): Promise<void> {
    /*
     - S12: job throws on every attempt — exhausts retries, lands in dead-letter queue silently.
     - Signal: BullMQ failed count climbs; Loki shows repeated error logs with job IDs.
    */
    if (isBugScenario(12)) throw new Error('Email service unavailable');

    const { cartId } = job.data;

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true, user: true },
    });

    // Idempotency check: if the cart is gone or empty the user already checked out.
    // Do nothing — sending a recovery email after checkout would be confusing.
    if (!cart || cart.items.length === 0) {
      this.logger.log(`Cart recovery job=${job.id}: cart empty, skipping`);
      return;
    }

    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    this.logger.log(`Cart recovery job=${job.id}: sending email to ${cart.user.email}`);
    await this.mailService.sendAbandonedCartEmail(cart.user.email, cart.user.firstName ?? '', `${appUrl}/cart`);
  }
}
