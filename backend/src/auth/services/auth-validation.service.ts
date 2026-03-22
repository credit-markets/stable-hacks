import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class AuthValidationService {
  /**
   * Validate email format
   */
  validateEmail(email: string): void {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email address');
    }
  }

  /**
   * Validate and parse OTP code
   */
  validateAndParseOtpCode(code: string): number {
    if (!code) {
      throw new BadRequestException('OTP code is required');
    }

    const codeNumber = parseInt(code, 10);
    if (isNaN(codeNumber) || codeNumber < 100000 || codeNumber > 999999) {
      throw new BadRequestException('Invalid OTP code format');
    }

    return codeNumber;
  }
}
