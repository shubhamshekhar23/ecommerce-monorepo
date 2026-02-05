import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCart(userId: string): Promise<any> {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: true } } },
      });
    }

    return this.mapToResponse(cart);
  }

  async getCart(userId: string): Promise<any> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      return null;
    }

    return this.mapToResponse(cart);
  }

  // eslint-disable-next-line max-lines-per-function
  async addItem(userId: string, productId: string, quantity: number): Promise<any> {
    if (quantity < 1 || quantity > 999) {
      throw new BadRequestException('Quantity must be between 1 and 999');
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      throw new BadRequestException('Product not found or inactive');
    }

    if (product.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }

    let cartItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (cartItem) {
      cartItem = await this.prisma.cartItem.update({
        where: { id: cartItem.id },
        data: { quantity: { increment: quantity } },
        include: { product: true },
      });
    } else {
      cartItem = await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
        include: { product: true },
      });
    }

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
      await this.prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity },
      });
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

  // eslint-disable-next-line max-lines-per-function
  private mapToResponse(cart: any): any {
    const itemCount = cart.items?.length || 0;
    const totalPrice =
      cart.items?.reduce((sum: number, item: any) => {
        return sum + parseFloat(String(item.product.price)) * item.quantity;
      }, 0) || 0;

    return {
      id: cart.id,
      userId: cart.userId,
      items:
        cart.items?.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          product: item.product,
          quantity: item.quantity,
          subtotal: parseFloat(String(item.product.price)) * item.quantity,
        })) || [],
      itemCount,
      totalPrice,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
