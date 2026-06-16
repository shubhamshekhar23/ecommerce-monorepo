import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { hashPassword, comparePassword } from '@/common/utils/password.util';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import type { ErasureJobData } from './erasure.processor';
import { User } from '@prisma/client';

const ERASURE_GRACE_DAYS = 7;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.DATA_ERASURE) private readonly erasureQueue: Queue,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, password, firstName, lastName } = createUserDto;

    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    return this.mapToResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    return this.mapToResponseDto(updatedUser);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    return isPasswordValid ? user : null;
  }

  async getUserProfile(id: string): Promise<UserResponseDto> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.mapToResponseDto(user);
  }

  async findAll(skip = 0, take = 10): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.mapToResponseDto(user));
  }

  async scheduleErasure(userId: string, password: string): Promise<{ scheduledAt: Date }> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isValid = await comparePassword(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid password');

    const existing = await this.prisma.dataErasureRequest.findUnique({ where: { userId } });
    if (existing?.status === 'PENDING') {
      throw new BadRequestException('An erasure request is already pending');
    }

    const scheduledAt = new Date(Date.now() + ERASURE_GRACE_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.dataErasureRequest.upsert({
      where: { userId },
      create: { userId, scheduledAt },
      update: { scheduledAt, status: 'PENDING', completedAt: null },
    });

    const delayMs = ERASURE_GRACE_DAYS * 24 * 60 * 60 * 1000;
    await this.erasureQueue.add('erase', { userId } satisfies ErasureJobData, {
      delay: delayMs,
      jobId: `erasure-${userId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
    });

    return { scheduledAt };
  }

  async cancelErasure(userId: string): Promise<void> {
    const request = await this.prisma.dataErasureRequest.findUnique({ where: { userId } });
    if (!request || request.status !== 'PENDING') {
      throw new BadRequestException('No pending erasure request found');
    }

    await this.prisma.dataErasureRequest.update({
      where: { userId },
      data: { status: 'CANCELLED' },
    });
  }

  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName as string,
      lastName: user.lastName as string,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      taxId: user.taxId,
    };
  }
}
