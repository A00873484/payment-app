import validator from 'validator';

export class InputValidator {
  static validateEmail(email: string) {
    if (!email || !validator.isEmail(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  static validateCardNumber(cardNumber: string) {
    const sanitized = cardNumber.replace(/\s/g, '');
    if (!validator.isCreditCard(sanitized)) {
      return 'Please enter a valid card number';
    }
    return null;
  }

  static validateExpiryDate(expiry: string) {
    const sanitized = validator.escape(expiry);
    if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(sanitized)) {
      return 'Please enter expiry date in MM/YY format';
    }
    
    // Check if date is in the future
    const [month, year] = expiry.split('/');
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const now = new Date();
    
    if (expiryDate < now) {
      return 'Card has expired';
    }
    
    return null;
  }

  static validateCVV(cvv: string) {
    const sanitized = validator.escape(cvv);
    if (!/^[0-9]{3,4}$/.test(sanitized)) {
      return 'Please enter a valid CVV (3-4 digits)';
    }
    return null;
  }

  static validateName(name: string) {
    if (!name || name.trim().length < 2 || name.trim().length > 50) {
      return 'Name must be between 2 and 50 characters';
    }
    return null;
  }

  static sanitizeInput(input: string | number): string {
    return validator.escape(input.toString().trim());
  }
}
