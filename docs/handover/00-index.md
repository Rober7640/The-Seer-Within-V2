# Handover Package — Start Here

Welcome to **The Seer Within** project. This folder contains everything a developer needs to take over, finish loose ends, and go live.

## Read these in order

| File | What it covers |
|------|---------------|
| `00-index.md` | This file — orientation |
| `01-platform-flowchart.md` | How the whole app works (ASCII diagrams) |
| `02-database-schema.md` | Every database table explained for SQL developers |
| `03-local-setup.md` | Get it running on your machine |
| `04-deployment.md` | Deploy to a real server |
| `05-remaining-todos.md` | What is NOT done yet — bugs + features |
| `06-go-live-checklist.md` | Run through this before pressing the big red button |
| `07-using-skills.md` | How to run the security audit tools |

---

## What is this project?

A website where users pay to chat with AI-powered spiritual advisors ("guides"). There are two separate systems in one codebase:

**System 1 — Conversion Funnel** (the original product)
- One guide: Evelyn Cross
- No accounts needed, one-time reading
- Payment via Stripe ($35)
- Two product upsells after payment
- Entry point: `http://yoursite.com/`

**System 2 — Chat Service** (the newer product)
- Multiple guides (Evelyn Cross, Marcus Stone, Luna Voss, Nova Sharma, Maren Soleil, Aiden Powers)
- Users create accounts
- Credit/coin system — buy minutes, chat with guides
- Payment via Stripe and PayPal
- Entry point: `http://yoursite.com/personas`

**Admin Panel**
- Manage guides, users, emails, analytics
- Entry point: `http://yoursite.com/admin/login`

---

## Tech stack — what you need to know as a PHP developer

This is **not** a PHP app. The backend is Node.js. The concepts map across like this:

| PHP concept | This app's equivalent |
|-------------|----------------------|
| PHP runtime | Node.js (JavaScript on the server) |
| Apache/Nginx + PHP-FPM | Express.js (handles HTTP requests) |
| MySQL / PDO | Supabase PostgreSQL + Drizzle ORM |
| Eloquent / ActiveRecord | Drizzle ORM (TypeScript query builder) |
| Blade / Twig templates | React (frontend renders in the browser) |
| `.htaccess` | Express middleware / routes |
| Composer | npm (package manager) |
| `php artisan migrate` | `npm run db:push` |
| `php artisan db:seed` | `npm run seed` |
| `php -S localhost:8000` | `npm run dev` |
| Cron jobs | Built-in Node.js cron (runs inside the server process) |
| Session files | JWT tokens stored in browser localStorage |

---

## Key people and services

| Service | What it does | Env var |
|---------|-------------|---------|
| **Supabase** | PostgreSQL database (cloud-hosted) | `DATABASE_URL` |
| **Anthropic** | The AI that powers all guide responses | `ANTHROPIC_API_KEY` |
| **Stripe** | Credit card payments | `STRIPE_SECRET_KEY` |
| **PayPal** | Alternative payment (credits purchase) | `PAYPAL_CLIENT_ID` |
| **Resend** | Sends re-engagement emails from guides | `RESEND_API_KEY` |
| **AWeber** | Email marketing list (optional) | `AWEBER_*` |

---

## Default login credentials

**Admin panel** (`/admin/login`):
- Email: `admin@theseerwithin.com`
- Password: `ChangeMe123!`
- **Change this immediately on the production server.**

**Test user**: Create one at `/login`, it will receive 3 free minutes (180 coins) automatically.
