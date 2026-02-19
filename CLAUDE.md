# The Seer Within - Multi-Persona Spiritual Reading Platform

## Overview

A comprehensive spiritual reading platform featuring multiple AI-powered personas. The application includes:

1. **Original Conversion Funnel** - Single-session psychic reading experience with "Evelyn Cross"
2. **Multi-Persona Chat Service** - Account-based system with multiple spiritual advisors, credit system, and persistent chat history

Users receive AI-powered personalized readings through an interactive chat interface. The original funnel leads to paid readings via Stripe checkout, while the new chat service offers ongoing relationships with multiple personas using a minutes-based credit system.

## Quick Start

### Initial Setup

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**

   Copy `.env.example` to `.env` and configure:

   ```env
   # Required - Database
   DATABASE_URL=postgresql://postgres.[project]:[password]@...pooler.supabase.com:6543/postgres

   # Required - AI
   ANTHROPIC_API_KEY=sk-ant-...

   # Required - Security
   JWT_SECRET=your-secure-random-string

   # Required - Payments
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_15MIN=price_...
   STRIPE_PRICE_ID_30MIN=price_...

   # Optional - Marketing
   AWEBER_CLIENT_ID=
   AWEBER_CLIENT_SECRET=
   FB_PIXEL_ID=
   FB_ACCESS_TOKEN=
   ```

   **⚠️ Important:** URL-encode special characters in database password:
   - `#` → `%23`
   - `!` → `%21`
   - `*` → `%2A`
   - `%` → `%25`

3. **Setup Database**
   ```bash
   npm run db:push    # Push schema to Supabase
   npm run seed       # Seed default data
   ```

4. **Start Development Server**
   ```bash
   npm run dev        # Backend on port 5000
   npm run dev:client # Frontend (if separate)
   ```

5. **Access the Application**
   - Original Funnel: http://localhost:5000/
   - Chat Service Login: http://localhost:5000/login
   - Admin Dashboard: http://localhost:5000/admin/login

### Default Accounts

**Admin:**
- Email: `admin@theseerwithin.com`
- Password: `ChangeMe123!`

**Test User:**
- Create new account at `/login`
- Receives 3 free minutes automatically

## User Preferences

Preferred communication style: Simple, everyday language.

## Application Routes

### Original Conversion Funnel
**Entry Point:** `/`

