// Fast design screenshots of the ClearingChoiceCard: restore a localStorage
// session already in PITCH state (sliding 55-35 variant) so the real card
// renders without walking the funnel. Mobile + desktop shots.
// Run: node improve-v1/evidence/sliding-close/card-shot.mjs
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5000';
const OUT_DIR = 'improve-v1/evidence/sliding-close';

const session = {
  state: {
    state: 'PITCH',
    messages: [
      { id: 'm1', type: 'bot', content: "But I need you to hear this, dear... I never want money to stand between you and your clearing." },
      { id: 'm2', type: 'bot', content: 'That is exactly why there is a second offering — $35, for when the full amount would strain you.' },
      { id: 'm3', type: 'bot', content: "Choose what's honest for you. The clearing is the same either way — every step, every hour. We do this together. ✨" },
    ],
    userData: {
      firstName: 'Claire', email: null, bucket: 'love', subBucket: null,
      personName: null, concern: 'x', desires: 'x', deeperResponse: null,
      emotionalResponse: null, blockSource: null, commitmentResponse: null,
      location: null, timeOfDay: 'evening', objectionCount: 0,
      priceDollars: 55, downsellDollars: 35, priceVariantId: '55-35',
    },
    isTyping: false, inputEnabled: true, inputPlaceholder: 'Or type a message...',
    inputType: 'text', showBucketButtons: false, showPermissionButton: false,
    showPurchaseCTA: true, showDownsellCTA: false, showUpsellCTA: false,
    showShippingForm: false, isUpsellProcessing: false, checkoutSessionId: null,
    upsellPaymentId: null, shippingAddress: null,
  },
  timestamp: Date.now(),
};

const browser = await chromium.launch();
for (const [label, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport });
  await ctx.route('**/api/lead', (r) => r.fulfill({ status: 200, body: '{}' }));
  const page = await ctx.newPage();
  // Inject BEFORE app boot — setting it after goto loses a race with the
  // greeting sequence's own save-effect, which overwrites the key per bubble.
  await page.addInitScript((s) => localStorage.setItem('seer_conversation', JSON.stringify(s)), session);
  await page.goto(`${BASE}/chat`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="clearing-choice-card"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(9000); // let the welcome-back bubbles finish + card settle
  await page.screenshot({ path: `${OUT_DIR}/card-${label}.png` });
  console.log(`wrote ${OUT_DIR}/card-${label}.png`);
  await ctx.close();
}
await browser.close();
