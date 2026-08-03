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
//
// OVERLAP WITH email_link_codes: a send migrated to a `/e/<code>` short link
// carries the same three fields (readingRecap / openLoop / continueSeed) in its
// own draft frontmatter, snapshotted into the `email_link_codes` row at render
// time. That row — not this registry — is what the short link resolves. This
// registry still serves every send on the legacy `?campaign=` link. When a
// campaign exists in both, they should say the same thing; the draft frontmatter
// is the authoring source, so copy from it, not the other way round.

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
    campaign: 'reframe-01-changed',
    personaSlug: 'evelyn-cross',
    label: 'The real question',
    readingRecap:
      "You wrote to them about a man who wrote to you listing everything he'd fixed — sober now, at the gym, calling his mother every Sunday — all to prove to a woman he'd changed. You showed them the reframe: every fix on his list had her name written under it, so it wasn't a life he was building, it was a case presented to a jury of one. You told them the truer question isn't \"how do I show her I've changed\" but \"would I still want to be this person if she never came back\" — because change built for someone else to notice is just the old chasing in cleaner clothes.",
    openLoop:
      "You asked them to bring you the question they're really asking about someone — the true one hiding under the one they keep repeating — so you could find the question they actually get to answer.",
    continueSeed:
      "You came to find your real question — good. Tell me the one you keep asking about them, and let's find what's actually hiding under it.",
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
      "You came to tell me about your fence — good. Tell me what it is you keep painting the same color, and let's find out what you're really keeping alive.",
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
      "You came to name your loop — good. Tell me the sentence, the true one about what you keep going back to, and we'll look at what it's really tied to.",
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
      "You came — good. I've been holding that line of yours, the one you say twice. Tell me what it is, and I'll tell you what it's guarding.",
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
      "You came to find out what you're really guarding — good. So tell me honestly: this peace of yours, is it still a door someone could knock on, or has it become the wall?",
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
      "You came to find your door — good. Tell me where you've been turning love away because you don't think you've earned it, and let's look at what's really locking it.",
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
      "You came to tell me your sign — good. Tell me the thing that keeps finding you, and I'll tell you what I think it's really asking of you.",
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
      "You came to tell me about your lamp — good. Tell me which one you've let go dark while you've been watching the water, and let's light it.",
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
      "You came to find where you're standing — good. Tell me where you think you've been auditioning instead of living, and let's find the difference.",
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
