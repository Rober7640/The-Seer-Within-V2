// server/lib/emailReadingBriefs.ts
// Per-campaign "reading briefs" — the structured specifics of what each Evelyn
// email actually SHOWED the reader, so the v2 chat can CONTINUE that exact reading
// instead of starting cold (email→chat continuity; improve-v2 #27, per-campaign).
//
// The `campaign` value MUST equal the `?campaign=` slug the email link carries
// (docs/aweber/evelyn-reframe-deck/scripts/render-aweber.mjs builds it as
// `campaign=<slug>`), which the lander persists to *_lander_sessions.campaign.
//
// Keep each recap to what the email ACTUALLY said — the engine is instructed
// never to invent beyond it.
//
// ── WHERE BRIEFS COME FROM (changed 2026-08-18) ─────────────────────────────
// `email_link_codes` FIRST, this file as the fallback. `resolveEmailReadingBrief`
// below is what the chat engine calls; the hardcoded BRIEFS array now only
// answers for campaigns that have no row.
//
// WHY. Both stores hold the same three fields (readingRecap / openLoop /
// continueSeed) — the short link's row is written by the render pipeline, this
// array by hand. That made every new email cycle a CODE DEPLOY: mint the links
// (a data change) and then edit-commit-push this file (a code change), or the
// lander would continue the reading while the chat quietly forgot it. Nothing
// failed loudly; the greeting just went cold. Reading the row the pipeline has
// already written removes the second step, so shipping a cycle is data again.
//
// The array stays, and is NOT deprecated: cycle 1's nine sends went out on the
// legacy `?campaign=` link before short links existed, are marked historical, and
// are deliberately BLOCKED from ever being minted — minting for an already-sent
// campaign would retroactively rewrite what its readers see (see
// sends/cycle-1/short-links.json). They have no row and never will, so this file
// is the only thing that can answer for them.
//
// Precedence is DB-first, not file-first, so an authored correction reaches
// readers by re-running the pipeline. If a campaign somehow exists in both and
// they disagree, the row wins: it is what the pipeline wrote from the draft
// frontmatter, which is the authoring source.

import { db } from './db';
import { and, eq } from 'drizzle-orm';
import { emailLinkCodes } from '@shared/schema';
import logger from './logger';

export interface EmailReadingBrief {
  /** Matches the ?campaign= slug, e.g. 'reframe-04-serious'. */
  campaign: string;
  /** Persona whose email this was, e.g. 'evelyn-cross'. */
  personaSlug: string;
  /**
   * Human label for logs + the injected block header, e.g. 'The tell'.
   *
   * Optional because `email_link_codes` has no column for it — it is an internal
   * name the reader never saw, so a DB-derived brief simply has none and the
   * prompt builders say "your recent email" instead of naming one. Adding a
   * column would mean a migration plus a pipeline change to populate it, for a
   * string no reader has ever read.
   */
  label?: string;
  /** 2–5 sentences: the exact reading the email delivered (the specifics). */
  readingRecap: string;
  /** The personal question the email left open for the chat to resolve. */
  openLoop: string;
  /** A register-example opener Evelyn can use to pick the thread back up (turn 0). */
  continueSeed: string;
}

