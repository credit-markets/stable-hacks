import { JWTCredential } from '../common/types/jwt.types';

declare module 'express' {
  interface Request {
    userCredentials?: JWTCredential;
    userId?: string;
    account?: string;
    token?: string;
  }
}
