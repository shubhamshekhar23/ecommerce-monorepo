import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';

export interface AddressSnapshot {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  async create(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  async update(userId: string, addressId: string, dto: Partial<CreateAddressDto>) {
    await this.findOwned(userId, addressId);
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.update({ where: { id: addressId }, data: dto });
  }

  async remove(userId: string, addressId: string): Promise<void> {
    await this.findOwned(userId, addressId);
    await this.prisma.address.delete({ where: { id: addressId } });
  }

  // Returns a plain object snapshot — copied to Order.shippingAddress at checkout.
  // This is the snapshot pattern: the order is immutable even if the address changes.
  async toSnapshot(userId: string, addressId: string): Promise<AddressSnapshot> {
    const address = await this.findOwned(userId, addressId);
    return {
      firstName: address.firstName,
      lastName: address.lastName,
      line1: address.line1,
      line2: address.line2 ?? undefined,
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
    };
  }

  private async findOwned(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException('Not your address');
    return address;
  }
}
