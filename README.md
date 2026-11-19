# HustleCart Kesses

**Your personal shopper for Kesses. We shop for you and deliver to your door.**

HustleCart Kesses is a personal shopping + delivery service platform built for the Kesses constituency in Uasin Gishu County, Kenya. One operator curates a catalog of products available at local shops, shops on behalf of customers, and delivers — with cash on delivery or M-Pesa STK push.

## Features

### Shopper
- Amazon-style storefront with search, categories, Today's Deals, and sorting
- Product cards with real images, star ratings, and yellow "Add to cart" buttons
- Product detail dialog with reviews, "Add to Cart" + "Buy Now"
- Cart drawer with delivery zone picker, Google Maps pin, and time slot scheduling
- M-Pesa STK push or Cash on Delivery at checkout
- Real-time order tracking with WebSocket live updates + SMS notifications
- Quick Order (free-text shopping list for items not in the catalog)
- Buy Again (re-order past orders with one click)
- Reviews and star ratings
- Loyalty stamp card (10 orders = free delivery)
- Referral program (share link, earn bonus stamps)
- Delivery photo proof (operator uploads, shopper sees)
- Order cancellation (before operator accepts)
- Mobile bottom navigation + PWA (installable on phone)
- Share app button (Web Share API)

### Operator Dashboard (9 tabs)
1. **Overview** — stats, 7-day chart, pending orders
2. **Orders** — queue with status stepper, profit per order, payment badges
3. **Quick Orders** — free-text shopping requests with WhatsApp contact
4. **Shopping List** — consolidated list grouped by source shop with checkboxes
5. **Daily Summary** — today's report with WhatsApp share + print
6. **Customers** — customer database with order history
7. **Catalog** — products with cost/sell/markup + image upload
8. **Source Shops** — CRUD for shops you buy from
9. **Delivery Zones** — area-based delivery fees

### Infrastructure
- Phone auth with SMS OTP (Africa's Talking with dev fallback)
- SMS notifications to shoppers on every status change
- WebSocket live order updates (shopper tracking + operator notifications with chime)
- Browser notifications for operator (new order/request alerts)
- M-Pesa Daraja integration (STK push + dev simulation + callback)
- Google Maps integration (pin location at checkout + map in order detail)
- PWA (manifest + service worker + icons)

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with shadcn/ui
- **Database**: Prisma ORM (SQLite for dev, PostgreSQL for production)
- **State**: Zustand (client) + TanStack Query (server)
- **Real-time**: Socket.io (mini-service on separate port)
- **Maps**: Leaflet + OpenStreetMap
- **Images**: Sharp (resize/optimize)
- **PWA**: manifest.json + service worker

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ or Bun
- An editor (VS Code recommended)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/hustlecart-kesses.git
cd hustlecart-kesses

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env — set HUSTLECART_OPERATOR_PHONE to your phone number

# Set up the database
npx prisma db push
npx prisma generate

# (Optional) Seed categories
npx tsx prisma/seed.ts

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Setting up the operator account

1. Set `HUSTLECART_OPERATOR_PHONE` in `.env` to your phone number (e.g., `0797859232`)
2. Sign up with that phone number → you'll be auto-promoted to the operator role
3. Add source shops, products, and delivery zones via the dashboard

### WebSocket mini-service (for live order updates)

The real-time order tracking + operator notifications require the WebSocket mini-service:

```bash
cd mini-services/order-events
npm install
npm start
```

This runs on port 3003 (socket.io) + 3004 (internal emit endpoint).

Without the mini-service, the app still works — order tracking just requires manual refresh instead of live updates.

## Deploying to Vercel

### Step 1: Switch to PostgreSQL

SQLite doesn't work on Vercel (serverless functions can't write to disk). Switch to PostgreSQL:

