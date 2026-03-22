import { getErrorMessage, getErrorStack, isError } from './error.util';

describe('Error Utilities', () => {
  describe('isError', () => {
    it('should return true for Error instances', () => {
      const error = new Error('Test error');
      expect(isError(error)).toBe(true);
    });

    it('should return true for Error subclasses', () => {
      const typeError = new TypeError('Type error');
      const rangeError = new RangeError('Range error');
      expect(isError(typeError)).toBe(true);
      expect(isError(rangeError)).toBe(true);
    });

    it('should return false for strings', () => {
      expect(isError('error string')).toBe(false);
    });

    it('should return false for objects with message property', () => {
      expect(isError({ message: 'error' })).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
    });

    it('should return false for numbers', () => {
      expect(isError(123)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error instances', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should extract message from Error subclasses', () => {
      const typeError = new TypeError('Type error message');
      expect(getErrorMessage(typeError)).toBe('Type error message');
    });

    it('should return the string directly for string errors', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should extract message from objects with message property', () => {
      const errorObj = { message: 'Object error message' };
      expect(getErrorMessage(errorObj)).toBe('Object error message');
    });

    it('should return default message for objects with non-string message', () => {
      const errorObj = { message: 123 };
      expect(getErrorMessage(errorObj)).toBe('An unknown error occurred');
    });

    it('should return default message for objects without message property', () => {
      const errorObj = { code: 'ERR_CODE' };
      expect(getErrorMessage(errorObj)).toBe('An unknown error occurred');
    });

    it('should return default message for null', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
    });

    it('should return default message for undefined', () => {
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
    });

    it('should return default message for numbers', () => {
      expect(getErrorMessage(123)).toBe('An unknown error occurred');
    });

    it('should return default message for booleans', () => {
      expect(getErrorMessage(true)).toBe('An unknown error occurred');
    });
  });

  describe('getErrorStack', () => {
    it('should extract stack from Error instances', () => {
      const error = new Error('Test error');
      const stack = getErrorStack(error);
      expect(stack).toBeDefined();
      expect(typeof stack).toBe('string');
      expect(stack).toContain('Error: Test error');
    });

    it('should extract stack from Error subclasses', () => {
      const typeError = new TypeError('Type error');
      const stack = getErrorStack(typeError);
      expect(stack).toBeDefined();
      expect(typeof stack).toBe('string');
    });

    it('should extract stack from objects with stack property', () => {
      const errorObj = { stack: 'Error stack trace' };
      expect(getErrorStack(errorObj)).toBe('Error stack trace');
    });

    it('should return undefined for objects with non-string stack', () => {
      const errorObj = { stack: 123 };
      expect(getErrorStack(errorObj)).toBeUndefined();
    });

    it('should return undefined for objects without stack property', () => {
      const errorObj = { message: 'error' };
      expect(getErrorStack(errorObj)).toBeUndefined();
    });

    it('should return undefined for strings', () => {
      expect(getErrorStack('error string')).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(getErrorStack(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(getErrorStack(undefined)).toBeUndefined();
    });

    it('should return undefined for numbers', () => {
      expect(getErrorStack(123)).toBeUndefined();
    });
  });
});
