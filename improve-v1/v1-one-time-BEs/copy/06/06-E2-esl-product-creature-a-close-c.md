# 06-E2 — ESL, **CHOSEN** *(the Wishing Bracelet · creature-first symbolism reveal)*

✅ **This is the finished letter — chosen by the operator, 2026-09-02, over `close-a.md` and
`close-b.md`.** Those two stay on disk as reference, not superseded (deck convention — nothing
gets deleted). See `docs/06/0-WORKFLOW-06.md`'s Fourth-round section for why this one won.

| | |
|---|---|
| **Offer** | 06 the Wishing Bracelet — black agate + Pixiu, wealth · fixed price TBD |
| **Sends to** | the backend customer list (be-customer), same machine as 02–04 |
| **Device** | **none.** No divination event. The creature itself carries the letter — her problem doesn't arrive until late, after the anatomy and its symbolism are fully walked through |
| **Structure** | creature-first symbolism reveal, her problem arrives late — operator direction, 2026-09-01. Rejects the earlier product-led hooks (the wrist instruction, the container-problem claim) as too weak to open on |
| **Merge token** | `%FIRSTNAME%` → `{{ subscriber.first_name \| capitalize }}` on AWeber, as 02–04 |
| **Links** | three point to the booking page — `{{BOOKING_URL}}?c=1` (the close), `?c=2` (the P.S.), `?c=3` (the P.P.S., added 2026-09-03) |
| **Price** | never appears here — lives on the booking page, statement 6 |
| **Brief** | not yet merged into `docs/00a-BRIEFS-BEs.md` — see `docs/06/06-SPEC-wishing-bracelet.md` |
| **Companion candidates** | `06-E2-esl-kaucim.md` / `06-E2-esl-iching.md` only — the reading-led direction, kept deliberately. Every product-led runner-up (5 named DR-architecture letters, creature-b, the unheaded original, 4 subheadline styles, close-a, close-b) was deleted 2026-09-02 once this file won — see `docs/06/0-WORKFLOW-06.md`'s Fourth-round audit note |

**Subheadline-style variant of the base creature-a letter.** Same body copy throughout — only
`###` headers added or repositioned, in Beats 2, 4, 5, and the unheaded tail of Beat 6, in a
curiosity / open-loop-question style.

**Close reorganized on top of that, 2026-09-02 — operator feedback: the close still read as a
stack of separate asks, and the left-wrist ritual belonged in it rather than buried mid-letter.**
This candidate ("close-c") is the most stylistically consistent of the three: its one close heading
is written in the SAME curiosity-question register as every other heading in this file, and the
wrist ritual + itemized contents are blended into a single paragraph (answering "what happens" as
one continuous beat) rather than kept as two separate paragraphs — see
`06-E2-esl-product-creature-a-close-a.md` (single section, contents and ritual as two paragraphs)
and `06-E2-esl-product-creature-a-close-b.md` (two headed beats, ritual leads) for the other two.
All three: same body copy through Beat 7, only Beat 6's wrist-rule tail and all of Beat 8 + P.S. are
rewritten. **This one drops to 2 total links** (was 5 + P.S. = 6), same consolidation as close-a,
with a different close heading and paragraph shape.

**Images — renumbered to match reading order** (operator direction, 2026-09-02: one image per
anatomy section, not one hero for the whole walkthrough — the same picture-before-meaning
discipline the deck already applies to the tarot cards, now applied per body part instead of once).

All seven anatomy crops are **reference-conditioned off the same source image**
(`assets/06-pixiu-gen-pencil.png`) via Codex's image-to-image mode, not independently prompted —
that's what keeps them reading as *one* creature shown seven ways rather than seven different
creatures that happen to match the same description. Verified per-crop, not just requested: each
was visually compared back to the reference before being accepted.

