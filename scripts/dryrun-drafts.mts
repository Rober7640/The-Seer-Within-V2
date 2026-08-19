#!/usr/bin/env npx tsx
// dryrun-drafts — run the SHARED registry guards against pending draft JSON, before wiring.
//
// WHY. preview-rewrite.mjs gates READABILITY (words, grade, syllables, echo). It does not know
// about the guards that live in tests/tarot-<family>-copy.test.ts — beat-1 distinctness across
// the whole deck, and the 6-word-run rules that stop one lander recycling another's wording.
// Those only fire AFTER wiring, which is the expensive place to find out. On his-other-life
// this caught two real collisions (a sibling family's line, and two of the new drafts against
// each other) that the readability gate passed clean.
//
// It checks what EVERY family's guard file shares. Per-family findings (the "this hook must
// still say X" assertions) are in FINDINGS below, filled in from each test file as it is read.
//
//   npx tsx scripts/dryrun-drafts.mts              # every pending draft
//   npx tsx scripts/dryrun-drafts.mts cards-loyal  # just these
//
// ⚠️ THIS IS A FAST PRE-FILTER, NOT THE PROOF. It re-implements the guards BY HAND, so it
// only catches what somebody remembered to transcribe — and a clean run here means nothing
// on its own. On 2026-08-19 it passed a batch the real guard files then failed 12 times.
// Before showing a draft to anyone, run the real thing:
//
//   npx vitest run --config scripts/vitest.drafts.config.ts tests/tarot-
//
// which loads the drafts into the in-memory registry and runs tests/tarot-*-copy.test.ts
// against them, touching no source file.
import { readdirSync, readFileSync } from 'node:fs'
const { DECKS, TAROT_HOOKS } = await import('../client/src/content/tarotReads.ts')

