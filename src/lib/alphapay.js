import axios from 'axios';
import { config } from './config.js';

export class AlphaPayProcessor {
  static async processPayment(paymentData) {
    try {
      console.log('Processing payment with AlphaPay:', {
        ...paymentData,
        cardNumber: '**** **** **** ' + paymentData.cardNumber.slice(-4),
        cvv: '***'
      });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful payment
      const paymentResult = {
        success: true,
        paymentId: `alphapay_${Date.now()}`,
        transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
        amount: paymentData.amount,
        currency: 'USD',
        status: 'completed',
        processedAt: new Date().toISOString()
      };

      return paymentResult;

      // Production implementation:
      /*
      const response = await axios.post('https://api.alphapay.com/v1/charges', {
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency,
        source: {
          number: paymentData.cardNumber,
          exp_month: paymentData.expiry.split('/')[0],
          exp_year: '20' + paymentData.expiry.split('/')[1],
          cvc: paymentData.cvv,
          name: paymentData.cardName
        },
        description: `Order ${paymentData.orderId}`,
        metadata: {
          orderId: paymentData.orderId,
          email: paymentData.email
        }
      }, {
        headers: {
          'Authorization': `Bearer ${config.alphaPay.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
      */
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw new Error('Payment processing failed. Please try again.');
    }
  }

  static formatCardNumber(cardNumber) {
    return cardNumber.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  static formatExpiryDate(expiry) {
    return expiry.replace(/\D/g, '').replace(/(\d{2})(?=\d)/, '$1/');
  }
}