| Slot | Section | Asset | Status |
|---|---|---|---|
| `IMG-1` | opening hero | `assets/06-pixiu-gen-pencil.png` (the reference itself, full body) | ✅ |
| `IMG-2` | The head | `assets/06-pixiu-crop-head.png` | ✅ verified — same mane/horn/expression language as the reference |
| `IMG-3` | The body | `assets/06-pixiu-crop-body.png` | ✅ verified — wing scrollwork, medallion, mane all consistent |
| `IMG-4` | The mouth | `assets/06-pixiu-crop-mouth-v2.png` | ✅ verified — v2; first attempt drifted on fang design, regenerated |
| `IMG-5` | The face | `assets/06-pixiu-crop-face-v2.png` | ✅ verified — v2; first attempt drifted on eye/brow, regenerated |
| `IMG-6` | The claws | `assets/06-pixiu-crop-claws-v2.png` | ✅ verified — v2; first attempt drifted toward reptilian foot, regenerated |
| `IMG-7` | The tail | `assets/06-pixiu-crop-tail.png` | ✅ verified — same curl pattern as reference |
| `IMG-8` | The part that matters most | `assets/06-pixiu-crop-rear.png` | ✅ verified — tasteful sealed circular knot motif, not anatomically explicit |
| `IMG-9` | The stone | `assets/06-pixiu-material-stone.png` | material illustration, same pencil style |
| `IMG-10` | The mantra | `assets/06-pixiu-material-mantra.png` | material illustration, same pencil style |
| `IMG-11` | The capsule | `assets/06-pixiu-material-capsule.png` | material illustration, same pencil style |
| `IMG-12` | Beat 8, "What happens after you say yes?" | ⚠ `assets/06-pixiu-product-angle-fixed.png` — see note below, operator override | shows the same "A" clasp logo; unconfirmed whose mark this is or whether our actual shipped unit carries it |

⚠ **`IMG-12` is a Codex-edited version of the real photo, not the untouched original — operator
decision, 2026-09-02, made with the tradeoff stated plainly first.** The original crop
(`06-pixiu-product-real-cropped.png`, still on disk, untouched) had an off-perpendicular camera
angle — the oval read as compressed near the clasp and wide near the charm. An angle-correction
edit was attempted via Codex's built-in image-edit mode; Codex's own report, which I verified myself
rather than taking at face value, was honest that the edit is **not pixel-faithful** — "several
characters were subtly redrawn" in the engraved lettering, and "the clasp logo... stroke geometry
also drifted." That means `IMG-12`, unlike every other image in this letter, carries an accuracy
question of its own: **the specific claim this photo makes — "this precisely represents what
arrives" — is now weaker than it was before the edit**, because the edit's whole value proposition
was fidelity and Codex could not fully deliver it. Recommended against shipping this version;
overridden. The untouched original remains on disk as the safer fallback if this needs revisiting.

**Layout, added 2026-09-02:** the render script now pairs a lone `[IMG-N]` tag with the paragraph
immediately after it as a small image on the left, text on the right — one part, one picture, one
description, for every section except the hero (`IMG-1`, which stays full-width, same as every
other letter in this deck). See `scripts/render-be-esl-preview.mjs`.

**Beat 6 restructured, 2026-09-02 — same discipline extended to the product itself.** Operator
direction: "the same has to be done for the product... breaking it down part by part as well." The
bracelet's three components (stone, mantra, capsule) now get their own sub-heading, image, and
description, mirroring the creature's anatomy walkthrough exactly.

