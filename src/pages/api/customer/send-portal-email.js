import { CustomerAuthManager } from '../../../lib/customerAuth';
import { EmailService } from '../../../lib/email';
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

    // Generate customer portal token (same as portal-link)
    const token = await CustomerAuthManager.generateCustomerToken({
      customerEmail: InputValidator.sanitizeInput(customerEmail),
      customerName: customerName ? InputValidator.sanitizeInput(customerName) : null
    });

    // Generate portal URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const portalUrl = `${baseUrl}/customer/portal?token=${token}`;

    // Send email with portal link (THIS IS THE DIFFERENCE)
    await EmailService.sendCustomerPortalEmail(
      customerEmail,
      customerName || 'Customer',
      portalUrl
    );

    console.log(`Portal link email sent to: ${customerEmail}`);

    res.status(200).json({
      success: true,
      message: 'Portal link email sent successfully',
      portalUrl, // Still return the URL for admin reference
      customerEmail,
      expiresIn: '30d'
    });

  } catch (error) {
    console.error('Send portal email failed:', error);
    res.status(500).json({ error: error.message });
  }
}

export default withAPIAuth(['write'])(handler);