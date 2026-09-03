# 06-E2 — ESL, Aiden cross-promo variant *(the Wishing Bracelet · Aiden hands off to Evelyn)*

**What this is:** the same finished letter as `06-E2-esl-product-creature-a-close-c.md`, with a new
Beat 0 in Aiden Powers' voice replacing Evelyn's own opening — Aiden introduces the story, hands
off, and everything from the myth onward is Evelyn's letter, unchanged. Built 2026-09-03, operator
direction: "brainstorm how you can write a version in the voice of Aiden Powers. Introducing Evelyn
and the rest of the stuff flows."

| | |
|---|---|
| **Offer** | 06 the Wishing Bracelet — black agate + Pixiu, wealth · fixed price TBD |
| **Sends to** | ⚠ **Aiden's own list, not the backend customer list `close-c.md` sends to.** This is a cross-promo — Aiden introducing an Evelyn offer to *his* subscribers, not Evelyn writing to her own. Confirm the actual list/segment before this ships |
| **Sender identity** | **Aiden Powers throughout**, even once the words become Evelyn's — he's relaying her story, the send belongs to him. See the header note below |
| **Device** | **none.** Same as `close-c` — no divination event |
| **Structure** | Beat 0 (new, Aiden) → Beats 2–8 + P.S. (unchanged, Evelyn) — Beat 1 (Evelyn's own self-introduction) is dropped entirely; Aiden's handoff already does that job |
| **Merge token** | `%FIRSTNAME%` → `{{ subscriber.first_name \| capitalize }}` on AWeber, same as every letter in this deck |
| **Links** | two point to the booking page — `{{BOOKING_URL}}?c=1` (the close) and `?c=2` (the P.S.) — same numbering as `close-c`. Campaign-specific tracking params (to attribute conversions to this variant specifically) aren't added yet — a Phase A/analytics decision, not a copy one |
| **Price** | never appears here — lives on the booking page |
| **Base letter** | `06-E2-esl-product-creature-a-close-c.md` — read that file's own frontmatter + Build notes for the full history of everything from Beat 2 onward. This file's own Build notes only cover what's new: Beat 0 |

✅ **Header fixed, 2026-09-03.** `render-be-esl-preview.mjs` used to render every offer-06 letter
with the shared "The Seer Within" platform banner — generic, not persona-specific, wrong for a
letter going out under Aiden's own identity. The script now supports an optional `_sender` key in
the images JSON (`{"name": ..., "avatar": ...}`) that swaps the banner for that persona's own small
avatar+name header instead, matching what his real daily emails already use (verified against
`docs/aweber/aiden-blueprint-deck/emails/04-the-tell.html`, and against the live avatar URL —
confirmed HTTP 200 before wiring it in). Every other letter using this script is unaffected —
`_sender` defaults to absent, which renders exactly as before; regression-checked against
`close-c`'s own render to confirm.

**Images** — identical to `close-c`, same 12 files, same S3 hosting, but **its own images JSON**:
`06-creature-a-images-aiden.json`, not the shared `06-creature-a-images.json` — same 12 image
mappings, plus the `_sender` key above. Kept separate on purpose, so adding Aiden's header here
never affects how `close-c` itself renders. See `close-c`'s own image table for the file/provenance
details; not reproduced here since nothing about the images changed.

---

<!-- BEAT 0 · Aiden's lead — new for this variant. Tightened to the big idea on operator request
     ("too much fluff") — cut a dinner scene, a permission-condition clause, and a Life
     Path/Pinnacle name-drop that were all in earlier drafts. What's left is just the claim (told
     me something private, wasn't going to share it, I'm sending it anyway) and the handoff. The
     secrecy is in the CONTEXT of the telling, not a claim that Pixiu mythology itself is hidden
     knowledge — Beat 4 below already tells her "you've probably heard Pixiu attracts wealth," so
     claiming the content itself is secret would directly contradict that. -->
# %FIRSTNAME%, Evelyn wasn't going to tell anyone this

*She told me not to send this. I did anyway.*

%FIRSTNAME% —

