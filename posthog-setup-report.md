<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into The Seer Within platform. The project already had a PostHog client (`server/lib/posthog.ts`) and partial instrumentation. This session extended coverage to close all remaining gaps: magic link tracking, session lifecycle, feedback, checkout completion, PayPal webhooks, and email unsubscribes. User identification (`posthog.identify`) is called on every registration and login path. Exception autocapture was already enabled via the client constructor and Express error middleware.

| Event | Description | File |
|-------|-------------|------|
| `user_registered` | New account created (email+password and magic-register). Includes `posthog.identify`. | `server/routes/auth.ts` |
| `user_logged_in` | Successful password login. Includes `posthog.identify`. | `server/routes/auth.ts` |
| `magic_link_sent` | Magic sign-in link dispatched to user's email. | `server/routes/auth.ts` |
| `magic_link_used` | Magic link verified. Includes `posthog.identify`. | `server/routes/auth.ts` |
| `email_verified` | User confirms email via verification link. Key activation event. | `server/routes/auth.ts` |
| `chat_session_started` | New chat session begins (pre-existing). | `server/routes/chatService.ts` |
| `chat_message_sent` | Message sent in a session (pre-existing). | `server/routes/chatService.ts` |
| `chat_session_ended` | Session explicitly ended; includes persona ID, reason, remaining coins. | `server/routes/chatService.ts` |
| `session_feedback_submitted` | Star rating submitted for a session. | `server/routes/chatService.ts` |
| `checkout_view_logged` | Payment modal opened (pre-existing). | `server/routes/credits.ts` |
| `checkout_initiated` | Stripe or PayPal checkout started (pre-existing). | `server/routes/credits.ts` |
| `credit_purchase_completed` | Stripe inline card payment confirmed (pre-existing). | `server/routes/credits.ts` |
| `paypal_purchase_completed` | PayPal order captured client-side (pre-existing). | `server/routes/credits.ts` |
| `confirm_checkout_completed` | Rescue-hatch Stripe Checkout flow grants coins. | `server/routes/credits.ts` |
| `stripe_webhook_purchase_completed` | Stripe webhook confirms purchase completion (pre-existing). | `server/routes/credits.ts` |
| `paypal_webhook_purchase_completed` | PayPal `PAYMENT.CAPTURE.COMPLETED` webhook processed. | `server/routes/webhooks.ts` |
| `user_unsubscribed` | User removed from follow-up email list (bounce, complaint, or manual). | `server/routes/webhooks.ts` |
| Exception autocapture | `posthog.captureException(err)` in Express error middleware (pre-existing). | `server/index.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1592541)
- [Daily New Signups](/insights/mbnYObTZ) — unique registrations per day
- [Credit Purchases Over Time](/insights/BIB5QlhU) — Stripe card, PayPal, and webhook completions per day
- [Activation Funnel: Register → Verify → First Chat](/insights/TYtTIHlf) — drop-off from registration to first chat
- [Purchase Conversion Funnel](/insights/Awjb182g) — checkout initiated → purchase completed within 1 hour
- [Email Unsubscribes & Churn Signals](/insights/CcL1kEt4) — daily unsubscribes as a leading churn indicator

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
