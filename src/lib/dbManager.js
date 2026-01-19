// ===========================
// src/lib/dbManager.js - Database operations with Prisma
// ===========================
import prisma from './db.js';

export class DatabaseManager {
  // ==================== USERS ====================
  
  static async createUser(userData) {
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

  static async getUserByPhone(phone) {
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

  static async getUserByEmail(email) {
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

  static async upsertUser(userData) {
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
  
  static async createProduct(productData) {
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

  static async getProductById(productId) {
    try {
      return await prisma.product.findUnique({
        where: { id: productId }
      });
    } catch (error) {
      console.error('Failed to get product:', error);
      throw new Error('Unable to retrieve product');
    }
  }

  static async getProductByBarcode(barcode) {
    try {
      return await prisma.product.findUnique({
        where: { barcode }
      });
    } catch (error) {
      console.error('Failed to get product:', error);
      throw new Error('Unable to retrieve product');
    }
  }

  static async getActiveProducts() {
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

  static async updateProduct(productId, updates) {
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

  static async updateProductInventory(productId, quantityChange) {
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

  static async findOrCreateProduct(productData) {
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

  // ==================== ORDERS ====================
  
  static async createOrder(orderData) {
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

  static async getOrderByOrderId(orderId) {
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

  static async getOrdersByName(name) {
    try {
      return await prisma.order.findMany({
        where: { user: {
          wechatId: { contains: name, mode: 'insensitive' }
        } },
        include: {
          user: {
            select: {
              wechatId: true,
            },
          },
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

  static async getOrdersByPhone(phone) {
    try {
      return await prisma.order.findMany({
        where: { phone },
        include: {
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

  static async getUnpaidOrders(phone = null, email = null) {
    try {
      const where = {
        paidStatus: {
          notIn: ['已付款', 'cash', 'etransfer', '弃单']
        },
        shippingStatus: {
          notIn: ['已發貨', 'Cancelled', 'Canceled']
        },
        packingStatus: {
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

  static async updateOrderStatus(orderId, status, paymentId = null) {
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

  static async updateOrder(orderId, updates) {
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
  
  static async createOrderItem(itemData) {
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

  static async getOrderItems(orderId) {
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

  static async updateOrderItem(orderItemId, updates) {
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
  
  static async createPaymentLink(linkData) {
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

  static async getPaymentLinkByToken(token) {
    try {
      return await prisma.paymentLink.findUnique({
        where: { token }
      });
    } catch (error) {
      console.error('Failed to get payment link:', error);
      throw new Error('Unable to retrieve payment link');
    }
  }

  static async markPaymentLinkUsed(token) {
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
  
  static async createSyncLog(logData) {
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

  static async updateSyncLog(syncLogId, updates) {
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

  static async getRecentSyncLogs(limit = 10) {
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
  
  static async getProductSalesReport(startDate = null, endDate = null) {
    try {
      const where = {};
      
      if (startDate || endDate) {
        where.order = {};
        if (startDate) where.order.orderTime = { gte: new Date(startDate) };
        if (endDate) where.order.orderTime = { ...where.order.orderTime, lte: new Date(endDate) };
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

  static async getOrderStatistics() {
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
