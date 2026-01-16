# 1. Update schema to use SQLite
# Edit prisma/schema.prisma, change:
# provider = "postgresql"  to  provider = "sqlite"

# 2. Set DATABASE_URL in .env.local
echo 'DATABASE_URL="file:./dev.db"' >> .env.local

# 3. Install dependencies
npm install

# 4. Generate Prisma Client
npm run db:generate

# 5. Create tables
npm run db:push

# 6. Seed from Master sheet
npm run db:seed-master

# 7. View data (opens browser)
npm run db:studio

# 8. Start app
npm run dev