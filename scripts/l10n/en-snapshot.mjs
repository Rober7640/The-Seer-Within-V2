// English render snapshot: load funnel pages with a frozen clock, a seeded
// Math.random and every /api call stubbed, let the chat timers run, then save
// each page's <body> HTML. Run once against a pristine Production checkout and
// once against the branch; `--compare` must report every page identical.
//
//   node scripts/l10n/en-snapshot.mjs --base http://localhost:5199 --out a.json
//   node scripts/l10n/en-snapshot.mjs --compare a.json b.json
import fs from "node:fs";

const SID = "cs_test_snapshot";
const PAGES = [
  "/fb", "/fb/chat", "/fb/checkout", `/fb/welcome1?session_id=${SID}`, `/fb/welcome2?session_id=${SID}`,
  `/fb/success?session_id=${SID}`, "/fb/success",
  "/fb-tarot", "/fb-tarot/b", "/fb-tarot/c", "/fb-tarot?hook=cards-come-back",
  "/fb-tarot?hook=cards-honest&deck=arcana-mfh", "/fb-tarot/chat", "/fb-tarot/checkout",
  `/fb-tarot/welcome1?session_id=${SID}`, `/fb-tarot/success?session_id=${SID}`,
  "/success", "/faq", "/privacy", "/terms", "/refund",
];

// Plausible API answers, so paid steps render their real copy instead of an
// error state. Identical for both trees, so they never cause a difference.
const BUYER = {
  firstName: "Marie", email: "snapshot@example.com", bucket: "love", personName: "Daniel",
  mainPurchaseAmount: 3500, bumpAmountCents: 0, upsellPurchased: true, upsellAmountCents: 4700,
  hasShipping: false, shippingAddress: null, sessionId: SID,
};
const STUBS = [
  [/\/api\/upsell2?\/user-data/, BUYER],
  [/\/api\/order\/details/, { ...BUYER, productName: "Energy Clearing Ritual", amountTotal: 3500, status: "paid" }],
  [/\/api\/pai-live\/config/, { publishableKey: "pk_snapshot", organizationId: "org_snapshot", sms: null }],
];
const ORDER = {
  orderToken: "tok_snapshot", totalCents: 3500, mainCents: 3500, bumpCents: 0,
  productName: "Energy Clearing Ritual", productDescription: "Your personalized clearing begins tonight",
  email: "snapshot@example.com", firstName: "Marie", funnel: "v1-fb", backUrl: "/fb/chat?cancelled=true",
  stripeFallbackBody: {},
};
const STEPS_MS = [500, 1500, 4000, 8000, 15000, 30000, 60000];

const args = process.argv.slice(2);
const arg = (k) => args[args.indexOf(k) + 1];

if (args[0] === "--compare") {
  const a = JSON.parse(fs.readFileSync(args[1], "utf8"));
  const b = JSON.parse(fs.readFileSync(args[2], "utf8"));
  let bad = 0;
  for (const key of Object.keys(a)) {
    if (a[key] === b[key]) { console.log(`✅ ${key}`); continue; }
    bad++;
    const x = a[key] ?? "", y = b[key] ?? "";
    let i = 0; while (i < x.length && x[i] === y[i]) i++;
    console.log(`❌ ${key}\n   prod:   …${x.slice(Math.max(0, i - 80), i + 120)}\n   branch: …${y.slice(Math.max(0, i - 80), i + 120)}`);
  }
  console.log(bad ? `\n${bad} snapshot(s) differ` : `\nall ${Object.keys(a).length} snapshots identical`);
  process.exit(bad ? 1 : 0);
}

const { chromium } = await import("playwright");
const base = arg("--base");
const browser = await chromium.launch();
const out = {};
for (const p of PAGES) {
  for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const ctx = await browser.newContext({ viewport: vp, locale: "en-US", timezoneId: "America/New_York" });
    const page = await ctx.newPage();
    await page.addInitScript((order) => {
      let s = 0x2f6b4a1d;
      Math.random = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      try {
        localStorage.clear(); sessionStorage.clear();
        if (location.pathname.endsWith("/checkout")) sessionStorage.setItem("pai-live-order", JSON.stringify(order));
      } catch {}
    }, ORDER);
    await page.clock.install({ time: new Date("2026-11-18T19:00:00-05:00") });
    await page.route("**/api/**", (r) => {
      const hit = STUBS.find(([re]) => re.test(r.request().url()));
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(hit ? hit[1] : {}) });
    });
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    await page.goto(base + p, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load").catch(() => {});
    let prev = 0;
    for (const ms of STEPS_MS) { await page.clock.runFor(ms - prev); prev = ms; await page.waitForTimeout(150); }
    const html = await page.evaluate(() => document.body.innerHTML.replace(/\s+/g, " "));
    out[`${p} @${vp.width}`] = html;
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(arg("--out"), JSON.stringify(out, null, 1));
console.log(`saved ${Object.keys(out).length} snapshots → ${arg("--out")}`);
