/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { BadRequestException } from '@nestjs/common';
import {
  generateFilePath,
  validateFilePath,
} from '../common/utils/file-path.util';
import { MulterFile } from '../common/types/multer.types';

describe('generateFilePath', () => {
  const mockFile: MulterFile = {
    originalname: 'test.jpg',
    buffer: Buffer.from('test'),
    mimetype: 'image/jpeg',
    size: 1024,
    fieldname: 'file',
    encoding: 'binary',
    destination: '',
    filename: 'test.jpg',
    path: '',
  };

  const managerAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';

  describe('file extension security', () => {
    it('should use secure MIME mapping for known types', () => {
      const path = generateFilePath(managerAddress, 'image', 'profile-logo', {
        ...mockFile,
        mimetype: 'image/jpeg',
      });

      expect(path).toMatch(/\.jpg$/);
    });

    it('should prevent malicious MIME type exploitation', () => {
      const maliciousFile = {
        ...mockFile,
        mimetype: 'image/php', // Malicious MIME type
        originalname: 'test.jpg',
      };

      const path = generateFilePath(
        managerAddress,
        'image',
        'profile-logo',
        maliciousFile,
      );

      // Should not create .php extension, should default to safe fallback
      expect(path).not.toMatch(/\.php$/);
      expect(path).toMatch(/\.(jpg|bin)$/);
    });

    it('should validate filename extensions against whitelist', () => {
      const suspiciousFile = {
        ...mockFile,
        mimetype: 'application/octet-stream',
        originalname: 'test.exe',
      };

      const path = generateFilePath(
        managerAddress,
        'document',
        'pool-document',
        suspiciousFile,
      );

      // Should not allow .exe extension
      expect(path).not.toMatch(/\.exe$/);
      expect(path).toMatch(/\.bin$/);
    });

    it('should handle missing MIME type gracefully', () => {
      const fileWithoutMime = {
        ...mockFile,
        mimetype: '',
        originalname: 'document.pdf',
      };

      const path = generateFilePath(
        managerAddress,
        'document',
        'pool-document',
        fileWithoutMime,
      );

      // Should extract safe extension from filename
      expect(path).toMatch(/\.pdf$/);
    });

    it('should default to .bin for unknown extensions', () => {
      const unknownFile = {
        ...mockFile,
        mimetype: 'application/unknown',
        originalname: 'file.xyz',
      };

      const path = generateFilePath(
        managerAddress,
        'document',
        'pool-document',
        unknownFile,
      );

      expect(path).toMatch(/\.bin$/);
    });
  });

  describe('path validation', () => {
    it('should validate manager address format', () => {
      expect(() => {
        generateFilePath('invalid-address', 'image', 'profile-logo', mockFile);
      }).toThrow(BadRequestException);
    });

    it('should validate subType against allowed values', () => {
      expect(() => {
        generateFilePath(
          managerAddress,
          'image',

          'invalid-subtype' as any,
          mockFile,
        );
      }).toThrow(BadRequestException);
    });

    it('should generate valid path structure', () => {
      const path = generateFilePath(
        managerAddress,
        'image',
        'profile-logo',
        mockFile,
      );

      expect(path).toMatch(
        /^manager\/[1-9A-HJ-NP-Za-km-z]{32,44}\/profile-logo-\d+\.(jpg|png|webp|pdf|doc|docx|xls|xlsx|txt|csv|bin)$/,
      );
    });
  });
});

describe('validateFilePath', () => {
  it('should accept valid manager file paths', () => {
    const validPaths = [
      'manager/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV/profile-logo-1234567890.jpg',
      'manager/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV/pool-document-1234567890.pdf',
      'manager/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV/team-member-1234567890.png',
    ];

    validPaths.forEach((path) => {
      expect(validateFilePath(path)).toBe(true);
    });
  });

  it('should reject invalid path formats', () => {
    const invalidPaths = [
      'manager/../../../etc/passwd',
      'manager/invalid-address/profile-logo-123.jpg',
      'invalid/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV/profile-logo-123.jpg',
      'manager/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV/invalid-subtype-123.jpg',
      'manager/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV/profile-logo-123.exe',
    ];

    invalidPaths.forEach((path) => {
      expect(validateFilePath(path)).toBe(false);
    });
  });
});
