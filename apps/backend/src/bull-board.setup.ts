import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getQueueToken } from '@nestjs/bullmq';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import type { JwtPayload } from '@/common/types/jwt-payload.interface';

const BOARD_BASE_PATH = '/admin/queues';

const ALL_QUEUE_NAMES = [
  'payment-retry',
  QUEUE_NAMES.INVOICES,
  QUEUE_NAMES.STOCK_ALERTS,
  QUEUE_NAMES.DATA_ERASURE,
  QUEUE_NAMES.CART_RECOVERY,
];

function buildAuthMiddleware(jwtService: JwtService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const raw = req.headers.authorization;
    const token = raw?.startsWith('Bearer ') ? raw.slice(7) : undefined;
    if (!token) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    try {
      const payload = jwtService.verify<JwtPayload>(token);
      if (payload.role !== 'ADMIN') {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
      next();
    } catch {
      res.status(401).json({ message: 'Invalid token' });
    }
  };
}

export function setupBullBoard(app: NestExpressApplication): void {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(BOARD_BASE_PATH);

  const queues = ALL_QUEUE_NAMES.map(
    (name) => new BullMQAdapter(app.get<Queue>(getQueueToken(name))),
  );

  createBullBoard({ queues, serverAdapter });

  const jwtService = app.get(JwtService);
  app.use(BOARD_BASE_PATH, buildAuthMiddleware(jwtService), serverAdapter.getRouter());
}
