import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST') ?? 'smtp.example.com',
      port: config.get<number>('SMTP_PORT') ?? 587,
      secure: false,
      auth: {
        user: config.get<string>('SMTP_USER') ?? '',
        pass: config.get<string>('SMTP_PASS') ?? '',
      },
    });
    this.from = config.get<string>('MAIL_FROM') ?? 'noreply@example.com';
    this.appUrl = config.get<string>('APP_URL') ?? 'http://localhost:4000';
  }

  async sendPasswordResetEmail(email: string, firstName: string, rawToken: string): Promise<void> {
    const resetUrl = `${this.appUrl}/reset-password?token=${rawToken}`;
    const html = `
      <h2>Reset your password</h2>
      <p>Hi ${firstName || 'User'},</p>
      <p>Click the link below to reset your password. It expires in 1 hour.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, ignore this email.</p>
    `;
    try {
      await this.transporter.sendMail({ from: this.from, to: email, subject: 'Reset your password', html });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
    }
  }
}
