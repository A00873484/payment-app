# Order Payment Processing App

A secure Next.js application for processing order payments with **Prisma database** and Google Sheets integration for data entry.

## 🚀 Features

- **Prisma Database**: Fast, reliable data storage with PostgreSQL/MySQL/SQLite
- **Google Sheets Integration**: Master sheet for data entry, syncs to database
- **JWT Token Authentication**: Secure tokenized payment links
- **AlphaPay Payment Processing**: Secure payment handling
- **Email Notifications**: Automated confirmation emails
- **Customer Portal**: Phone-based authentication for customers
- **Admin Dashboard**: NextAuth with Google OAuth
- **Input Validation**: Comprehensive validation with Validator.js
- **Responsive Design**: Mobile-friendly Tailwind CSS interface
- **Real-time Updates**: Fast database queries
- **Product Catalog**: Centralized product management with inventory
- **Analytics**: Sales reports and order statistics

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: Prisma ORM with PostgreSQL/MySQL/SQLite
- **Authentication**: JWT (jose library), NextAuth.js
- **Validation**: Validator.js
- **Payment Processing**: AlphaPay integration
- **Email Service**: Nodemailer
- **Data Entry**: Google Sheets (Master sheet)

## 📦 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd payment-app
npm install
```

### 2. Setup Database

**Choose your database:**

**PostgreSQL (Recommended):**
```bash
# Install PostgreSQL, then:
createdb payment_app
```

**SQLite (Quick Start):**
```bash
# Update prisma/schema.prisma:
# Change provider = "postgresql" to provider = "sqlite"
```

**MySQL:**
```bash
# Install MySQL, then:
mysql -u root -p -e "CREATE DATABASE payment_app;"
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Database - Choose ONE:
DATABASE_URL="postgresql://username:password@localhost:5432/payment_app?schema=public"
# DATABASE_URL="mysql://username:password@localhost:3306/payment_app"
# DATABASE_URL="file:./dev.db"

# Google Sheets (for Master sheet sync)
GOOGLE_SHEETS_API_KEY=your_api_key
SPREADSHEET_ID=your_spreadsheet_id

# AlphaPay
ALPHAPAY_SECRET_KEY=your_secret
NEXT_PUBLIC_ALPHAPAY_PUBLIC_KEY=your_public_key

# JWT & NextAuth
JWT_SECRET=your_jwt_secret_min_32_chars
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email
EMAIL_SERVICE_API_KEY=your_email_api_key
EMAIL_SERVICE_ENDPOINT=your_email_endpoint

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Setup Database Tables

```bash
npm run db:push
```

### 5. Seed Sample Data (Optional)

```bash
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

### 7. View Database

```bash
npm run db:studio
```

Opens Prisma Studio at http://localhost:5555

## 🗄️ Database Schema

```
Users (from sheet_user)
  ├─ phone (unique)
  ├─ email (unique)
  ├─ name
  ├─ wechatId
  └─ orders[]

Products (from sheet_products)
  ├─ productName
  ├─ brand
  ├─ specification
  ├─ inventory
  ├─ basePrice
  ├─ barcode (unique)
  └─ orderItems[]

Orders (from sheet_orders + master)
  ├─ orderId (unique, your custom ID)
  ├─ userId
  ├─ phone
  ├─ totalOrderAmount
  ├─ paidStatus
  ├─ shippingStatus
  ├─ packingStatus
  └─ orderItems[]

OrderItems (from sheet_orderItems + master)
  ├─ orderId
  ├─ productId
  ├─ productName
  ├─ quantity
  ├─ priceAtPurchase
  └─ totalProductAmount

PaymentLinks (new!)
  ├─ orderId
  ├─ token
  ├─ expiresAt
  └─ usedAt

SyncLogs (new!)
  ├─ sheetName
  ├─ recordsAdded
  ├─ recordsUpdated
  └─ status
```

## 🔄 Google Sheets Integration

### Master Sheet → Database Sync

Your team continues using Google Sheets for data entry. The app syncs to database:

**Manual Sync via API:**
```bash
curl -X POST http://localhost:3000/api/sync/master \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Or programmatically:**
```javascript
import { SyncService } from './src/lib/syncService.js';
await SyncService.syncMasterToDatabase();
```

**Sync single order:**
```javascript
await SyncService.syncSingleOrder('ORD-12345');
```

## 🔧 Usage

### 1. Data Entry in Google Sheets

Your team enters orders in the Master sheet as usual.

### 2. Sync to Database

Run sync (manual or scheduled) to import orders into database.

### 3. Generate Payment Links

```bash
POST /api/generate-payment-link
{
  "orderId": "ORD-12345",
  "customerEmail": "customer@example.com"
}
```

### 4. Send Payment Emails

```bash
POST /api/send-payment-email
{
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "orderId": "ORD-12345",
  "paymentUrl": "https://yourapp.com/payment?orderId=ORD-12345&token=...",
  "orderTotal": 69.97
}
```

### 5. Customer Portal

Customers access their orders via phone authentication:
```
https://yourapp.com/customer/portal
```