// Per-family assertions lifted from tests/tarot-<family>-copy.test.ts, filled in as each
// guard file is read. FINDINGS run against beat 3 joined across the three cards; WORD_BANS
// run against every whole beat; CLAUSE_BANS run only on clauses with no negator in them (so
// copy that names a banned frame in order to REFUSE it is not caught by its own refusal);
// NO_RUN_WITH compares beat 3 against another hook on every deck both appear on.
type Family = {
  hooks: string[]
  findings?: Record<string, Array<[RegExp, string]>>
  wordBans?: Array<[RegExp, string]>
  clauseBans?: Array<[RegExp, string]>
  noRunWith?: string[]
}
const FAMILIES: Family[] = [
  // 💰 TRACK B — money-block. ⚠️ ADDED 2026-08-19 because these three drafts were passing
  // BOTH gates without being checked at all: the money hooks are not in the registry yet, so
  // every deck-level guard skipped them silently and the run still printed a green tick. A
  // clean gate on an unwired family means nothing until the family is listed here.
  //
  // 🔴 NONE of the seven bans was loosened with the love families on 2026-08-19. This is the
  // one place on the funnel where a wrong sentence costs her actual money, so the directional
  // argument ("the hopeful half has no victim") does not hold: "money is coming" IS the
  // harmful direction when she can act on it with her savings.
  {
    hooks: ['cards-blocked-retiring', 'cards-nest-egg', 'cards-too-late'],
    findings: {
      // Ban 5 is directional by design: 'too late' must be NAMED on this hook in order to be
      // refused. The restatement exemption below keeps beat 2 (which quotes her headline)
      // from tripping the ban the refusal exists to satisfy.
      'cards-too-late': [[/not too late|didn't leave it too late|did not leave it too late|never once counted|not out of road/i, 'must REFUSE the too-late premise outright']],
      'cards-blocked-retiring': [[/never you|not where this went wrong|held is|not out of road|never once counted/i, 'must clear HER of the failing']],
      'cards-nest-egg': [[/points at you|old, dear|not something recent|block, dear|kept the ground bare|long time/i, 'must place the block in TIME, never in her']],
    },
    wordBans: [
      [/[£$€]\s?\d|\b\d[\d,]{2,}\b|\b(thousand|million|figure sum)\b/i, 'BAN 1 — an amount'],
      [/\bwithin (a|the|\d)|\bin (a few|the next|\d+) (day|week|month|year)|\bby (the end of|christmas|new year|spring|summer|autumn|winter)\b/i, 'BAN 2 — a date'],
      [/\b(inheritance|inherit|windfall|lottery|legal case|lawsuit|settlement|compensation|payout|a will)\b/i, 'BAN 3 — names a SOURCE she could act on'],
      [/\b(invest|sell|buy|hold on to|cash (it )?in|take the pension|delay(ing)? (it|your pension)|go back to work|stop working|remortgage|borrow)\b/i, 'BAN 4 — financial advice'],
      [/\b(poverty mindset|scarcity mindset|money block(age)? in you|you attract|vibration|abundance mindset|manifest)\b/i, 'BAN 6 — blames her'],
      [/\bmoney is coming\b|\bit will come\b|\byou will be (fine|comfortable|secure)\b/i, 'BAN 5b — a promised arrival'],
      [/\byou (are|were) (broke|poor|penniless|struggling)\b|\bwhat little you have\b/i, 'BAN 7 — presumes her finances'],
    ],
    clauseBans: [
      [/\b(your|his|her) (husband|wife|son|daughter|sister|brother|mother|father|partner|family) (is|has|took|takes)\b/i, 'BAN 3b — names a PERSON as the block'],
      [/\bsomebody (is|has been) (taking|drawing|holding)\b|\bsomeone in your family\b/i, 'BAN 3b — names a PERSON as the block'],
      [/\byou (left it|have left it) too late\b|\bit (is|'s) too late\b/i, "BAN 5 — asserts 'too late' (naming it to REFUSE it is required, and is exempted)"],
      [/\byou should have (saved|invested|started|planned)\b|\byour own (fault|doing)\b/i, 'BAN 6 — blames her'],
    ],
  },
  {
    hooks: ['cards-forever-or-now', 'cards-his-children', 'cards-her-shadow', 'cards-live-apart', 'cards-too-long'],
    findings: {
      'cards-forever-or-now': [[/not a condition|is built|has been built|only been felt|no such fact|never been named/i, 'permanence-is-built finding']],
      'cards-his-children': [
        [/first call|do have a first|children ought to mean|come first/i, 'says children DO have a first call'],
        [/place of your own|where you sit|appear on one|planned for you/i, 'offers a DEFINED place, not a higher one'],
      ],
      'cards-too-long': [
        [/not spend|waiting room|lived them|time given to a person|not the same as time lost/i, 'years-were-lived finding'],
        [/allowed to want|am i allowed|entitled to want|permission/i, 'names the buried question'],
      ],
    },
    clauseBans: [
      [/\byou (deserve|ought) to come (first|before)\b|\byou should come (first|before)\b/i, 'tells her to outrank his children'],
      [/\bcome before (his|the) (children|kids)\b|\byou (come|are) second\b/i, 'ranks her against the children'],
      [/\b(his|the) (children|kids) are (the problem|an obstacle|in the way)\b/i, 'children as obstacle'],
      [/\bhe (is|has been) a (bad|poor|weak) father\b/i, 'grades him as a father'],
      [/\bshe (is|has) (at peace|crossed over|passed|watching)\b|\bshe would want\b/i, 'MEDIUMSHIP'],
      [/\bhis (late|dead) wife\b|\bhis ex.?wife\b|\bhe is still married\b/i, 'presumes his circumstances'],
      [/\byou (have )?(wasted|squandered) (your|those|the) (time|years|life)\b/i, 'verdict on her past'],
      [/\byou (have )?(given|stayed) too (long|much)\b|\bit was (all )?worth it\b/i, 'verdict / promise on her past'],
      [/\byou (were|are|have been) (naive|foolish|silly|weak|desperate|a doormat)\b/i, 'grades her'],
    ],
  },
  {
    // tests/tarot-fidelity-copy.test.ts — 🔴 the FLAGGED word appears in NO beat, and the
    // paranoia frame is banned in BOTH directions (calling her it is the injury; using it to
    // reassure her plants it). cards-cheating is the INCUMBENT these must not restate.
    hooks: ['cards-someone-else', 'cards-loyal', 'cards-talking-someone', 'cards-faithful'],
    findings: {
      'cards-someone-else': [[/explanation|account|gap|draft|told/i, 'routes to the EXPLANATION she was left to author']],
      'cards-talking-someone': [[/attention|entitled|direction|split|unnamed/i, 'routes to ATTENTION and her right to mind']],
      'cards-faithful': [[/rest|suspend|put it down|footing|guarantee/i, 'routes to her not resting']],
      'cards-loyal': [[/portion|share|whole|adjust|held (partly )?back/i, 'routes to the PORTION taken for the whole']],
    },
    wordBans: [
      [/\b(cheat|cheats|cheated|cheating|cheater|affairs?|infidelity)\b/i, 'the FLAGGED word — banned in every beat of this family'],
      [/\bparanoi(a|d)\b|\bimagining (it|things)\b|\boverthinking\b|\binsecure\b|\bcrazy\b/i, 'paranoia framing — banned in BOTH directions'],
    ],
    clauseBans: [
      [/\bthere is someone else\b/i, 'asserts a third person'],
      [/\bhe (is|has been) (seeing|talking to|involved with|with) (someone|another)\b/i, 'asserts a third person'],
      [/\byour (instincts?|gut) (is|are) right about (him|this)\b/i, 'confirms the accusation sideways'],
      [/\bthere is (nobody|no one) else\b/i, 'denies — a reassurance the funnel cannot give'],
      [/\bhe (is|has been) (loyal|faithful|true) to you\b/i, 'vouches for a real man'],
      [/\byou (have|'ve) nothing to worry about\b|\bhe would never\b/i, 'reassurance'],
      [/\b(check|look at|go through|read) (his|the) (phone|messages|texts|emails|accounts)\b/i, 'surveillance'],
      [/\bfollow him\b|\b(watch|track) (him|his)\b|\btest him\b/i, 'surveillance'],
      [/\b(find|get|gather) (the )?(proof|evidence)\b|\bcatch him\b|\bconfront him\b/i, 'tells her to build a case'],
      [/\bhe (is|'s) (just|only) (busy|stressed|tired|going through)\b|\b(men|all men) are\b/i, 'excuse'],
      [/\byou (are|'re) (being )?(too )?(demanding|needy|jealous|possessive|clingy)\b/i, 'her fault'],
      [/\byou (pushed|drove) him\b|\byou (are|'re) not enough\b|\btrust him more\b/i, 'her fault'],
    ],
    noRunWith: ['cards-cheating'],
  },
  {
    // tests/tarot-twin-flame-copy.test.ts — the tightest guards on the funnel. Each hook is a
    // VOCABULARY TEST against a named incumbent in another family, so beat 3 must not rhyme
    // with its own control either.
    hooks: ['cards-twin-back', 'cards-twin-ready', 'cards-twin-feels'],
    wordBans: [
      [/\bwithin (a|the|\d)|\bin (a few|the next|\d+) (day|week|month|year)|\bsoon\b/i, 'timeframe'],
      [/\bwhen the time is right\b/i, 'timeframe dressed as wisdom'],
      [/\bI promise\b/i, 'a promise the funnel cannot keep'],
      [/\$|\bpay\b|\bprice\b|\boffer\b/i, 'price'],
      [/\b(hurry|today only|limited|act now|expires)\b/i, 'urgency'],
    ],
    clauseBans: [
      [/\bhe (is|really is|truly is) your twin flame\b|\bthis (is|really is) a twin flame\b/i, 'certifies the bond'],
      [/\byes,? he is (the one|your)\b|\byou two are (fated|destined|meant|bound)\b/i, 'certifies / fate claim'],
      [/\byour souls (are|were)\b|\b(one|two) halves of\b/i, 'certifies the cosmology'],
      [/\bhe (is not|isn't) your twin flame\b/i, 'denies it — equally a verdict'],
      [/\bthe connection is (real|genuine) between you\b/i, 'certifies mutuality as fact'],
      [/\bhe (is )?(running|runs)\b|\bthe runner\b/i, 'the runner trope'],
      [/\bhe (pulls|pulled) away because\b|\bhis (distance|silence|absence) (is|shows|proves|means)\b/i, 'distance read as evidence'],
      [/\b(overwhelmed|frightened|scared) by (the|this) (intensity|connection|bond)\b/i, 'the runner rationale'],
      // 🔄 LOOSENED 2026-08-19 — "he feels it too" is now allowed (cards-twin-feels asks
      // exactly that). What stays is the part that keeps her waiting.
      [/\bhe (cannot|can't) (stay away|escape|deny)\b|\bhe (is|will be) drawn back\b/i, 'the runner script / promises the return'],
      [/\b(this|the) separation (is|was)\b/i, 'separation as a stage'],
      [/\b(a|the) (phase|stage|chapter) (of|in) (the|your|this) (journey|process|union)\b|\bpart of (the|your) journey\b/i, 'separation script'],
      [/\bthe universe is (bringing|preparing|aligning)\b|\bdivine timing\b/i, 'fate with intentions'],
      [/\bwhen you (have healed|are healed|heal)\b|\bonce you (have )?(healed|let go|worked on|raised)\b/i, 'his return as her homework'],
      [/\braise your vibration\b|\b(ascend|ascension)\b/i, 'homework'],
      [/\bstop chasing\b|\bno contact\b/i, 'tactic'],
      [/\bhe (is|'s) (avoidant|a narcissist|emotionally unavailable|commitment[- ]phobic)\b|\bhis attachment\b/i, 'diagnosis'],
      [/\bhe (is|'s) (a coward|selfish|using you|toxic)\b/i, 'character verdict'],
      [/\b(send|text|message|call) him\b|\bgive him (space|time)\b|\breach out\b/i, 'tactic'],
      [/\blet him go\b|\bmove on\b/i, 'tactic in the other direction'],
    ],
    noRunWith: ['cards-ready-commit', 'cards-feels', 'cards-ever-back'],
  },
  {
    // tests/tarot-reconciliation-copy.test.ts — the forbidden verdict is on the RELATIONSHIP,
    // both ways, which is harder than a verdict on a man: she cannot measure it against anything.
    hooks: ['cards-still-a-chance', 'cards-really-over', 'cards-back-together'],
    findings: {
      'cards-really-over': [
        [/said|say|spoken|told|words|plainly|unfinished/i, 'routes to the conversation she was never given'],
        [/withhold|neither|not .*(mine|the Magician's) to|nothing in the Fool closes|will not|refuse|declines|no amount/i, 'must visibly REFUSE its own headline'],
      ],
      'cards-still-a-chance': [[/hope|unsettled|unanswered|not been (spent|sealed|answered)/i, 'affirms hoping without promising']],
    },
    wordBans: [
      [/\bwithin (a|the|\d)|\bin (a few|the next|\d+) (day|week|month|year)|\bsoon\b|\bI promise\b/i, 'timeframe / promise'],
    ],
    clauseBans: [
      [/\bit (is|really is|has been) over\b|\b(this|it) (is|has) (finished|ended|done)\b/i, 'pronounces the relationship dead'],
      [/\byou (two )?(will|are going to) (get back together|find your way back|reconcile)\b/i, 'forecasts reunion'],
      [/\b(it|this) (is|will be) not over\b|\bthere is still (a real|every) (chance|hope)\b/i, 'promise dressed as a reading'],
      [/\byou (will|are going to) be together again\b|\bhe (is|will be) coming back\b/i, 'forecasts a return'],
      [/\bhe (does not|doesn't) (love|want) you\b/i, 'convicts him'],
      [/\b\d+\s*(%|percent)|\b(good|strong|slim|high|low|fair) (odds|chance|chances|possibility)\b|\bthe odds are\b/i, 'odds'],
      [/\b(likely|unlikely|probable|improbable)\b|\bmore than likely\b|\b(every|a real) chance\b/i, 'odds'],
      [/\b(you (need|have|ought) to|you should) (move on|let go|accept|wait|reach out|call him|text him|fight)\b/i, 'directive'],
      [/\bit is time to (move on|let go|accept|walk away)\b|\b(move on|let go of him|let him go|walk away|close this chapter)\b/i, 'directive'],
      [/\bfight for (him|this|it)\b|\breach out (to him )?first\b|\bgive him (space|time)\b|\bdon't give up (on him|on this)\b/i, 'directive'],
      [/\bit (is|will be) up to you\b|\bdepends on (what you|you)\b|\bif you (only |just )?(tried|showed|reached|opened)\b/i, 'hands her the outcome'],
      [/\byou (were|are) too (much|available|eager|needy|sensitive)\b|\byou (were|are) not enough\b/i, 'her fault'],
      [/\byou (pushed him|drove him) away\b|\byou (are|were) (clinging|desperate|deluding yourself)\b/i, 'her fault'],
      [/\b(unable|refusing) to (accept|face) reality\b/i, 'her fault'],
    ],
  },
  {
    // tests/tarot-soulmate-after-loss-copy.test.ts — 🔴🔴 THE ONLY FAMILY WHERE THE MAN MAY BE
    // DEAD. Mediumship is the failure mode that exists nowhere else on the funnel, and
    // universalSafety.ts does not catch it. Note the VOC also shows the "loss" is often a
    // divorce, a walkout or a nursing home — so nothing may presume a death either.
    hooks: ['cards-new-soulmate', 'cards-soulmate-out-there', 'cards-ready-to-love'],
    findings: {
      'cards-new-soulmate': [[/replac|disloyal|overwrite|seat left empty|debt against/i, 'answers the REPLACEMENT fear']],
      'cards-soulmate-out-there': [[/premise|used it up|runs down|running down|empties|unwalked|closed off/i, 'answers the PREMISE, not the whereabouts']],
      'cards-ready-to-love': [
        [/permission|allowed|nobody else|anyone else|only its owner|certain in advance/i, 'routes to PERMISSION being hers'],
        [/will not grade|declines?|not going to do it|issues no verdict|no standard|not ready or unready|refuse/i, 'must visibly REFUSE its own headline'],
      ],
    },
    wordBans: [
      [/\bwithin (a|the|\d)|\bin (a few|the next|\d+) (day|week|month|year)|\bsoon\b|\bI promise\b|\bnot (much )?long now\b/i, 'timeframe'],
    ],
    clauseBans: [
      [/\bhe (is|would be) (at peace|at rest|in a better place)\b|\bhe (is|has been) watching (over )?(you|from)\b/i, 'MEDIUMSHIP'],
      [/\bhe (is|would be) proud of you\b|\bhe would want you to\b|\bhe would have wanted\b/i, 'MEDIUMSHIP: speaks his wishes'],
      [/\bhe (sent|brought|led) you (here|to)\b|\bhe (is|stays|remains) (with|beside|near) you\b/i, 'MEDIUMSHIP'],
      [/\b(his|the) spirit\b|\bfrom the other side\b|\bhe (knows|sees|hears) (you|that|this)\b/i, 'MEDIUMSHIP'],
      [/\bhis blessing\b|\b(reach|contact|hear from|a message from) him\b/i, 'MEDIUMSHIP'],
      // 🔄 SYNCED 2026-08-19 with tests/tarot-soulmate-after-loss-copy.test.ts, which LOOSENED
      // the arrival promise on the operator's call. The mirror kept banning it for a day after
      // the real guard stopped, which is worse than no mirror: it argues with the source of
      // truth. Only 'nearer than' stays, and for DISTINCTNESS — it is the live cards-soulmate
      // incumbent's exact landing. Dates stay banned in wordBans above.
      [/\bnearer than\b/i, 'collides with the live cards-soulmate landing'],
      [/\byou (are|'re) ready\b|\byou (are|'re) not ready\b|\byou (have|'ve) (healed|grieved) enough\b/i, 'grades her'],
      [/\bit (is|'s) time (to|for you)\b|\bit (is|'s) too soon\b|\byou need (more )?time\b/i, 'prescribes a timetable'],
      [/\byou (are|'re) (still )?(not )?(there|healed) yet\b|\bwhen you (are|'re) ready you will\b/i, 'grades her progress'],
      [/\b(move on|let go of him|let him go|say goodbye|close this chapter)\b/i, 'grief directive'],
      [/\byou (need|have|ought) to (move on|let go|heal|open up|start living)\b/i, 'grief directive'],
      [/\bhonou?r (him|his memory) by\b|\b(he|it) would want\b|\bdon't (stay|remain) stuck\b/i, 'grief directive / speaks for him'],
      [/\b(better|greater|deeper|healthier) than (what you had|he was|the last)\b/i, 'ranks the two loves'],
      [/\b(replace|replacing) him\b/i, 'the fear she arrived with, asserted rather than answered'],
    ],
  },
  {
    // tests/tarot-commitment-copy.test.ts — these ask for a PREDICTION outright, so the
    // no-verdict rule runs in BOTH directions plus a no-timeframe rule. 🔴 The bans here are
    // WHOLE-BEAT, not clause-level, so a banned phrase is caught even inside its own refusal.
    hooks: ['cards-wont-commit', 'cards-ready-commit'],
    wordBans: [
      [/\bhe will commit\b|\bhe'll commit\b/i, 'promises he commits'],
      [/\bhe will never\b|\bnever commit\b/i, 'pronounces he never will'],
      [/\bhe is not capable\b/i, 'verdict on his capacity'],
      [/\bwithin (a|the|\d)|\bin (a few|the next|\d+) (day|week|month|year)|\bsoon\b/i, 'timeframe'],
      [/\byour fault\b|\btoo much\b|\bnot enough\b|\btoo available\b|\btoo eager\b/i, 'blames her'],
    ],
    noRunWith: ['cards-twin-ready', 'cards-will-commit'],
  },
  {
    // trust — a SEED family with NO guard file (tests/tarot-trust-copy.test.ts does not
    // exist), so only the generic guards apply and this is among the least protected copy on
    // the funnel. The bans below come from TAROT_HOOK_TENDENCY instead.
    // ⚠️ cards-real-person: the 2026-07-10 buyer audit caught Evelyn reframing textbook scam
    // markers as a genuine bond. REASSURANCE is the failure mode here, not the safe option.
    hooks: ['cards-real-person', 'cards-misled'],
    clauseBans: [
      [/\bhe (is|'s) (real|genuine|who he says)\b/i, 'vouches for him — the documented failure mode on this hook'],
      [/\bthe (bond|connection) (is|feels) (real|genuine)\b/i, 'reassures her the bond is genuine'],
      [/\bhe (is|'s) (fake|a fraud|a scammer|catfishing you)\b/i, 'pronounces him fake — still a verdict'],
      [/\bhe (is|has been) (deceiving|misleading|lying to) you\b/i, 'states the deception as fact'],
      [/\byou (are|'re) (imagining|inventing) (it|this|things)\b/i, 'tells her she is imagining it'],
      [/\byou (are|'re) (paranoid|being paranoid|overthinking)\b/i, 'frames her as paranoid'],
      [/\b(send|wire|lend|give) him (money|cash|funds)\b/i, 'financial instruction'],
    ],
  },
  {
    hooks: ['cards-not-found-yet', 'cards-where-soulmate', 'cards-soulmate-closer'],
    findings: {
      'cards-not-found-yet': [[/fault|culprit|guilty|blame|wrong turning|caused/i, 'refuses to name a CULPRIT']],
      'cards-where-soulmate': [[/distance|destination|miles|geography|address|coordinates|somewhere.else/i, 'the not-yet is not a DISTANCE']],
      'cards-soulmate-closer': [
        [/will not (put|quote)|not going to quote|no notion of near|has no notion|does not offer|no honest reading/i, 'must REFUSE the proximity claim'],
        [/guard|brac|flinch|rationing|managing|expectations? low/i, 'routes to the bracing, not to proximity'],
      ],
    },
    clauseBans: [
      [/\b(he|she|they) (is|are) (near|nearby|close by|around you|in your)\b/i, 'places them'],
      [/\bsomeone (you already know|you have already met|in your circle|at (your )?work)\b/i, 'identifies a real person'],
      [/\b(you have|you've) already met (him|her|them)\b|\bcrossed paths (already|before)\b/i, 'implies a past meeting'],
      [/\b(closer|nearer) than you (think|realise|realize|know)\b|\bnearer than\b|\bjust around the corner\b/i, 'proximity claim'],
      [/\b(in|near) (a|the|your) (city|town|village|country|workplace|neighbourhood|neighborhood)\b/i, 'names a setting'],
      [/\b(look|search) (for (him|her|them) )?(in|near|around)\b|\b(he|she|they) will (be|come) from\b/i, 'gives a direction'],
      [/\b(get|go) out (there )?more\b|\bput yourself out there\b|\bopen (yourself )?up (more|to)\b/i, 'strategy'],
      [/\byou (need|have|ought) to (move|travel|leave|try|join|start)\b|\b(try|join|download) (the )?(apps?|dating|a class|a group)\b/i, 'strategy'],
      [/\blook (somewhere )?else(where)?\b|\bstop looking\b|\bit will happen when you\b/i, 'strategy'],
      [/\b(work on|heal|love) yourself first\b/i, 'strategy + her fault'],
      [/\byour (blocks?|walls?|barriers?|baggage)\b|\byour standards are\b/i, 'her fault'],
      [/\byou (are|'re) (too|not) (picky|fussy|guarded|closed|much|enough)\b/i, 'her fault'],
    ],
  },
  {
    hooks: ['cards-end-up-alone', 'cards-stop-searching', 'cards-given-up'],
    clauseBans: [
      [/\byou (give|love|care) too much\b|\byou have never been met\b/i, 'kind diagnosis'],
      [/\byou (keep )?(give|giving) to (people|men|those) who (cannot|can't|do not|don't)\b/i, 'kind diagnosis'],
      [/\byou (are|were) too (much|strong|independent|intense)\b/i, 'kind diagnosis dressed as a compliment'],
      [/\byour (standards|strength|independence) (is|are|intimidate)\b/i, 'kind diagnosis'],
      [/\byou (keep )?(choose|choosing|pick|picking) (the wrong|men who|people who)\b/i, 'blames her selection'],
      [/\bthe timing has never been\b|\bit (is|was) because you\b|\bthe reason (is|was) (you|that you)\b/i, 'supplies a cause'],
      [/\byou (are|were) (guarded|closed|walled)\b|\byou (have|need) (walls|barriers|a wall)\b/i, 'diagnosis'],
      [/\byou (are|were) the (reason|cause|problem|common)\b/i, 'rules that she is the cause'],
      [/\byou (have not|haven't) healed\b|\buntil you (love|heal|fix|work on) yourself\b/i, 'prerequisite framing'],
      [/\byou (have|'ve) given up\b/i, 'rules on the headline — the banned direction'],
      [/\byou (have|'ve) (closed|shut) (off|down|yourself)\b/i, 'rules on her interior'],
      [/\byou (are|'re) (jaded|bitter|cynical|hardened|numb)\b/i, 'character verdict'],
      [/\bwhat you (really|secretly|truly) (feel|believe|want|think)\b|\bdeep down you\b/i, 'claims access she did not give'],
      [/\bpart of you (has|knows|believes|wants)\b/i, 'narrates her interior as fact'],
      [/\byou do not (even )?(realise|realize|know) (it|that)\b|\bwithout (you )?(realising|realizing) it,? you\b/i, 'the headline premise, asserted'],
    ],
  },
  {
    hooks: ['cards-still-think', 'cards-still-love', 'cards-love-or-moved-on'],
    findings: {
      'cards-still-think': [[/smallest|too much to ask|scaled|modest|only thing left to ask/i, 'the SMALLEST-ASK finding']],
      'cards-love-or-moved-on': [[/not opposites|never a pair|two different axes|false hinge|were never a pair/i, 'the NOT-OPPOSITES finding']],
    },
    clauseBans: [
      // 🔄 LOOSENED 2026-08-19 in step with tests/tarot-still-feels-copy.test.ts — the
      // present tense may now be affirmed; only the BURIAL stays banned.
      [/\bhe (has |had )?moved on\b|\bhe (is|has got) over (you|it)\b|\bhe (has )?forgotten you\b/i, 'issues the burial'],
      [/\bhe (does not|doesn't|no longer) (love|want|miss)s? you\b/i, 'issues the burial'],
      [/\bhis (feelings|heart) (are|is|were|was) (gone|dead|over)\b/i, 'issues the burial'],
      [/\bit (is|was) over for him\b|\byou (are|were) nothing to him\b/i, 'issues the burial'],
      [/\byou (need|have) to (let (him|it) go|move on|stop)\b|\bit('s| is) time to (let (him|it) go|move on)\b/i, 'directive'],
      [/\byou should (let (him|it) go|move on|stop (asking|waiting))\b/i, 'directive'],
      [/\b(you are|you're) (obsessed|fixated|stuck|clinging)\b|\byou (can't|cannot) let (him|it) go\b/i, 'pathologising'],
      [/\b(unhealthy|obsessive|codependent|desperate)\b/i, 'pathologising'],
      [/\bhe (chose to |decided to )?(walked?|left) (away|out|you)\b/i, 'presumes he chose to go'],
      [/\bwhen he (dumped|abandoned|discarded) you\b/i, 'presumes the manner of going'],
      [/\bhe (passed away|died)\b/i, 'presumes a death'],
    ],
    noRunWith: ['cards-moved-on', 'cards-on-my-mind'],
  },
  {
    hooks: ['cards-meant-alone', 'cards-someone-for-me', 'cards-alone-forever'],
    findings: {
      'cards-meant-alone': [[/assign|designation|decided|author|singled out|circumstance/i, 'refuses the premise that anything is ASSIGNED']],
      'cards-someone-for-me': [[/comfort|reassur|answer|unknown|proof|truth|believe/i, 'reads the EPISTEMICS, not the hope']],
      'cards-alone-forever': [
        [/not going to describe|nobody's forever|never measures|will not tell you|cannot be made to hold|no honest reading/i, 'must REFUSE the absolute'],
        [/weight|exhaustion|heavy|endurance|tired|carried/i, "'forever' describes the WEIGHT, not the length"],
      ],
    },
    wordBans: [[/\bwithin (a|the|\d)|\bin (a few|the next|\d+) (day|week|month|year)|\bsoon\b|\bI promise\b|\bit will happen when you\b/i, 'timeframe']],
    clauseBans: [
      [/\byou (are|were) meant to be alone\b|\byou (are|were) meant (for|to be with)\b|\bsome people are meant\b/i, 'FATE'],
      [/\bit (is|was) (meant to be|your destiny|your fate|written)\b|\bthe universe (has|wants|is)\b/i, 'FATE'],
      [/\b(this|it) is (a lesson|a test|preparing you|teaching you)\b/i, 'makes her suffering purposeful'],
      [/\byou (have been|were) chosen (for|to)\b|\byour path is\b|\bthere is a reason (for this|you are)\b/i, 'FATE'],
      [/\byou will (be|end up|remain|stay) alone\b|\byou will always be (alone|on your own)\b/i, 'a life sentence from a stranger'],
      [/\byou (will|are going to) (find|meet) someone\b|\byou (will|won't) be alone forever\b/i, 'promise / rules on the absolute'],
      [/\bthis (will|is going to) (change|end|pass)\b|\blove is coming\b/i, 'forecast'],
      [/\byou (are|'re) (being )?(too )?(negative|defeatist|pessimistic|bitter|closed off|jaded)\b/i, 'pathologising'],
      [/\byou (have|'ve) given up\b|\byou (are|'re) (sabotaging|blocking|pushing (people|them) away)\b/i, 'pathologising'],
      [/\byou attract what you\b/i, 'pathologising — the manifesting version'],
    ],
  },
  {
    hooks: ['cards-pulling-away', 'cards-gone-cold', 'cards-losing-interest'],
    findings: {
      'cards-losing-interest': [[/will not choose|neither will I|declines your either-or|refuses to be pushed/i, 'must visibly refuse the either-or']],
    },
    wordBans: [[/\bwithin (a|the|\d)|\bin (a few|the next|\d+) (day|week|month|year)|\bsoon\b|\bI promise\b/i, 'timeframe']],
    clauseBans: [
      [/\bhe (is|has been) losing interest\b|\bhe (is|has) (moved on|checked out|given up|done with you)\b/i, 'convicts him'],
      [/\bhe (does not|doesn't) (love|want|care about) you\b|\bhe (still |really )?(loves|adores|wants) you\b/i, 'verdict either way'],
      [/\bhe (is|will be) coming back\b|\bnothing (is|has gone) wrong\b/i, 'promise / reassures'],
      [/\bgive him (space|time|room)\b|\bpull(ing)? back\b|\bmatch his energy\b|\bplay it cool\b/i, 'strategy'],
      [/\b(stop|don't|do not) (texting|calling|reaching out|chasing)\b|\bmake yourself (scarce|unavailable)\b/i, 'strategy'],
      [/\bhe('ll| will) (chase|come running|miss you)\b/i, 'promises a reaction'],
      [/\byou (need|have|ought) to (wait|back off|be patient)\b|\byou should (wait|back off|say nothing|give him)\b/i, 'directive'],
      [/\byou (were|are|have been) too (much|available|eager|needy|keen|sensitive|fast)\b/i, 'blames her'],
      [/\byou (were|are) not enough\b|\byou (pushed|scared|drove) him\b|\byou (came on|moved) too (strong|fast)\b/i, 'blames her'],
      [/\byou should have (waited|known|said nothing|held back)\b/i, 'blames her'],
      [/\bit (is|must be) (that he is )?(losing interest|just going through)/i, 'resolves the binary in passing'],
    ],
  },
  {
    hooks: ['cards-really-love', 'cards-imagining-it', 'cards-feel-about-me'],
    clauseBans: [
      // 🔄 LOOSENED 2026-08-19 in step with tests/tarot-real-feelings-copy.test.ts — the
      // interior claim is allowed, the DENIAL is not.
      [/\bhe (does not|doesn't|never) love[sd]? you\b/i, 'the denial'],
      [/\bhe (did not|didn't) (love|care)\b/i, 'the denial, past tense'],
      [/\bhis (feelings|heart) (are|is|were|was) (gone|dead|over|empty)\b/i, 'the denial'],
      [/\byou (were|are) (just |only )?(a|an) (distraction|option|convenience|habit)\b/i, 'grades her down'],
      [/\b(emotionally )?unavailable\b|\bavoidant|attachment style|commitment.?phobic\b/i, 'diagnosis'],
      [/\bhe (is|has) (a )?(narcissist|selfish|incapable|broken)\b|\bhe (cannot|can't) love\b/i, 'character verdict'],
      [/\bhe is stringing you along\b|\bhe is using you\b/i, 'character verdict'],
      [/\byou (were|are|have been) (naive|foolish|silly|blind)\b|\byou gave (too much|too soon|away too)\b/i, 'grades her'],
      [/\byou (should not|shouldn't) have\b|\b(lesson|learn from this|next time you)\b/i, 'moralises'],
      [/\byou (are|were) (chasing|clinging|desperate)\b|\blove yourself first\b/i, 'grades her / self-help tactic'],
      [/\byou (imagined|invented|made) (it|this|the whole thing)\b/i, 'the crueller door'],
      [/\bit (was|is) all in your (head|mind)\b|\byou (are|were) seeing (things|what you want)\b/i, 'gaslights'],
    ],
    noRunWith: ['cards-feels'],
  },
  {
    hooks: ['cards-stop-missing', 'cards-still-miss-him', 'cards-stop-hurting'],
    wordBans: [
      [/\bwithin (a|the|\d)|\bin (a few|the next|another|\d+) (day|week|month|year)|\bsoon\b|\bI promise\b/i, 'timeframe'],
      [/\btime heals\b|\bgive it (time|a year|six months|another)|\bone day you('ll| will)\b/i, 'the folk timeframe'],
      [/\bby (next|this) (week|month|year|spring|summer|autumn|winter)/i, 'timeframe'],
    ],
    clauseBans: [
      // 🔄 SYNCED 2026-08-19 with tests/tarot-missing-him-copy.test.ts. The real guard now
      // ALLOWS the hopeful direction (the hurt ends) and keeps only the LIFE SENTENCE and the
      // dated forms. The mirror went on banning what the source of truth permits, which sends
      // a writer chasing a rule nobody holds any more.
      [/\bthese things take\b/i, 'a rule of thumb about duration'],
      [/\byou will always (miss|love|feel|hurt)\b|\byou('ll| will) never (stop|get over|be free)\b/i, 'life sentence'],
      [/\ba part of you always will\b/i, 'life sentence in a softer coat'],
      [/\bthis (is|will be) how it stays\b/i, 'life sentence'],
      [/\bhe (is|must be|will be) thinking (of|about) you\b|\bhe misses you\b|\bhe (feels|felt) it too\b/i, 'claims his interior'],
      [/\bhe (will|is going to) (come back|return)\b|\bhe (would want|wanted) you to\b|\byou are still connected\b/i, 'forecast / speaks for him'],
      [/\blet him go\b|\b(delete|block|unfollow) (his|him|the photos)\b|\bstart dating\b/i, 'a tactic, not a reading'],
      [/\b(obsessed|obsession|obsessive)\b|\b(unhealthy|toxic|dysfunctional)\b|\byou are stuck\b/i, 'pathologises'],
      [/\b(trauma[- ]bond|codependen|attachment (issue|disorder|style)|abandonment issues)/i, 'clinical label'],
      [/\byou (are|were) (weak|naive|foolish|desperate|pathetic)\b|\b(low )?self[- ]worth\b/i, 'lands as her failing'],
      [/\byour (poor |weak )?boundaries\b|\byou (did not|didn't) love yourself\b|\byou are not over him\b/i, 'lands as her failing'],
      [/\bit (was|wasn't) (that|so) bad\b/i, 'minimises what she named'],
      [/\bhe (did not|didn't) mean\b|\bhe was (doing his best|hurting too|struggling)\b/i, 'excuses him'],
      [/\bhe (is|was) (a good man|toxic|a narcissist|abusive|not worth)\b|\btry to see it from his\b/i, 'pronounces on him'],
    ],
  },
  {
    hooks: ['cards-come-back', 'cards-ever-back', 'cards-moved-on'],
    findings: { 'cards-moved-on': [[/refuses|will not|declines|\bno\b|\bnot\b/i, 'must decline the either-or']] },
    wordBans: [
      [/\bwithin (a|the|\d)|\bin (a few|the next|\d+) (day|week|month|year)|\bsoon\b|\bI promise\b/i, 'timeframe / promise'],
      [/what comes back often comes back/i, 'the 2026-07-30 rejected prediction phrasing'],
    ],
    clauseBans: [
      [/\bhe (will|is going to) (come back|return)\b|\bhe (is|will be) coming back\b/i, 'forecasts a return'],
      [/\byou will (get|have|win) him back\b|\bhe (will|does) come back to you\b/i, 'forecasts a return'],
      [/\bhe has moved on\b|\bhe (is|was) gone for good\b/i, 'declares him gone'],
      [/\bhe (will|is) never (come back|coming back|returning)\b|\bit (is|was) over between you\b/i, 'declares it finished'],
      [/\bguarantee[sd]? (you )?(that )?he\b|\bcertain to (return|come back)\b/i, 'certainty about the outcome'],
      [/\b(naive|naivety|naivete|gullible)\b|\btoo trusting\b|\bfoolish\b|\bclinging\b|\bdesperate\b/i, 'blames her'],
      [/\bshould have (known|seen|moved on|let go)\b|\byour own fault\b|\bwasted your (time|years|life)\b/i, 'blames her'],
    ],
    noRunWith: ['cards-return', 'cards-twin-back'],
  },
  {
    hooks: ['cards-ghosted', 'cards-left-without-word', 'cards-not-enough'],
    clauseBans: [
      [/\bhe (was|felt|got) (scared|afraid|frightened|overwhelmed|confused|bored|ashamed|guilty)\b/i, 'supplies his state of mind'],
      [/\bhe (could not|couldn't|was unable to) (cope|handle|face|commit)\b/i, 'supplies his reason'],
      [/\bhe (never|did not|didn't) (love|value|deserve|appreciate) you\b/i, 'verdict on his feeling'],
      [/\bhe (was|is) (a coward|cruel|selfish|weak|immature|broken|damaged|a user)\b/i, 'verdict on his person'],
      [/\bhe (left|went|disappeared|pulled away) because\b|\bthe reason (he|for his)\b/i, 'states a reason outright'],
      [/\bwhat he (was really|was actually) (feeling|thinking)\b|\bhe (was|had) (met|found) someone\b/i, 'claims his interior / invents a third person'],
      [/\bit was never about you\b|\bhe was protecting you\b/i, 'a motive claim wearing reassurance'],
      [/\bhe (chose|decided|made the choice) to\b|\bhe (walked|turned his back|gave up on you)\b/i, 'states he chose it'],
      [/\bhe (is|must be) thinking (of|about) you\b|\bhe (misses|regrets|is sorry)\b/i, 'claims his interior'],
      [/\bhe (will|is going to) (come back|return|explain|reach out)\b|\bhe (will|is) never (coming back|going to explain)\b/i, 'forecasts him'],
      [/\byou (will|'ll) (get|have) (your )?(answers?|closure|an explanation)\b|\byou are still connected\b/i, 'promises an explanation'],
      [/\b(reach out|message him|text him|call him|send him|one last)\b|\bcheck (if|whether) he\b/i, 'a tactic'],
      [/\b(block|delete|unfollow) (him|his)\b|\bno[- ]contact\b/i, 'a tactic'],
      [/\byou were (more than )?enough\b|\byou were not enough\b/i, 'scores the comparison — banned in BOTH directions'],
      [/\byou (gave|loved) too (much|hard|deeply)\b|\byou lost yourself\b/i, 'a verdict on her wearing sympathy'],
      [/\byou (should have|could have|needed to)\b|\bif you had (only )?\b|\b(low )?self[- ]worth\b/i, 'enumerates what she should have done'],
    ],
  },
  {
    hooks: ['cards-truth', 'cards-lied-to', 'cards-deceived'],
    wordBans: [[/\bwithin (a|the|\d)|\bin (a few|the next|\d+) (day|week|month|year)|\bsoon\b/i, 'timeframe']],
    clauseBans: [
      [/\bhe (is|was|has been) lying\b|\bhe lied to you\b|\bhe (is|was) a liar\b/i, 'states he lied'],
      [/\bhe (is|was) deceiving you\b|\byou (are|have been|were) being deceived\b|\byou have been lied to\b/i, 'states the deception'],
      [/\bhe (is|was) not lying\b|\bhe (is|was) (telling|speaking) (you )?the truth\b/i, 'vouches for him'],
      [/\bhe (is|was) (honest|truthful|sincere) with you\b|\bhe would never lie\b|\byou are not being deceived\b/i, 'vouches for him'],
      [/\b(naive|naivety|naivete|gullible)\b|\btoo trusting\b|\bfoolish\b|\byour own fault\b/i, 'blames her'],
      [/\bshould have (known|seen|noticed|realised|realized)\b/i, 'blames her for not seeing'],
    ],
  },
  {
    hooks: ['cards-who-hurt-me', 'cards-on-my-mind', 'cards-cant-stop'],
    clauseBans: [
      [/\byou (need|have|ought) to (let (him )?go|move on|forgive|forget)\b/i, 'directive'],
      [/\bit('s| is) time to (let (him )?go|move on)\b|\byou must (let (him )?go|move on|stop)\b/i, 'directive'],
      [/\blet him go\b|\btry to (move on|forget him)\b|\byou should (move on|forget|stop thinking)\b/i, 'directive'],
      [/\bhe (is|must be|will be) thinking (of|about) you\b|\bhe misses you\b|\bhe feels it too\b/i, 'claims his interior'],
      [/\bhe (will|is going to) (come back|return)\b|\byou are still connected\b/i, 'promise'],
      [/\bobsess(ed|ion|ive|ing)\b|\bunhealthy\b|\byou (are|have been) stuck\b/i, 'pathologises'],
      [/\bhe did not mean (it|to hurt you)\b|\bit was not that bad\b|\byou are overreacting\b|\bperhaps he did not\b/i, 'minimises the hurt she named'],
      [/\bhe (is|was) (cruel|toxic|a narcissist|abusive|a bad man)\b|\bhe never (loved|cared about) you\b/i, 'verdict on him'],
    ],
    wordBans: [[/\bwithin (a|the|\d)|\bin (a few|the next|\d+) (day|week|month|year)|\bsoon\b|\bI promise\b/i, 'timeframe']],
    noRunWith: ['cards-still-think'],
  },
  {
    hooks: ['cards-hiding-something', 'cards-feels-off'],
    clauseBans: [
      [/\bhe (is|has been|must be|really is) (hiding|concealing|keeping something|withholding)\b/i, 'convicts him'],
      [/\byes,? (he|there) (is|does)\b/i, 'flat yes'],
      [/\bthere (is|really is) something (he is )?(hiding|being kept|behind)\b/i, 'asserts the secret exists'],
      [/\bhe (is|has) (lied|lying|deceiv)/i, 'upgrades an omission into a lie'],
      [/\bhe (is|isn't|is not) (being )?(honest|truthful|straight) with you\b/i, 'verdict either way'],
      [/\bhe (is|is not) (secretive|dishonest|a liar|trustworthy)\b/i, 'diagnoses his character'],
      [/\b(nothing|there is nothing) (is )?being (hidden|kept)\b/i, 'dismisses what she noticed'],
      [/\banother woman\b|\bsomeone else\b|\b(an )?affair\b|\b(is |has )?(cheat|unfaithful|sleeping with)/i, 'names contents'],
      [/\b(money|debt|financial|he owes)\b|\b(text|message|dm)s? from\b|\bwhat he is hiding is\b/i, 'names contents'],
      [/\b(a )?(secret|hidden) (past|family|child|marriage|wife|girlfriend)\b/i, 'names contents'],
      [/\b(check|go through|going through|look through|read|search) (his|the|a man's) (phone|messages|texts|emails|socials)\b/i, 'surveillance'],
      [/\b(you should|try to|it may help to) (ask|confront|test|watch|catch)\b|\b(test|trap|catch) him\b/i, 'hands her a move'],
    ],
  },
  {
    hooks: ['cards-really-soulmate', 'cards-met-already', 'cards-twin-or-connection'],
    findings: {
      'cards-twin-or-connection': [[/identical under both|same man|nothing about him shifts|not one thing|two names for one situation|what is different tomorrow/i, 'the same-evidence-two-words finding']],
    },
    clauseBans: [
      [/\bhe (really )?is your (soulmate|twin flame)\b|\bhe is not your (soulmate|twin flame)\b/i, 'certifies / denies the label'],
      [/\bhe is (the one|your person)\b/i, 'certifies the label'],
      [/\byou (have )?(already )?met (him|your soulmate) and (missed|lost)\b/i, 'the missed-him verdict'],
      [/\byour soulmate is (elsewhere|still ahead|coming|out there)\b/i, 'a forecast dressed as a finding'],
      [/\b(twin flames?|a twin flame) (is|are) (rarer|higher|deeper|stronger|more)\b/i, 'ranks the labels'],
      [/\bmore than (just )?a (soulmate|strong connection)\b|\bonly a strong connection\b/i, 'ranks the labels'],
      [/\b(soulmates?|twin flames?) (come|are) (above|below|first|second)\b/i, 'ranks the labels'],
      [/\bthe (highest|deepest|rarest|truest) (form|kind|level) of (love|connection|bond)\b/i, 'grades love'],
      [/\bsettle for (a|just a)\b|\bmerely a (connection|bond|attraction)\b|\ba lesser (bond|connection|love)\b/i, 'demotes the connection'],
      [/\byou deserve (a|more than a) (twin flame|soulmate)\b/i, 'ranks and prescribes'],
      [/\bhis (distance|silence|absence|running) (is|proves|shows|means)\b|\bthe (runner|chaser)\b/i, 'the runner script'],
      [/\b(separation|surrender) (phase|stage)\b|\bpart of the journey\b/i, 'the separation phase'],
      [/\bwhen you (heal|let go|raise)\b|\b(raise|raising) your vibration\b|\bhe will return when you\b/i, 'ascension homework'],
      [/\bpushes you away because\b/i, 'explains his conduct as the bond'],
      [/\byou already know who\b|\bthe (man|one) who (came|was) (before|first)\b/i, 'points at a person'],
      [/\bthink back to\b|\bgo back (to|through) (him|your)\b|\breach out to him\b/i, 'sends her hunting'],
      [/\byou (were|are) (blind|naive|careless|foolish)\b|\byou should have (seen|known|noticed)\b/i, 'grades her past self'],
      [/\b(you should|you need to) (leave|walk away|end it|stay|wait)\b/i, 'leave/stay instruction'],
      [/\bpull back\b|\bstop (texting|calling)\b|\bmake him\b|\bgive him (space|a deadline|time)\b/i, 'tactic'],
      [/\bwithin (a|the) (week|month|year)\b|\b(in|after) (a few|several|six) (weeks|months|years)\b/i, 'timeframe'],
      [/\byou will know when\b|\bhe('ll| will) (come around|realise|choose you)\b/i, 'fake timeframe / forecast'],
    ],
    noRunWith: ['cards-moved-on', 'cards-imagining-it', 'cards-love-or-moved-on', 'cards-forever-or-now'],
  },
]
const famOf = (hook: string) => FAMILIES.find((f) => f.hooks.includes(hook))

const DIR = new URL('../fb-tarot/docs/drafts/rewrites/', import.meta.url)
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const drafts = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, DIR), 'utf8')))
  .filter((d) => !only.length || only.includes(d.hook))
  .sort((a, b) => a.hook.localeCompare(b.hook))
if (!drafts.length) { console.error('no drafts found'); process.exit(2) }

const CARDS = ['a', 'b', 'c'] as const
// 7 bubbles -> the 4 registry beats; beat 3 carries bubbles 3-6, joined with \n at wiring time.
const toBeats = (b: string[]) => [b[0], b[1], b.slice(2, 6).join('\n'), b[6]]
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
const runsOf = (s: string, n = 6) => { const w = words(s); const o = new Set<string>(); for (let i = 0; i + n <= w.length; i++) o.add(w.slice(i, i + n).join(' ')); return o }
const shared = (a: string, b: string) => { const rb = runsOf(b); return [...runsOf(a)].filter((r) => rb.has(r)) }

let fails = 0
const bad = (m: string) => { fails++; console.log(`  ✗ ${m}`) }

// Fold every draft into beats, keyed by deck.
type Read = { hook: string; beats: string[][] }
const byDeck: Record<string, Read[]> = {}
const wired: string[] = []
for (const d of drafts) for (const [deck, byCard] of Object.entries(d.decks as Record<string, any>)) {
  const beats = CARDS.map((c) => toBeats(byCard[c]))
  // A draft whose copy already IS the registry copy has shipped — re-checking it only
  // reports pre-existing state as if this run had caused it.
  const live = (DECKS as any)[deck]?.reads?.[d.hook]
  if (live && CARDS.every((c, i) => JSON.stringify(live[c]) === JSON.stringify(beats[i]))) {
    wired.push(`${d.hook} @ ${deck}`); continue
  }
  (byDeck[deck] ??= []).push({ hook: d.hook, beats })
}
if (wired.length) console.log(`\nalready wired, not re-checked: ${wired.join(' · ')}`)

for (const [deck, reads] of Object.entries(byDeck)) {
  const cfg = (DECKS as any)[deck]
  if (!cfg) { bad(`unknown deck ${deck}`); continue }
  const openVerb = cfg.facing === 'up' ? 'You chose ' : 'You turned '
  console.log(`\n${'═'.repeat(76)}\n${deck} — ${reads.length} draft(s), cards face ${cfg.facing.toUpperCase()}`)

  for (const { hook, beats } of reads) {
    for (let i = 0; i < CARDS.length; i++) {
      const b = beats[i], tag = `${hook}/${CARDS[i]}`
      if (b.length !== 4) bad(`${tag} not 4 beats`)
      for (const x of b) if (x.trim().length <= 20) bad(`${tag} a beat is <=20 chars`)
      if (!b[0].startsWith(openVerb)) bad(`${tag} beat 1 must start "${openVerb}" (facing ${cfg.facing})`)
      if (!/^Let me look closer at .*…$/.test(b[3])) bad(`${tag} beat 4 breaks the open loop`)
      for (const x of b) {
        if (/!/.test(x)) bad(`${tag} exclamation mark`)
        if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(x)) bad(`${tag} emoji`)
      }
    }
    const fam = famOf(hook)
    for (const [re, why] of fam?.findings?.[hook] ?? []) {
      if (!re.test(beats.map((b) => b[2]).join(' '))) bad(`${hook} lost its required finding — ${why}`)
    }
    const NEGATOR = /\b(no|not|never|can't|unable|n't|nor|nobody|no one|none|cannot|rather than|instead of|does not|is not|nothing|refuses?|declines?|will not|would not|withholds?|neither|without)\b/i
    // ⚠️ RESTATEMENT EXEMPTION, added 2026-08-19. Beat 2 says her own headline back to her, and
    // on some hooks the headline CONTAINS that family's banned phrase — 'cards-too-late' asks
    // "…or did I just leave it too late?", so the clause "or if you left it too late" carries
    // ban 5 with no negator anywhere in it. Sweeping that clause fails the exact copy the ban
    // exists to protect, because beat 3 then refuses the premise outright.
    //
    // The marker is checked on the WHOLE BEAT rather than the clause: "You asked" sits in the
    // first clause and the restated phrase in the second, so a clause-local check never sees
    // it. Safe, because a real assertion made after the restatement lives in a different BEAT
    // (beats 3 and 4 never open with "You asked") and is still swept.
    //
    // This is the same collision the 2026-08-19 guard audit found ten times across the love
    // families, and the same fix tests/tarot-his-other-life-copy.test.ts already carries.
    const RESTATES = /\byou (asked|came asking|are asking|have asked)\b/i
    for (let i = 0; i < CARDS.length; i++) for (const beat of beats[i]) {
      for (const [re, why] of fam?.wordBans ?? []) if (re.test(beat)) bad(`${hook}/${CARDS[i]} (${why}): "${beat.match(re)![0]}"`)
      if (RESTATES.test(beat)) continue
      // 🔴 FIXED 2026-08-19 — the split used to be /[—;:,]/, which does NOT break on a full
      // stop or a newline. Beat 3 carries FOUR bubbles joined by '\n', so one "never" in
      // bubble 3 put the whole of bubbles 4-6 behind the negator exemption and every clause
      // ban in them was skipped. Caught by feeding the gate a deliberate violation instead of
      // trusting its green tick: "And your sister has been taking from it" sailed through
      // because the bubble above it said "it was never you".
      for (const clause of beat.split(/[—;:,.\n]/)) {
        if (NEGATOR.test(clause)) continue
        for (const [re, why] of fam?.clauseBans ?? []) if (re.test(clause)) bad(`${hook}/${CARDS[i]} (${why}): "${clause.trim()}"`)
      }
    }
    // Cross-deck: beat 3 must not restate a named incumbent on any deck both appear on.
    for (const other of fam?.noRunWith ?? []) {
      if (reads.some((r) => r.hook === other)) continue   // handled by the within-deck pass
      const inc = (cfg.reads as any)[other]
      if (!inc) continue
      for (let i = 0; i < CARDS.length; i++) for (const r of shared(beats[i][2], inc[CARDS[i]][2]))
        bad(`${hook}/${CARDS[i]} restates incumbent ${other}: "${r}"`)
    }
  }

  // Beat 1 must be unique across the ENTIRE deck: existing registry copy + every draft.
  const seen = new Map<string, string>()
  for (const [h, byCard] of Object.entries(cfg.reads as Record<string, string[][]>)) {
    if (reads.some((r) => r.hook === h)) continue   // being replaced
    for (const c of CARDS) seen.set(byCard[c][0], `${h}/${c} (live)`)
  }
  for (const { hook, beats } of reads) for (let i = 0; i < CARDS.length; i++) {
    const o = beats[i][0], tag = `${hook}/${CARDS[i]}`
    if (seen.has(o)) bad(`${tag} beat 1 duplicates ${seen.get(o)}`)
    seen.set(o, tag)
  }

  // Beat 3 must share no 6-word run with live copy on this deck, nor between the drafts.
  const live = TAROT_HOOKS.filter((h: string) => cfg.reads[h] && !reads.some((r) => r.hook === h))
  for (const { hook, beats } of reads) for (let i = 0; i < CARDS.length; i++) for (const oh of live) {
    for (const r of shared(beats[i][2], cfg.reads[oh][CARDS[i]][2])) bad(`${hook}/${CARDS[i]} recycles ${oh}: "${r}"`)
  }
  for (let x = 0; x < reads.length; x++) for (let y = x + 1; y < reads.length; y++) for (let i = 0; i < CARDS.length; i++) {
    for (const r of shared(reads[x].beats[i][2], reads[y].beats[i][2])) bad(`${reads[x].hook} ~ ${reads[y].hook}/${CARDS[i]}: "${r}"`)
  }
  if (!fails) console.log('  ✓ structure · facing · open loop · beat-1 distinctness · no recycled 6-word runs')
}

console.log(fails ? `\n🔴 ${fails} guard failure(s) — these WOULD break the test suite after wiring` : '\n✅ all drafts clear the shared registry guards')
process.exit(fails ? 1 : 0)
