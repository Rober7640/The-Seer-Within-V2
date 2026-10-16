/**
 * TEMPORARY — Payments.AI PRODUCTION $0.10 live-card test page (Lewis, 16 Oct 2026).
 * Lets a teammate run main+bump ($0.20, one charge) → upsell 1 ($0.10 MIT) → upsell 2
 * ($0.10 MIT) → refund, on the LIVE Payments.AI account, to see whether saved-card
 * (merchant-initiated) charges decline for a non-Indian card. REMOVE after the test.
 *
 * Off unless ALL of these are set (otherwise every path 404s):
 *   PAI_PROD_TEST_ENABLED=true
 *   PAI_PROD_TEST_PASSWORD=<shared out-of-band>     (browser Basic-auth prompt)
 *   PAI_PROD_TEST_EXPIRES_AT=<ISO time>             (after it: 410 on everything)
 *   PAYMENTSAI_PROD_API_KEY, PAYMENTSAI_PROD_ORG_ID (live account; never sent to the browser)
 *
 * Safety: every charge hard-capped at 25 cents; product names TEST-* so an n8n IF on
 * metadata.product never fulfils; no new first charge in the last 10 minutes; max 10 runs.
 * Touches no DB, AWeber, pixel or PostHog.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { timingSafeEqual, randomUUID } from "node:crypto";

const BASE = "https://api.payments.ai";
const MAX_CENTS = 25;
const MAIN_CENTS = 10;
const BUMP_CENTS = 10;
const UPSELL_CENTS = 10;
const MAX_RUNS = 10;
const NO_NEW_MAIN_MS = 10 * 60 * 1000;
const MOUNT = "/pai-prod-test";

type Tx = Record<string, any>;
interface Run {
  id: string; startedAt: string; tag: string; customerId: string | null;
  main: Tx | null; u1: Tx | null; u2: Tx | null; refunds: Tx[];
}

function config() {
  const e = process.env;
  const expiresAt = Date.parse(e.PAI_PROD_TEST_EXPIRES_AT ?? "");
  if (e.PAI_PROD_TEST_ENABLED !== "true" || !e.PAI_PROD_TEST_PASSWORD || !Number.isFinite(expiresAt)
    || !e.PAYMENTSAI_PROD_API_KEY || !e.PAYMENTSAI_PROD_ORG_ID) return null;
  return { password: e.PAI_PROD_TEST_PASSWORD, expiresAt, apiKey: e.PAYMENTSAI_PROD_API_KEY, org: e.PAYMENTSAI_PROD_ORG_ID };
}

function passwordOk(header: string | undefined, expected: string): boolean {
  if (!header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const given = Buffer.from(decoded.slice(decoded.indexOf(":") + 1));
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

export function createPaiProdTestRouter(): Router {
  const router = Router();
  const runs = new Map<string, Run>();
  let publishableKey: string | null = null;

  // Gate: enabled + not expired + password. 404 when off so the path looks like nothing.
  router.use((req: Request, res: Response, next: NextFunction) => {
    const cfg = config();
    if (!cfg) return res.status(404).send("Not found");
    res.set("X-Robots-Tag", "noindex, nofollow");
    res.set("Cache-Control", "no-store");
    if (Date.now() > cfg.expiresAt) return res.status(410).send("This test link has expired.");
    if (!passwordOk(req.headers.authorization, cfg.password)) {
      res.set("WWW-Authenticate", 'Basic realm="PAI live test"');
      return res.status(401).send("Password required.");
    }
    next();
  });

  async function pai(method: string, path: string, body?: unknown) {
    const cfg = config()!;
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `ApiKey ${cfg.apiKey}`, Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await r.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* non-JSON */ }
    return { status: r.status, ok: r.ok, d: json?.data ?? json, msg: json?.message as string | undefined, text };
  }
  const api = () => `/v1/public-api/organizations/${config()!.org}`;

  function meta(run: Run, email: string, firstName: string, product: string, type: string, bump: boolean) {
    return {
      product, type, funnel: "pai-prod-test", bucket: "love", firstName, email,
      originalSession: run.tag, trackdeskClickId: "none", gclid: "none", noemail: "true",
      flow: "test", bumpProduct: bump ? "TEST-BUMP" : "none", app: "v1", priceVariant: "test-010",
      posthogDistinctId: run.tag, bumpBucket: bump ? "love" : "none", bumpAmount: bump ? String(BUMP_CENTS) : "0",
    };
  }

  function summary(tx: Tx, sent: Record<string, string>) {
    const back = tx.metadata ?? {};
    const keys = Object.keys(sent);
    const kept = keys.filter((k) => k in back).length;
    return {
      id: tx.id, amount: tx.amount, currency: tx.currency, status: tx.status, result: tx.result,
      threeDS: tx.has3ds ?? null, approvalLink: tx.status === "waiting" ? tx.approvalLink ?? null : null,
      fieldsKept: `${kept}/${keys.length}`,
    };
  }

  async function settle(id: string, tries = 8) {
    let tx: Tx | null = null;
    for (let i = 0; i < tries; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const r = await pai("GET", `${api()}/transactions/${encodeURIComponent(id)}`);
      if (r.d) tx = r.d;
      const res = String(tx?.result ?? "").toLowerCase();
      if (tx?.status === "waiting" || (res && res !== "pending")) break;
    }
    return tx;
  }

  function returnUrl(req: Request, run: Run, label: string) {
    const host = req.get("host");
    const proto = host?.startsWith("localhost") ? req.protocol : "https";
    return `${proto}://${host}${MOUNT}/?run=${run.id}&back=${label}`;
  }

  async function sale(req: Request, run: Run, o: { cents: number; token?: string; instrumentId?: string; mit: boolean; metadata: Record<string, string>; label: string }) {
    if (o.cents > MAX_CENTS) throw new Error(`refusing ${o.cents}c > cap ${MAX_CENTS}c`);
    const r = await pai("POST", `${api()}/transactions`, {
      type: "sale", customerId: run.customerId, currency: "USD", amount: o.cents / 100,
      idempotencyKey: `${run.tag}-${o.label}`, isMerchantInitiated: o.mit,
      paymentInstruction: o.token ? { token: o.token } : { paymentInstrumentId: o.instrumentId },
      metadata: o.metadata, redirectUrl: returnUrl(req, run, o.label),
    });
    console.log(`[pai-prod-test] run=${run.id} ${o.label} $${(o.cents / 100).toFixed(2)} -> HTTP ${r.status}`);
    if (!r.ok || !r.d?.id) return { http: r.status, error: r.msg ?? r.text.slice(0, 300) };
    const tx = (await settle(r.d.id)) ?? r.d;
    const s = summary(tx, o.metadata);
    console.log(`[pai-prod-test] run=${run.id} ${o.label} result=${s.result} id=${s.id}`);
    return { ...s, sent: o.metadata, instrumentId: tx.paymentInstrument?.id ?? tx.paymentInstrumentId ?? null };
  }

  async function refreshMain(run: Run) {
    if (!run.main?.id) return;
    const tx = await settle(run.main.id, 2);
    if (tx) Object.assign(run.main, summary(tx, run.main.sent), {
      instrumentId: tx.paymentInstrument?.id ?? tx.paymentInstrumentId ?? run.main.instrumentId,
    });
  }

  const strip = (x: Tx | null) => (x ? (({ sent, instrumentId, ...rest }) => rest)(x) : x);
  const view = (run: Run) => ({ run: run.id, main: strip(run.main), u1: strip(run.u1), u2: strip(run.u2), refunds: run.refunds });
  const getRun = (req: Request) => runs.get(String(req.body?.run ?? req.query.run ?? ""));

  router.get("/", (req, res) => {
    // The page uses relative "api/..." URLs, so it must be served from ".../pai-prod-test/".
    const [path, qs] = req.originalUrl.split("?");
    if (!path.endsWith("/")) return res.redirect(302, `${path}/${qs ? `?${qs}` : ""}`);
    res.type("html").send(PAGE);
  });

  router.get("/api/config", async (_req, res) => {
    const cfg = config()!;
    if (!publishableKey) {
      const pk = await pai("GET", `/v1/organizations/${cfg.org}/public-keys/publishable`);
      publishableKey = pk.d?.value ?? null;
    }
    if (!publishableKey || publishableKey.startsWith("pk_sandbox")) return res.status(503).json({ error: "live publishable key unavailable" });
    res.json({ publishableKey, organizationId: cfg.org, expiresAt: new Date(cfg.expiresAt).toISOString() });
  });

  router.post("/api/new-run", (_req, res) => {
    if (runs.size >= MAX_RUNS) return res.status(429).json({ error: `run limit (${MAX_RUNS}) reached` });
    const id = randomUUID().slice(0, 8);
    runs.set(id, { id, startedAt: new Date().toISOString(), tag: `pai-prod-test-${id}-${Date.now()}`, customerId: null, main: null, u1: null, u2: null, refunds: [] });
    res.json({ run: id });
  });

  router.get("/api/state", async (req, res) => {
    const run = getRun(req);
    if (!run) return res.status(404).json({ error: "unknown run — start a new test" });
    if (req.query.refresh) await refreshMain(run);
    res.json(view(run));
  });

  router.post("/api/main", async (req, res) => {
    try {
      const run = getRun(req);
      if (!run) return res.status(404).json({ error: "unknown run — start a new test" });
      if (run.main) return res.status(409).json({ error: "main charge already made in this run — click 'Start a new test'", main: strip(run.main) });
      if (config()!.expiresAt - Date.now() < NO_NEW_MAIN_MS) return res.status(410).json({ error: "link closes in under 10 minutes — no new test can start" });
      const { token, name, email, bump } = req.body ?? {};
      if (!token || !email || !name) return res.status(400).json({ error: "name, email and card required" });
      const parts = String(name).trim().split(/\s+/);
      const c = await pai("POST", `${api()}/customers`, { email, firstName: parts[0], lastName: parts.slice(1).join(" ") || parts[0] });
      if (!c.ok) return res.status(502).json({ error: "customer create failed", http: c.status, detail: c.msg ?? c.text.slice(0, 300) });
      run.customerId = c.d.id;
      run.main = await sale(req, run, {
        cents: MAIN_CENTS + (bump ? BUMP_CENTS : 0), token, mit: false, label: "main",
        metadata: meta(run, String(email), parts[0], bump ? "TEST-MAIN+BUMP" : "TEST-MAIN", "main", !!bump),
      });
      res.json(strip(run.main));
    } catch (e: any) {
      console.error("[pai-prod-test] main error", e?.message);
      res.status(500).json({ error: e?.message ?? "error" });
    }
  });

  router.post("/api/upsell", async (req, res) => {
    try {
      const run = getRun(req);
      if (!run) return res.status(404).json({ error: "unknown run — start a new test" });
      const n = Number(req.body?.n);
      if (n !== 1 && n !== 2) return res.status(400).json({ error: "n must be 1 or 2" });
      const key = n === 1 ? "u1" : "u2";
      if (run[key]) return res.json({ already: true, ...strip(run[key]) });
      await refreshMain(run);
      // Same MIT guard as the funnel: only charge the saved card if the main charge APPROVED.
      if (String(run.main?.result ?? "").toLowerCase() !== "approved") {
        return res.json({ blocked: `main charge is "${run.main?.result ?? "missing"}" — upsell not attempted` });
      }
      if (!run.main!.instrumentId) return res.json({ blocked: "no saved card on the main charge" });
      run[key] = await sale(req, run, {
        cents: UPSELL_CENTS, instrumentId: run.main!.instrumentId, mit: true, label: key,
        metadata: { ...run.main!.sent, product: `TEST-UPSELL-${n}`, type: "upsell", bumpProduct: "none", bumpBucket: "none", bumpAmount: "0" },
      });
      res.json(strip(run[key]));
    } catch (e: any) {
      console.error("[pai-prod-test] upsell error", e?.message);
      res.status(500).json({ error: e?.message ?? "error" });
    }
  });

  router.post("/api/refund-all", async (req, res) => {
    try {
      const run = getRun(req);
      if (!run) return res.status(404).json({ error: "unknown run — start a new test" });
      const out: Tx[] = [];
      for (const key of ["main", "u1", "u2"] as const) {
        const t = run[key];
        if (!t?.id) continue;
        const back = await pai("GET", `${api()}/transactions/${encodeURIComponent(t.id)}`);
        // Declined charges report refundableAmount>0 but took no money — only refund approved ones.
        if (String(back.d?.result ?? "").toLowerCase() !== "approved") { out.push({ key, id: t.id, skipped: `result ${back.d?.result}` }); continue; }
        const refundable = Number(back.d?.refundableAmount ?? 0);
        if (!(refundable > 0)) { out.push({ key, id: t.id, skipped: "already refunded" }); continue; }
        const r = await pai("POST", `${api()}/transactions/${encodeURIComponent(t.id)}/refund`, { amount: refundable });
        out.push({ key, id: t.id, amount: refundable, http: r.status, result: r.d?.result ?? r.d?.status ?? r.msg });
        console.log(`[pai-prod-test] run=${run.id} refund ${key} $${refundable} -> HTTP ${r.status}`);
      }
      run.refunds.push({ at: new Date().toISOString(), out });
      res.json(out);
    } catch (e: any) {
      console.error("[pai-prod-test] refund error", e?.message);
      res.status(500).json({ error: e?.message ?? "error" });
    }
  });

  return router;
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>PAI live test</title>
<style>
body{font:16px system-ui,sans-serif;max-width:560px;margin:24px auto;padding:0 16px;background:#fff;color:#111}
.box{border:1px solid #ccc;border-radius:8px;padding:16px;margin:16px 0}
input{width:100%;padding:8px;margin:4px 0 10px;box-sizing:border-box;font:inherit}
button{padding:10px 16px;font:inherit;cursor:pointer;margin:4px 4px 4px 0}
#pai-card{border:1px solid #999;border-radius:6px;padding:10px;margin:6px 0 12px;min-height:22px}
pre{background:#f4f4f4;padding:10px;white-space:pre-wrap;word-break:break-all;font-size:13px}
.warn{background:#fff3cd;padding:10px;border-radius:6px}
#clock{font-size:14px;color:#555}
</style></head><body>
<h2>Payments.AI live card test</h2>
<p class="warn">REAL card, REAL money (cents). Step 1 charges $0.20 once (main $0.10 + bump $0.10). Upsell 1 and upsell 2 charge $0.10 each to the same card, with one click. Max $0.40. Use the refund button at the end.</p>
<p id="clock"></p>
<div class="box" id="step1">
<b>1. Main + order bump</b> <span id="runlbl" style="font-size:13px;color:#777"></span>
<form id="f" onsubmit="return false">
<label>Name on card<input id="name" value=""></label>
<label>Email<input id="email" type="email" value=""></label>
<label><input type="checkbox" id="bump" checked style="width:auto"> Add order bump (+$0.10)</label>
<div id="pai-card"></div>
<button id="pay" disabled>Loading card form…</button>
</form></div>
<div class="box"><b>2. One-click upsells</b> <span style="font-size:13px;color:#777">(wait ~1 minute after step 1)</span><br>
<button onclick="up(1)">Buy upsell 1 — $0.10</button>
<button onclick="up(2)">Buy upsell 2 — $0.10</button></div>
<div class="box"><b>3. Finish</b><br>
<button onclick="post('api/refund-all')">Refund everything</button>
<button onclick="get('api/state')">Show results</button>
<button onclick="newRun(true)">Start a new test</button></div>
<pre id="out">Results appear here.</pre>
<script src="https://framepay.payments.ai/framepay.js"></script>
<script>
const out = (x) => document.getElementById('out').textContent = typeof x === 'string' ? x : JSON.stringify(x, null, 2);
let RUN = new URLSearchParams(location.search).get('run') || sessionStorage.getItem('paiRun');
function setRun(r) { RUN = r; sessionStorage.setItem('paiRun', r); document.getElementById('runlbl').textContent = '(test ' + r + ')'; }
async function newRun(show) {
  const r = await fetch('api/new-run', {method:'POST'}); const j = await r.json();
  if (!r.ok) return out(j);
  setRun(j.run); if (show) { document.getElementById('f').reset(); out('New test started (' + j.run + '). Enter the card again for step 1.'); }
}
async function post(u, b) { out('Working… (can take ~15 seconds)'); const r = await fetch(u, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({run:RUN}, b||{}))}); const j = await r.json(); out(j); return j; }
async function get(u) { const r = await fetch(u + (u.includes('?') ? '&' : '?') + 'run=' + RUN); const j = await r.json(); out(j); return j; }
async function up(n) { await post('api/upsell', {n}); }
(async () => {
  if (RUN) setRun(RUN); else await newRun(false);
  const cfg = await (await fetch('api/config')).json();
  if (cfg.expiresAt) {
    const end = Date.parse(cfg.expiresAt);
    const tick = () => { const m = Math.max(0, Math.round((end - Date.now()) / 60000)); document.getElementById('clock').textContent = 'This link closes in ' + m + ' min.'; };
    tick(); setInterval(tick, 30000);
  }
  try {
    await Framepay.initialize({ publishableKey: cfg.publishableKey, organizationId: cfg.organizationId,
      transactionData: { currency: 'USD', amount: 0.20 } });
    Framepay.card.mount('#pai-card');
    const b = document.getElementById('pay'); b.disabled = false; b.textContent = 'Pay $0.20';
  } catch (e) { out('Card form failed to load: ' + (e && e.message || e)); }
  if (location.search.includes('back=')) { out('Back from bank check — reading result…'); get('api/state?refresh=1'); }
})();
document.getElementById('pay').onclick = async () => {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  if (!name || !email) return out('Enter name and email.');
  const parts = name.split(/\\s+/);
  let token;
  try {
    const t = await Framepay.createToken(document.getElementById('f'), { method: 'payment-card',
      billingAddress: { firstName: parts[0], lastName: parts.slice(1).join(' ') || parts[0] } });
    token = t && (t.id || t.token || t);
  } catch (e) { return out('Card rejected by the form: ' + (e && e.message || e)); }
  const j = await post('api/main', { token, name, email, bump: document.getElementById('bump').checked });
  if (j.approvalLink) { out('Bank check (3DS) needed — sending you to your bank…'); location.href = j.approvalLink; }
};
</script></body></html>`;
