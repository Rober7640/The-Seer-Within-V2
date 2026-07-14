/**
 * analyze-buyer-pull.ts — mechanical stats over a pull-buyer-transcripts.ts output dir.
 * Pure file analysis, no DB. Usage: npx tsx scripts/analyze-buyer-pull.ts <pullDir> [label]
 */
import fs from "fs";
import path from "path";

const dir = process.argv[2];
const label = process.argv[3] ?? dir;
if (!dir || !fs.existsSync(path.join(dir, "01-purchases.json"))) {
  console.error("usage: analyze-buyer-pull.ts <pullDir>");
  process.exit(1);
}
const allRows = JSON.parse(fs.readFileSync(path.join(dir, "01-purchases.json"), "utf8"));
// $0 rows (admin_adjustment credits) are not customer purchases — excluded from behavior stats.
const purchases = allRows.filter((p: any) => p.price_usd > 0);
if (allRows.length !== purchases.length)
  console.log(`(excluded ${allRows.length - purchases.length} zero-price rows, e.g. admin_adjustment)`);
const sessions = JSON.parse(fs.readFileSync(path.join(dir, "02-sessions.json"), "utf8"));

// Parse transcripts: full session id -> messages[{role, words, endsQ, text}]
type Msg = { role: string; words: number; endsQ: boolean; text: string };
const msgsBySession = new Map<string, Msg[]>();
for (const f of fs.readdirSync(path.join(dir, "buyers"), { recursive: true }) as string[]) {
  if (!/session-[0-9a-f]{8}\.md$/.test(f)) continue;
  const raw = fs.readFileSync(path.join(dir, "buyers", f), "utf8");
  const idMatch = raw.match(/- session_id: ([0-9a-f-]{36})/);
  if (!idMatch) continue;
  const body = raw.split("\n---\n")[1] ?? "";
  const parts = body.split(/\n\*\*(USER|ASSISTANT|SYSTEM)\*\* \([^)]*\):\n/);
  const msgs: Msg[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const role = parts[i].toLowerCase();
    const text = (parts[i + 1] ?? "").trim();
    msgs.push({ role, text, words: text.split(/\s+/).filter(Boolean).length, endsQ: /\?\s*$/.test(text) });
  }
  msgsBySession.set(idMatch[1], msgs);
}

const sessById = new Map<string, any>(sessions.map((s: any) => [s.id, s]));
const pct = (a: number, b: number) => (b ? `${a}/${b} (${Math.round((100 * a) / b)}%)` : "0/0");

// ---- billing anomalies across ALL pulled sessions ----
let overbilled: any[] = [];
let zombies = 0;
let idleTail = 0; // last_message well before billing end (>= 120s tail)
for (const s of sessions) {
  const dur = s.duration_seconds ?? 0;
  const coins = s.coins_charged ?? 0;
  if (coins >= dur + 60) overbilled.push({ id: s.id.slice(0, 8), user: s.user_id.slice(0, 8), dur, coins, excess: coins - dur });
  const started = new Date(s.started_at).getTime();
  const lastMsg = s.last_message_at ? new Date(s.last_message_at).getTime() : null;
  if (coins === 0 && dur <= 5 && (msgsBySession.get(s.id)?.length ?? 0) >= 2) zombies++;
  if (lastMsg && coins > 0) {
    const billedUntil = started + coins * 1000; // 1 coin/sec
    if (billedUntil - lastMsg >= 120_000) idleTail++;
  }
}
const excessCoins = overbilled.reduce((a, o) => a + o.excess, 0);

// ---- per-purchase behavior ----
let b2cDuring = 0, b2c15 = 0, b2c60 = 0, coldStart = 0, longGap = 0;
let cutOnQ = 0, readingBefore = 0, b2cTotal = 0, resumedFast = 0;
let askOnlyTurns = 0, assistantTurns = 0;
const multiBuy = new Map<string, number>();
for (const p of purchases) {
  multiBuy.set(p.user_id, (multiBuy.get(p.user_id) ?? 0) + 1);
  const preId = p._during_session_id ?? p._pre_session_id;
  const gap = p._during_session_id ? 0 : p._pre_gap_min;
  if (p._during_session_id) b2cDuring++;
  if (preId && gap !== null && gap <= 15) b2c15++;
  if (preId && gap !== null && gap <= 60) b2c60++;
  else if (preId) longGap++;
  else coldStart++;

  if (preId && gap !== null && gap <= 60) {
    b2cTotal++;
    const msgs = msgsBySession.get(preId) ?? [];
    const assistant = msgs.filter((m) => m.role === "assistant");
    const last = assistant[assistant.length - 1];
    if (last?.endsQ) cutOnQ++;
    if (assistant.some((m) => m.words >= 100)) readingBefore++;
    if (p._post_gap_min !== null && p._post_gap_min <= 15) resumedFast++;
    for (const m of assistant) {
      assistantTurns++;
      if (m.endsQ && m.words < 30) askOnlyTurns++;
    }
  }
}
const repeatBuyers = [...multiBuy.values()].filter((n) => n >= 2).length;

console.log(`\n═══ ${label} ═══`);
console.log(`purchases=${purchases.length} buyers=${multiBuy.size} revenue=$${(purchases.reduce((a: number, p: any) => a + p.price_usd, 0) / 100).toFixed(2)} repeat-buyers-in-window=${repeatBuyers}`);
console.log(`package mix: ${Object.entries(purchases.reduce((m: any, p: any) => ((m[p.package_type] = (m[p.package_type] ?? 0) + 1), m), {})).map(([k, v]) => `${k}=${v}`).join(" ")}`);
console.log(`\nPurchase context:`);
console.log(`  bought DURING a live session:      ${pct(b2cDuring, purchases.length)}`);
console.log(`  buy-to-continue (pre-gap ≤15m):    ${pct(b2c15, purchases.length)}   (≤60m: ${pct(b2c60 + b2cDuring, purchases.length)})`);
console.log(`  cold start (no session ≤48h):      ${pct(coldStart, purchases.length)}  gap>60m: ${pct(longGap, purchases.length)}`);
console.log(`\nOf buy-to-continue (≤60m or during) purchases [n=${b2cTotal}]:`);
console.log(`  pre-session cut on open question:  ${pct(cutOnQ, b2cTotal)}`);
console.log(`  full reading (≥100w) before cut:   ${pct(readingBefore, b2cTotal)}`);
console.log(`  resumed chat ≤15m after buying:    ${pct(resumedFast, b2cTotal)}`);
console.log(`  ask-only assistant turns (<30w+?): ${pct(askOnlyTurns, assistantTurns)}`);
console.log(`\nBilling health (all ${sessions.length} pulled sessions):`);
console.log(`  overbilled (coins ≥ dur+60):       ${overbilled.length} sessions, ${excessCoins} excess coins (~$${((excessCoins / 540) * 19.99).toFixed(0)})`);
console.log(`  zombie sessions (0 coin,≤5s,≥2msg): ${zombies}`);
console.log(`  billed ≥2min past last message:    ${idleTail}`);
if (overbilled.length) {
  console.log(`  worst: ${overbilled.sort((a, b) => b.excess - a.excess).slice(0, 8).map((o) => `${o.id}(+${o.excess})`).join(" ")}`);
}