⚠ **These three are material/concept illustrations, not the product photo `IMG-9` used to be
reserved for — and that distinction is load-bearing, not cosmetic.** They're generated in the same
pencil-sketch style as the creature crops, illustrating the general *idea* of black agate, an
engraved mantra, and a sealed capsule — not a photograph claiming to show the exact unit that
ships. Nothing in this letter is presented as a literal photo of anything, creature or product
alike, so an illustration here doesn't cross into "this is what arrives at your door" the way a
photorealistic product shot would have. **A real, actual photo of the shipped bracelet is still a
separate, unmet need** — still blocked on the same fulfillment/sourcing decision in
`0-WORKFLOW-06.md` (dropship vs. our own unit), still not something to source or generate as a
stand-in. If that photo is ever taken, it belongs as an *additional* image (e.g. at Beat 8's "What
arrives" recap, which currently has none), not a replacement for these three.

⚠ **Three of the eight crops needed a second pass.** Mouth, face, and claws each drifted on a
specific design detail on the first generation (different fang count/spacing, different eye shape,
reptilian-looking claws) — Codex flagged this itself both times rather than overclaiming success,
and the second attempt, prompted with the specific drift named, corrected it. Reference-conditioning
narrows the gap to the source image; it does not guarantee an exact match on the first try.

⚠ **Generation method changed mid-build, 2026-09-02.** The first two crops (head, and the initial
mouth/face/claws attempts) were dispatched through the `codex-rescue` subagent — technically correct,
but each dispatch costs a full separate Claude subagent turn (~25-30K tokens) for what is a one-shot
image call. Per the `clay-ad-codex-dispatch` skill (verified against the actual code, not assumed):
`codex-rescue` has no image-gen-specific path at all — it drives Codex's `app-server` coding-agent
protocol, built for multi-turn file/command work, not a single image request. Billing is identical
either way (same built-in `image_gen` tool, $0 marginal cost); the only difference is Claude-side
context overhead. The remaining regenerations used `codex exec -i <ref> -s workspace-write -o
<file>` directly instead — and even then, the first direct call still cost real context by letting
Codex's full raw transcript (it re-read its own 200-line imagegen skill file inline) print straight
to Bash's stdout. Redirecting stdout to a log file and reading only the `-o` output fixed that.
**For any future image generation in this deck: call `codex exec` directly, redirect stdout, read
only the compact `-o` result.**

⚠ **File-size flag for whoever wires this into AWeber:** eight embedded images in one letter is far
more than any other candidate in this deck carries. Check the render against Gmail's clip
threshold (the render script already warns past ~102KB of HTML) before this ships — it may need
image compression or hosting-and-linking rather than full embedding.

---

<!-- BEAT 1 · direct opening announcement — no hook-device, no instruction, no claim -->
# %FIRSTNAME%, tonight I want to tell you about a very strange creature

<!-- BEAT 1b · deck: payoff + window -->
*Not a card, not a spread, not a working. Just a creature I think you should know about — because
by the end of this letter I think you'll understand exactly why I'm the one telling you.*

`[IMG-1]`

%FIRSTNAME% —

Evelyn here.

I don't often write to you like this. Most nights it's cards on the table, or it's the reading
itself. Tonight I want to do something closer to teaching you something, because I think you'll
get more out of it than another spread would give you, and because what I'm about to describe
explains itself far better than I could explain a product on its own.

<!-- BEAT 2 · the creature's origin/myth, told with real fascination -->
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

<!-- BEAT 3 · anatomy part by part, symbolism revealed as we go -->
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

<!-- BEAT 4 · the two-headed reveal — Pi Chiu, one head pulls, one keeps, both real -->
### How many heads does he actually have?

One more thing, worth pointing out before I go any further.

You've probably heard that Pixiu attracts wealth — pulls it toward you. You heard right. In the old
tradition he's Pi Chiu, and he carries two heads for two different jobs. One head pulls: reaches
out and draws toward you whatever's already somewhere within reach. The other keeps: takes what the
first one pulls in and refuses to let it go again.

Two heads, two jobs, one creature. He doesn't only hold on to what already finds you. He goes and
finds more of it too.

<!-- BEAT 5 · pivot to her — VOC-grounded, arrives late on purpose -->
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

<!-- BEAT 6 · the object itself — now broken down part by part, same discipline as the creature -->
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

<!-- BEAT 7 · precedent, now with its own heading — no CTA here, matching 02's rule that
     precedent+limit precede the first ask rather than carrying one themselves -->
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

I want to be equally honest with you about what this doesn't do. Both heads work on what's real,
not what's impossible. The pulling head draws toward you what's already somewhere within reach — it
doesn't conjure a deal that was never going to happen for you at all. The keeping head only holds
what actually arrives — it doesn't multiply it. If nothing has come near you in a long while, that's
not something a season fixes. I think that's not you. I wouldn't have written all this if I thought
it was.

<!-- BEAT 8 · offer + close — reorganized 2026-09-02, operator direction: fold the left-wrist
     ritual (previously its own mid-letter heading in Beat 6) into the close, and convert the
     close's own heading to the same curiosity-question style used everywhere else in this file.
     One headed section, 2 CTAs total (was 5 + P.S.) — see build notes. -->
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

I'm not going to tell you this fixes money in general. It's not going to conjure a deal that was
never realistically yours. What it does do: it pulls what's already somewhere in reach a little
closer, and once it arrives, it doesn't let go again.

[Let me send it]({{BOOKING_URL}}?c=1), and I'll walk you through the rest — where to send it, what
to write on your one sentence, how to seal it in. Nothing complicated.

I hope this holds for you the way it was built to, dear.

— Evelyn

---

## P.S. *(ships on every letter — settled 2026-08-10, no A/B)*

P.S. If you remember one thing from tonight, let it be this: he has no way out. That's not a
detail, that's the whole mechanism. [It's ready to send whenever you are.]({{BOOKING_URL}}?c=2)

