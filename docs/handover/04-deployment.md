# Deployment Guide

How to get the app running on a production server.

---

## What the app needs to run

- **Node.js 18+** on the server
- **One open port** (default 5000, or 80/443 with a reverse proxy)
- **All environment variables** set (see `03-local-setup.md` and the go-live checklist)
- **No local database** — database is Supabase (cloud), no PostgreSQL needed on your server

The app serves both the frontend (React) and backend (API) from a single Node.js process on a single port. No separate web server like Apache or Nginx is strictly required, though you may want one in front as a reverse proxy.

---

## Option A: Railway (Recommended — easiest)

Railway is a cloud platform that works well with Node.js apps.

1. Create an account at https://railway.app
2. Connect your GitHub repository
3. Railway will detect it's a Node.js app automatically
4. Add all environment variables in the Railway dashboard (Settings → Variables)
5. Set the start command: `npm run start` (or it reads `package.json` automatically)
6. Deploy — Railway builds and starts the app

**Build process Railway runs:**
```bash
npm install
npm run build   # compiles TypeScript and bundles the app
npm run start   # starts the production server
```

After first deploy, run these one-time commands via Railway's shell:
```bash
npm run db:push   # create tables in database
npm run seed      # insert default data
```

---

## Option B: Render

Similar to Railway.

1. Create account at https://render.com
2. New → Web Service → connect repository
3. Build command: `npm install && npm run build`
4. Start command: `npm run start`
5. Add environment variables in Render dashboard
6. Run `npm run db:push` and `npm run seed` via Render Shell after first deploy

---

## Option C: VPS (DigitalOcean, Hetzner, Linode, etc.)

If you're using a Linux VPS:

**1. Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**2. Install PM2 (process manager — keeps the app running)**
```bash
sudo npm install -g pm2
```

**3. Clone the repository**
```bash
git clone <repo-url> /var/www/the-seer-within
cd /var/www/the-seer-within
```

**4. Set up environment variables**
```bash
cp .env.example .env
nano .env   # fill in all values
```

**5. Build and seed**
```bash
npm install
npm run build
npm run db:push
npm run seed
```

**6. Start with PM2**
```bash
pm2 start npm --name "seer-within" -- run start
pm2 save        # save so it restarts on reboot
pm2 startup     # set up system service
```

**7. Check it's running**
```bash
pm2 status
pm2 logs seer-within
```

**8. Optional: Nginx reverse proxy**

If you want to serve on port 80/443:
```nginx
server {
    listen 80;
    server_name theseerwithin.com www.theseerwithin.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then add SSL with Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d theseerwithin.com -d www.theseerwithin.com
```

---

## Build process explained

```bash
npm run build
```

This runs `tsx script/build.ts` which:
1. Compiles TypeScript → JavaScript
2. Bundles all server code into `dist/index.cjs`
3. Builds the React frontend with Vite into `dist/public/`

```bash
npm run start
```

Starts the compiled server: `node dist/index.cjs`

The server:
- Serves the React frontend as static files from `dist/public/`
- Handles all `/api/*` requests as backend routes
- Runs scheduled cron jobs (email, cleanup)
- Handles Stripe and Resend webhooks

---

## Environment variables for production

Change these from their development defaults:

```
NODE_ENV=production           # enables production optimisations
BASE_URL=https://theseerwithin.com   # your actual domain (no trailing slash)
PAYPAL_MODE=live              # switch from sandbox to live PayPal
STRIPE_SECRET_KEY=sk_live_... # use live Stripe key (not test)
STRIPE_WEBHOOK_SECRET=whsec_... # update with webhook secret from live Stripe
```

---

## Stripe webhook setup

Stripe must be told where to send payment notifications.

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://theseerwithin.com/api/webhooks/stripe`
3. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the Signing Secret → paste as `STRIPE_WEBHOOK_SECRET` in your `.env`

Repeat for the credits webhook:
- Add endpoint: `https://theseerwithin.com/api/webhooks/stripe` (same URL)
- Copy the Signing Secret → paste as `STRIPE_CREDITS_WEBHOOK_SECRET`

---

## Resend domain verification (required for emails)

Before any guide emails can be sent, verify the domain in Resend:

1. Go to https://resend.com → Domains → Add Domain
2. Enter: `theseerwithin.com`
3. Resend gives you 3 DNS records (2 DKIM + 1 SPF)
4. Add these records in your DNS provider (Cloudflare, GoDaddy, etc.)
5. Wait 5-30 minutes for DNS propagation
6. Domain turns green in Resend dashboard

One domain verification covers all guide email addresses
(evelyn@, marcus@, luna@, etc.) since they all share the same domain.

---

## Health check endpoints

Use these to verify the app is running correctly:

```
GET /api/health        Full health check — returns DB, AI, Stripe status
GET /api/ready         Simple readiness probe (for load balancers)
GET /api/metrics       Prometheus-format metrics (for monitoring)
```

Example health check response:
```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "anthropic": "ok",
    "stripe": "ok",
    "resend": "ok"
  }
}
```

---

## Updating the app

After making code changes:

```bash
git pull
npm install          # only needed if package.json changed
npm run build
pm2 restart seer-within   # on VPS
```

On Railway/Render: push to GitHub → auto-deploys.

---

## Database migrations

If `shared/schema.ts` changes (new columns or tables added):

```bash
npm run db:push
```

This is safe to run on a live database — it only adds new columns/tables, does not delete existing data.

---

## Monitoring and logs

**VPS with PM2:**
```bash
pm2 logs seer-within          # live logs
pm2 logs seer-within --lines 200  # last 200 lines
```

**Railway/Render:** View logs in the dashboard.

**Health check URL:** Bookmark `https://theseerwithin.com/api/health` — check it after any deployment.
