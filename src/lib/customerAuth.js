import { SignJWT, jwtVerify } from 'jose';
import { config } from './config.js';

const secret = new TextEncoder().encode(config.jwt.secret);

export class CustomerAuthManager {
  // Generate customer portal token (tied to customer email/ID)
  static async generateCustomerToken(customerData) {
    const { customerId, customerEmail, customerName } = customerData;
    
    return await new SignJWT({
      customerId: customerId || customerEmail, // Use email as ID if no customerId
      customerEmail,
      customerName,
      type: 'customer_portal'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d') // 30 days for customer portal access
      .sign(secret);
  }

  // Verify customer token
  static async verifyCustomerToken(token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      
      if (payload.type !== 'customer_portal') {
        return { valid: false, error: 'Invalid token type' };
      }
      
      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}