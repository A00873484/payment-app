import { useState } from 'react';
import { InputValidator } from '../lib/validators';
import { AlphaPayProcessor } from '../lib/alphapay';

export default function PaymentForm({ orderData, onPaymentSuccess, onPaymentError }) {
  const [formData, setFormData] = useState({
    email: orderData.customerEmail,
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardName: orderData.customerName
  });
  
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleInputChange = (field, value) => {
    let formattedValue = value;
    
    // Apply formatting
    if (field === 'cardNumber') {
      formattedValue = AlphaPayProcessor.formatCardNumber(value);
    } else if (field === 'expiry') {
      formattedValue = AlphaPayProcessor.formatExpiryDate(value);
    } else if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '');
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    newErrors.email = InputValidator.validateEmail(formData.email);
    newErrors.cardNumber = InputValidator.validateCardNumber(formData.cardNumber);
    newErrors.expiry = InputValidator.validateExpiryDate(formData.expiry);
    newErrors.cvv = InputValidator.validateCVV(formData.cvv);
    newErrors.cardName = InputValidator.validateName(formData.cardName);
    
    // Remove null errors
    Object.keys(newErrors).forEach(key => {
      if (newErrors[key] === null) delete newErrors[key];
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsProcessing(true);
    
    try {
      const paymentData = {
        orderId: orderData.orderId,
        amount: orderData.total,
        currency: 'USD',
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
        expiry: formData.expiry,
        cvv: formData.cvv,
        cardName: InputValidator.sanitizeInput(formData.cardName),
        email: InputValidator.sanitizeInput(formData.email)
      };

      const result = await AlphaPayProcessor.processPayment(paymentData);
      onPaymentSuccess(result);
      
    } catch (error) {
      onPaymentError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const InputField = ({ label, type, field, placeholder, maxLength }) => (
    <div className="mb-6">
      <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        id={field}
        value={formData[field]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors ${
          errors[field] ? 'border-red-400' : 'border-gray-300'
        }`}
        required
      />
      {errors[field] && (
        <p className="text-red-600 text-sm mt-1">{errors[field]}</p>
      )}
    </div>
  );

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        💳 Payment Information
      </h3>
      
      <form onSubmit={handleSubmit}>
        <InputField
          label="Email Address"
          type="email"
          field="email"
          placeholder="john@example.com"
        />
        
        <InputField
          label="Card Number"
          type="text"
          field="cardNumber"
          placeholder="1234 5678 9012 3456"
          maxLength={19}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Expiry Date"
            type="text"
            field="expiry"
            placeholder="MM/YY"
            maxLength={5}
          />
          
          <InputField
            label="CVV"
            type="text"
            field="cvv"
            placeholder="123"
            maxLength={4}
          />
        </div>
        
        <InputField
          label="Name on Card"
          type="text"
          field="cardName"
          placeholder="John Doe"
        />
        
        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
            isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 hover:-translate-y-0.5 shadow-lg hover:shadow-xl'
          } text-white`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Processing Payment...
            </span>
          ) : (
            `🔒 Pay $${orderData.total.toFixed(2)} Securely`
          )}
        </button>
      </form>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center text-sm text-gray-600">
        🛡️ Your payment is secured with 256-bit SSL encryption
      </div>
    </div>
  );
}
