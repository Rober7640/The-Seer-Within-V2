// SMS sender — texts V1 buyers who said "Yes, text me" at checkout (smsConsent.ts).
//
// WHY. Joel (1 Oct 2026): use texts to bring V1 buyers into the V2 chat with
// Evelyn, one-way, tracked in PostHog. Plan approved 6 Oct
// (docs/2026-10-02-sms-plan.md): three texts — right after purchase, day 4, day 7.
//
// HOW. A cron tick (cronJobs.ts, every 15 min) looks at recent "Yes" consents,
// works out which text each number is due, and sends it through Twilio. Each send
// is first claimed as a sms_sends row; (phone, step) is unique, so a number never
// gets the same text twice — even if she bought twice, or a tick crashed mid-send.
// A failed send is NOT retried (at most once beats a double text).
//
// 🔴 OFF BY DEFAULT. Nothing is sent unless SMS_SENDING_ENABLED=true AND either
//   - SMS_ALLOWED_NUMBERS lists the numbers to text (test servers: only those
//     numbers are ever looked at — everyone else is left alone, not even logged), or
//   - SMS_SEND_TO_ALL=true (production go-live, after Toll-Free Verification).
// Neither set ⇒ the tick does nothing and logs why.
//
// RULES (the plan + what we told Twilio in the TFV form, 9 Oct):
//   - only consented, not opted out, US/Canada (+1) numbers, /fb-read + /fb-tarot + root funnels;
//   - text 1 carries the opt-in confirmation (brand, up to 3 msgs/week, rates, HELP, STOP);
//   - texts go out 1pm-8pm New York time = 10am-5pm Pacific, so every US/Canada
//     time zone gets them between 10am and 8pm local (Joel OK'd "10am-8pm US time",
//     23 Nov 2026; allow-listed test numbers skip this);
//   - a text more than 48h overdue is skipped, never sent late;
//   - texts 2 and 3 are skipped if she has already USED the V2 chat (spent coins).
//     Not "has a V2 account": every V1 buyer gets one auto-created on purchase
//     (funnelMigrationEmail.ts) — 119 of 119 tarot buyers, 23 Nov 2026 — so that
//     rule would have stopped texts 2 and 3 for everyone;
//   - STOP is handled by Twilio Advanced Opt-Out; if Twilio says she is
//     unsubscribed (error 21610) we mark her consent opted out.
//   - plain GSM-7 characters only (no curly quotes / emoji / accents), or a text
//     costs 2-3x as many segments.
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { conversations, smsConsents, smsSends, users } from "@shared/schema";
import logger from "./logger";

export type SmsStep = 1 | 2 | 3;

const DAY_MS = 24 * 60 * 60 * 1000;

// When each text is due, counted from the purchase (= consentedAt).
export const SMS_STEP_DELAY_MS: Record<SmsStep, number> = { 1: 0, 2: 4 * DAY_MS, 3: 7 * DAY_MS };

// A text this late is skipped, never sent (e.g. the switch was off for a while).
export const SMS_LATE_LIMIT_MS = 48 * 60 * 60 * 1000;

// Only consents from funnels whose main product is the Energy Clearing Ritual
// (text 1 names it).
export const SMS_SEQUENCE_FUNNELS = new Set(["v1-read", "v1-tarot", "root"]);

// Hard cap per tick, so a mistake can never blast the whole list in one go.
export const SMS_MAX_SENDS_PER_TICK = 50;

// Twilio: "Attempt to send to unsubscribed recipient".
const TWILIO_UNSUBSCRIBED = "21610";

const DEFAULT_LINK_BASE = "https://www.theseerwithin.com";

// ── Pure helpers (tested in smsSender.test.ts) ─────────────────────────────────

// "+1 (201) 555-0123" → "+12015550123". Keeps the leading + and digits only.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return raw.trim().startsWith("+") ? `+${digits}` : digits;
}

export function isUsOrCanada(phone: string): boolean {
  return /^\+1\d{10}$/.test(normalizePhone(phone));
}

// 1pm-8pm New York time (see RULES above).
export function isInSendWindow(now: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now),
  );
  return hour >= 13 && hour < 20;
}

