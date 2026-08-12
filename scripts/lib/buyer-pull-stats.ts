/**
 * Pure stats over a pull-buyer-transcripts.ts output directory.
 *
 * NO DB ACCESS. NO CONSOLE OUTPUT. The CLI (analyze-buyer-pull.ts) formats what
 * this computes; keeping the two apart is what makes the stats testable against
 * the frozen pull cohorts under improve-v2/transcripts/monitor/.
 */
import fs from 'fs';
import path from 'path';
import { KNOWN_PERSONA_SLUGS, UNKNOWN_PERSONA } from './persona-registry';
import { COINS_PER_MINUTE } from '@shared/types';

export type Msg = { role: string; words: number; endsQ: boolean; text: string };

export type Pull = {
  purchases: any[];
  sessions: any[];
  msgsBySession: Map<string, Msg[]>;
  excludedZeroPrice: number;
};

export type BehaviorStats = {
  purchases: number;
  buyers: number;
  revenueCents: number;
  repeatBuyers: number;
  packageMix: Record<string, number>;
  duringSession: number;
  b2c15: number;
  b2c60: number;
  coldStart: number;
  longGap: number;
  b2cTotal: number;
  cutOnQ: number;
  readingBefore: number;
  resumedFast: number;
  askOnlyTurns: number;
  assistantTurns: number;
};

/** Read a pull dir: purchases (zero-price excluded), sessions, parsed transcripts. */
export function loadPull(dir: string): Pull {
  const allRows = JSON.parse(fs.readFileSync(path.join(dir, '01-purchases.json'), 'utf8'));
  const purchases = allRows.filter((p: any) => p.price_usd > 0);
  const sessions = JSON.parse(fs.readFileSync(path.join(dir, '02-sessions.json'), 'utf8'));

  const msgsBySession = new Map<string, Msg[]>();
  for (const f of fs.readdirSync(path.join(dir, 'buyers'), { recursive: true }) as string[]) {
    if (!/session-[0-9a-f]{8}\.md$/.test(f)) continue;
    const raw = fs.readFileSync(path.join(dir, 'buyers', f), 'utf8');
    const idMatch = raw.match(/- session_id: ([0-9a-f-]{36})/);
    if (!idMatch) continue;
    const body = raw.split('\n---\n')[1] ?? '';
    const parts = body.split(/\n\*\*(USER|ASSISTANT|SYSTEM)\*\* \([^)]*\):\n/);
    const msgs: Msg[] = [];
    for (let i = 1; i < parts.length; i += 2) {
      const role = parts[i].toLowerCase();
      const text = (parts[i + 1] ?? '').trim();
      msgs.push({ role, text, words: text.split(/\s+/).filter(Boolean).length, endsQ: /\?\s*$/.test(text) });
    }
    msgsBySession.set(idMatch[1], msgs);
  }

  return { purchases, sessions, msgsBySession, excludedZeroPrice: allRows.length - purchases.length };
}

/** Behaviour stats over an arbitrary subset of purchases (all, or one persona's). */
export function computeBehavior(purchases: any[], msgsBySession: Map<string, Msg[]>): BehaviorStats {
  const multiBuy = new Map<string, number>();
  const packageMix: Record<string, number> = {};
  let duringSession = 0, b2c15 = 0, b2c60 = 0, coldStart = 0, longGap = 0;
  let b2cTotal = 0, cutOnQ = 0, readingBefore = 0, resumedFast = 0;
  let askOnlyTurns = 0, assistantTurns = 0, revenueCents = 0;

  for (const p of purchases) {
    multiBuy.set(p.user_id, (multiBuy.get(p.user_id) ?? 0) + 1);
    packageMix[p.package_type] = (packageMix[p.package_type] ?? 0) + 1;
    revenueCents += p.price_usd;

    const preId = p._during_session_id ?? p._pre_session_id;
    const gap = p._during_session_id ? 0 : p._pre_gap_min;
    if (p._during_session_id) duringSession++;
    if (preId && gap !== null && gap <= 15) b2c15++;
    if (preId && gap !== null && gap <= 60) b2c60++;
    else if (preId) longGap++;
    else coldStart++;

    if (preId && gap !== null && gap <= 60) {
      b2cTotal++;
      const assistant = (msgsBySession.get(preId) ?? []).filter(m => m.role === 'assistant');
      const last = assistant[assistant.length - 1];
      if (last?.endsQ) cutOnQ++;
      if (assistant.some(m => m.words >= 100)) readingBefore++;
      if (p._post_gap_min !== null && p._post_gap_min <= 15) resumedFast++;
      for (const m of assistant) {
        assistantTurns++;
        if (m.endsQ && m.words < 30) askOnlyTurns++;
      }
    }
  }

  return {
    purchases: purchases.length,
    buyers: multiBuy.size,
    revenueCents,
    repeatBuyers: [...multiBuy.values()].filter(n => n >= 2).length,
    packageMix,
    duringSession, b2c15, b2c60, coldStart, longGap,
    b2cTotal, cutOnQ, readingBefore, resumedFast, askOnlyTurns, assistantTurns,
  };
}

