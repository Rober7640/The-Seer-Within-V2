// server/lib/emailReadingBriefs.ts
// Per-campaign "reading briefs" — the structured specifics of what each Evelyn
// email actually SHOWED the reader, so the v2 chat can CONTINUE that exact reading
// instead of starting cold (email→chat continuity; improve-v2 #27, per-campaign).
//
// The `campaign` value MUST equal the `?campaign=` slug the email link carries
// (docs/aweber/evelyn-reframe-deck/scripts/render-aweber.mjs builds it as
// `campaign=<slug>`), which the lander persists to *_lander_sessions.campaign.
//
// This registry is the ONLY place email specifics live for the chat engine. Keep
// each recap to what the email ACTUALLY said — the engine is instructed never to
// invent beyond it.

export interface EmailReadingBrief {
  /** Matches the ?campaign= slug, e.g. 'reframe-04-serious'. */
  campaign: string;
  /** Persona whose email this was, e.g. 'evelyn-cross'. */
  personaSlug: string;
  /** Human label for logs + the injected block header, e.g. 'The tell'. */
  label: string;
  /** 2–5 sentences: the exact reading the email delivered (the specifics). */
  readingRecap: string;
  /** The personal question the email left open for the chat to resolve. */
  openLoop: string;
  /** A register-example opener Evelyn can use to pick the thread back up (turn 0). */
  continueSeed: string;
}

const BRIEFS: EmailReadingBrief[] = [
  {
    campaign: 'reframe-04-serious',
    personaSlug: 'evelyn-cross',
    label: 'The tell',
    readingRecap:
      "You wrote to them about the tell — how a sentence said twice is not a preference but a flinch. You showed them that \"I'm not looking for anything serious,\" said twice in one hour, is a wall built in advance so no one can watch them hope and lose. You named that the wall also keeps out the very person who takes them at their word and quietly backs away.",
    openLoop:
      "You asked them to tell you the line they catch themselves repeating — the one you'd read as guarding something.",
    continueSeed:
      "You came — good. I've been holding that line of yours, the one you say twice. Tell me what it is, and I'll tell you what it's guarding.",
  },
];

export function getEmailReadingBrief(campaign: string): EmailReadingBrief | null {
  if (!campaign) return null;
  return BRIEFS.find((b) => b.campaign === campaign) ?? null;
}
