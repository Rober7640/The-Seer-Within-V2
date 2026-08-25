// Shared AWeber broadcast API helpers. Reads creds from the repo-root .env, calls the
// API with the current broadcast access token, and refreshes-on-401 (AWeber rotates the
// refresh token → we back up .env first, then persist the new access+refresh).
//
// Env keys used: AWEBER_CLIENT_ID, AWEBER_CLIENT_SECRET, AWEBER_ACCOUNT_ID, AWEBER_LIST_ID,
//                AWEBER_BROADCAST_ACCESS_TOKEN, AWEBER_BROADCAST_REFRESH_TOKEN.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ENV_PATH = path.resolve(__dirname, '../../../../.env'); // scripts/ -> repo root

const strip = s => s == null ? s : s.replace(/^["']|["']$/g, "").trim();
function readEnv() {
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  const get = k => { const m = raw.match(new RegExp("^" + k + "=(.*)$", "m")); return m ? strip(m[1]) : null; };
  return { raw, get };
}
let { get } = readEnv();
export const clientId = get("AWEBER_CLIENT_ID");
export const clientSecret = get("AWEBER_CLIENT_SECRET");
export const accountId = get("AWEBER_ACCOUNT_ID");
export const listId = get("AWEBER_LIST_ID");
export const BASE = `https://api.aweber.com/1.0/accounts/${accountId}/lists/${listId}`;

// Every list the daily send goes out to. The V1 ad funnels write leads to their
// own AWeber list (AWEBER_LIST_ID_PALM / _TAROT in the app), so mailing only
// AWEBER_LIST_ID silently skipped those audiences. Comma-separated override via
// AWEBER_DAILY_LIST_IDS; falls back to the single shared list so existing
// callers behave exactly as before.
//
// NOTE: these lists overlap (~23% of the palm list is also on the shared list),
// and AWeber has no cross-list dedupe — a subscriber on two of them receives the
// broadcast twice. That is a deliberate, operator-approved trade-off.
export const dailyListIds = (get("AWEBER_DAILY_LIST_IDS") || listId || "")
  .split(",").map(s => s.trim()).filter(Boolean);
export const listBase = (id) =>
  `https://api.aweber.com/1.0/accounts/${accountId}/lists/${id}`;
let accessToken = get("AWEBER_BROADCAST_ACCESS_TOKEN");
export const mask = t => t ? t.slice(0, 4) + "…" + t.slice(-3) : "(none)";

async function refresh() {
  const env = readEnv();
  const refreshToken = env.get("AWEBER_BROADCAST_REFRESH_TOKEN");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const r = await fetch("https://auth.aweber.com/oauth2/token", {
    method: "POST",
    headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error("REFRESH FAILED " + r.status + " " + t.slice(0, 300));
  const tok = JSON.parse(t);
  const newAccess = tok.access_token, newRefresh = tok.refresh_token || refreshToken;
  const backup = ENV_PATH + ".bak-" + new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(ENV_PATH, backup);
  const updated = env.raw
    .replace(/^AWEBER_BROADCAST_ACCESS_TOKEN=.*$/m, `AWEBER_BROADCAST_ACCESS_TOKEN=${newAccess}`)
    .replace(/^AWEBER_BROADCAST_REFRESH_TOKEN=.*$/m, `AWEBER_BROADCAST_REFRESH_TOKEN=${newRefresh}`);
  fs.writeFileSync(ENV_PATH + ".tmp", updated); fs.renameSync(ENV_PATH + ".tmp", ENV_PATH);
  accessToken = newAccess;
  console.error(`  [refreshed broadcast token → ${mask(newAccess)}, backup ${path.basename(backup)}]`);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// AWeber answers a burst with 403 "Rate Limit Error" — NOT 429. It reads like a
// permissions failure, so an unguarded caller treats a throttled GET as an
// authoritative empty result. That silently defeated the replicate idempotency
// scan (empty "already scheduled" set => duplicate broadcasts). Every call now
// backs off and retries a rate-limited response before returning it.
const isRateLimited = (status, text) =>
  status === 403 && /rate limit/i.test(text || "");

// api(method, url, {form}) — form => x-www-form-urlencoded body. Refreshes once
// on 401; retries with backoff on a 403 rate limit.
export async function api(method, url, { form } = {}, _retried = false, _throttled = 0) {
  const headers = { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json" };
  const opts = { method, headers };
  if (form) { headers["Content-Type"] = "application/x-www-form-urlencoded"; opts.body = new URLSearchParams(form).toString(); }
  const r = await fetch(url, opts);
  if (r.status === 401 && !_retried) { await refresh(); return api(method, url, { form }, true, _throttled); }
  if (r.status === 403 && _throttled < 8) {
    const peek = await r.clone().text();
    if (isRateLimited(r.status, peek)) {
      const wait = Math.min(30000, 2000 * 2 ** _throttled);
      console.error(`  [rate limited — waiting ${wait / 1000}s, attempt ${_throttled + 1}/8]`);
      await sleep(wait);
      return api(method, url, { form }, _retried, _throttled + 1);
    }
  }
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { ok: r.ok, status: r.status, text, json, location: r.headers.get("location") };
}
