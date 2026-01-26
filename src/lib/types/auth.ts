// src/lib/types/auth.ts
// TypeScript types for authentication and API keys

import type { NextApiRequest } from 'next';

export type Permission = 'read' | 'write' | 'admin';

export interface APIKeyConfig {
  name: string;
  permissions: Permission[];
  rateLimitPerHour: number;
}

export interface RateLimitResult {
  exceeded: boolean;
  current: number;
  limit: number;
  retryAfter?: number;
  remaining?: number;
}

export interface APIKeyInfo {
  name: string;
  permissions: Permission[];
}

export interface JWTPayload {
  phone?: string;
  email?: string;
  customerEmail?: string;
  customerName?: string;
  orderId?: string;
  orderTotal?: number;
  purpose?: string;
  [key: string]: unknown;
}

export interface JWTVerifyResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

// Extend Next.js request type to include apiKey
export interface AuthenticatedNextApiRequest extends NextApiRequest {
  apiKey?: APIKeyInfo;
}