Aiden here.

Evelyn told me something last week she wasn't planning to tell anyone. I asked if I could send it
to you anyway. She said yes.

I don't do myth — I calculate. This one isn't mine to explain. It's hers to tell, so here it is,
exactly the way she told me.

`[IMG-1]`

<!-- HANDOFF · everything below this line is 06-E2-esl-product-creature-a-close-c.md's Beat 2
     onward, verbatim — copied, not rewritten, EXCEPT for the "Evelyn here." line immediately
     below, which is new. First draft dropped Evelyn's whole Beat 1 (the full self-introduction
     paragraph, "I don't often write to you like this...") as redundant with Aiden's handoff —
     operator feedback: without ANY marker, the myth reads as Aiden narrating in detail right
     after he'd just said "I don't do myth," which is confusing, not just redundant. Fix: keep the
     bare minimum signal of the voice switch, not the whole paragraph. -->

Evelyn here.

### What was this creature doing in the Emperor's court?

So. A very strange creature.

He has the head of a dragon and the body of a lion, and a very long time ago he sat in the Jade
Emperor's own court — which in the mythology of the time was as close to the centre of the world
as anywhere got.

One day he ate the treasury. Not stole from it. Ate it. Gold, jewels, silver, straight down his
throat, the whole hoard of Heaven's own court.

### What happened when he got caught?

When the Emperor found him out, he didn't have him killed. He did something stranger. He sealed
him — closed the one place all of that gold would eventually have come back out.

So the creature kept eating. He has been swallowing wealth for a few thousand years now, by the
old counting, and he has never once let go of a single piece of it. His name is Pixiu, and I want
to walk you through him properly, because every part of him means something, and none of it is
decoration.

### The head

`[IMG-2]`

Start with the dragon's head. In the old symbolism, a dragon is a Yang creature — it means
authority, supreme success, the kind of luck that answers to nobody. That's the half of him that
commands.

### The body

`[IMG-3]`

Then the lion's body underneath it — a Yin creature, standing for guardianship, strength, the
kind of majesty that stands watch rather than chases. Head and body together are meant to be a
balance: the part of him that commands, and the part of him that guards. Neither on its own is the
whole animal.

### The mouth

`[IMG-4]`

Look at the mouth next, because it's larger than it needs to be for anything he's actually eating.
That's deliberate, in the old telling — the size of the mouth is the size of what he can swallow
and hold. A modest mouth would only ever hold a modest fortune.

### The face

`[IMG-5]`

His expression is fierce, not friendly, and that's a job too, not an accident of the carving. He's
meant to look like a guardian, the kind of face that turns evil and bad financial luck away before
either gets near you.

### The claws

`[IMG-6]`

Look at the claws too, because they're not just for standing. In the old symbolism they're what
wards evil off physically, the part of him that does something rather than only looks fierce. And
where he's shown resting a paw on something round, that's not decoration either — it's the old way
of saying he draws wealth from every direction, not just the one you're watching.

### The tail

`[IMG-7]`

Even his tail is part of the argument. It's kept smooth and closed, the same as the rest of him,
because the old telling is consistent about this in every part of him it touches: nothing leaves
here either.

### The part that matters most

`[IMG-8]`

And then the part of him I haven't mentioned yet, which is the one the whole story actually turns
on.

He has no way out. Not "rarely." None. That's the single most distinctive thing about him in every
old telling I've ever read, and it's the reason the Emperor sealed him in the first place, and it's
the entire reason he's worth anything to you at all. Wealth goes in. It does not come back out.
Not because he's loyal. Because he's built that way.

### How many horns does he actually have?

One more thing, worth pointing out before I go any further.

You've probably heard that Pixiu attracts wealth — pulls it toward you. That's true of some of
them. This one has two horns, though, and in the old tradition that makes him Bixie — the guardian,
not the puller. He isn't built to chase down money that was never coming your way. He's built to
guard what already reaches you, and once it's past him, it doesn't leave again.

### What have you actually told me?

I'm telling you all of this tonight because of something you've said to me yourself, in your own
words, more than once.

