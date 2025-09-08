# Order Payment Processing App

A secure Next.js application for processing order payments with Google Sheets integration and AlphaPay payment processing.

## 🚀 Features

- **JWT Token Authentication**: Secure tokenized payment links
- **Google Sheets Integration**: Order data retrieval and status updates
- **AlphaPay Payment Processing**: Secure payment handling
- **Email Notifications**: Automated confirmation emails
- **Input Validation**: Comprehensive validation with Validator.js
- **Responsive Design**: Mobile-friendly Tailwind CSS interface
- **Real-time Form Validation**: Live validation with error messaging
- **Security**: XSS protection and input sanitization

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Authentication**: JWT (jose library)
- **Validation**: Validator.js
- **Payment Processing**: AlphaPay integration
- **Email Service**: Nodemailer
- **Google Sheets**: Google APIs

## 📦 Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd order-payment-app
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env.local` file with:
   ```env
   GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key
   SPREADSHEET_ID=your_spreadsheet_id
   ALPHAPAY_SECRET_KEY=your_alphapay_secret_key
   NEXT_PUBLIC_ALPHAPAY_PUBLIC_KEY=your_alphapay_public_key
   JWT_SECRET=your_jwt_secret_key
   EMAIL_SERVICE_API_KEY=your_email_service_api_key
   EMAIL_SERVICE_ENDPOINT=your_email_service_endpoint
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

## 🔧 Usage

### 1. Generate Payment Links

Use the API endpoint to generate secure payment links:

```javascript
POST /api/generate-payment-link
{
  "orderId": "ORD-12345",
  "customerEmail": "customer@example.com"
}
```

### 2. Send Payment Emails

Send payment notification emails:

```javascript
POST /api/send-payment-email
{
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "orderId": "ORD-12345",
  "paymentUrl": "https://yourapp.com/payment?orderId=ORD-12345&token=...",
  "orderTotal": 69.97
}
```

### 3. Payment Processing Flow

1. User receives email with "Pay Now" button
2. Clicks link to access payment page
3. JWT token is validated
4. Order details are fetched from Google Sheets
5. User completes payment form
6. Payment is processed via AlphaPay
7. Order status is updated in Google Sheets
8. Confirmation email is sent

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── LoadingSpinner.js
│   ├── ErrorMessage.js
│   ├── OrderDetails.js
│   ├── PaymentForm.js
│   └── PaymentSuccess.js
├── lib/                  # Utility libraries
│   ├── config.js        # Configuration
│   ├── validators.js    # Input validation
│   ├── jwt.js          # JWT handling
│   ├── sheets.js       # Google Sheets API
│   ├── alphapay.js     # AlphaPay integration
│   └── email.js        # Email service
├── pages/
│   ├── api/            # API routes
│   │   ├── orders/[orderId].js
│   │   ├── payment/process.js
│   │   ├── generate-payment-link.js
│   │   └── send-payment-email.js
│   ├── _app.js
│   ├── _document.js
│   ├── index.js
│   └── payment.js      # Main payment page
└── styles/
    └── globals.css     # Global styles
```

## 🔐 Security Features

- **JWT Token Validation**: Secure, time-limited payment links
- **Input Sanitization**: XSS protection using Validator.js
- **Server-side Validation**: Comprehensive API validation
- **HTTPS Enforcement**: SSL/TLS encryption
- **Rate Limiting**: (Implement as needed)

## 📧 Email Integration

The app supports multiple email service providers:
- Nodemailer for SMTP services
- SendGrid, Mailgun, or other REST APIs
- Custom email templates with order details

## 💳 Payment Flow

1. **Token Generation**: JWT tokens with order information
2. **Validation**: Server-side token verification
3. **Order Retrieval**: Fetch order details from Google Sheets
4. **Payment Processing**: Secure AlphaPay integration
5. **Status Update**: Update Google Sheets with payment status
6. **Confirmation**: Send email confirmation with pickup instructions

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Other Platforms
```bash
npm run build
npm start
```

## 🧪 Testing

Replace mock implementations in production:
- `SheetsManager.fetchOrderDetails()` - Implement actual Google Sheets API calls
- `AlphaPayProcessor.processPayment()` - Connect to real AlphaPay API
- `EmailService.sendConfirmationEmail()` - Configure with your email provider

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments for implementation details