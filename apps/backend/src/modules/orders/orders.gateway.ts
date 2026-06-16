import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { OrderCreatedEvent } from '@/modules/events/order.events';
import { UserRole } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  type: string;
}

@WebSocketGateway({
  namespace: '/admin/orders',
  cors: { origin: (process.env.CORS_ORIGIN ?? '').split(',') },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const token = socket.handshake.auth['token'] as string | undefined;

    if (!token) {
      this.logger.warn(`WS rejected — no token socketId=${socket.id}`);
      socket.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, { algorithms: ['RS256'] });

      if (payload.type !== 'access') {
        this.logger.warn(`WS rejected — not access token socketId=${socket.id}`);
        socket.disconnect(true);
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { role: true, isActive: true },
      });

      if (!user?.isActive || user.role !== UserRole.ADMIN) {
        this.logger.warn(`WS rejected — not ADMIN socketId=${socket.id} role=${user?.role}`);
        socket.disconnect(true);
        return;
      }

      this.logger.log(`Admin connected socketId=${socket.id} userId=${payload.sub}`);
    } catch (err) {
      this.logger.warn(
        `WS rejected — invalid token socketId=${socket.id} err=${err instanceof Error ? err.message : String(err)}`,
      );
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(`Admin disconnected socketId=${socket.id}`);
  }

  @OnEvent(OrderCreatedEvent.EVENT_NAME)
  handleOrderCreated(event: OrderCreatedEvent): void {
    this.server.emit('order:created', {
      orderId: event.orderId,
      userId: event.userId,
      orderNumber: event.orderNumber,
      totalPrice: event.totalPrice,
      itemCount: event.itemCount,
      createdAt: event.createdAt,
    });
  }
}