P.P.S. Left wrist, %FIRSTNAME%, never the right — it's the one that receives.
[Send it to me.]({{BOOKING_URL}}?c=3)

---

## Build notes

**Beat table** (8 beats — a fresh sequence, not the reading deck's 17-beat table in
`00e-FRAMEWORK-BEs.md` §1, which is built for offers that resolve into more reading):

| # | Beat | Job |
|---|---|---|
| 1 | Direct opening announcement | plain "tonight I want to tell you about a creature" register — no hook-device, no instruction, no claim |
| 2 | Origin/myth | told with real fascination — the Jade Emperor's court, eating the treasury, the sealing |
| 3 | Anatomy walkthrough | head → body → mouth → face → claws → tail → the sealed rear, each given its real symbolic meaning, building to the no-exit fact as the climax. Claws and tail added 2026-09-02 once independently verified — see below |
| 4 | The two-headed reveal | Pi Chiu, two heads — one pulls, one keeps. Superseded the horn/Bixie/Tianlu framing entirely, 2026-09-03 — see the newest Build notes bullet |
| 5 | Pivot to her | VOC-grounded problem, arrives late on purpose — the creature has to be fully explained before it's relevant to her |
| 6 | The object | materials, mantra, wish capsule. The left-wrist rule moved OUT of this beat, 2026-09-02 — see Beat 8 |
| 7 | Precedent + honest limit | now two headed sub-sections ("Rosalind," "What this can't do") instead of unheaded paragraphs — added 2026-09-02, see below |
| 8 | Offer + close | reorganized again, 2026-09-02 — one question-style heading, ritual and contents blended into a single paragraph, 2 CTAs + P.S. (was 5 + P.S.) — see below |

- **Why the problem arrives so late:** this is the core operator direction — "we are essentially
  selling symbolism." The letter has to earn that claim by actually walking through the symbolism
  in enough depth to feel like a real education, not a two-sentence gesture at "an ancient myth,"
  before it's allowed to pivot to her. Front-loading her problem the way every other candidate does
  would cut the symbolism section short and undercut the whole premise.
- **Verified symbolism used, not invented:** dragon head = authority/Yang, lion body = guardianship/Yin,
  large mouth = capacity to hold wealth, fierce face = ward against bad luck, no exit = the
  distinctive trait, one horn (Tianlu) = attracts vs two horns (Bixie) = protects. Sourced and
  cross-checked before writing, per the operator's explicit instruction not to let this fork invent
  its own mythology.