Not that money never reaches you. I don't think that's true, and I don't think you've ever said
it. What you've said is that it reaches you and then it doesn't stay — that it gets close, close
enough to nearly close your hand around it, and then it isn't there any more.

*"Everything appears to be reaching me but doesn't."*

### Attraction problem, or something else?

That's yours, %FIRSTNAME%, not mine. I'm only repeating it back to you, because it's exactly the
shape of the problem a creature with no way out was built to answer. You don't have an attraction
problem. Attraction was never the part that failed. You have a containment problem, and until
tonight I don't think anyone's ever handed you something built to hold.

What I'm sending, if you say yes, is a bracelet. Black agate underneath, a small cast Pixiu sitting
on top of it, facing out. Three parts to it, and I want to walk you through them the same way I
just walked you through him — because none of these are decoration either.

### The stone

`[IMG-9]`

Black agate is a grounding stone, which in practice means it holds a charge rather than losing it
to the room — the same way you lose money to a bill you forgot, a subscription you stopped
noticing, an "opportunity" that was actually just a hole in the floor. Pixiu keeps what reaches you
from leaving through the one exit he doesn't have. The stone keeps it from quietly draining away in
the meantime. Two materials, one job.

### The mantra

`[IMG-10]`

There's a mantra worked into the beads too — *Om Mani Padme Hum* — and I'll say plainly what that
is rather than let it sit there as decoration: a compassion mantra, carried as a working part of
the piece.

### The capsule

`[IMG-11]`

And there's a small capsule built into it, sealed at both ends, with a paper meant for exactly one
sentence. Here's what you do with it. Write down the specific one — not "more money," the actual
thing that got away. The deal. The client. The cheque that was supposed to clear. Seal that paper
inside the capsule, the same seal the creature carries, the same seal the stone carries.

### What happened when I gave one to Rosalind?

I gave one of these to someone a few years ago — Rosalind, though that's not quite the name. Their
complaint was specific, not vague: a client finally paid what they were owed, and the same week
their car needed a repair that ran almost exactly that amount. It kept happening that way — money
arriving, then something showing up right behind it to take the same amount back out, always for a
reason that sounded reasonable enough at the time.

They wore it on their left wrist, the way I'm about to tell you to, and told me honestly that
nothing seemed different after the first couple of weeks. I told them to give it a season, not a
fortnight, before deciding.

I'm not going to tell you their whole life changed, because it didn't, and you'd be right not to
believe me if I said it had. What changed, within that season, is that the amount stopped shrinking
on its way to them. Same work, same modest luck they'd always had — the payment came, and nothing
arrived behind it to take the matching bite. It just stayed the size it came in at. "It's not
more," they told me once. "It's just — still there."

### What this can't do

I want to be equally honest with you about what this doesn't do. A creature with no exit can only
keep what reaches him. He can't manufacture a fortune that was never coming. If nothing has come
near you in a long while — no near-miss, nothing that got close and didn't land — this isn't what
starts that. I think that's not you. I wouldn't have written all this if I thought it was.

### What happens after you say yes?

`[IMG-12]`

Here's what arrives, and how you wear it:

- **What arrives.** The bracelet itself — black agate, the Pixiu, the sealed capsule and its paper
  — in a small box built to keep it, with a card recording what it is and where it's from, and the
  care instructions.
- **How you wear it.** Left wrist only, dear, never the right — the left is the one that receives,
  nearer the heart, the hand that takes rather than gives.

Worn on the right, you'd be offering the seal to what you're sending out, not what's reaching you,
which is the one way to take a thing built with no exit and hand it one anyway.

I'm not going to tell you this fixes money in general. It doesn't put anything in front of you that
wasn't already finding its way to you. What it does do: what already reaches you stops leaking back
out before you've had the chance to close your hand around it.

[Let me send it]({{BOOKING_URL}}?c=1), and I'll walk you through the rest — where to send it, what
to write on your one sentence, how to seal it in. Nothing complicated.

I hope this holds for you the way it was built to, dear.

