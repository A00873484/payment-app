// src/pages/api/orders/search.ts
// Authenticated order search endpoint supporting multiple search modes:
//   ?query=<name>         — search by customer name (fuzzy)
//   ?phone=<phone>        — exact phone match
//   ?orderId=<orderId>    — exact orderId match
//   ?q=<any>              — smart search: tries phone, orderId, then name in order

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAPIAuth } from '@/lib/middleware/apiAuth';
import { DatabaseManager } from '@/lib/dbManager';
import type { OrderSearchResponse, OrderSearchResult } from '@/lib/types/api';
import type { ErrorResponse } from '@/lib/types/database';

const PHONE_RE = /^\d{7,15}$/;

/**
 * Determine if a string looks like a phone number.
 */
function looksLikePhone(value: string): boolean {
  return PHONE_RE.test(value.replace(/[\s\-().+]/g, ''));
}

/**
 * Sanitize a raw phone string to digits only.
 */
function sanitizePhone(value: string): string {
  return value.replace(/[\s\-().+]/g, '');
}

/**
 * Map a DB order to the public-safe OrderSearchResult shape,
 * with full phone exposed for authenticated callers.
 */
function toSearchResult(order: Awaited<ReturnType<typeof DatabaseManager.getOrdersByName>>[number]): OrderSearchResult {
  return {
    ...order,
    orderId: order.wordChain || order.orderId,
    dbOrderId: order.orderId,
    name: order.user?.name || '',
    endPhone: order.phone.slice(-2),
    orderItems: (order.orderItems ?? []).map(item => ({
      ...item,
      brand: item.brand ?? item.product?.brand ?? null,
    })),
  } as OrderSearchResult;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderSearchResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Pull individual search params ──────────────────────────────────────
  const rawQuery  = typeof req.query.query  === 'string' ? req.query.query.trim()  : '';
  const rawQ      = typeof req.query.q      === 'string' ? req.query.q.trim()      : '';
  const rawPhone  = typeof req.query.phone  === 'string' ? req.query.phone.trim()  : '';
  const rawOrder  = typeof req.query.orderId=== 'string' ? req.query.orderId.trim(): '';

  // At least one parameter must be present
  if (!rawQuery && !rawQ && !rawPhone && !rawOrder) {
    return res.status(400).json({
      error: 'At least one search parameter is required: query, phone, orderId, or q',
    });
  }

  try {
    let orders: Awaited<ReturnType<typeof DatabaseManager.getOrdersByName>> = [];

    // ── 1. Explicit phone search ────────────────────────────────────────
    if (rawPhone) {
      const phone = sanitizePhone(rawPhone);
      orders = await DatabaseManager.getOrdersByPhone(phone);

    // ── 2. Explicit orderId search ──────────────────────────────────────
    } else if (rawOrder) {
      const order = await DatabaseManager.getOrderByOrderId(rawOrder);
      orders = order ? [order] : [];

    // ── 3. Explicit name/query search ───────────────────────────────────
    } else if (rawQuery) {
      orders = await DatabaseManager.getOrdersByName(rawQuery.toLowerCase());

    // ── 4. Smart catch-all: ?q=<anything> ──────────────────────────────
    } else if (rawQ) {
      if (looksLikePhone(rawQ)) {
        // Try phone first
        const phone = sanitizePhone(rawQ);
        orders = await DatabaseManager.getOrdersByPhone(phone);

        // Fall back to orderId if no phone hits
        if (!orders.length) {
          const order = await DatabaseManager.getOrderByOrderId(rawQ);
          orders = order ? [order] : [];
        }
      } else {
        // Try orderId (e.g. "QJL-12345")
        const order = await DatabaseManager.getOrderByOrderId(rawQ);
        if (order) {
          orders = [order];
        } else {
          // Finally fall back to name search
          orders = await DatabaseManager.getOrdersByName(rawQ.toLowerCase());
        }
      }
    }

    return res.status(200).json({
      results: orders.map(toSearchResult),
    });

  } catch (err) {
    console.error('Orders search API error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// Require a valid API key with at least read permission
export default withAPIAuth(['read'])(handler);
