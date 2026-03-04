# Quick Start Guide
## The Seer Within - Multi-Persona Chat Service

This guide will get you up and running with the complete multi-persona psychic consultant platform.

## 🚀 Quick Setup (5 Minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Required for development
DATABASE_URL=postgresql://localhost/seer_within
ANTHROPIC_API_KEY=sk-ant-your-key-here
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Required for production
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Optional - defaults provided
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000
```

**Note:** For Replit deployment, DATABASE_URL is automatically injected when you enable the PostgreSQL module.

### 3. Initialize Database

```bash
# Push schema to database (creates all tables)
npm run db:push

# Seed default data (Evelyn Cross persona, admin account, system config)
npm run seed
```

**Default admin credentials** (change immediately!):
- Email: `admin@theseerwithin.com`
- Password: `ChangeMe123!`

### 4. Start Development Server

```bash
npm run dev
```

Server runs on http://localhost:5000

---

## 📊 Database Schema Overview

The platform uses 10 tables:

### Original Funnel Tables
1. **conversations** - Legacy funnel data (existing customers)

### New Chat Service Tables
2. **personas** - Psychic consultant profiles (Evelyn, Marcus, etc.)
3. **personaPrompts** - Versioned system prompts with A/B testing
4. **users** - Authenticated user accounts
5. **chatSessions** - Individual conversation sessions
6. **chatMessages** - Message history
7. **userMemory** - AI-generated summaries for continuity
8. **creditPurchases** - Transaction log
9. **adminUsers** - Super admin accounts
10. **systemConfig** - Platform settings

---

## 🧪 Testing

### Run Automated E2E Tests

```bash
# Make sure database is seeded first
npm run seed