— Evelyn

---

## P.S. *(ships on every letter — settled 2026-08-10, no A/B)*

P.S. If you remember one thing from tonight, let it be this: he has no way out. That's not a
detail, that's the whole mechanism. [It's ready to send whenever you are.]({{BOOKING_URL}}?c=2)

---

## Build notes

**This file only documents Beat 0 (Aiden's lead) and the handoff mechanics.** For everything from
Beat 2 onward — the myth's sourcing, the anatomy walkthrough, the horn-beat rewrite history,
Rosalind's story, the close reorganization, the image-hosting fix — see
`06-E2-esl-product-creature-a-close-c.md`'s own Build notes. None of that content changed here;
duplicating its history in this file would just be two copies to keep in sync.

- **Four rounds on Beat 0 before landing here.** First pass: 3 structural variations (plain/warm,
  certainty-vs-uncertainty contrast, cold-open-on-a-detail). Operator asked for a fourth angle,
  "more secret lead" — grounded in `docs/aweber/aiden-blueprint-deck/emails/04-the-tell.html`, the
  one real Aiden email that exists in this codebase and matches the "the-tell" format on record as
  his platform's best-performing pattern (specific story, detached/observational opening register,
  declarative confidence, no hedge words). Operator then asked to tighten it further: "too much
  fluff." Cut in that pass: a dinner scene, a permission-condition clause ("on the condition I told
  you that part too"), a Life Path/Pinnacle name-drop, and a closing line ("worth being let in
  on"). What survived is four lines: the claim, the ask-and-answer, the honest gap (calculates,
  doesn't do myth), the handoff.
- **The secrecy is honest, not invented.** "Evelyn wasn't going to tell anyone this" refers to the
  CONTEXT of the telling (not planned for a list) — not a claim that Pixiu mythology itself is
  secret knowledge. That distinction matters because Beat 4, a few paragraphs later, tells her
  "You've probably heard that Pixiu attracts wealth" — an explicit acknowledgment the mythology is
  commonly known. A "hidden knowledge" framing in Beat 0 would directly contradict that a few beats
  later. Keeping the secrecy scoped to "this wasn't written for a list" avoids the collision.
- **Aiden stays in his established register.** Declarative, no hedge words ("maybe," "perhaps" —
  none used), no psychic language attributed to himself (he's curious about Evelyn's story, not
  claiming any intuition of his own about it) — matching the character rules in
  `server/lib/seedIntentConfigs.ts:980-998`.
- **Why Beat 1's full paragraph is dropped, but "Evelyn here." isn't — fixed 2026-09-03.** First
  draft cut Evelyn's whole self-introduction (the "tonight I want to tell you about a very strange
  creature" paragraph and "I don't often write to you like this...") as redundant with Aiden's
  handoff. Operator feedback: that went too far — with zero marker at all, the myth reads as Aiden
  narrating in detail right after telling the reader he doesn't do myth, which is confusing, not
  just repetitive. Fix: a single bare line, "Evelyn here.", sits right where the voice actually
  switches — enough to remove the confusion without re-adding the paragraph-length self-intro that
  really was redundant. `IMG-1` (the full labeled reference image) sits right after Beat 0 and
  before that line, serving as the visual hinge between Aiden's words and Evelyn's, same job it
  always had.
- **Sign-off stays "— Evelyn," not "— Aiden."** From Beat 2 onward the words are hers, relayed by
  him — the sign-off (and the P.S.) are part of what she told him, not something Aiden is adding on
  top. No closing coda from Aiden after "— Evelyn" either; operator instruction was "the rest of
  the stuff flows," read literally as: everything downstream of the handoff, including the ending,
  stays exactly as `close-c` already has it.
- **Not yet run through `copy-check.cjs`** as of this file being written — do that next, along with
  a full-corpus run to check Beat 0's new sentences don't collide with anything already in the
  corpus (the "the-tell" reference file isn't part of the checked corpus, so a echo of its specific
  phrasing wouldn't be caught automatically — worth a manual re-read against it before this ships).
