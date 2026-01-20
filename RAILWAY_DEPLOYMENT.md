# Railway Deployment Guide

This guide explains how to deploy the POS Simulator to Railway and configure it for cloud use.

## 🚀 Quick Deployment

### 1. Connect Railway to GitHub

1. Go to [Railway](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Railway will auto-detect the project

### 2. Add PostgreSQL Database

1. In Railway dashboard, click "New" → "Database" → "PostgreSQL"
2. Railway will create a PostgreSQL instance
3. Copy the `DATABASE_URL` from the database service

### 3. Configure Environment Variables

In Railway project settings, add these environment variables:

```env
DATABASE_URL=<Railway PostgreSQL connection string>
PORT=3000
POS_API_KEY=dev-api-key-12345
NODE_ENV=production
POS_BASE_URL=https://pos.yap.net.do/api/v1
SIMULATED_DELAY_MS=0
FAILURE_RATE=0.0
```

**Important:** 
- `DATABASE_URL` is automatically provided by Railway when you add a PostgreSQL service
- `POS_BASE_URL` should be your custom domain (if configured) or Railway's generated URL

### 4. Custom Domain (Optional)

If you have a custom domain `pos.yap.net.do`:

1. In Railway project settings → "Networking"
2. Add custom domain: `pos.yap.net.do`
3. Configure DNS records as instructed by Railway

### 5. Deploy

Railway will automatically deploy on every push to `main` branch.

## 📊 Database Setup

### Initialize Schema

After first deployment, run migrations:

```bash
# Set Railway database URL
export DATABASE_PUBLIC_URL="<Railway PostgreSQL Public URL>"

# Run migrations
npx tsx src/scripts/20260115_add_paid_amount_to_ticket_items.ts
npx tsx src/scripts/20260115_add_external_provider_to_payments.ts
npx tsx src/scripts/20260115_add_currency_to_payments.ts
npx tsx src/scripts/20260115_create_payment_items.ts
```

### Seed Database

```bash
export DATABASE_PUBLIC_URL="<Railway PostgreSQL Public URL>"
npm run db:seed
```

### Verify Ticket Exists

```bash
export DATABASE_PUBLIC_URL="<Railway PostgreSQL Public URL>"
npm run db:verify-railway
```

Expected output:
```
✅ Ticket 22222222-2222-2222-2222-222222222222 is ready in Railway database!
```

## 🔗 API Endpoints

Once deployed, your POS API will be available at:

- **Production URL**: `https://pos.yap.net.do/api/v1`
- **Railway URL**: `https://<your-project>.up.railway.app/api/v1`

### Health Check

```bash
curl https://pos.yap.net.do/api/v1/health
```

### Get Ticket

```bash
curl -H "X-POS-API-KEY: dev-api-key-12345" \
  https://pos.yap.net.do/api/v1/tickets/22222222-2222-2222-2222-222222222222
```

## 🔧 YAP Integration

Configure YAP to point to the cloud POS:

```env
POS_BASE_URL=https://pos.yap.net.do/api/v1
POS_API_KEY=dev-api-key-12345
```

## 📝 Notes

- Railway automatically provides `DATABASE_URL` when PostgreSQL service is added
- Use `DATABASE_PUBLIC_URL` for local scripts that need to connect to Railway DB
- The POS server listens on `0.0.0.0` and uses `process.env.PORT` (Railway sets this automatically)
- Health checks are available at `/health` and `/api/v1/health` (no auth required)

## 🐛 Troubleshooting

### Ticket Not Found

If ticket `22222222-2222-2222-2222-222222222222` is not found:

```bash
export DATABASE_PUBLIC_URL="<Railway PostgreSQL Public URL>"
npm run db:seed
npm run db:verify-railway
```

### Database Connection Issues

- Verify `DATABASE_URL` is set in Railway environment variables
- Check Railway PostgreSQL service is running
- Ensure SSL is enabled for Railway connections (handled automatically)

### Deployment Fails

- Check Railway build logs
- Verify all dependencies are in `package.json`
- Ensure `tsx` is available (it's in `devDependencies`)