### 6. Payment Processing Flow

1. Customer receives email with payment link
2. Clicks link → validates JWT token
3. Order details fetched from **database** (fast!)
4. Completes payment form
5. Payment processed via AlphaPay
6. Database updated immediately
7. Confirmation email sent

## 🏗️ Project Structure

```
payment-app/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.js                # Sample data
├── src/
│   ├── components/            # React components
│   │   ├── LoadingSpinner.js
│   │   ├── ErrorMessage.js
│   │   ├── OrderDetails.js
│   │   ├── PaymentForm.js
│   │   └── PaymentSuccess.js
│   ├── lib/                   # Core logic
│   │   ├── db.ts             # Prisma client
│   │   ├── dbManager.ts      # Database operations
│   │   ├── syncService.js    # Sheets → DB sync
│   │   ├── sheets.js         # Google Sheets API
│   │   ├── validators.js     # Input validation
│   │   ├── jwt.js           # JWT handling
│   │   ├── alphapay.js      # Payment processing
│   │   ├── email.js         # Email service
│   │   └── const.js         # Constants/column mappings
│   ├── pages/
│   │   ├── api/             # API routes
│   │   │   ├── orders/[orderId].js
│   │   │   ├── payment/process.js
│   │   │   ├── sync/master.js      # NEW: Sync endpoint
│   │   │   ├── customer/orders.js
│   │   │   └── ...
│   │   ├── admin/           # Admin pages
│   │   ├── customer/        # Customer portal
│   │   ├── payment.js       # Payment page
│   │   └── index.js
│   └── styles/
│       └── globals.css
├── docs/                     # Documentation
│   ├── QUICK_START.md       # Fast setup guide
│   ├── PRISMA_SETUP.md      # Detailed setup
│   └── WHATS_DIFFERENT.md   # Migration guide
└── .env.local               # Configuration
```

## 🔐 Security Features

- JWT Token Validation for payment links
- Input Sanitization with Validator.js
- Server-side Validation on all endpoints
- HTTPS/TLS encryption
- NextAuth for admin authentication
- Rate limiting ready
- SQL injection prevention (Prisma)

## 💳 Payment Flow

1. **Order Creation**: Entered in Master sheet
2. **Sync**: Imported to database
3. **Link Generation**: JWT tokens with order info
4. **Validation**: Server-side token verification
5. **Payment**: Secure AlphaPay integration
6. **Update**: Database updated immediately
7. **Confirmation**: Email sent to customer

## 📊 Database Operations

### Query Examples

```javascript
import { DatabaseManager } from './src/lib/dbManager.ts';

// Get order with items and product details
const order = await DatabaseManager.getOrderByOrderId('ORD-123');

// Get customer's unpaid orders
const orders = await DatabaseManager.getAllOrders({ activeOrdersOnly: true }, '555-0100');

// Update order status
await DatabaseManager.updateOrderStatus('ORD-123', '已付款', 'PAY-123');

// Get sales report
const report = await DatabaseManager.getProductSalesReport();

// Get statistics
const stats = await DatabaseManager.getOrderStatistics();
```

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Add DATABASE_URL to Vercel environment variables
# Then deploy:
vercel --prod
```

### Railway / Render / Fly.io

1. Add database (PostgreSQL)
2. Set environment variables
3. Run migrations: `npx prisma migrate deploy`
4. Deploy app

## 🛠️ Commands

```bash
# Development
npm run dev                  # Start dev server
npm run build               # Build for production
npm start                   # Start production server

# Database
npm run db:generate         # Generate Prisma Client
npm run db:push            # Push schema changes (dev)
npm run db:migrate         # Create migrations (prod)
npm run db:studio          # Open database browser
npm run db:seed            # Seed sample data

# Sync
# Via API: POST /api/sync/master
```

## 📚 Documentation

- **[Quick Start](docs/QUICK_START.md)** - Get running in 5 minutes
- **[Prisma Setup](docs/PRISMA_SETUP.md)** - Detailed database setup
- **[What's Different](docs/WHATS_DIFFERENT.md)** - Sheets vs Database comparison

## 🧪 Testing

Replace mock implementations in production:
- ✅ DatabaseManager - Already connected to real DB
- ✅ AlphaPayProcessor - Connect to real AlphaPay API
- ✅ EmailService - Configure with your email provider

## 🐛 Troubleshooting

### Database Issues
```bash
# Check connection
npm run db:studio

# Reset database
npm run db:push -- --force-reset
npm run db:seed
```

### Sync Issues
- Check Google Sheets credentials in `.env.local`
- Verify spreadsheet ID is correct
- Check column names match `const.js`

### Common Errors
- "DATABASE_URL not found" → Check `.env.local`
- "Can't reach database" → Check if DB is running
- Prisma errors → Run `npm run db:generate`

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📞 Support

- Check documentation in `docs/`
- Review code comments
- Open an issue on GitHub

---

**New to this project?** Start with [`docs/QUICK_START.md`](docs/QUICK_START.md)
