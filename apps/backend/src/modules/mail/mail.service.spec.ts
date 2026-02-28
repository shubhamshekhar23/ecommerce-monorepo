import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';
import type { User } from '@prisma/client';

// eslint-disable-next-line max-lines-per-function
describe('MailService', () => {
  let service: MailService;
  let mailerService: MailerService;

  // eslint-disable-next-line max-lines-per-function
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                APP_URL: 'http://localhost:3000',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mailerService = module.get<MailerService>(MailerService);
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const user: Partial<User> = {
        email: 'test@example.com',
        firstName: 'John',
      };

      (mailerService.sendMail as jest.Mock).mockResolvedValue({ messageId: '123' });

      await service.sendWelcomeEmail(user as User);

      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Welcome to ECommerce!',
          template: 'welcome',
          context: expect.objectContaining({
            firstName: 'John',
            email: 'test@example.com',
            appUrl: 'http://localhost:3000',
          }),
        }),
      );
    });

    it('should use default firstName if not provided', async () => {
      const user: Partial<User> = {
        email: 'test@example.com',
        firstName: null,
      };

      (mailerService.sendMail as jest.Mock).mockResolvedValue({ messageId: '123' });

      await service.sendWelcomeEmail(user as User);

      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            firstName: 'User',
          }),
        }),
      );
    });

    it('should handle email sending errors gracefully', async () => {
      const user: Partial<User> = {
        email: 'test@example.com',
        firstName: 'John',
      };

      (mailerService.sendMail as jest.Mock).mockRejectedValue(new Error('SMTP connection failed'));

      // Should not throw
      await expect(service.sendWelcomeEmail(user as User)).resolves.not.toThrow();
    });
  });

  describe('sendOrderConfirmation', () => {
    it('should send order confirmation email successfully', async () => {
      const user: Partial<User> = {
        email: 'test@example.com',
        firstName: 'John',
      };

      const order: Partial<any> = {
        orderNumber: 'ORD-123',
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
        total: { toString: () => '99.99' },
      };

      const items = [{ productName: 'Laptop', quantity: 1, price: 99.99 }];

      const address = {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      };

      (mailerService.sendMail as jest.Mock).mockResolvedValue({ messageId: '123' });

      await service.sendOrderConfirmation(order as any, user as User, items, address);

      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Order Confirmation',
          template: 'order-confirmation',
        }),
      );
    });
  });

  describe('sendOrderShipped', () => {
    it('should send order shipped email successfully', async () => {
      const user: Partial<User> = {
        email: 'test@example.com',
        firstName: 'John',
      };

      const order: Partial<any> = {
        orderNumber: 'ORD-123',
        createdAt: new Date('2024-01-01'),
      };

      const address = {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      };

      (mailerService.sendMail as jest.Mock).mockResolvedValue({ messageId: '123' });

      await service.sendOrderShipped(order as any, user as User, 'TRACK123', 'FedEx', address);

      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Your Order Has Shipped',
          template: 'order-shipped',
          context: expect.objectContaining({
            trackingNumber: 'TRACK123',
            carrier: 'FedEx',
          }),
        }),
      );
    });
  });
});
