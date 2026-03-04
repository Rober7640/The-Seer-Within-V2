# Local Setup Guide

Get the app running on your development machine.

---

## Prerequisites

Install these before starting:

1. **Node.js 18 or higher**
   - Download from https://nodejs.org (choose LTS version)
   - Verify: `node --version` should print `v18.x.x` or higher

2. **npm** — comes bundled with Node.js
   - Verify: `npm --version`

3. **Git** — to clone and track changes

That's it. You do NOT need to install PostgreSQL locally — the database is hosted on Supabase (cloud).

---

## Step 1: Get the code

```bash
git clone <repository-url>
cd the-seer-within-2
```

---

## Step 2: Install dependencies

```bash
npm install
```

This downloads all third-party packages (like npm's version of Composer). Takes 1-2 minutes on first run.

---

## Step 3: Set up environment variables

Copy the example file:
```bash
cp .env.example .env
```

Now open `.env` in a text editor and fill in the values. Here is what each one does:

### Required for basic operation

```
DATABASE_URL
```
The connection string for the Supabase PostgreSQL database.
Format: `postgresql://postgres.[project]:[password]@[host]:6543/postgres`

**Important:** If the password contains special characters, URL-encode them:
- `#` → `%23`
- `!` → `%21`
- `*` → `%2A`
- `%` → `%25`

Get this from: Supabase dashboard → Project → Settings → Database → Connection string → Transaction pooler

```
ANTHROPIC_API_KEY
```
The key that lets the app talk to Claude AI. Without this, no AI responses work.
Get from: https://console.anthropic.com → API Keys

```
JWT_SECRET
```
A random string used to sign login tokens. Make it long and random.
Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Required for payments

```
STRIPE_SECRET_KEY         sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET     whsec_...
STRIPE_CREDITS_WEBHOOK_SECRET  whsec_... (second webhook for System 2 credits)
STRIPE_PRICE_ID_15MIN     price_...
STRIPE_PRICE_ID_30MIN     price_...
```
Get from: Stripe Dashboard → Developers → API Keys and Webhooks

```
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_MODE               sandbox   (use "live" in production)
VITE_PAYPAL_CLIENT_ID     same as PAYPAL_CLIENT_ID
```
Get from: PayPal Developer Dashboard → Apps & Credentials

### Required for emails

```
RESEND_API_KEY            re_...
FOLLOW_UP_FROM_EMAIL      hello@theseerwithin.com
FOLLOW_UP_FROM_NAME       The Seer Within
```
Get from: https://resend.com → API Keys
Note: The domain theseerwithin.com must be verified in Resend before emails will send (see deployment guide).

### Other settings

```
NODE_ENV          development   (use "production" on the server)
PORT              5000
BASE_URL          http://localhost:5000
CRON_TIMEZONE     America/New_York
MODEL_MODE        default   (options: default / economy / high-quality)
```

For local development, `MODEL_MODE=economy` saves money — it uses the cheaper Haiku model for everything.

### Optional (won't break the app if missing)

```
AWEBER_CLIENT_ID
AWEBER_CLIENT_SECRET
AWEBER_ACCOUNT_ID
AWEBER_LIST_ID
FB_PIXEL_ID
SENTRY_DSN
```

---

## Step 4: Push database schema

This creates all the tables in Supabase:

```bash
npm run db:push
```

If you see errors about connection, double-check your `DATABASE_URL` in `.env`.

This is like running `CREATE TABLE` statements but handled automatically from `shared/schema.ts`.

---

## Step 5: Seed default data

This inserts the default admin account and guide personas:

```bash
npm run seed
```

What it creates:
- Admin user: `admin@theseerwithin.com` / `ChangeMe123!`
- Evelyn Cross guide (default)
- Marcus Stone guide
- Luna Voss guide
- Nova Sharma guide
- Maren Soleil guide
- Aiden Powers guide
- System config defaults

---

## Step 6: Start the development server

```bash
npm run dev
```

This starts both the frontend and backend together on port 5000.

Open your browser to:
- System 2 (chat service): http://localhost:5000/personas
- System 1 (funnel): http://localhost:5000/
- Admin panel: http://localhost:5000/admin/login

---

## Verification: is it working?

1. Visit http://localhost:5000/api/health — should return JSON with `"status": "healthy"`
2. Visit http://localhost:5000/personas — should show the guide directory
3. Log into admin: http://localhost:5000/admin/login with `admin@theseerwithin.com` / `ChangeMe123!`
4. Create a test user at http://localhost:5000/personas and try clicking "Start Chat"

---

## Common problems

**"Cannot connect to database"**
- Check `DATABASE_URL` in `.env`
- Make sure password special characters are URL-encoded
- Try connecting with a PostgreSQL client (like TablePlus or DBeaver) to verify credentials

**"npm install fails"**
- Try deleting `node_modules` folder and `package-lock.json`, then run `npm install` again
- Make sure Node.js version is 18 or higher

**"Port 5000 is already in use"**
- Another process is on port 5000. Either kill it or change `PORT=5001` in `.env`

**AI guide doesn't respond**
- Check `ANTHROPIC_API_KEY` is set and valid
- Check the Anthropic account has credits

**Stripe payments don't work in development**
- Use Stripe test card: `4242 4242 4242 4242`, any future date, any 3-digit CVC
- Make sure you're using `sk_test_...` not `sk_live_...`

---

## Useful development commands

```bash
npm run dev           # Start the server (backend + frontend together)
npm run check         # TypeScript type checking — find type errors
npm run db:push       # Push schema changes to database
npm run seed          # Re-seed default data (safe to run multiple times)
npm test              # Run Playwright end-to-end tests
npm run test:headed   # Run tests with a visible browser (useful for debugging)
npm run test:debug    # Run tests in debug mode, step through each action
```

---

## Project file structure

```
the-seer-within-2/
├── client/                 Frontend (React)
│   └── src/
│       ├── pages/          One file per page/route
│       ├── components/     Reusable UI components
│       └── App.tsx         Route definitions
├── server/                 Backend (Node.js + Express)
│   ├── routes/             API endpoint handlers
│   │   └── admin/          Admin-only endpoints
│   ├── lib/                Business logic, utilities
│   ├── scripts/            One-off scripts (seed.ts)
│   └── index.ts            Server entry point
├── shared/
│   └── schema.ts           Database table definitions (source of truth)
├── docs/                   Documentation
│   └── handover/           This folder
├── tests/                  Playwright test files
├── .env.example            Template for environment variables
├── .env                    Your actual env vars (never commit this)
├── package.json            Dependencies and scripts
└── CLAUDE.md               Full project reference
```
