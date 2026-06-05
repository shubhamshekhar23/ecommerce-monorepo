import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';

const CART_INCLUDE = {
  items: {
    include: {
      product: { select: { id: true, name: true, slug: true, images: { where: { isMain: true } } } },
      variant: { include: { attributeValues: { include: { option: { include: { variantType: true } } } } } },
    },
  },
} as const;

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCart(userId: string): Promise<any> {
    let cart = await this.prisma.cart.findUnique({ where: { userId }, include: CART_INCLUDE });

    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId }, include: CART_INCLUDE });
      this.logger.log(`Cart created for user ${userId}`);
    }

    return this.mapToResponse(cart);
  }

  async getCart(userId: string): Promise<any> {
    const cart = await this.prisma.cart.findUnique({ where: { userId }, include: CART_INCLUDE });
    return cart ? this.mapToResponse(cart) : null;
  }

  // eslint-disable-next-line max-lines-per-function
  async addItem(userId: string, productId: string, variantId: string, quantity: number): Promise<any> {
    if (quantity < 1 || quantity > 999) {
      throw new BadRequestException('Quantity must be between 1 and 999');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant || !variant.isActive || variant.productId !== productId) {
      throw new BadRequestException('Variant not found or inactive');
    }

    if (variant.stock < quantity) {
      this.logger.warn(`Insufficient stock: variantId=${variantId} requested=${quantity} available=${variant.stock}`);
      throw new BadRequestException('Insufficient stock');
    }

    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, variantId, quantity },
      });
    }

    this.logger.log(`Item added: userId=${userId} variantId=${variantId} qty=${quantity}`);
    return this.getCart(userId);
  }

  async updateItem(userId: string, cartItemId: string, quantity: number): Promise<any> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    } else if (quantity > 0 && quantity <= 999) {
      await this.prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
    } else {
      throw new BadRequestException('Invalid quantity');
    }

    return this.getCart(userId);
  }

  async removeItem(userId: string, cartItemId: string): Promise<any> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }

  private mapToResponse(cart: any): any {
    const items = cart.items ?? [];
    const totalPrice = items.reduce(
      (sum: number, item: any) => sum + parseFloat(String(item.variant.price)) * item.quantity,
      0,
    );

    return {
      id: cart.id,
      userId: cart.userId,
      items: items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: parseFloat(String(item.variant.price)),
        subtotal: parseFloat(String(item.variant.price)) * item.quantity,
      })),
      itemCount: items.length,
      totalPrice,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
