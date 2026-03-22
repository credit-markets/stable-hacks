import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private emailSender: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(
      this.configService.getOrThrow<string>('RESEND_API_KEY'),
    );
    this.emailSender =
      this.configService.get<string>('EMAIL_SENDER') ||
      'noreply@yourdomain.com';
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: `Credit Markets Wallet <${this.emailSender}>`,
        to: email,
        subject: `Credit Markets: verification code to add wallet ${otp}`,
        html: this.getVerifyAddWalletTemplate(otp),
      });
    } catch (error) {
      this.logger.error('Error sending email:', error);
      throw new Error('Failed to send OTP email');
    }
  }

  private getVerifyAddWalletTemplate(otp: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Your Verification Code</h2>
        <p>Please use the following code to verify your wallet:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this code, please ignore this email.</p>
      </div>
    `;
  }
}
