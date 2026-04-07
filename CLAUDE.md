# payment-app

Multi-order payment portal bridging Google Sheets/Drive data with a Next.js web app. Customers search orders and pay via portal links; admins manage orders, run syncs, and send bulk emails.

## Tech Stack

- **Framework**: Next.js 15 (App Router via `pages/`) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL via Prisma 6 ORM
- **Auth**: NextAuth (admin dashboard) + JWT/jose (customer portal)
- **External**: Google Sheets API, Google Drive API, AlphaPay, nodemailer
- **Deploy**: Vercel (with cron job)

## Dev Commands

```bash
npm run dev          # Start dev server (turbopack)
npm run build        # Production build
npm run lint         # ESLint

npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Sync schema to DB (dev)
npm run db:migrate   # Create a migration (prod)
npm run db:studio    # Visual DB admin UI
npm run db:seed      # Seed with test data
npm run db:seed-master  # Seed from Google Sheets Master
```

## Project Layout

```
src/
  pages/
    admin/           # Admin dashboard (index.tsx), signin, sync
    customer/        # Customer portal (portal.tsx)
    api/
      admin/         # Bulk payment links, emails, order status
      auth/          # NextAuth config
      cron/          # process-drive-folders (runs daily at 6 AM via Vercel)
      customer/      # Customer order API
      orders/        # Order search
      payment/       # AlphaPay payment processing
      sync/          # Manual Drive/sheet sync triggers
    index.tsx        # Public order search page
    payment.js       # Legacy payment page
  components/
    OrderSearch.tsx  # Reusable search (admin & public modes)
  lib/
    dbManager.ts     # All DB CRUD (users, orders, products, payment links)
    driveFolderSync.ts  # Google Drive Excel file processing
    rawSheetsSync.ts    # Raw sheet format parsing → DB records
    email.ts            # Email templates + nodemailer
    masterSheetSync.ts  # Master sheet sync
    config.ts           # Env-based config
    const.ts            # Sheet column mappings (Master, Raw-QJL, Raw-PT)
    jwt.ts              # Customer portal token generation/validation
    middleware/apiAuth.ts  # API key auth + role-based access
    alphapay.js         # Payment gateway integration
    types/              # api.ts, database.ts
prisma/
  schema.prisma    # DB schema: User, Product, Order, OrderItem, PaymentLink, SyncLog
  seed.js
scripts/
  seed-from-master.js
docs/              # Architecture, setup guides
apps-script/       # Google Apps Script code
```

## Path Aliases

`@/*` maps to `src/*` — use for all internal imports.

## API Authentication

All `/api/*` routes use API key middleware (`src/lib/middleware/apiAuth.ts`).

- **Roles**: `admin`, `sync`, `read`
- Pass key as `x-api-key` header or `apiKey` query param
- Keys configured in `.env` — see `.env.example` for variable names

## Sheet Formats

The app handles three Google Sheets formats — column mappings are in `src/lib/const.ts`:
- **Master** — canonical order data
- **Raw-QJL** — raw import format (QJL)
- **Raw-PT** — raw import format (PT)

Format is auto-detected by required column headers during Drive sync.

## Environment Variables

See `.env.example` for all ~45 required vars. Key categories:
- `DATABASE_URL` — PostgreSQL connection
- `NEXTAUTH_*` — NextAuth config + OAuth credentials
- `API_KEY_*` — API keys per role
- `GOOGLE_*` / `SHEETS_*` / `DRIVE_*` — Google integrations
- `SMTP_*` — Email
- `ALPHAPAY_*` — Payment gateway
- `NEXT_PUBLIC_BASE_URL` — App base URL
- `CRON_SECRET` — Set by Vercel for cron security

## Vercel Cron

`vercel.json` schedules `GET /api/cron/process-drive-folders` at `0 6 * * *` (6 AM UTC daily).

## Database

Prisma schema at `prisma/schema.prisma`. Key models:
- `User` — customers (phone, email, name, WeChat, address)
- `Product` — product catalog
- `Order` — order records with payment/fulfillment status
- `OrderItem` — line items
- `PaymentLink` — JWT-based portal links with expiry
- `SyncLog` — audit trail for all syncs

After schema changes: `npm run db:generate` then `npm run db:migrate` (or `db:push` for dev).