// "  sarah jane " → "Sarah". Anything that isn't plain A-Z letters (or a hyphen)
// → null, so a name can never push the text out of GSM-7 or inject junk.
export function cleanFirstName(raw: string | null | undefined): string | null {
  const first = (raw ?? "").trim().split(/\s+/)[0] ?? "";
  if (!/^[A-Za-z][A-Za-z-]{0,19}$/.test(first)) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

// Chat bucket → the words after "questions about".
export function topicFor(bucket: string | null | undefined): string | null {
  switch (bucket) {
    case "love": return "love";
    case "money": return "money";
    case "purpose": return "your purpose";
    case "specific":
    case "someone": return "the one on your mind";
    default: return null;
  }
}

export function smsLink(step: SmsStep, base = process.env.SMS_LINK_BASE || DEFAULT_LINK_BASE): string {
  return `${base.replace(/\/+$/, "")}/evelyn?utm_source=sms&utm_campaign=v1-buyers&utm_content=t${step}`;
}

export function buildSmsBody(step: SmsStep, ctx: { firstName: string | null; bucket: string | null; linkBase?: string }): string {
  const name = cleanFirstName(ctx.firstName);
  const link = smsLink(step, ctx.linkBase);
  const opener = name ? `${name}, it's Evelyn.` : "It's Evelyn.";
  if (step === 1) {
    return (
      `The Seer Within: Thank you${name ? `, ${name}` : ""}. Evelyn here. ` +
      `I've begun your Energy Clearing Ritual. Your ritual arrives by email in about 24 hours. ` +
      `Up to 3 msgs/week. Msg & data rates may apply. Reply HELP for help, STOP to opt out.`
    );
  }
  if (step === 2) {
    const topic = topicFor(ctx.bucket);
    return (
      `The Seer Within: ${opener} I hope your reading spoke to you. ` +
      `If it stirred questions${topic ? ` about ${topic}` : ""}, I'm here to talk: ${link} Reply STOP to opt out`
    );
  }
  return (
    `The Seer Within: ${opener} Your reading holds guidance for the weeks ahead. ` +
    `Want me with you as it unfolds? First minutes are on me: ${link} Reply STOP to opt out`
  );
}

// The GSM-7 basic set (+ the extension chars we might plausibly use). Anything
// else makes Twilio send the whole text as UCS-2 (70 chars a segment, not 160).
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
export function isGsm7(text: string): boolean {
  return Array.from(text).every((ch) => GSM7.includes(ch));
}

// Which step is next for a number, given the steps already logged for it.
export function nextStep(done: ReadonlySet<number>): SmsStep | null {
  for (const s of [1, 2, 3] as const) if (!done.has(s)) return s;
  return null;
}

export type SendingMode =
  | { kind: "off"; reason: string }
  | { kind: "allowList"; numbers: Set<string> }
  | { kind: "all" };

export function sendingMode(env: NodeJS.ProcessEnv = process.env): SendingMode {
  if (env.SMS_SENDING_ENABLED !== "true") return { kind: "off", reason: "SMS_SENDING_ENABLED is not true" };
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return { kind: "off", reason: "Twilio credentials missing" };
  if (!env.TWILIO_MESSAGING_SERVICE_SID && !env.TWILIO_FROM_NUMBER) {
    return { kind: "off", reason: "no TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER" };
  }
  const listed = (env.SMS_ALLOWED_NUMBERS ?? "").split(",").map((n) => normalizePhone(n)).filter((n) => n.length > 4);
  if (listed.length > 0) return { kind: "allowList", numbers: new Set(listed) };
  if (env.SMS_SEND_TO_ALL === "true") return { kind: "all" };
  return { kind: "off", reason: "neither SMS_ALLOWED_NUMBERS nor SMS_SEND_TO_ALL=true is set" };
}

// ── Twilio ────────────────────────────────────────────────────────────────────

async function sendViaTwilio(to: string, body: string): Promise<{ sid?: string; errorCode?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const params = new URLSearchParams({ To: to, Body: body });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) params.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  else params.set("From", process.env.TWILIO_FROM_NUMBER!);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const json = (await res.json().catch(() => ({}))) as { sid?: string; code?: number | string; message?: string };
  if (res.ok && json.sid) return { sid: json.sid };
  return { errorCode: String(json.code ?? `http_${res.status}`) };
}

// ── The tick ──────────────────────────────────────────────────────────────────

export interface SmsTickStats { mode: string; checked: number; sent: number; failed: number; skipped: number; }

