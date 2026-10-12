// preview-04-journey — click through offer 04's whole journey in a real browser, with NO
// database, NO Stripe and NO AWeber:
//
//   booking page → TURN MY CUP → Upsell 1 → Upsell 2 → thank-you page
//
// The real client (Vite, via the app's own setupVite) is served; the few /api calls these
// pages make are answered here with fake data, so the "payment" buttons just move her on.
// ⛔ Nothing here can charge or email anyone: there is no Stripe key, no AWeber token and
// no database connection in this process — every /api route below is a local stub.
//
//   npx tsx improve-v1/v1-one-time-BEs/scripts/preview-04-journey.ts      # then open
//   http://localhost:5096/offers/wiccan/tea-reading?fn=Sarah
//
// The price is one fixed price under a $35 / $45 split test (operator 2026-10-11 — no ladder).
// The page shows arm A ($35) by default; add ?arm=B to the booking URL to see arm B ($45). The
// stub checkout charges the arm the page printed (`quotedArm`).
process.env.VITE_BACKEND_CHECKOUT_LIVE = 'true'; // so the button calls the stub below, not the preview log
process.env.NODE_ENV = 'development';

import express from 'express';
import { createServer } from 'http';
import { setupVite } from '../../../server/vite';

const PORT = Number(process.env.PORT || 5096);
const ARMS: Record<string, number> = { A: 3500, B: 4500 };
const BUMP_CENTS = 1277;
const label = (c: number) => (c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`);

interface PreviewOrder {
  firstName: string | null;
  bump: boolean;
  arm: string;
  upsellPurchased: boolean;
}
const orders = new Map<string, PreviewOrder>();
let seq = 0;

const app = express();
app.use(express.json());

// The real endpoint resolves her arm from ?subject= (the draft test ⇒ A for everyone); this stub
// answers A, or the ?arm= preview the page passes through.
app.get('/api/backend/offers/tea-reading/price', (req, res) => {
  const asked = String(req.query.arm ?? '').toUpperCase();
  const arm = asked in ARMS ? asked : 'A';
  res.set('cache-control', 'no-store').json({
    offer: 'tea-reading', arm, cents: ARMS[arm], label: label(ARMS[arm]),
    ...(asked in ARMS ? { preview: true } : {}),
  });
});

// "Checkout": no Stripe page — straight to Upsell 1, the way Stripe's success URL would.
app.post('/api/backend/checkout', (req, res) => {
  const b = req.body ?? {};
  const id = `cs_preview_04_${++seq}`;
  orders.set(id, {
    firstName: typeof b.firstName === 'string' && b.firstName ? b.firstName : null,
    bump: !!b.bump,
    // The stub charges the arm the page printed (the real checkout re-resolves it server-side).
    arm: typeof b.quotedArm === 'string' && b.quotedArm in ARMS ? b.quotedArm : 'A',
    upsellPurchased: false,
  });
  console.log(`[preview] checkout → ${id}`, { bump: !!b.bump, quotedArm: b.quotedArm ?? null });
  res.json({ url: `/offers/upsell/welcome1?session_id=${id}` });
});

app.get('/api/backend/upsell/user-data', (req, res) => {
  const id = String(req.query.session_id || '');
  const o = orders.get(id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  res.json({
    firstName: o.firstName, email: 'preview@example.test', offer: 'tea-reading',
    bucket: null, personName: null,
    upsell1PriceCents: 4700, upsell2PriceCents: 4700, upsell2DownsellCents: 3000,
    hasSavedCard: true, upsellPurchased: o.upsellPurchased,
    hasShipping: o.upsellPurchased, shipping: null,
  });
});

app.post('/api/backend/upsell/charge', (req, res) => {
  const id = String(req.body?.checkoutSessionId || '');
  const o = orders.get(id);
  if (o) o.upsellPurchased = true;
  console.log('[preview] upsell charge (fake)', req.body);
  res.json({ success: true, paymentIntentId: `pi_preview_${++seq}` });
});

app.post('/api/backend/upsell/shipping', (req, res) => {
  console.log('[preview] shipping (fake)', req.body?.address ?? null);
  res.json({ ok: true });
});

app.get('/api/backend/order/:id', (req, res) => {
  const o = orders.get(req.params.id);
  if (!o || req.query.offer !== 'tea-reading') return res.status(404).json({ error: 'Order not found.' });
  const readingCents = ARMS[o.arm] ?? ARMS.A;
  res.json({
    order: {
      reference: req.params.id.slice(-6).toUpperCase(), offer: 'tea-reading', offerNumber: '04',
      email: 'preview@example.test', status: 'paid', deliveryHours: 24, deliveredAt: null,
      firstName: o.firstName, readingCents,
      bumpPurchased: o.bump, bumpCents: o.bump ? BUMP_CENTS : 0,
      bumpProductKey: o.bump ? 'double_turning' : null,
      amountCents: readingCents + (o.bump ? BUMP_CENTS : 0),
    },
  });
});

// Anything else under /api (analytics, PostHog relays, …) — a quiet no-op.
app.use('/api', (_req, res) => res.status(204).end());

const server = createServer(app);
await setupVite(server, app);
server.listen(PORT, () => {
  console.log(`\n04 journey preview — nothing charges:\n  http://localhost:${PORT}/offers/wiccan/tea-reading?fn=Sarah\n`);
});