const BRIEFS: EmailReadingBrief[] = [
  {
    campaign: 'reframe-01-changed',
    personaSlug: 'evelyn-cross',
    label: 'The real question',
    readingRecap:
      "You wrote to them about a man who wrote to you listing everything he'd fixed — sober now, at the gym, calling his mother every Sunday — all to prove to a woman he'd changed. You showed them the reframe: every fix on his list had her name written under it, so it wasn't a life he was building, it was a case presented to a jury of one. You told them the truer question isn't \"how do I show her I've changed\" but \"would I still want to be this person if she never came back\" — because change built for someone else to notice is just the old chasing in cleaner clothes.",
    openLoop:
      "You asked them to bring you the question they're really asking about someone — the true one hiding under the one they keep repeating — so you could find the question they actually get to answer.",
    continueSeed:
      "You came back about the list — the man who fixed everything he could think of to prove it to one person. Tell me the question you keep asking about them, and I'll show you the truer one hiding underneath it.",
  },
  {
    campaign: 'reframe-02-fence',
    personaSlug: 'evelyn-cross',
    label: 'The fence',
    readingRecap:
      "You wrote to them about a widower on your street who repaints his fence the same soft green every spring — the color his wife chose the last spring she was alive, four years gone now. You showed them the reframe: he isn't failing to let her go, he's keeping alive the part of him that still shares a life, the part that considers another person and asks \"what would you think?\" — and that capacity didn't go into the ground with her, it's still his to use.",
    openLoop:
      "You asked them to notice which fence THEY keep painting — the ritual, the untouched side of the bed, the thing they keep exactly as it was — and come tell you what it is.",
    continueSeed:
      "You came back about the green fence — the one he repaints the same colour every spring. Tell me what you keep painting, and I'll tell you what you're really keeping alive.",
  },
  {
    campaign: 'reframe-03-devil',
    personaSlug: 'evelyn-cross',
    label: 'The loose chain',
    readingRecap:
      "You wrote to them about the Devil card — how everyone flinches at the horns and the firelight, but you pointed them at the chains themselves: loose loops dropped over the two figures' heads, no lock, wide enough to lift off with two hands and a decision. You showed them the reframe — the card isn't a curse arriving, it's a mirror asking why they haven't taken off something that only looks locked, something familiar enough it's started to feel like home.",
    openLoop:
      "You asked them to simply name the loop out loud — the one true sentence about what they keep going back to — without trying to lift it yet.",
    continueSeed:
      "You came back about the Devil card — those chains, loose enough to lift off with two hands and a decision. Tell me the one you haven't lifted yet, the thing you keep going back to, and we'll look at what it's actually tied to.",
  },
  {
    campaign: 'reframe-04-serious',
    personaSlug: 'evelyn-cross',
    label: 'The tell',
    readingRecap:
      "You wrote to them about the tell — how a sentence said twice is not a preference but a flinch. You showed them that \"I'm not looking for anything serious,\" said twice in one hour, is a wall built in advance so no one can watch them hope and lose. You named that the wall also keeps out the very person who takes them at their word and quietly backs away.",
    openLoop:
      "You asked them to tell you the line they catch themselves repeating — the one you'd read as guarding something.",
    continueSeed:
      "You came back about the tell — the sentence said twice. I've been holding that line of yours since the letter went out. Tell me what it is, and I'll tell you what it's guarding.",
  },
  {
    campaign: 'reframe-05-peace',
    personaSlug: 'evelyn-cross',
    label: 'Protecting my peace',
    readingRecap:
      "You wrote to them about the phrase \"protecting my peace\" — how it can be a real boundary, or a wall wearing gentler words. You gave them the test: a boundary is aimed at the one person who hurt them; a wall is aimed at anyone who might get close enough to, keeping everyone out and calling the empty room serenity.",
    openLoop:
      "You gave them a truer sentence to test their peace against — \"I'm keeping everyone at a distance so nothing can reach me\" — and told them if it landed, not to sit with that alone.",
    continueSeed:
      "You came back about protecting your peace — good. So tell me honestly: is it still a door someone could knock on, or has it quietly become the wall?",
  },
  {
    campaign: 'reframe-06-love-yourself',
    personaSlug: 'evelyn-cross',
    label: 'Love yourself first',
    readingRecap:
      "You wrote to them about the phrase \"you can't love anyone until you love yourself\" — how half of it is true (certain you're worthless, you'll take scraps and call them a feast) but the saying turns that truth into an entrance fee, locking the door on the very people still learning their worth. You showed them the reframe: self-love is rarely the finish line you cross before you're allowed to be loved — far more often it's what being chosen well, and stayed with, actually teaches you.",
    openLoop:
      "You gave them a truer question to sit with — \"where am I turning love away because I've decided I haven't earned it yet\" — and asked them to come tell you where they're standing outside that door.",
    continueSeed:
      "You came back about that saying — that you can't love anyone until you love yourself. Tell me where you've been turning love away because you decided you haven't earned it yet, and we'll look at what's really locking that door.",
  },
  {
    campaign: 'reframe-07-song',
    personaSlug: 'evelyn-cross',
    label: 'The song',
    readingRecap:
      "You wrote to them about the song that keeps finding them — in a café, a stranger's car, a playlist they didn't build — and the story everyone tells about it (\"they're thinking of you, it's a sign, wait\"). You showed them the reframe: the song isn't a message FROM the person they're missing, it's a message about where their own attention still lives — their ear keeps catching it because a question is open in them, and the song is only the flag for it, not a leash but a lamp.",
    openLoop:
      "You asked them to tell you their sign — the thing that keeps finding them — so you could tell them what you think it's really pointing at, what it's asking OF them rather than what it's promising.",
    continueSeed:
      "You came back about the song — the one that keeps finding you everywhere. Tell me what it is, and I'll tell you what your attention is really flagging.",
  },
  {
    campaign: 'reframe-08-lighthouse',
    personaSlug: 'evelyn-cross',
    label: 'The lighthouse',
    readingRecap:
      "You wrote to them about a lighthouse keeper who still lights her lamp every dusk on a coast the ships stopped visiting years ago. You showed them the reframe: she doesn't climb those stairs for the ships — a lit lamp is a life still tended, and lighting it is for her, not to summon anyone; waiting done that way keeps a person whole instead of hollowing them out at the glass.",
    openLoop:
      "You asked them which lamp they've let go dark while watching the sea — the piece of their own life they keep saving for \"once they come\" — and to come tell you what it is.",
    continueSeed:
      "You came back about the lamp — the keeper lighting it every night for ships that rarely come. Tell me which of yours you've let go dark while you watched the water, and let's light it.",
  },
  {
    campaign: 'reframe-09-stop-looking',
    personaSlug: 'evelyn-cross',
    label: 'Stop looking',
    readingRecap:
      "You wrote to them about the line \"you'll find love when you stop looking\" — how half of it is true (frantic scanning, auditioning every date like a job interview, does wear a person down and show) but the saying smuggles in a cruelty: hearing \"stop looking\" as \"stop wanting, go numb, disappear.\" You showed them the reframe: stop auditioning, yes — but never stop wanting, showing up, being seen; the real shift is where their eyes point, not whether they want it at all.",
    openLoop:
      "You gave them a truer question to sit with — \"where am I auditioning, when I could just be living\" — and asked them to come tell you if they can feel the difference but can't quite find it.",
    continueSeed:
      "You came back about that advice — that you'll find love when you stop looking. Tell me where you've been auditioning instead of living, and we'll find the difference.",
  },
];