export async function processSmsQueue(now = new Date()): Promise<SmsTickStats> {
  const mode = sendingMode();
  const stats: SmsTickStats = { mode: mode.kind, checked: 0, sent: 0, failed: 0, skipped: 0 };
  if (mode.kind === "off") {
    logger.debug(`SMS sender off: ${mode.reason}`);
    return stats;
  }

  // Oldest purchase that can still have a text due (day 7 + the 48h late limit).
  const since = new Date(now.getTime() - SMS_STEP_DELAY_MS[3] - SMS_LATE_LIMIT_MS);
  const rows = await db
    .select({
      id: smsConsents.id,
      phone: smsConsents.phone,
      email: smsConsents.email,
      funnel: smsConsents.funnel,
      consentedAt: smsConsents.consentedAt,
      firstName: conversations.firstName,
      bucket: conversations.bucket,
    })
    .from(smsConsents)
    .leftJoin(conversations, eq(conversations.id, smsConsents.conversationId))
    .where(and(eq(smsConsents.consented, true), isNull(smsConsents.optedOutAt), gt(smsConsents.consentedAt, since)))
    .orderBy(smsConsents.consentedAt);

  // One sequence per number: the earliest purchase's row drives it.
  const byPhone = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const phone = normalizePhone(r.phone);
    if (mode.kind === "allowList" && !mode.numbers.has(phone)) continue;
    if (!SMS_SEQUENCE_FUNNELS.has(r.funnel ?? "root")) continue;
    if (!byPhone.has(phone)) byPhone.set(phone, r);
  }
  if (byPhone.size === 0) return stats;

  const phones = Array.from(byPhone.keys());
  // A STOP on ANY of her consent rows stops all of them.
  const optedOut = new Set(
    (await db.select({ phone: smsConsents.phone }).from(smsConsents)
      .where(and(inArray(smsConsents.phone, phones), sql`${smsConsents.optedOutAt} IS NOT NULL`)))
      .map((r) => normalizePhone(r.phone)),
  );
  const doneByPhone = new Map<string, Set<number>>();
  for (const s of await db.select({ phone: smsSends.phone, step: smsSends.step }).from(smsSends).where(inArray(smsSends.phone, phones))) {
    const set = doneByPhone.get(s.phone) ?? new Set<number>();
    set.add(s.step);
    doneByPhone.set(s.phone, set);
  }

  const testNumber = mode.kind === "allowList";
  for (const [phone, c] of Array.from(byPhone)) {
    if (stats.sent + stats.failed >= SMS_MAX_SENDS_PER_TICK) break;
    stats.checked++;
    if (optedOut.has(phone)) continue;
    const step = nextStep(doneByPhone.get(phone) ?? new Set());
    if (step === null) continue;
    const due = c.consentedAt.getTime() + SMS_STEP_DELAY_MS[step];
    if (now.getTime() < due) continue;

    const skip = async (note: string) => {
      await claim(c.id, phone, step, "skipped", null, note);
      stats.skipped++;
    };
    if (now.getTime() - due > SMS_LATE_LIMIT_MS) { await skip("late"); continue; }
    if (!testNumber && !isUsOrCanada(phone)) { await skip("not a US/Canada number"); continue; }
    if (step > 1 && c.email) {
      const [v2] = await db.select({ id: users.id }).from(users)
        .where(sql`lower(${users.email}) = lower(${c.email}) AND ${users.totalCoinsUsed} > 0`).limit(1);
      if (v2) { await skip("already uses the V2 chat"); continue; }
    }
    if (!testNumber && !isInSendWindow(now)) continue; // wait for the window

    const body = buildSmsBody(step, { firstName: c.firstName, bucket: c.bucket });
    if (!isGsm7(body)) { await skip("body not GSM-7"); continue; }
    const claimedId = await claim(c.id, phone, step, "sending", body, null);
    if (!claimedId) continue; // another tick got there first

    let result: { sid?: string; errorCode?: string };
    try {
      result = await sendViaTwilio(phone, body);
    } catch (error) {
      result = { errorCode: `exception: ${(error as Error).message}`.slice(0, 200) };
    }
    await db.update(smsSends)
      .set({ status: result.sid ? "sent" : "failed", twilioSid: result.sid ?? null, errorCode: result.errorCode ?? null, updatedAt: new Date() })
      .where(eq(smsSends.id, claimedId));
    if (result.sid) {
      stats.sent++;
    } else {
      stats.failed++;
      logger.error("SMS send failed", { step, consentId: c.id, errorCode: result.errorCode });
      if (result.errorCode === TWILIO_UNSUBSCRIBED) {
        await db.update(smsConsents).set({ optedOutAt: now }).where(eq(smsConsents.phone, c.phone));
      }
    }
  }
  return stats;
}

// Writes the (phone, step) row. Returns its id, or null if that step was already
// logged for this number (the unique index refused it).
async function claim(consentId: string, phone: string, step: SmsStep, status: string, body: string | null, note: string | null): Promise<string | null> {
  const [row] = await db.insert(smsSends)
    .values({ consentId, phone, step, status, body, note })
    .onConflictDoNothing({ target: [smsSends.phone, smsSends.step] })
    .returning({ id: smsSends.id });
  return row?.id ?? null;
}
