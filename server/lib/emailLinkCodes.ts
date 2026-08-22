/**
 * Mint/resolve opaque short codes for marketing-email links (/e/:code).
 *
 * A code stands in for a content snapshot (persona, campaign, recap, open
 * loop, continuation seed) captured at email-render time, so the lander can
 * continue the specific reading a reader clicked from without exposing a
 * guessable `?campaign=` param. See shared/schema.ts `emailLinkCodes`.
 */
import { randomBytes } from 'crypto';
import { and, asc, eq } from 'drizzle-orm';
import { db } from './db';
import { emailLinkCodes } from '@shared/schema';

export interface ResolvedEmailLink {
  personaSlug: string;
  campaign: string;
  readingRecap: string | null;
  openLoop: string | null;
  continueSeed: string;
  /** The ONE thing this email is about — see shared/schema.ts's big_idea. */
  bigIdea: string | null;
  /** The letter's card art, shown as its own lander bubble. Usually null. */
  cardImageUrl: string | null;
  /** Lander context the legacy `?bucket=&src=` query string carried; the
   *  redirector rebuilds the query string from these. See shared/schema.ts. */
  bucket: string | null;
  src: string | null;
}

export interface MintEmailLinkCodeInput {
  personaSlug: string;
  campaign: string;
  continueSeed: string;
  readingRecap?: string;
  openLoop?: string;
  /**
   * The email's subject as a phrase the persona can say — lifted from the
   * draft's `**Big Idea:**` line. Optional: a draft without one still mints,
   * and the chat falls back to inferring the topic from the recap (which is
   * exactly the failure this field exists to remove, so drafts should carry it).
   */
  bigIdea?: string;
  /**
   * The letter's card art, lifted from the draft's `**Card Image:**` line.
   * Optional and usually absent — most letters show no card, and one that does
   * needs only this value, never a code change.
   */
  cardImageUrl?: string;
  bucket?: string;
  src?: string;
}

export interface UpsertEmailLinkCodeResult {
  code: string;
  /** 'created' = a new code was minted; 'reused' = an existing code already
   * carried exactly this content; 'updated' = the existing code was kept but
   * its content was refreshed from the newly authored values. */
  action: 'created' | 'reused' | 'updated';
}

/** Postgres unique_violation error code (primary key or unique constraint). */
const PG_UNIQUE_VIOLATION = '23505';

/** Name Postgres gives the email_link_codes primary key (its default naming
 * convention for a single-column PK: `<table>_pkey`). Verified against the
 * real local schema (`\d email_link_codes`), not guessed. */
const CODE_PK_CONSTRAINT = 'email_link_codes_pkey';

function generateCode(): string {
  // 5 random bytes -> 7-char URL-safe string (base64url, no padding).
  return randomBytes(5).toString('base64url');
}

/**
 * True only when `err` is a unique_violation against THIS table's primary
 * key — i.e. a genuine random-code collision that's safe to retry. A unique
 * violation on any other constraint (or any other kind of error) must not be
 * swallowed by a silent retry loop.
 *
 * Exported (not just inlined in the catch block) so the decision itself can
 * be unit-tested against a fabricated error shape, independent of whether
 * the live schema currently has a second unique constraint to provoke one.
 */
export function isCodeCollision(err: unknown): boolean {
  const e = err as { code?: unknown; constraint?: unknown } | null | undefined;
  return e?.code === PG_UNIQUE_VIOLATION && e?.constraint === CODE_PK_CONSTRAINT;
}

export async function mintEmailLinkCode(
  input: MintEmailLinkCodeInput,
  // Injectable purely so tests can force a specific code sequence (e.g. a
  // pre-occupied code followed by a fresh one) to observe a real retry.
  // Production callers never pass this — it defaults to the real generator.
  codeGenerator: () => string = generateCode,
): Promise<string> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = codeGenerator();
    try {
      await db.insert(emailLinkCodes).values({
        code,
        personaSlug: input.personaSlug,
        campaign: input.campaign,
        continueSeed: input.continueSeed,
        readingRecap: input.readingRecap ?? null,
        openLoop: input.openLoop ?? null,
        bigIdea: input.bigIdea ?? null,
        cardImageUrl: input.cardImageUrl ?? null,
        bucket: input.bucket ?? null,
        src: input.src ?? null,
      });
      return code;
    } catch (err) {
      if (isCodeCollision(err)) continue;
      throw err;
    }
  }
  throw new Error(`Failed to mint a unique email link code after ${MAX_ATTEMPTS} attempts`);
}

/**
 * Campaign-idempotent mint, for the email-rendering pipeline
 * (docs/aweber/evelyn-reframe-deck/scripts/render-aweber.mjs).
 *
 * Minting is a side effect with no undo, and the code it returns goes into the
 * body of an email that may already be scheduled to send. Re-rendering a cycle
 * is routine (subject tweak, copy fix, a re-run to inspect the HTML), so a
 * plain `mintEmailLinkCode` per render would mint a fresh row every time —
 * orphaning the old rows and, worse, silently changing the URL inside an email
 * an operator has already queued.
 *
 * So the code is keyed on (personaSlug, campaign), which is the pipeline's own
 * stable identity for a send:
 *   - no row yet          -> mint one ('created')
 *   - row, same content   -> hand the same code back ('reused')
 *   - row, new content    -> keep the code, refresh the content ('updated')
 *
 * Updating in place rather than minting anew is the point: the reader's link
 * stays valid while the continuation content stays in sync with what the email
 * actually says.
 *
 * The read-then-write below is not atomic, but it doesn't have to be: the
 * `uq_email_link_codes_persona_campaign` unique index enforces the invariant
 * this function assumes. If two renders race, the loser's INSERT fails with a
 * unique_violation on THAT index, which `isCodeCollision` deliberately does not
 * treat as a retryable code collision — so it surfaces as an error instead of
 * quietly producing a second code for the same campaign. Duplicates are
 * therefore impossible rather than merely unlikely; the `orderBy` is a
 * belt-and-braces determinism guard, not a duplicate-resolution strategy.
 */
