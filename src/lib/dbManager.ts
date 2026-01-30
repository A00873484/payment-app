// ===========================
// src/lib/dbManager.ts - Database operations with Prisma
// ===========================
import prisma from './db';
import type {
  CreateUserData,
  CreateProductData,
  CreateOrderData,
  CreateOrderItemData,
  CreatePaymentLinkData,
  CreateSyncLogData,
  UpdateSyncLogData,
  ProductSalesReportItem,
  OrderStatistics,
  OrderWithItems,
  CustomerWithOrders,
  Filters
} from './types/database';
import type { User, Product, Order, OrderItem, PaymentLink, SyncLog, Prisma } from '@prisma/client';

export class DatabaseManager {
  // ==================== USERS ====================
  
  static async createUser(userData: CreateUserData): Promise<User> {
    try {
      return await prisma.user.create({
        data: {
          phone: userData.phone,
          wechatId: userData.wechatId || null,
          name: userData.name,
          nameEn: userData.nameEn || null,
          address: userData.address || null,
          email: userData.email || null,
        }
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      throw new Error('Unable to create user');
    }
  }

  static async getUserByPhone(phone: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { phone },
        include: {
          orders: {
            where: {
              paidStatus: {
                notIn: ['已付款', 'cash', 'etransfer', '弃单']
              }
            },
            orderBy: { orderTime: 'desc' }
          }
        }
      });
    } catch (error) {
      console.error('Failed to get user:', error);
      throw new Error('Unable to retrieve user');
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email },
        include: {
          orders: {
            orderBy: { orderTime: 'desc' }
          }
        }
      });
    } catch (error) {
      console.error('Failed to get user:', error);
      throw new Error('Unable to retrieve user');
    }
  }

  static async upsertUser(userData: CreateUserData): Promise<User> {
    try {
      return await prisma.user.upsert({
        where: { phone: userData.phone },
        update: {
          wechatId: userData.wechatId || undefined,
          name: userData.name,
          nameEn: userData.nameEn || undefined,
          address: userData.address || undefined,
          email: userData.email || undefined,
        },
        create: {
          phone: userData.phone,
          wechatId: userData.wechatId || null,
          name: userData.name,
          nameEn: userData.nameEn || null,
          address: userData.address || null,
          email: userData.email || null,
        }
      });
    } catch (error) {
      console.error('Failed to upsert user:', error);
      throw new Error(`Unable to save user: ${error}`);
    }
  }

  // ==================== PRODUCTS ====================
  
  static async createProduct(productData: CreateProductData): Promise<Product> {
    try {
      return await prisma.product.create({
        data: {
          brand: productData.brand || null,
          productName: productData.productName,
          specification: productData.specification || null,
          inventory: productData.inventory || 0,
          picture: productData.picture || null,
          barcode: productData.barcode || null,
          basePrice: productData.basePrice || 0,
          active: productData.active !== false,
          category: productData.category || null,
        }
      });
    } catch (error) {
      console.error('Failed to create product:', error);
      throw new Error('Unable to create product');
    }
  }

  static async getProductById(productId: string): Promise<Product | null> {
    try {
      return await prisma.product.findUnique({
        where: { id: productId }
      });
    } catch (error) {
      console.error('Failed to get product:', error);
      throw new Error('Unable to retrieve product');
    }
  }

  static async getProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      return await prisma.product.findUnique({
        where: { barcode }
      });
    } catch (error) {
      console.error('Failed to get product:', error);
      throw new Error('Unable to retrieve product');
    }
  }

  static async getActiveProducts(): Promise<Product[]> {
    try {
      return await prisma.product.findMany({
        where: { active: true },
        orderBy: { productName: 'asc' }
      });
    } catch (error) {
      console.error('Failed to get products:', error);
      throw new Error('Unable to retrieve products');
    }
  }

  static async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    try {
      return await prisma.product.update({
        where: { id: productId },
        data: updates
      });
    } catch (error) {
      console.error('Failed to update product:', error);
      throw new Error('Unable to update product');
    }
  }

  static async updateProductInventory(productId: string, quantityChange: number): Promise<Product> {
    try {
      return await prisma.product.update({
        where: { id: productId },
        data: {
          inventory: {
            increment: quantityChange
          }
        }
      });
    } catch (error) {
      console.error('Failed to update inventory:', error);
      throw new Error('Unable to update inventory');
    }
  }

  static async findOrCreateProduct(productData: CreateProductData): Promise<Product> {
    try {
      // Try to find by barcode first
      if (productData.barcode) {
        const existing = await prisma.product.findUnique({
          where: { barcode: productData.barcode }
        });
        if (existing) return existing;
      }

      // Try to find by name + specification
      const existing = await prisma.product.findFirst({
        where: {
          productName: productData.productName,
          specification: productData.specification || null
        }
      });

      if (existing) return existing;

      // Create new product
      return await this.createProduct(productData);
    } catch (error) {
      console.error('Failed to find or create product:', error);
      throw new Error('Unable to process product');
    }
  }

  // ==================== CUSTOMERS ====================

  static async getAllCustomers(filters: Filters): Promise<CustomerWithOrders[]> {
    if(!filters) filters = {};
    const where: Prisma.OrderWhereInput = {};
    if (filters?.activeOrdersOnly) {
      where.paidStatus = {
        notIn: ['已付款', 'cash', 'etransfer', '弃单']
      };
      where.shippingStatus = {
        notIn: ['已發貨', 'Cancelled', 'Canceled']
      };
      where.packingStatus = {
        notIn: ['未完成那箱', '已取消']
      };
    }
    
    try {
      return await prisma.user.findMany({
        include: {
          orders: {
            where,
            include: {
              orderItems: {
                include: {
                  product: true
                }
              }
            },
            orderBy: { orderTime: 'desc' }
          }
        },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('Failed to get customers:', error);
      throw new Error('Unable to retrieve customers');
    }
  }

  // ==================== ORDERS ====================
  
  static async createOrder(orderData: CreateOrderData): Promise<Order> {
    try {
      return await prisma.order.create({
        data: {
          orderId: orderData.orderId,
          userId: orderData.userId || null,
          phone: orderData.phone,
          wordChain: orderData.wordChain || null,
          paymentStatus: orderData.paymentStatus || null,
          remarks: orderData.remarks || null,
          orderTime: orderData.orderTime || new Date(),
          shippingCost: orderData.shippingCost || 0,
          totalOrderAmount: orderData.totalOrderAmount,
          paidStatus: orderData.paidStatus || 'pending',
          packingStatus: orderData.packingStatus || 'pending',
          shippingStatus: orderData.shippingStatus || 'pending',
          address: orderData.address || null,
          shipping1: orderData.shipping1 || null,
          shipping2: orderData.shipping2 || null,
          fulfillable: orderData.fulfillable !== false,
          paymentId: orderData.paymentId || null,
        }
      });
    } catch (error) {
      console.error('Failed to create order:', error);
      throw new Error('Unable to create order');
    }
  }

  static async getOrderByOrderId(orderId: string): Promise<OrderWithItems | null> {
    try {
      return await prisma.order.findUnique({
        where: { orderId },
        include: {
          orderItems: {
            include: {
              product: true
            }
          },
          user: true
        }
      });
    } catch (error) {
      console.error('Failed to get order:', error);
      throw new Error('Unable to retrieve order');
    }
  }
  
  static async getOrdersByName(name: string): Promise<OrderWithItems[]> {
    try {
      return await prisma.order.findMany({
        where: { user: {
          name: { contains: name, mode: 'insensitive' }
        } },
        include: {
          user: true,
          orderItems: {
            include: {
              product: true
            }
          }
        },
        orderBy: { orderTime: 'desc' }
      });
    } catch (error) {
      console.error('Failed to get orders:', error);
      throw new Error('Unable to retrieve orders');
    }
  }

  static async getOrdersByPhone(phone: string): Promise<OrderWithItems[]> {
    try {
      return await prisma.order.findMany({
        where: { phone },
        include: {
          user: true,
          orderItems: {
            include: {
              product: true
            }
          }
        },
        orderBy: { orderTime: 'desc' }
      });
    } catch (error) {
      console.error('Failed to get orders:', error);
      throw new Error('Unable to retrieve orders');
    }
  }

  static async getAllOrders(filters: Filters,phone: string | null = null, email: string | null = null): Promise<OrderWithItems[]> {
    try {
      const where: Prisma.OrderWhereInput = {}
      if (filters?.activeOrdersOnly) {
        where.paidStatus = {
          notIn: ['已付款', 'cash', 'etransfer', '弃单']
        };
        where.shippingStatus = {
          notIn: ['已發貨', 'Cancelled', 'Canceled']
        };
        where.packingStatus = {
          notIn: ['未完成那箱', '已取消']
        }
      };

      if (phone || email) {
        where.OR = [];
        if (phone) where.OR.push({ phone });
        if (email) {
          where.OR.push({
            user: {
              email
            }
          });
        }
      }

      return await prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: true
            }
          },
          user: true
        },
        orderBy: { orderTime: 'desc' }
      });
    } catch (error) {
      console.error('Failed to get unpaid orders:', error);
      throw new Error('Unable to retrieve unpaid orders');
    }
  }

  static async updateOrderStatus(orderId: string, status: string, paymentId: string | null = null): Promise<Order> {
    try {
      return await prisma.order.update({
        where: { orderId },
        data: {
          paidStatus: status,
          paymentId: paymentId || undefined,
        }
      });
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw new Error('Unable to update order status');
    }
  }

  static async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    try {
      return await prisma.order.update({
        where: { orderId },
        data: updates
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      throw new Error('Unable to update order');
    }
  }

  // ==================== ORDER ITEMS ====================
  
  static async createOrderItem(itemData: CreateOrderItemData): Promise<OrderItem> {
    try {
      const priceAtPurchase = itemData.totalProductAmount / itemData.quantity;
      
      return await prisma.orderItem.create({
        data: {
          productId: itemData.productId,
          orderId: itemData.orderId,
          brand: itemData.brand || null,
          productName: itemData.productName,
          specification: itemData.specification || null,
          quantity: itemData.quantity,
          totalProductAmount: itemData.totalProductAmount,
          priceAtPurchase,
          packed: itemData.packed || false,
          delivered: itemData.delivered || false,
          fulfillable: itemData.fulfillable !== false,
        }
      });
    } catch (error) {
      console.error('Failed to create order item:', error);
      throw new Error('Unable to create order item');
    }
  }

  static async getOrderItems(orderId: string) {
    try {
      return await prisma.orderItem.findMany({
        where: { orderId },
        include: {
          product: true
        }
      });
    } catch (error) {
      console.error('Failed to get order items:', error);
      throw new Error('Unable to retrieve order items');
    }
  }

  static async updateOrderItem(orderItemId: string, updates: Partial<OrderItem>): Promise<OrderItem> {
    try {
      return await prisma.orderItem.update({
        where: { id: orderItemId },
        data: updates
      });
    } catch (error) {
      console.error('Failed to update order item:', error);
      throw new Error('Unable to update order item');
    }
  }

  // ==================== PAYMENT LINKS ====================
  
  static async createPaymentLink(linkData: CreatePaymentLinkData): Promise<PaymentLink> {
    try {
      return await prisma.paymentLink.create({
        data: {
          orderId: linkData.orderId,
          token: linkData.token,
          customerEmail: linkData.customerEmail,
          customerName: linkData.customerName || null,
          expiresAt: linkData.expiresAt,
        }
      });
    } catch (error) {
      console.error('Failed to create payment link:', error);
      throw new Error('Unable to create payment link');
    }
  }

  static async getPaymentLinkByToken(token: string): Promise<PaymentLink | null> {
    try {
      return await prisma.paymentLink.findUnique({
        where: { token }
      });
    } catch (error) {
      console.error('Failed to get payment link:', error);
      throw new Error('Unable to retrieve payment link');
    }
  }

  static async markPaymentLinkUsed(token: string): Promise<PaymentLink> {
    try {
      return await prisma.paymentLink.update({
        where: { token },
        data: { usedAt: new Date() }
      });
    } catch (error) {
      console.error('Failed to mark payment link as used:', error);
      throw new Error('Unable to update payment link');
    }
  }

  // ==================== SYNC LOG ====================
  
  static async createSyncLog(logData: CreateSyncLogData): Promise<SyncLog> {
    try {
      return await prisma.syncLog.create({
        data: {
          sheetName: logData.sheetName,
          syncType: logData.syncType,
          status: 'RUNNING',
          startedAt: new Date(),
          recordsAdded: 0,
          recordsUpdated: 0,
          recordsFailed: 0,
        }
      });
    } catch (error) {
      console.error('Failed to create sync log:', error);
      throw new Error('Unable to create sync log');
    }
  }

  static async updateSyncLog(syncLogId: string, updates: UpdateSyncLogData): Promise<SyncLog> {
    try {
      return await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          ...updates,
          completedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update sync log:', error);
      throw new Error('Unable to update sync log');
    }
  }

  static async getRecentSyncLogs(limit: number = 10): Promise<SyncLog[]> {
    try {
      return await prisma.syncLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('Failed to get sync logs:', error);
      throw new Error('Unable to retrieve sync logs');
    }
  }

  // ==================== ANALYTICS ====================
  
  static async getProductSalesReport(startDate: string | null = null, endDate: string | null = null): Promise<ProductSalesReportItem[]> {
    try {
      const where: Prisma.OrderItemWhereInput = {};
      
      if (startDate || endDate) {
        where.order = {};
        if (startDate) {
          if( endDate ) where.order.orderTime = { gte: new Date(startDate), lte: new Date(endDate) };
          else where.order.orderTime = { gte: new Date(startDate) };
        }
        else if (endDate) where.order.orderTime = { lte: new Date(endDate) };
      }

      const salesData = await prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where,
        _sum: {
          quantity: true,
          totalProductAmount: true,
        },
        _count: {
          id: true,
        },
      });

      return salesData.map(item => ({
        productId: item.productId,
        productName: item.productName,
        totalQuantity: item._sum.quantity || 0,
        totalRevenue: item._sum.totalProductAmount || 0,
        orderCount: item._count.id,
      }));
    } catch (error) {
      console.error('Failed to generate sales report:', error);
      throw new Error('Unable to generate sales report');
    }
  }

  static async getOrderStatistics(): Promise<OrderStatistics> {
    try {
      const [
        totalOrders,
        paidOrders,
        unpaidOrders,
        totalRevenue,
      ] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({
          where: {
            paidStatus: {
              in: ['已付款', 'cash', 'etransfer']
            }
          }
        }),
        prisma.order.count({
          where: {
            paidStatus: {
              notIn: ['已付款', 'cash', 'etransfer', '弃单']
            }
          }
        }),
        prisma.order.aggregate({
          where: {
            paidStatus: {
              in: ['已付款', 'cash', 'etransfer']
            }
          },
          _sum: {
            totalOrderAmount: true
          }
        }),
      ]);

      return {
        totalOrders,
        paidOrders,
        unpaidOrders,
        totalRevenue: totalRevenue._sum.totalOrderAmount || 0,
      };
    } catch (error) {
      console.error('Failed to get order statistics:', error);
      throw new Error('Unable to retrieve statistics');
    }
  }
}

export default DatabaseManager;
