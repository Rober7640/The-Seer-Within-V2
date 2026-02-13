# The Seer Within - Psychic Chat Funnel

## Overview

A psychic reading chat funnel application featuring "Evelyn Cross," a warm, maternal psychic persona. Users receive AI-powered personalized readings through an interactive chat interface, with a conversion flow leading to paid readings via Stripe checkout. The application uses Claude AI for generating contextual, empathetic responses with cold-reading techniques.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Conversations table storing user data, bucket selection, responses, and purchase status
- **Session**: In-memory storage for development, PostgreSQL sessions for production

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
- **PostgreSQL** - Primary data store via Drizzle ORM
  - Requires `DATABASE_URL` environment variable
  - Migrations in `/migrations` directory

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

### Optional Services
- **Supabase** (`@supabase/supabase-js`) - Alternative/additional database integration
  - Configured via `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Development Tools
- **Replit Plugins** - Cartographer, dev banner, runtime error overlay (dev only)
- **TypeScript** - Strict mode enabled with path aliases (`@/*`, `@shared/*`)