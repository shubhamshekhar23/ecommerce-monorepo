import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

export const INVENTORY_STOCK_UPDATED = 'inventory.stock.updated';

export interface StockUpdatedPayload {
  productId: string;
  variantId: string;
  stock: number;
}

/*
 - Public WebSocket gateway — no auth required (stock count is public info).
 - Clients subscribe per product; only that product's room receives updates.
 */
@WebSocketGateway({
  namespace: '/inventory',
  cors: { origin: (process.env.CORS_ORIGIN ?? '').split(',') },
})
export class InventoryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(InventoryGateway.name);

  handleConnection(socket: Socket): void {
    this.logger.log(`Inventory client connected socketId=${socket.id}`);
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(`Inventory client disconnected socketId=${socket.id}`);
  }

  @SubscribeMessage('subscribeProduct')
  async handleSubscribeProduct(
    @MessageBody() productId: string,
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    await socket.join(`product:${productId}`);
  }

  @SubscribeMessage('unsubscribeProduct')
  async handleUnsubscribeProduct(
    @MessageBody() productId: string,
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    await socket.leave(`product:${productId}`);
  }

  /*
   - Fires whenever updateVariantStock is called, regardless of direction.
   - Subscribers on the product room receive the new stock number immediately.
   */
  @OnEvent(INVENTORY_STOCK_UPDATED)
  handleStockUpdated(payload: StockUpdatedPayload): void {
    this.server.to(`product:${payload.productId}`).emit('inventory:stockUpdate', payload);
  }
}
