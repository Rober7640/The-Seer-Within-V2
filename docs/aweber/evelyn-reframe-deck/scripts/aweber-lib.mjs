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

// api(method, url, {form}) — form => x-www-form-urlencoded body. Refreshes once on 401.
export async function api(method, url, { form } = {}, _retried = false) {
  const headers = { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json" };
  const opts = { method, headers };
  if (form) { headers["Content-Type"] = "application/x-www-form-urlencoded"; opts.body = new URLSearchParams(form).toString(); }
  const r = await fetch(url, opts);
  if (r.status === 401 && !_retried) { await refresh(); return api(method, url, { form }, true); }
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { ok: r.ok, status: r.status, text, json, location: r.headers.get("location") };
}