# Run full test suite
npx tsx server/lib/e2eTest.ts
```

Tests cover:
- ✅ Authentication (JWT + bcrypt)
- ✅ User registration & credits
- ✅ Chat sessions & time tracking
- ✅ AI memory summarization
- ✅ Cross-persona memory transfer
- ✅ Panel readings
- ✅ Proactive outreach
- ✅ Quality scoring
- ✅ Out of credits handling

### Manual Testing (See TESTING_GUIDE.md)

For detailed manual testing instructions, see [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 🗂️ Project Structure

```
the-seer-within-2/
├── client/src/              # React frontend
│   ├── pages/
│   │   ├── ChatServicePage.tsx    # Main chat UI
│   │   ├── PersonasDirectory.tsx  # Browse personas
│   │   ├── CreditsPage.tsx        # Purchase credits
│   │   ├── LoginPage.tsx          # User login
│   │   └── admin/                 # Admin dashboard
│   ├── components/
│   └── lib/
├── server/
│   ├── lib/
│   │   ├── auth.ts               # JWT authentication
│   │   ├── creditTracking.ts    # Time-based credit system
│   │   ├── memoryManager.ts     # AI summarization
│   │   ├── personaManager.ts    # Persona CRUD
│   │   ├── promptManager.ts     # Prompt versioning
│   │   ├── chatEngine.ts        # Chat processing
│   │   ├── memoryTransfer.ts    # Cross-persona memory
│   │   ├── panelReadings.ts     # Multi-persona collaboration
│   │   ├── proactiveOutreach.ts # AI outreach
│   │   ├── marketplace.ts       # Vendor system
│   │   ├── personaTraining.ts   # Quality scoring
│   │   └── migration.ts         # Funnel data migration
│   ├── routes/
│   │   ├── auth.ts              # POST /api/auth/register, /login
│   │   ├── chatService.ts       # POST /api/chat-service/session/*
│   │   ├── credits.ts           # POST /api/credits/checkout
│   │   └── admin/               # Admin API routes
│   └── scripts/
│       └── seed.ts              # Database seeding
├── shared/
│   └── schema.ts                # Drizzle schema (10 tables)
└── migrations/                  # Auto-generated migrations
```

---

## 🌟 Key Features Implemented

### Phase 1: Core Authentication & Credits ✅
- Email/password authentication with JWT
- Time-based credit tracking (30-second heartbeat)
- Stripe payment integration
- Activity-based memory retention

### Phase 2: Multi-Persona System ✅
- Unlimited psychic consultant personas
- Per-persona pricing (admin-editable JSON)
- Persona directory with filters
- Prompt versioning with A/B testing
- Per-persona memory isolation
- Admin dashboard:
  - Persona CRUD
  - Prompt editor
  - User management
  - Analytics

### Phase 3: Advanced Features ✅
- Cross-persona memory transfer
- Panel readings (multi-persona collaboration)
- Proactive AI outreach system
- White-label marketplace with Stripe Connect
- Persona training & quality scoring
- Migration script for funnel users

---

## 🔄 User Journey

### New User Flow
1. **Discover** - Browse personas directory (public)
2. **Register** - Create account, get 3 free minutes
3. **Chat** - Select persona, start conversation
4. **Credits expire** - Prompted to purchase more time
5. **Purchase** - Stripe checkout (15min/$15, 30min/$25)
6. **Return** - Evelyn remembers previous conversations

### Returning User Flow
1. **Login** - JWT token issued
2. **Select persona** - Choose Evelyn, Marcus, or others
3. **Continuity** - AI loads top 5 memories by importance
4. **Context aware** - Persona references past conversations

### Admin Flow
1. **Login** - Separate admin authentication
2. **Manage personas** - Create, edit, activate/deactivate
3. **Edit prompts** - Version control & A/B testing
4. **View users** - See multi-persona stats, memories, sessions
5. **Adjust pricing** - Change rates without code deployment
6. **Analytics** - Revenue, session metrics, persona comparison

---

## 🔧 Configuration

### Per-Persona Pricing (Admin-Editable)

Pricing is stored as JSON in the `customPricing` column:

```json
[
  {
    "packageType": "15min",
    "minutes": 15,
    "priceUsd": 1500,
    "label": "15 Minutes - $15",
    "stripePriceId": "price_..."
  },
  {
    "packageType": "30min",
    "minutes": 30,
    "priceUsd": 2500,
    "label": "30 Minutes - $25",
    "stripePriceId": "price_..."
  }
]
```

Change via admin UI → **NO code deployment needed**

### System Configuration

Global settings in `systemConfig` table:

| Key | Value | Description |
|-----|-------|-------------|
| `platform_name` | "The Seer Within" | Platform display name |
| `default_free_minutes` | `3` | Free minutes for new users |
| `memory_retention_days` | `180` | Cleanup after inactivity |
| `session_heartbeat_seconds` | `30` | Credit checkpoint interval |
| `panel_reading_multiplier` | `1.5` | Panel reading rate multiplier |
| `outreach_enabled` | `false` | Enable proactive outreach |
| `marketplace_commission_rate` | `0.30` | Platform commission (30%) |

---

## 🔐 Security Checklist

- [x] Passwords hashed with bcrypt (10 rounds)
- [x] JWT tokens expire after 7 days
- [x] Stripe webhook signature verification
- [x] SQL injection prevention (Drizzle parameterized queries)
- [x] XSS prevention (React escapes output)
- [x] Authorization checks (users can only access own data)
- [x] Admin routes require admin JWT
- [x] Environment secrets in .env (not committed)

---

## 📈 Scaling Considerations

### Current Setup (Dev/Small Scale)
- In-memory session timers (Map)
- Single server instance
- PostgreSQL 16
- 30-second heartbeat

### Production Scaling (High Traffic)
- **Redis** - Store active session timers for distributed systems
- **Load balancer** - Multiple server instances
- **Database** - Connection pooling, read replicas
- **Heartbeat** - Separate worker process or cron job
- **Monitoring** - Sentry for errors, Datadog for metrics

---

## 🚀 Deployment Checklist

### Pre-Production
- [ ] Set strong JWT_SECRET (32+ chars random)
- [ ] Use production DATABASE_URL
- [ ] Configure production Stripe keys
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS/SSL
- [ ] Set up domain and BASE_URL

### Database
- [ ] Run `npm run db:push` on production database
- [ ] Run `npm run seed` to create admin and default persona
- [ ] Run migration script if migrating funnel users

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Track credit accuracy metrics

### Communication
- [ ] Prepare welcome email template
- [ ] Send migration emails to funnel users
- [ ] Create password reset flow
- [ ] Document user support process

---

## 🐛 Troubleshooting

### Database Connection Error
```
DATABASE_URL, ensure the database is provisioned
```
**Solution:** Create `.env` file with valid `DATABASE_URL`

### Out of Credits (Testing)
**Solution:** Manually add credits via admin panel or SQL:
```sql
UPDATE users SET credit_minutes = 100 WHERE email = 'test@example.com';
```

### Heartbeat Not Running
**Check:** `server/index.ts` line 95 calls `startHeartbeat()`
**Verify:** Active sessions in memory via logs

### Memory Not Loading
**Check:**
1. `ANTHROPIC_API_KEY` set correctly
2. Session ended successfully (triggers summarization)
3. `userMemory` table has records for the user

### Stripe Webhook Not Working
**Local dev:** Use Stripe CLI webhook forwarding
```bash
stripe listen --forward-to localhost:5000/api/credits/webhook
```
**Production:** Configure webhook in Stripe Dashboard

---

## 📚 Additional Resources

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Comprehensive testing instructions
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)

---

## 🎯 Next Steps

1. **Test the platform** - Run e2e tests and manual testing
2. **Create personas** - Add Marcus Stone, Luna Dream, etc.
3. **Configure Stripe** - Set up price IDs for credit packages
4. **Deploy to production** - Follow deployment checklist
5. **Migrate funnel users** - Run migration script
6. **Monitor & iterate** - Track usage, gather feedback, optimize

---

## 💬 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review [TESTING_GUIDE.md](./TESTING_GUIDE.md)
3. Inspect logs: `console.log` statements in server code
4. Check database: Verify table contents match expectations

---

**Ready to launch! 🚀**

The Seer Within is now a complete multi-persona psychic consultant platform with authenticated chat, time-based credits, AI-powered memory, and a full admin backend.
