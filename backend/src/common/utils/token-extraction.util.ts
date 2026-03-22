import { Request } from 'express';

/**
 * Extract JWT token from request headers or cookies
 * Checks Authorization header (Bearer token) first, then falls back to cookies
 *
 * @param request - Express request object
 * @returns JWT token string or undefined if not found
 */
export function extractToken(request: Request): string | undefined {
  // Extract from Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // Extract from cookies (Dynamic Labs official cookie name)
  if (request.cookies) {
    const token = request.cookies.DYNAMIC_JWT_TOKEN as unknown;
    // Type guard: ensure token is a string
    if (typeof token === 'string') {
      return token;
    }
  }

  return undefined;
}
