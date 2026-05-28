import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { Decimal } from '@prisma/client/runtime/library';

export interface DiscountResult {
  discountAmount: number;
  couponId: string;
  couponCode: string;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    return this.prisma.coupon.create({ data: { ...dto, id: crypto.randomUUID() } });
  }

  async findByCode(code: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  // Validate and calculate discount WITHOUT applying (use applyCoupon for atomic apply).
  async calculateDiscount(code: string, subtotal: number): Promise<DiscountResult> {
    const coupon = await this.findByCode(code);
    this.assertValid(coupon, subtotal);

    const discount = coupon.type === 'PERCENTAGE'
      ? subtotal * (Number(coupon.value) / 100)
      : Math.min(Number(coupon.value), subtotal);

    return { discountAmount: Math.round(discount * 100) / 100, couponId: coupon.id, couponCode: coupon.code };
  }

  // Atomic apply: UPDATE coupons SET usedCount = usedCount + 1 WHERE id = ? AND usedCount < maxUses
  // This is optimistic locking — no SELECT-then-UPDATE which has a TOCTOU race.
  // If 1000 users simultaneously apply the last use:
  //   - Only the one whose UPDATE returns rowCount=1 wins
  //   - All others get 0 rows affected → 409 Conflict
  async applyCoupon(couponId: string, orderId: string, userId: string): Promise<void> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    const rowsAffected = await this.prisma.$executeRaw`
      UPDATE "Coupon"
      SET "usedCount" = "usedCount" + 1
      WHERE id = ${couponId}
        AND "isActive" = true
        AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
        AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
    `;

    if (rowsAffected === 0) {
      throw new BadRequestException('Coupon is no longer valid or has reached its usage limit');
    }

    await this.prisma.couponUsage.create({
      data: { id: crypto.randomUUID(), couponId, orderId, userId },
    });
  }

  private assertValid(coupon: { isActive: boolean; expiresAt: Date | null; maxUses: number | null; usedCount: number; minOrderAmount: Decimal | null }, subtotal: number): void {
    if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException('Coupon has expired');
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon has reached its usage limit');
    }
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount is ${coupon.minOrderAmount}`);
    }
  }
}