1. **Get a PostgreSQL database**: Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Supabase](https://supabase.com), [Neon](https://neon.tech), or [Railway](https://railway.app)

2. **Replace the Prisma schema**:
   ```bash
   cp prisma/schema-postgres.prisma prisma/schema.prisma
   ```

3. **Set the DATABASE_URL** in your `.env` to the PostgreSQL connection string:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database?schema=public
   ```

4. **Push the schema**:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Seed the database**:
   ```bash
   npx tsx prisma/seed.ts
   ```

### Step 2: Deploy the mini-service separately

The WebSocket mini-service can't run on Vercel (no long-running processes). Deploy it separately:

**Option A: Railway / Render / Fly.io**
```bash
cd mini-services/order-events
# Deploy to Railway:
railway init
railway up
```

**Option B: Skip real-time features**
If you don't need live tracking, you can skip the mini-service entirely. Order tracking will work with manual refresh. The chime + browser notifications won't fire, but SMS notifications still work.

### Step 3: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — HustleCart Kesses"
git branch -M main
git remote add origin https://github.com/yourusername/hustlecart-kesses.git
git push -u origin main
```

### Step 4: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → "Add New" → "Project"
2. Import your GitHub repo
3. **Set Environment Variables** in the Vercel dashboard:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `HUSTLECART_OPERATOR_PHONE` — your phone number
   - `AFRICASTALKING_USERNAME` — (optional) for real SMS
   - `AFRICASTALKING_API_KEY` — (optional) for real SMS
   - `AFRICASTALKING_SENDER_ID` — (optional) for real SMS
   - `DARAJA_CONSUMER_KEY` — (optional) for real M-Pesa
   - `DARAJA_CONSUMER_SECRET` — (optional) for real M-Pesa
   - `DARAJA_PASSKEY` — (optional) for real M-Pesa
   - `DARAJA_SHORTCODE` — (optional) for real M-Pesa
   - `DARAJA_CALLBACK_URL` — (optional) `https://your-domain/api/mpesa/callback`
   - `HUSTLECART_INTERNAL_TOKEN` — (optional) for WebSocket auth
4. Click "Deploy"

### Step 5: Update the Caddyfile / gateway (if using the mini-service)

If you deployed the mini-service separately, update the frontend to connect to it:
- In `src/components/orders/order-tracking.tsx` and `src/hooks/use-operator-notifications.ts`
- Change `io("/?XTransformPort=3003")` to point to your mini-service URL

### Image uploads in production

On Vercel, uploaded images (product images, delivery photos) won't persist between deployments. For production:
- Use [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) or [Cloudinary](https://cloudinary.com)
- Update the upload routes (`/api/operator/upload` and `/api/orders/[id]/delivery-photo`) to use cloud storage instead of local filesystem

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string (SQLite for dev, PostgreSQL for prod) |
| `HUSTLECART_OPERATOR_PHONE` | Yes | Phone number that gets operator role at signup |
| `AFRICASTALKING_USERNAME` | No | Africa's Talking username (sandbox or production) |
| `AFRICASTALKING_API_KEY` | No | Africa's Talking API key |
| `AFRICASTALKING_SENDER_ID` | No | SMS sender ID |
| `DARAJA_CONSUMER_KEY` | No | M-Pesa Daraja consumer key |
| `DARAJA_CONSUMER_SECRET` | No | M-Pesa Daraja consumer secret |
| `DARAJA_PASSKEY` | No | Lipa Na M-Pesa passkey |
| `DARAJA_SHORTCODE` | No | Paybill/till number (174379 for sandbox) |
| `DARAJA_CALLBACK_URL` | No | Public URL for M-Pesa callbacks |
| `DARAJA_ENV` | No | "sandbox" or "production" |
| `HUSTLECART_INTERNAL_TOKEN` | No | Shared secret for WebSocket auth |

When optional variables are not set, the app runs in **development mode** with simulated features (random OTP codes shown in the UI, simulated M-Pesa payments, SMS logged to console).

## Order Status Flow

```
PLACED → ACCEPTED → SHOPPING → OUT_FOR_DELIVERY → DELIVERED
                                                   ↗ (or CANCELLED at any point)
```

## License

This project is proprietary. © 2026 HustleCart Kesses.