- **Claws and tail added 2026-09-02, same discipline.** Both surfaced as labels inside a Codex-generated
  reference image, not trusted on sight — independently verified against real feng shui sources before
  being written into copy: the tail is kept smooth/sealed for the same no-leak reason as the rest of him
  (not just "auspicious," which is what the image's own caption said, unverified); the claws ward off
  evil, and a paw resting on a globe (traditional imagery, not necessarily what any specific carving of
  ours shows) means wealth drawn from every direction. The letter's wording reflects the verified
  version, not the image's own unverified phrasing.
- **The horn uncertainty, superseded 2026-09-02 — the product is confirmed two-horned (Bixie).**
  Originally the letter admitted uncertainty over which variant our own piece was; the operator has
  since confirmed it's a two-horned Bixie, so Beat 4 now states that plainly instead of hedging, and
  drops the one-horned Tianlu comparison entirely (operator: "I rather you not talk about the
  one-horn"). See the newer bullet below for the actual rewrite.
- **Rosalind is a new precedent name** — no collision with Ruth (02) / Marta (03) / Frances (kaucim)
  / the unnamed flower-stall owner (iching) / Noreen (product v1) / Deirdre (sugarman) / Alma
  (schwartz) / Constance (halbert) / Yvonne (hopkins) / Margit (collier).
- **No price, no delivery-time-as-SLA.** Confirmed clean by `scripts/copy-check.cjs`.
- **Closing section restructured, 2026-09-02 — operator feedback: "6-8 CTAs at once... we need
  additional subheadlines, esp the testimonial section."** Checked against the rendered HTML, not
  just the markdown, and the complaint was right: four "###" mini-sections landed back-to-back in
  the close, two of them (the mouth callback, the capsule callback) were one-liners that existed
  mainly to carry a CTA rather than to say anything new, and the precedent/limit block had **no
  heading at all**, so it read as two unstructured paragraphs floating before the actual close.
  Fixed: Rosalind's story and the honest limit each get their own `###` heading now (the precedent
  point specifically), and the two thin callbacks are merged into one section ("Two things worth
  repeating") carrying a single CTA instead of two. Net: 5 CTAs instead of 6, renumbered `c=1..5` +
  P.S. at `c=6` (was `c=1..6` + `c=7`) — every `{{BOOKING_URL}}` link in this file was checked
  against the new numbering, not just the ones that moved.
- **`IMG-12` added, 2026-09-02 — a REAL product photo, operator-supplied, not sourced or generated.**
  Sits at "What arrives, if you say yes," where the physical contents are itemized — the natural
  home for an actual photo, per the note this file already carried ("if that photo is ever taken, it
  belongs as an additional image at Beat 8's recap"). This is the first real photo of the actual
  product to exist for this offer; see the image table above for the file and any provenance notes.
- **Six CTA links + P.S. at c=7**, matching the deck-wide link convention exactly. Verb never "buy."
- **Banned constructions avoided:** no "clearing," no "energy field," no "our conversation," no
  hedge words, no AI tells, no horoscope filler. Predictions stated flat.
- **Images, superseded note:** this letter originally used one hero image for the whole anatomy
  walkthrough (a diagram or a single illustration). Operator direction 2026-09-02 replaced that with
  one reference-conditioned crop per anatomy section (`IMG-2` through `IMG-8`) — see the table at the
  top of this file for the current mapping. `IMG-9` (the product bracelet, Beat 6) remains the one
  slot nothing can fill yet.
- **Subheadline pass, 2026-09-02 — the four remaining unheaded walls got `###` headers, curiosity /
  open-loop-question style.** Beats 2, 4, 5, and the tail of Beat 6 were the only blocks left
  without the sub-heading treatment Beats 3 and 7 already had. Body copy is untouched — no sentence
  was cut, added, or reworded. Two of the four were split into two headed sub-sections rather than
  given one heading, because each had a genuine seam: Beat 2's myth turns on the Emperor's reaction
  ("What was this creature doing in the Emperor's court?" / "What happened when he got caught?"),
  and Beat 5's pivot turns from her own words into the reframe ("What have you actually told me?" /
  "Attraction problem, or something else?"). Beat 4 (the horn detail) and Beat 6's wrist-rule tail
  are each one idea and got one heading apiece ("How many horns does he actually have?" / "Does it
  matter which wrist you wear it on?"). Beats 1, 3, 7, and 8 are untouched — out of scope. See
  `06-E2-esl-product-creature-a.md` for the unheaded base version this variant is built from.
- **Close reorganized a second time, 2026-09-02 — operator feedback, verbatim: still bothered by
  the CTA count, and the left-wrist ritual "could be part of the close" for a gentler, softer
  ending.** This candidate goes furthest on internal consistency: the close's own heading, "What
  happens after you say yes?", is written in the exact curiosity-question register used by every
  other heading in this letter (Beats 2, 4, 5), so nothing about the close reads as a stylistic
  handoff to a different, more salesy voice. The wrist-rule paragraph is deleted from its old spot
  at the tail of Beat 6 and blended into the same paragraph as the itemized contents — "what
  arrives" and "how you wear it" answered as one continuous beat rather than two separate
  paragraphs (contrast `close-a`, which keeps them as two paragraphs under one heading). Net: one
  headed section, 2 links (was 4 headed beats, 5 links + P.S.). No new claims — every sentence is
  either verbatim-moved or a light connective rewrite; the two thinnest former mini-sections ("In
  concrete terms, what do you do now?" and "Two things worth repeating") were cut because their
  content either duplicated Beat 6's capsule instruction or restated Beat 3's mouth symbolism. This
  is one of three close-reorganization candidates built on the same base — see the note below the
  frontmatter table for the other two and how they differ.
- **Preview file size fixed, 2026-09-02.** The 12 source PNGs are generated far larger than their
  email display size (1080–1402px wide; the letter shows them at 120px paired or 540px full-width),
  so base64-embedding them at full resolution produced a 47MB `-PREVIEW.html` — unusable for a real
  send, and unusable as a preview too. Fixed properly, not by shrinking the preview's ambitions:
  each image was resized to its actual display size at 2x retina (240px for the 10 paired crops,
  1080px for the hero and the product photo) and JPEG-encoded via `sips`, then hosted on S3 through
  the deck's existing `host-be-asset.cjs` under a new prefix (`backend-06/creature-a/`, does not
  touch the protected `evelyn/tarot/` prefix). `render-be-esl-preview.mjs` now links a hosted URL
  directly instead of embedding it — `06-creature-a-images.json` holds those URLs now, not local
  paths. Result: 47MB → 20KB, images visually unchanged at display size. This is the same
  hosted-image pattern every other image-bearing send in this codebase already uses (the tarot
  broadcast pipeline's `host-card.cjs`); base64 embedding stays available in the script for any
  letter that hasn't been resized+hosted yet.
- **Beat 4 (the horn detail) rewritten, 2026-09-02 — operator feedback, verbatim: "the honesty
  beat confuses me rather than the intention."** See
  `06-E2-esl-product-creature-a-subhead-question.md`'s Build notes for the full explanation; same
  fix applied here since this file inherits that same paragraph. Short version: the old double
  hedge ("or whether either, precisely") is gone, and the paragraph now closes by naming what isn't
  in question — pull or guard, the no-exit mechanism holds either way — instead of leaving an
  unresolved doubt right after a confident anatomy walkthrough.
- **Beat 4 rewritten again, 2026-09-02 — operator confirmed the actual product: "The bracelet we
  are selling is a two-horn, so I rather you not talk about the one-horn."** This resolves the
  previous fix at its root rather than just softening it: there's no more uncertainty to hedge, so
  the honesty-framing opener ("I want to be honest about it rather than pretend to a certainty I
  don't have") is gone, and so is any mention of Tianlu or the one-horned variant — the beat now
  states plainly that this one has two horns, names it Bixie the guardian, and explains what that
  means (guards what already reaches you, doesn't chase new money). This also sets up Beat 5 better
  than before: Bixie-as-guardian foreshadows the "you have a containment problem, not an attraction
  problem" reveal that follows immediately after.
- **"Rosalind" heading converted to a question, 2026-09-02 — operator request, for consistency with
  every other heading in this file.** "### Rosalind" → "### What happened when I gave one to
  Rosalind?" — keeps her name (the story is still hers) but now opens a curiosity gap the paragraph
  beneath resolves, matching Beats 2/4/5's question-style headings. "### What this can't do" (the
  other Beat 7 heading) was left as-is — not asked for, and it reads fine declarative since it's
  already a direct admission rather than a teaser.
- **Beat 4 rewritten a third time, 2026-09-02 — operator: "obviously, in Chinese tradition, Pixiu
  is also considered a wealth attraction device."** Checked against real sources before writing
  anything (web search, not memory): true at the level of "Pixiu" as a general category — very
  commonly marketed that way — but the specific two-horned Bixie has a distinct role in the more
  detailed tradition: guardian, not attractor; that job belongs to the one-horned Tianlu. Rather
  than pick one truth and ignore the other, the beat now acknowledges what she's probably already
  heard about Pixiu generally, then differentiates: "This one has two horns... the guardian, not
  the puller." Confident, not hedged — no uncertainty about which variant our product is, unlike
  the version this superseded. Doesn't name Tianlu, per the standing instruction not to dwell on
  the one-horned kind — the acknowledgment is one sentence, then the letter moves on to what makes
  this specific piece different.
- **Rosalind's story expanded, 2026-09-02 — operator: "a bit more detailed."** Was two thin,
  abstract paragraphs ("whatever reached her seemed to find its own way back out"); now a concrete
  scenario (a client payment matched almost exactly by a car repair the same week — the leak made
  specific rather than gestured at), a doubt beat (nothing seemed different for the first couple of
  weeks, told honestly rather than smoothed over), and a closing quote from her, echoing how Beat 5
  closes on %FIRSTNAME%'s own quoted words. The honest limit — "I'm not going to tell you her whole
  life changed" — is untouched; this adds texture, not a bigger claim. No dollar figures, no
  guaranteed outcome — "a repair that ran almost exactly that amount" stays deliberately
  unquantified, same discipline as the rest of the letter.
- **Beat 8's blended paragraph converted to bullets, 2026-09-02 — operator request.** "What
  arrives" and "how you wear it" are now two `**bold-lead**` list items instead of one run-on
  sentence, with the wrist-rule reasoning ("worn on the right, you'd be offering the seal to what
  you're sending out...") kept as a plain paragraph after the list rather than folded into a bullet
  — reasoning reads better as prose than as a list item. Required adding bullet-list support to
  `render-be-esl-preview.mjs` itself, since the renderer had none: a block whose first line starts
  `- ` now renders as a real `<ul>`, with wrapped continuation lines (not starting `- `) appended to
  the item still being built, matching how every other paragraph in this file wraps.
- **Rosalind's precedent story de-gendered, 2026-09-02 — operator: the be-customer list includes
  men, and this offer specifically skews more male than female.** The rest of the letter was
  already gender-neutral direct address ("you," never "she") — Rosalind's story was the one place
  a third-person pronoun was doing real work, and it was gendered ("a woman," "her"). Rewritten with
  singular "someone... they/their" throughout; kept the name Rosalind itself (still covered by the
  precedent-name collision check against Ruth/Marta/Frances/Noreen/Deirdre/Alma/Constance/Yvonne/
  Margit) since a name alone doesn't assert the letter-writer's gender, only "a woman" did. No other
  facts in the story changed. Same pass applied across the whole offer — booking page, order bump,
  thank-you page, both post-purchase emails, both upsell bridges — see
  `docs/06/0-WORKFLOW-06.md` for the full list.
- **Beat 4 rewritten a fourth time, 2026-09-03 — operator, speaking as a firsthand cultural source
  (not verified against external sources, per explicit instruction to stop searching and take the
  lore directly): "the Chinese lore is Pi Chiu, since it's two headed, one captures wealth, the
  other keeps wealth."** This supersedes the whole horn/Bixie/Tianlu framing from the three prior
  Beat 4 rewrites above — not a terminology swap, a real change to what the product claims to do.
  Confirmed through a short back-and-forth before writing anything: (1) this changes the product's
  actual function, not just the mythological detail — the piece genuinely pulls new wealth toward
  the buyer AND keeps what arrives, both real, not one real and one traditional-color; (2) checked
  the real product photo (`assets/06-pixiu-product-real.png`) first, since the letter's whole
  discipline has been "verified per-crop" for every other image — the second head is NOT visually
  distinct on this specific casting (one clear head, the other end reads as scrollwork/medallion,
  matching what Beat 3 already described), so no new anatomy image was generated or sourced; the
  claim is functional/traditional, not something added to the anatomy walkthrough or its images.
  Beat 3 (the physical anatomy walkthrough, all 7 crops) is untouched — still accurate to what's
  visibly on the piece. Three things changed: Beat 4 now states the two-headed pull-and-keep
  function directly (and can finally CONFIRM the popular "Pixiu attracts wealth" belief instead of
  denying it, which reads more honestly than the old "that's true of some of them, not this one"
  line); Beat 7's honest limit was rewritten because "he can't manufacture a fortune that was never
  coming" is no longer true of a creature that actively pulls new wealth toward her — the new
  version keeps the same honest-limit FUNCTION (still tells her plainly what it doesn't do — no
  conjuring, no multiplying) using the two-headed frame instead; Beat 8's close line changed for the
  same reason ("it doesn't put anything in front of you that wasn't already finding its way to you"
  was the same now-false claim). Beat 5 (the pivot to her — "you have a containment problem, not an
  attraction problem") is untouched: that's a diagnosis of HER stated words, not a claim about the
  product's full capability, and stays accurate regardless of what else the product does.
- ⚠ **Not yet propagated everywhere this assumption lived, as of this bullet.** `06-U2a-upsell2-opening-beats.md`'s
  entire pitch, both paths, is built on "Pixiu only guards, never calls new things toward you — the
  Manifestation Bracelet is the only thing that does that." That's now directly contradicted and
  needs its own re-differentiation pass, not a quick patch — flagged, not fixed, as of this bullet.
  `06-E1-subject-lines-product-creature-a-close-c.md`'s subject #5 also still says "two horns, not
  one" and needs the same fix as this file's Beat 4. `06-E2-esl-AIDEN-close-c.md` duplicates this
  letter's Beats 2–8 verbatim and needs the identical Beat 4/7/8 changes applied.
- **A P.P.S. added, 2026-09-03 — operator: "add another PS. Remind them the left hand and add the
  CTA there."** Third link in the letter, `c=3`. Reuses the exact left-wrist phrasing already
  established in Beat 8 ("the one that receives") rather than inventing new wording for the same
  fact — a callback for the reader who skims straight to the end, not a new claim. Same addition
  applied to `06-E2-esl-AIDEN-close-c.md`, which shares this P.S. block verbatim.
