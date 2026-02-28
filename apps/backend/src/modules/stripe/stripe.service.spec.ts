import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PrismaService } from '@/modules/prisma/prisma.service';

// eslint-disable-next-line max-lines-per-function
describe('StripeService', () => {
  let service: StripeService;
  let prisma: PrismaService;
  let _configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                STRIPE_SECRET_KEY: 'sk_test_fake_key',
                STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
              };
              return config[key];
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            order: {
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    prisma = module.get<PrismaService>(PrismaService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const orderId = 'order_123';
      const amount = 99.99;

      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: orderId,
        totalPrice: amount,
      });
      (prisma.order.update as jest.Mock).mockResolvedValue({ id: orderId });

      const result = await service.createPaymentIntent(orderId, amount);

      expect(result).toBeDefined();
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
      });
    });

    it('should throw NotFoundException if order does not exist', async () => {
      const orderId = 'invalid_order';

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createPaymentIntent(orderId, 99.99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      const paymentIntentId = 'pi_123';

      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order_123',
      });
      (prisma.order.update as jest.Mock).mockResolvedValue({
        id: 'order_123',
      });

      await service.confirmPayment(paymentIntentId);

      expect(prisma.order.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if order not found', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.confirmPayment('pi_invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelPaymentIntent', () => {
    it('should cancel payment intent successfully', async () => {
      const paymentIntentId = 'pi_123';

      (prisma.order.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.cancelPaymentIntent(paymentIntentId);

      expect(prisma.order.updateMany).toHaveBeenCalled();
    });
  });

  describe('constructWebhookEvent', () => {
    it('should throw BadRequestException for invalid signature', () => {
      const payload = Buffer.from('invalid');
      const signature = 'invalid_signature';

      expect(() => {
        service.constructWebhookEvent(payload, signature);
      }).toThrow(BadRequestException);
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should handle payment success', async () => {
      const paymentIntent = {
        metadata: { orderId: 'order_123' },
      } as any;

      (prisma.order.update as jest.Mock).mockResolvedValue({
        id: 'order_123',
      });

      await service.handlePaymentSuccess(paymentIntent);

      expect(prisma.order.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if order ID not in metadata', async () => {
      const paymentIntent = {
        metadata: {},
      } as any;

      await expect(service.handlePaymentSuccess(paymentIntent)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
