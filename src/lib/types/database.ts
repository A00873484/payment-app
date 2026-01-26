// src/lib/types/database.ts
// TypeScript types for database operations

import { Order, OrderItem, User } from "@prisma/client";

export interface CreateUserData {
  phone: string;
  wechatId?: string | null;
  name: string;
  nameEn?: string | null;
  address?: string | null;
  email?: string | null;
}

export interface CreateProductData {
  brand?: string | null;
  productName: string;
  specification?: string | null;
  inventory?: number;
  picture?: string | null;
  barcode?: string | null;
  basePrice?: number;
  active?: boolean;
  category?: string | null;
}

export interface CreateOrderData {
  orderId: string;
  userId?: string | null;
  phone: string;
  wordChain?: string | null;
  paymentStatus?: string | null;
  remarks?: string | null;
  orderTime?: Date;
  shippingCost?: number;
  totalOrderAmount: number;
  paidStatus?: string;
  packingStatus?: string;
  shippingStatus?: string;
  address?: string | null;
  shipping1?: string | null;
  shipping2?: string | null;
  fulfillable?: boolean;
  paymentId?: string | null;
}

export interface CreateOrderItemData {
  productId: string;
  orderId: string;
  brand?: string | null;
  productName: string;
  specification?: string | null;
  quantity: number;
  totalProductAmount: number;
  packed?: boolean;
  delivered?: boolean;
  fulfillable?: boolean;
}

export interface CreatePaymentLinkData {
  orderId: string;
  token: string;
  customerEmail: string;
  customerName?: string | null;
  expiresAt: Date;
}

export interface CreateSyncLogData {
  sheetName: string;
  syncType: string;
}

export interface UpdateSyncLogData {
  status?: string;
  recordsAdded?: number;
  recordsUpdated?: number;
  recordsFailed?: number;
  errorMessage?: string | null;
}

export interface ProductSalesReportItem {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export interface OrderStatistics {
  totalOrders: number;
  paidOrders: number;
  unpaidOrders: number;
  totalRevenue: number;
}

export interface OrderWithItems extends Order {
  orderItems: OrderItem[];
  user?: User | null;
}

export interface CustomerWithOrders extends User {
  orders: OrderWithItems[];
}

export interface ErrorResponse {
  success?: false;
  error: string;
}

export interface SuccessResponse {
  success?: boolean;
  message: string;
}

export interface Filters {
  activeOrdersOnly?: boolean;
}