export async function upsertEmailLinkCodeForCampaign(
  input: MintEmailLinkCodeInput,
): Promise<UpsertEmailLinkCodeResult> {
  const existing = await db
    .select()
    .from(emailLinkCodes)
    .where(
      and(
        eq(emailLinkCodes.personaSlug, input.personaSlug),
        eq(emailLinkCodes.campaign, input.campaign),
      ),
    )
    .orderBy(asc(emailLinkCodes.createdAt), asc(emailLinkCodes.code))
    .limit(1);

  if (existing.length === 0) {
    return { code: await mintEmailLinkCode(input), action: 'created' };
  }

  const row = existing[0];
  const readingRecap = input.readingRecap ?? null;
  const openLoop = input.openLoop ?? null;
  const bigIdea = input.bigIdea ?? null;
  const cardImageUrl = input.cardImageUrl ?? null;
  const bucket = input.bucket ?? null;
  const src = input.src ?? null;

  if (
    row.continueSeed === input.continueSeed &&
    row.readingRecap === readingRecap &&
    row.openLoop === openLoop &&
    row.bigIdea === bigIdea &&
    row.cardImageUrl === cardImageUrl &&
    row.bucket === bucket &&
    row.src === src
  ) {
    return { code: row.code, action: 'reused' };
  }

  await db
    .update(emailLinkCodes)
    .set({ continueSeed: input.continueSeed, readingRecap, openLoop, bigIdea, cardImageUrl, bucket, src })
    .where(eq(emailLinkCodes.code, row.code));

  return { code: row.code, action: 'updated' };
}

/**
 * The authored continuation line for a (persona, campaign), or null.
 *
 * SOURCE OF TRUTH. `continueSeed` also exists in the hardcoded registry
 * `server/lib/emailReadingBriefs.ts`, which the chat engine reads
 * (arrivalReading.ts). This table wins for anything lander-facing, for three
 * reasons:
 *   1. It is what the operator actually authors. The seed is written in the
 *      email draft's `**Continue Seed:**` frontmatter and snapshotted here by
 *      the rendering pipeline (render-aweber.mjs); the registry is a
 *      hand-maintained copy of that same text — its own header already says
 *      "the draft frontmatter is the authoring source, so copy from it, not
 *      the other way round."
 *   2. It is a per-send SNAPSHOT taken at render time, so it still says what
 *      the email in the reader's inbox said even after the draft moves on.
 *   3. The `?campaign=` a short-link reader arrives with was itself written by
 *      /e/:code off THIS row (emailLinkRedirect.ts), so reading the row back is
 *      re-reading the same record rather than consulting a second copy of it.
 *
 * Keyed on (personaSlug, campaign) — the pair `uq_email_link_codes_persona_campaign`
 * makes unique — and NOT on campaign alone: `campaign` arrives as a
 * reader-supplied query param, and a bare campaign lookup would happily put
 * another persona's authored line in this persona's mouth.
 *
 * Returns null for a campaign with no row, and for a row whose seed is blank —
 * callers fall back to their own generic opener, so an empty string must not be
 * mistaken for "resolved".
 */
export async function resolveCampaignContinueSeed(
  personaSlug: string,
  campaign: string,
): Promise<string | null> {
  return (await resolveCampaignOpenerContent(personaSlug, campaign))?.continueSeed ?? null;
}

/** Everything the lander thread renders for a campaign: the authored line, and
 *  the card the letter was about when it had one.
 *
 *  ONE query for both. The image is not a second lookup bolted onto the opener —
 *  it is part of the same authored snapshot, resolved on the same row read that
 *  the lander's /start already pays for.
 *
 *  A blank or whitespace-only seed resolves to null overall, exactly as the
 *  seed-only lookup did: without a line to say, there is no thread to put an
 *  image in, and a lone picture is the "reads like an ad" failure this feature
 *  is trying to avoid. */
export async function resolveCampaignOpenerContent(
  personaSlug: string,
  campaign: string,
): Promise<{ continueSeed: string; cardImageUrl: string | null } | null> {
  if (!campaign) return null;
  const rows = await db
    .select({
      continueSeed: emailLinkCodes.continueSeed,
      cardImageUrl: emailLinkCodes.cardImageUrl,
    })
    .from(emailLinkCodes)
    .where(
      and(eq(emailLinkCodes.personaSlug, personaSlug), eq(emailLinkCodes.campaign, campaign)),
    )
    .limit(1);
  const seed = rows[0]?.continueSeed?.trim();
  if (!seed) return null;
  return { continueSeed: seed, cardImageUrl: rows[0]?.cardImageUrl?.trim() || null };
}

export async function resolveEmailLinkCode(code: string): Promise<ResolvedEmailLink | null> {
  const rows = await db.select().from(emailLinkCodes).where(eq(emailLinkCodes.code, code)).limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    personaSlug: row.personaSlug,
    campaign: row.campaign,
    readingRecap: row.readingRecap,
    openLoop: row.openLoop,
    bigIdea: row.bigIdea,
    cardImageUrl: row.cardImageUrl,
    bucket: row.bucket,
    src: row.src,
    continueSeed: row.continueSeed,
  };
}