// TEA-LEAF TEMPLATE (activate when the email ships — set its ?campaign= slug to match):
// {
//   campaign: 'tealeaf-<topic>',
//   personaSlug: 'evelyn-cross',
//   label: 'The tea leaves',
//   readingRecap:
//     "In your letter you read their leaves symbol by symbol: <bird taking flight = he's pulling away>, " +
//     "<withering tree = the connection thinning>, then the turn — <bridge = a way back>, <lighthouse = support near>, " +
//     "<butterfly = change is possible>. Transcribe the ACTUAL symbols the email used.",
//   openLoop: "You offered them the FULL reading — the part the letter held back.",
//   continueSeed: "You came for the rest of it. Let me finish reading those leaves for you — start with the one that's been sitting with you.",
// },

export function getEmailReadingBrief(campaign: string): EmailReadingBrief | null {
  if (!campaign) return null;
  return BRIEFS.find((b) => b.campaign === campaign) ?? null;
}

/** True if this persona has ANY reading briefs registered — lets callers skip the
 * arrival-reading lookup entirely for personas (Marcus, Luna, …) that never have one. */
export function hasBriefsForPersona(personaSlug: string): boolean {
  return BRIEFS.some((b) => b.personaSlug === personaSlug);
}

// ---------------------------------------------------------------------------
// DB-backed resolution (the accessors the chat engine actually uses)
// ---------------------------------------------------------------------------
/**
 * A row can be minted with only `continue_seed` — that is all the LANDER needs
 * to render its opening bubble, and `reading_recap` / `open_loop` are optional
 * columns. The CHAT needs more than that: `buildArrivalReadingSection` hands the
 * persona the recap as "here is exactly what you showed them" and the open loop
 * as the question to resolve. With either missing, the injected block would tell
 * her she wrote something and then not say what — which is precisely the cold,
 * inventing-details failure this whole mechanism exists to prevent.
 *
 * So a row that cannot produce a COMPLETE brief is treated as no brief at all,
 * and resolution falls through to the built-in registry. Partial is worse than
 * absent here.
 */
function briefFromRow(row: {
  campaign: string;
  personaSlug: string;
  readingRecap: string | null;
  openLoop: string | null;
  continueSeed: string;
}): EmailReadingBrief | null {
  const readingRecap = row.readingRecap?.trim();
  const openLoop = row.openLoop?.trim();
  if (!readingRecap || !openLoop) return null;
  return {
    campaign: row.campaign,
    personaSlug: row.personaSlug,
    readingRecap,
    openLoop,
    continueSeed: row.continueSeed,
    // No label column — see EmailReadingBrief.label.
  };
}