/**
 * One row per persona, in roster order, then any persona seen in the data but
 * missing from the roster (so a new persona surfaces instead of vanishing).
 * Personas with no activity still get a row — "0 buyers in window" is a finding.
 */
export function groupByPersona(pull: Pull): { persona: string; behavior: BehaviorStats; sessionCount: number }[] {
  const slugOf = (row: any): string => row.persona_slug ?? UNKNOWN_PERSONA;

  const seen = new Set<string>([
    ...pull.purchases.map(slugOf),
    ...pull.sessions.map(slugOf),
  ]);
  const order = [
    ...KNOWN_PERSONA_SLUGS,
    ...[...seen].filter(s => !(KNOWN_PERSONA_SLUGS as readonly string[]).includes(s)).sort(),
  ];

  return order.map(persona => ({
    persona,
    behavior: computeBehavior(pull.purchases.filter(p => slugOf(p) === persona), pull.msgsBySession),
    sessionCount: pull.sessions.filter(s => slugOf(s) === persona).length,
  }));
}

/**
 * The contractual ceiling: a session may never bill faster than the per-minute
 * rate. 299/min = 4.983 coins/sec.
 *
 * ⚠️ This REPLACED the pre-flip heuristic `coins >= duration + 60` plus a
 * `excess / 540 * 19.99` dollarization. Both assumed 1 coin/sec and the old
 * 540-coins-for-$19.99 pack. After the 2026-07-28 wallet flip (coin = cent,
 * 299 coins/min) that heuristic flagged EVERY healthy session and reported a
 * fabricated ~$2k of overbilling on every single run. Compare the RATIO to the
 * contractual rate — that works in both eras, because the pre-flip rate
 * (1 coin/sec) is also below 4.983.
 */
export const MAX_COINS_PER_SECOND = COINS_PER_MINUTE / 60;

export type BillingHealth = {
  sessionsChecked: number;
  overRate: { id: string; user: string; dur: number; coins: number; ratio: number }[];
  medianRatio: number;
  maxRatio: number;
  zombies: number;
  idleTail: number;
};

/**
 * ⚠️ `chat_sessions.coins_charged` is the uncapped METER, not the wallet
 * deduction — a session can show more charged than the wallet held. Never quote
 * it as dispute evidence; the ledger is `credit_transactions`. It is fine as a
 * rate signal, which is all this computes.
 */
export function computeBillingHealth(sessions: any[], msgsBySession: Map<string, Msg[]>): BillingHealth {
  const overRate: BillingHealth['overRate'] = [];
  const ratios: number[] = [];
  let zombies = 0;
  let idleTail = 0;

  for (const s of sessions) {
    const dur = s.duration_seconds ?? 0;
    const coins = s.coins_charged ?? 0;

    if (dur > 60) {
      const ratio = coins / dur;
      ratios.push(ratio);
      if (ratio > MAX_COINS_PER_SECOND + 1e-6) {
        overRate.push({ id: s.id.slice(0, 8), user: s.user_id.slice(0, 8), dur, coins, ratio });
      }
    }

    if (coins === 0 && dur <= 5 && (msgsBySession.get(s.id)?.length ?? 0) >= 2) zombies++;

    const started = new Date(s.started_at).getTime();
    const lastMsg = s.last_message_at ? new Date(s.last_message_at).getTime() : null;
    if (lastMsg && coins > 0 && dur > 0) {
      // Billed-until derived from DURATION, not from a coins-per-second guess —
      // the old version assumed 1 coin/sec here too.
      if (started + dur * 1000 - lastMsg >= 120_000) idleTail++;
    }
  }

  const sorted = [...ratios].sort((a, b) => a - b);
  return {
    sessionsChecked: ratios.length,
    overRate: overRate.sort((a, b) => b.ratio - a.ratio),
    medianRatio: sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0,
    maxRatio: sorted.length ? sorted[sorted.length - 1] : 0,
    zombies,
    idleTail,
  };
}
