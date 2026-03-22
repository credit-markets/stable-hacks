import { extractToken } from './token-extraction.util';
import { Request } from 'express';

describe('extractToken', () => {
  it('should extract token from Authorization header', () => {
    const mockRequest = {
      headers: {
        authorization: 'Bearer test-token-123',
      },
      cookies: {},
    } as unknown as Request;

    const token = extractToken(mockRequest);
    expect(token).toBe('test-token-123');
  });

  it('should extract token from cookies when Authorization header is missing', () => {
    const mockRequest = {
      headers: {},
      cookies: {
        DYNAMIC_JWT_TOKEN: 'cookie-token-456',
      },
    } as unknown as Request;

    const token = extractToken(mockRequest);
    expect(token).toBe('cookie-token-456');
  });

  it('should prioritize Authorization header over cookies', () => {
    const mockRequest = {
      headers: {
        authorization: 'Bearer header-token',
      },
      cookies: {
        DYNAMIC_JWT_TOKEN: 'cookie-token',
      },
    } as unknown as Request;

    const token = extractToken(mockRequest);
    expect(token).toBe('header-token');
  });

  it('should return undefined when no token is present', () => {
    const mockRequest = {
      headers: {},
      cookies: {},
    } as unknown as Request;

    const token = extractToken(mockRequest);
    expect(token).toBeUndefined();
  });

  it('should return undefined when Authorization header does not start with Bearer', () => {
    const mockRequest = {
      headers: {
        authorization: 'Basic some-credentials',
      },
      cookies: {},
    } as unknown as Request;

    const token = extractToken(mockRequest);
    expect(token).toBeUndefined();
  });

  it('should return undefined when cookie token is not a string', () => {
    const mockRequest = {
      headers: {},
      cookies: {
        DYNAMIC_JWT_TOKEN: { invalid: 'object' },
      },
    } as unknown as Request;

    const token = extractToken(mockRequest);
    expect(token).toBeUndefined();
  });
});