/**
 * The brief for a campaign: the `email_link_codes` row if it can produce a
 * complete one, else the built-in registry.
 *
 * Scoped by persona in the QUERY rather than checked afterwards. `campaign` is
 * unique only per (persona, campaign) — the table's own unique index says so —
 * so looking up by campaign alone could return another persona's row and hand
 * Evelyn's recap to Luna. The caller in arrivalReading.ts also re-checks the
 * persona, which is belt-and-braces for the registry path, not a substitute here.
 *
 * A DB failure is logged and falls back to the registry rather than propagating:
 * this runs inside greeting generation, and continuity going cold is a far
 * better outcome than a greeting that fails to send at all.
 */
export async function resolveEmailReadingBrief(
  campaign: string,
  personaSlug: string,
): Promise<EmailReadingBrief | null> {
  if (!campaign || !personaSlug) return null;

  try {
    const [row] = await db
      .select({
        campaign: emailLinkCodes.campaign,
        personaSlug: emailLinkCodes.personaSlug,
        readingRecap: emailLinkCodes.readingRecap,
        openLoop: emailLinkCodes.openLoop,
        continueSeed: emailLinkCodes.continueSeed,
      })
      .from(emailLinkCodes)
      .where(
        and(
          eq(emailLinkCodes.campaign, campaign),
          eq(emailLinkCodes.personaSlug, personaSlug),
        ),
      )
      .limit(1);

    if (row) {
      const brief = briefFromRow(row);
      if (brief) {
        // The row wins on CONTENT, but has no label column. Where the same
        // campaign also exists in the built-in registry, borrow its label rather
        // than dropping to the unnamed phrasing — the two stores describe the
        // same send, and a name we already have beats none. New campaigns
        // (cycle 2 onward) have no registry entry and so stay unnamed, which is
        // the intended steady state.
        const label = getEmailReadingBrief(campaign)?.label;
        return label ? { ...brief, label } : brief;
      }
      // Row exists but is lander-only (no recap/open loop). Not an error — the
      // pipeline allows it — but worth seeing, because the chat half of
      // continuity is silently off for that campaign.
      logger.warn('emailReadingBriefs: link row has no recap/open loop — chat continuity falls back', {
        campaign,
        personaSlug,
      });
    }
  } catch (error: any) {
    logger.error('emailReadingBriefs: DB lookup failed — falling back to built-in registry', {
      campaign,
      personaSlug,
      error: error?.message,
    });
  }

  const fallback = getEmailReadingBrief(campaign);
  return fallback && fallback.personaSlug === personaSlug ? fallback : null;
}

/**
 * Cheap "could this persona have a brief at all?" guard, so personas that never
 * have one (Marcus, Nova, Maren…) skip the lander lookup entirely — this runs on
 * every greeting and every early in-session message.
 *
 * Cached because it is on that hot path and its answer changes about as often as
 * a new email cycle ships. The TTL is what bounds how long a newly-minted
 * persona waits to be recognised; a minute is far below the gap between minting
 * a cycle and its first send, so no reader can land inside the window.
 *
 * On a DB error we return TRUE (assume it might), which costs one wasted lookup
 * downstream instead of silently disabling continuity for everyone.
 */
const PERSONA_SET_TTL_MS = 60_000;
let personaSetCache: { slugs: Set<string>; expiresAt: number } | null = null;

/** Test-only: drop the cache so a freshly-inserted row is seen immediately. */
export function __resetBriefPersonaCache(): void {
  personaSetCache = null;
}

export async function personaMayHaveBriefs(personaSlug: string): Promise<boolean> {
  if (!personaSlug) return false;
  // The built-in registry is free to check and answers for cycle 1.
  if (hasBriefsForPersona(personaSlug)) return true;

  const now = Date.now();
  if (!personaSetCache || personaSetCache.expiresAt <= now) {
    try {
      const rows = await db
        .selectDistinct({ personaSlug: emailLinkCodes.personaSlug })
        .from(emailLinkCodes);
      personaSetCache = {
        slugs: new Set(rows.map((r) => r.personaSlug)),
        expiresAt: now + PERSONA_SET_TTL_MS,
      };
    } catch (error: any) {
      logger.error('emailReadingBriefs: persona-set lookup failed — assuming briefs may exist', {
        error: error?.message,
      });
      return true;
    }
  }

  return personaSetCache.slugs.has(personaSlug);
}