| Route | Description |
|-------|-------------|
| `/` | Landing page with Evelyn Cross |
| `/chat` | Single-session psychic reading |
| `/welcome1` | Upsell 1: Protection Ritual ($47) |
| `/welcome2` | Upsell 2: Manifestation Bracelet ($47/$30) |
| `/success` | Purchase confirmation |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/refund` | Refund policy |

### Multi-Persona Chat Service
**Entry Point:** `/login`

| Route | Description |
|-------|-------------|
| `/login` | User registration and login |
| `/reading` | Multi-persona chat interface |
| `/personas` | Browse available spiritual advisors |
| `/credits` | Purchase additional minutes |

### Admin Dashboard
**Entry Point:** `/admin/login`

| Route | Description |
|-------|-------------|
| `/admin/login` | Admin authentication |
| `/admin/personas` | Manage spiritual advisor personas |
| `/admin/personas/new` | Create new persona |
| `/admin/personas/:id` | Edit existing persona |
| `/admin/prompts` | Manage system prompts and A/B tests |
| `/admin/users` | View and manage user accounts |
| `/admin/users/:id` | User detail and credit history |
| `/admin/analytics` | Platform metrics and insights |

## Dual System Architecture

### System 1: Original Conversion Funnel
**Routes:** `/` → `/chat` → `/welcome1` → `/welcome2` → `/success`

**Features:**
- Landing page with Evelyn Cross
- Single-session psychic reading chat
- Guided conversation flow with state machine
- Stripe checkout for $35 main offer / $25 downsell
- Two upsell offers (Protection Ritual $47, Manifestation Bracelet $47/$30)
- Email capture and AWeber integration
- Facebook Pixel tracking

### System 2: Multi-Persona Chat Service
**Routes:** `/login` → `/reading` → `/credits` → `/personas`

**Features:**
- User authentication and persistent accounts
- Credit/minutes-based system (3 free minutes on signup)
- Multiple spiritual advisor personas:
  - **Evelyn Cross** (default) - Spiritual guide for love, money, and purpose
  - **Marcus Stone** - Tarot master and shadow work specialist
- Chat history and memory persistence
- Stripe integration for purchasing additional minutes
- Admin dashboard for managing personas, prompts, and users
- Per-persona custom pricing

**Backend Integration:**
- Shared Supabase database for both systems
- User accounts link to conversation data
- Personas stored with customizable pricing and system prompts
- Credit tracking and usage monitoring

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with Vite as the build tool
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS v4 with custom theme variables for cosmic/mystical aesthetics
- **UI Components**: shadcn/ui component library (New York style) with Radix UI primitives
- **Fonts**: Inter (body) + Playfair Display (headings/logo)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **API Design**: RESTful endpoints under `/api/*`
- **AI Integration**: Anthropic Claude API (claude-sonnet-4-20250514 model) for generating psychic readings
- **Build System**: esbuild for server bundling, Vite for client

### Conversation Flow
The chat implements a state machine with phases:
1. **Greeting/Name Capture** - Initial engagement
2. **Bucket Selection** - User chooses topic (love, money, purpose, someone specific)
3. **Deepening** - Multiple rounds of engagement and reading
4. **Crisis/Pitch** - Reveal blocks, build urgency, present offer
5. **Checkout** - Stripe integration for payments ($35 main / $25 downsell)
6. **Upsell 1** - Protection Ritual + Lava Stone ($47) at `/upsell`
7. **Upsell 2** - Manifestation Bracelet ($47 full / $30 downsell) at `/upsell2`
   - Two entry paths: Path A (bought Upsell 1, has shipping) vs Path B (declined Upsell 1, needs shipping)
   - Claude AI generates personalized manifest reveal + stone personalization
   - 3 interactive questions with quick reply options
   - 1-click charge or fallback Stripe checkout
   - Shipping reuse (Path A) or new collection (Path B)

### Data Storage
- **Database**: Supabase (PostgreSQL) via Drizzle ORM
- **Schema**:
  - `conversations` - Original funnel conversation data
  - `users` - User accounts with email, password, credit balance
  - `personas` - Spiritual advisor profiles with pricing and prompts
  - `persona_prompts` - System prompts with A/B testing support
  - `chat_sessions` - Multi-persona chat sessions
  - `chat_messages` - Individual messages with token usage tracking
  - `user_memories` - Persistent context across sessions
  - `credit_transactions` - Credit purchase and usage history
  - `admin_users` - Admin accounts for dashboard access
  - `system_config` - Platform-wide configuration settings
- **Session**: In-memory storage for development, PostgreSQL sessions for production
- **Seeding**: `npm run seed` populates default personas and admin account

### Key Design Patterns
- **Prompt Engineering**: Structured prompts with Barnum statements and cold-reading techniques
- **Intent Detection**: Client-side classification of user responses (positive, objection, gibberish, etc.)
- **Typing Simulation**: Realistic delays based on message length to simulate human typing
- **Session Persistence**: LocalStorage for conversation state with 24-hour expiry

## External Dependencies

### AI Services
- **Anthropic Claude API** (`@anthropic-ai/sdk`) - Powers all psychic reading responses
  - Requires `ANTHROPIC_API_KEY` environment variable

### Payment Processing
- **Stripe** - Checkout sessions for purchasing readings
  - Requires `STRIPE_SECRET_KEY` environment variable
  - Webhook handling at `/api/webhook`

### Database
- **Supabase (PostgreSQL)** - Primary data store via Drizzle ORM
  - Requires `DATABASE_URL` environment variable (Supabase connection string with Transaction pooling)
  - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
  - **Important**: Special characters in password must be URL-encoded
  - Migrations managed via `drizzle-kit`
  - Commands:
    - `npm run db:push` - Push schema to database
    - `npm run seed` - Seed default data (admin user, personas, config)

### Email Marketing
- **AWeber** - Email list management for lead capture
  - Configured via `AWEBER_ACCESS_TOKEN`, `AWEBER_REFRESH_TOKEN`
  - Account/list via `AWEBER_ACCOUNT_ID`, `AWEBER_LIST_ID`
  - Optional: `AWEBER_CLIENT_ID`, `AWEBER_CLIENT_SECRET` for token refresh
  - Subscribers tagged with bucket type + 'seer-within'
  - Non-blocking integration in `/api/lead` endpoint

### Facebook Tracking
- **Facebook Pixel & Conversions API** - Dual tracking with event deduplication
  - Client-side: Facebook Pixel in `client/index.html`
  - Server-side: Conversions API in `server/lib/facebook.ts`
  - Endpoint: `/api/fb-event` for server-side events
  - Environment variables: `FB_PIXEL_ID`, `FB_ACCESS_TOKEN`
  - Events tracked:
    - **PageView** - On every page navigation (App.tsx)
    - **Lead** - When user enters email in chat (useConversation.ts)
    - **InitiateCheckout** - When user clicks purchase CTA (useConversation.ts)
    - **Purchase** - When upsell page loads after $35 payment (UpsellPage.tsx)
  - Uses event_id for client/server deduplication

## Admin Dashboard

**Route:** `/admin/login` → `/admin/personas` | `/admin/prompts` | `/admin/users` | `/admin/analytics`

**Features:**
- Secure admin authentication separate from user accounts
- **Personas Management** - Create, edit, and configure spiritual advisors
- **Prompts Editor** - Manage system prompts with A/B testing variants
- **Users Management** - View user accounts, credit balances, and usage
- **Analytics Dashboard** - Track platform metrics and performance

**Default Admin Credentials:**
- Email: `admin@theseerwithin.com`
- Password: `ChangeMe123!` (⚠️ Change immediately after first login)

## Testing

**Test Suite:** Playwright end-to-end tests (40 tests across 6 files)

**Test Files:**
- `tests/auth.spec.ts` - User authentication and registration
- `tests/credits.spec.ts` - Credit purchase and balance management
- `tests/admin.spec.ts` - Admin dashboard functionality
- `tests/chat.spec.ts` - Chat functionality
- `tests/personas.spec.ts` - Persona selection and display
- `tests/memory.spec.ts` - Context persistence

**Commands:**
- `npm test` - Run all tests
- `npm run test:ui` - Run tests with UI
- `npm run test:headed` - Run tests in headed mode
- `npm run test:debug` - Debug tests

### Test Ideas Backlog

A running list of Playwright tests to write as features are built is maintained at:

```
C:\Users\joelc\.cursor\plans\Test ideas MD.md
```

**Convention:** Whenever a new feature is implemented, add the corresponding test cases to that file before considering the feature done. Each entry uses `[ ]` checklist format so tests can be converted directly into Playwright specs.

### Development Tools
- **Replit Plugins** - Cartographer, dev banner, runtime error overlay (dev only)
- **TypeScript** - Strict mode enabled with path aliases (`@/*`, `@shared/*`)

## Recent Updates

### Database & Infrastructure
✅ Connected Supabase PostgreSQL database
✅ Implemented database seeding with default personas and admin account
✅ Fixed free minutes allocation (3 minutes granted on user registration)

### Multi-Persona System
✅ Added user authentication and account management
✅ Implemented credit/minutes-based pricing system
✅ Created two default personas (Evelyn Cross, Marcus Stone)
✅ Built admin dashboard for persona and user management
✅ Added per-persona custom pricing configuration

### Testing & Quality
✅ Fixed form accessibility for test automation (added `name` attributes)
✅ Updated test suite URLs to match current routing
✅ Verified core functionality (registration, login, credit granting)
✅ Comprehensive test coverage across 6 test files (40 tests)

### Technical Improvements
✅ Environment variable management with URL encoding for special characters
✅ Database migration system with drizzle-kit
✅ Proper error handling and logging
✅ Session management and JWT authentication