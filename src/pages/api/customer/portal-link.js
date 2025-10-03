import { CustomerAuthManager } from '../../../lib/customerAuth';
import { InputValidator } from '../../../lib/validators';
import { withAPIAuth } from '../../../lib/middleware/apiAuth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerEmail, customerName } = req.body;

    // Validate email
    const emailError = InputValidator.validateEmail(customerEmail);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    // Generate customer portal token
    const token = await CustomerAuthManager.generateCustomerToken({
      customerEmail: InputValidator.sanitizeInput(customerEmail),
      customerName: customerName ? InputValidator.sanitizeInput(customerName) : null
    });

    // Generate portal URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const portalUrl = `${baseUrl}/customer/portal?token=${token}`;

    console.log(`Portal link generated for: ${customerEmail}`);

    res.status(200).json({
      success: true,
      portalUrl,
      token,
      customerEmail,
      expiresIn: '30d',
      message: 'Customer portal link generated successfully'
    });

  } catch (error) {
    console.error('Portal link generation failed:', error);
    res.status(500).json({ error: error.message });
  }
}

export default withAPIAuth(['write'])(handler);