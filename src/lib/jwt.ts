// src/lib/jwt.ts
import { SignJWT, jwtVerify } from 'jose';
import { config } from './config';
import type { JWTPayload, JWTVerifyResult } from './types/auth';
import { errorMessage } from './utils';

const secret = new TextEncoder().encode(config.jwt.secret);

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTVerifyResult> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { valid: true, payload: payload as JWTPayload };
  } catch (error) {
    return { 
      valid: false, 
      error: errorMessage(error) 
    };
  }
}
