# 08 · THE SHAPE

**The goal:** an engaging free reading that leaves her with a clear discovery and a specific
reason to want the remaining cards read for her.

**This is the craft authority for a Marcus Stone daily letter.** Use the linked product and spread
specifications for facts, and existing letters as examples rather than mandatory sentence patterns.
When an example conflicts with this guide, follow this guide.

⭐ **Clarity comes first throughout the email.** She should understand the picture, its connection
to her life, and the offer on one reading. Explain a connection when needed. Never make a sentence
cryptic to preserve a metaphor, a short sentence, or Marcus's voice.

| | |
|---|---|
| The spread library | [`SPREADS.md`](SPREADS.md) — every spread, its real name, its traditional positions |
| The named things | [`QUESTIONS.md`](QUESTIONS.md) — the well of candidate questions a morning is laid on |
| The product she buys | [`PAID-READING.md`](../paid-reading/SCOPE.md) — the free/paid rule, her name, her sentence |

The earlier voice profile was set aside after a blind editorial test. That test and its winning
control letters are now missing; `letters-02/` contains the surviving examples. Sentence counts
from those examples describe those letters, not a proven conversion formula. The recommendations
here need testing against actual reader response and completed reading orders.

---

## What Marcus does every morning

He lays one real spread on one named question. He turns the cards he can honestly read to a
reader on that topic and leaves the remaining positions for the personal reading. Her name is
required for that reading; a sentence about her situation is optional.

- **The spread comes from `SPREADS.md`.** Prefer a real, popular one. Where none genuinely
  answers the named thing, an in-house spread is allowed — but ⭐ designed **backwards from the
  named thing it finds**, never a shape with a concept forced onto it afterwards. That is how 07
  failed. ⛔ And it is never called traditional: `SPREADS.md` marks each spread
  `traditional` / `folk` / `in-house`, and the letter claims only what is true.
- **Keep the spread's name and provenance accurate in the plan.** Name it in the email when
  that helps the reader. The introduction does not have to name or explain it. The card count and
  deck can establish the scene briefly; do not interrupt her concern to teach spread terminology.
- **Card count 3–12.** Nothing in this spec assumes six.
- ⛔ **Positions are always said in HER language** — a bare *what / who / where* clause, 2–7 words.
  The spread's traditional position names live in `SPREADS.md` and never reach a letter.
- **Cards turned free follow this working allocation** (roughly a third): 3→1 · 5→2 · 6→2 · 7→2 · 10→3 · 12→4.
- **WHICH positions turn** is `PAID-READING.md`'s honesty rule: free if Marcus can answer it for any
  woman with that topic on her mind; face down if answering it needs to know her.
- **Headings carry the REAL position number**, never a re-count. A 7-card spread turning 1, 2 and 5
  gives its third block `**Five — what it costs you. The Eight of Swords.**` The face-down inventory
  names the real remaining ordinals too.

**Deck: Rider–Waite, 1909.** Not his design — his copy. Pamela Colman Smith drew all seventy-eight
and went uncredited for most of a century. Provenance, not exclusivity. Art is in S3 at
`evelyn/tarot-rws/`.

⭐ **Her personal card guides the interpretation. Every spread, no exceptions.** It is not an
extra position, never "in the middle", never "read around it" — the Celtic Cross is excluded from
the library for exactly this reason.

**Explain what it adds in plain language.** Her name identifies a personal tarot card. Marcus uses
that card's reading of her strengths and familiar patterns to interpret the remaining cards on the
morning's question. Say what that changes for THIS topic; do not stop at calling the card "hers".
"Lens" is internal shorthand, not an explanation for the reader. Do not use *"your name gives me
your lens"*, *"read through it"*, or a comparison with a stranger's reading to explain the offer.

The email does not need a calculation lesson or tarot jargon. Explain the purpose and the process
without sums, arithmetic, *twenty-two*, *Major Arcana*, or *Trump*. Describe only what the paid
reading actually does; do not invent personal information the name cannot supply.

## Plan the discovery before writing

Write two plain sentences in the brief:

- **What she learns free:** one insight she can explain without naming the cards.
- **What she wants to understand next:** a natural follow-up answered by the remaining positions.

For higher calling, the discovery could be *"You may be waiting for certainty before giving this
interest a serious chance."* The next question is *"What can you change, and where can you begin?"*
These are planning examples, not lines to copy into every letter.

Each card block must advance the discovery: add evidence, show a consequence, or change the
interpretation of an earlier card. Two cards making the same point need a better reading. Give the
free insight completely; do not withhold the explanation needed to understand it.

## The movement of the email

Use this as a working sequence, not a sentence template. Start with her concern, give her a reading,
and make the next question worth pursuing. **The opening is one continuous movement into the first
card, not a situation paragraph followed by a second introduction.** The acknowledgement and
transition can move or combine.

| Part | Job |
|---|---|
| Subject | Give her a recognizable concern, an intriguing observation, or a relevant possibility. The body must fulfil its promise. Emoji and `%FIRSTNAME%` are available house devices; no fixed word count or compulsory contradiction |
| Salutation | `%FIRSTNAME%,` alone |
| Opening into the reading | Connect a recognizable concern or inviting question directly to the first card. Include only the setup needed to follow the reading; no separate mandatory deck line. Do not invent a personal event or imply she submitted a question she did not submit |
| Gender clarification | Where a third party is involved and it helps, briefly explain how to read the pronouns |
| Card blocks | Picture → meaningful detail → connection to her life. Each contributes to the discovery |
| Read the spread | Explain what the cards mean together and how their positions affect that reading |
| Acknowledge and develop | Recognize her situation, then develop the discovery through encouragement, a consequence, a choice, or a changed understanding |
| Transition | Connect the discovery to the specific unanswered question |
| Close | Continue this reading into her unresolved concern; weave in why her name helps, then a relevant invitation |
| Sign-off and P.S. | `Marcus`, then a brief return to an image from the reading |

**Opening example for higher calling:**

> The thing you keep coming back to—could that be your calling?
>
> That's what I'm looking at this morning. I've laid six Rider–Waite cards on the question of
> your higher calling. Two are face up. Let's start with The Star.

The concern leads into the reading without restarting it. Adapt this movement, not the exact
sentences. Do not require a rhetorical question in every email. If the masthead already identifies
Marcus and his role, the body need not introduce him again. Mention the spread's name, its position
system, or the face-down count only where it helps; do not stack all the metadata before card one.

**Length is a planning guide.** `300 + 120 × (cards turned)` is a starting estimate, not a quota.
Give an important card room; cut repeated descriptions and explanations. Neither padding nor
removing a necessary bridge to hit a count improves the reading. Do not announce the whole
conclusion in the opening and then repeat it in both card blocks, the summary, and the transition.
Let the opening raise the concern, the cards develop the discovery, and the transition move forward.

**Build compatibility:** headings, the crosshead, and the close have parser anchors in
`build-08-daily.py`. Keep those structural markers intact or update their configuration when
building a new letter. If the new opening needs different presentation, change the builder rather
than forcing the copy into the old deck-line treatment or hand-editing generated HTML.

## One card block

1. **The picture.** Describe enough of the actual drawing for her to see what Marcus is referring
   to. Select relevant objects and actions rather than inventorying everything.
2. **The meaningful detail.** Draw attention to a specific feature that supports the reading.
   An overlooked detail can reward attention, but novelty alone is not a reason to choose it.
   Verify it against the card art. Do not force a meaning onto an incidental feature.
3. **The connection.** Connect the picture to a recognizable situation in her life. The connection
   must make sense on first reading. Use a short explanation whenever the image alone does not
   carry the meaning; "That's the cost" cannot substitute for saying what the cost is. Explain the
   image-to-life connection, not the writing process. Repeated phrases such as "as the first card
   in this reading" and "this position asks" turn the reading into a commentary on its construction.
4. **A final short line, if earned.** Give the thought a landing when helpful. Not every block
   needs a stinger.

For example, after describing the Star's foot in the water:

> You keep coming back to this interest, but you haven't given yourself a chance to pursue it
> seriously. You read about it. You imagine doing it. Then you put it aside for another week.

The image gives the passage character; recognizable actions give it meaning. Present an
interpretation, not a claim that the picture proves a private fact about her.

**Heading formula:** `**<Ordinal word> — <her-language position>. <The Card Name>.**`
Ordinal as a word never a digit · spaced em-dash · two full stops, never a colon · card named last,
with its article. Keep this syntax for the builder; explain the reading in the body.

## From the free discovery to the remaining cards

Name the next question before asking for the click. Show how it follows from what she has just
learned, then identify the remaining positions in ordinary language.

> Recognizing why you've waited is a start. The next question is what you can change—and what
> your first step could be.

"The other four carry the weight" or "the ones you want" cannot establish the value on their own.
Say what those cards address. Keep the free reading worthwhile; do not dismiss it to sell the rest.
Avoid repeating the whole face-down inventory in both the transition and the close. Name the next
question in one place and the specific scope in the other.

The existing crosshead anchor, `That's the <N-up spelled out> I can turn.`, may remain for build
compatibility. It is not the persuasive argument. If changing it, update `crosshead_start` in the
letter's builder configuration. Keep the remaining positions and counts consistent with the spread.

## Acknowledge her situation without repeating one emotional formula

Recognition should come from the situation described. Praise is optional. Do not manufacture three
"You've" clauses or force every virtue to become a fault.

Choose the movement that suits this reading:

- **Recognition:** name a pattern she has struggled to explain.
- **Encouragement:** show a strength and where she can put it to work.
- **A difficult choice:** clarify what each direction asks of her.
- **A mistaken assumption:** give a different interpretation and explain why it fits.
- **An overlooked possibility:** show something she has not considered.

The virtue-and-cost movement remains available when earned. Acknowledge why her approach made
sense, then explain its consequence without scolding her. Check nearby letters in `STATE.md` and
`letters-02/` for repeated emotional turns and phrases; do not impose a fixed rotation.

## The close — continue THIS reading into her next question

⭐ **Write the close fresh for the question and the discovery in this email.** It is Marcus still
speaking to her, not a product explanation appended after the reading. Topic words inserted into a
standard paragraph do not make it specific. Connect what she has just understood to the answer
she now wants, in the same voice and emotional register.

**These are things to communicate, not paragraphs to fill:**

- The unresolved concern that matters after this particular reading.
- What Marcus will explore next, within the actual remaining positions. Weave those questions into
  the invitation; do not automatically recite a four-item inventory. If the inventory already
  appeared, develop its significance rather than repeating it.
- Why he needs her first and last name: it identifies her personal tarot card, whose meaning helps
  him interpret the remaining cards. Connect that contribution to this situation—for example,
  saying what she needs in an uncertain relationship, or giving a persistent interest a serious
  chance. Do not stop at the generic phrase "strengths and familiar habits".
- A link that invites the next step she wants to take. Prefer wording connected to the question
  over a default "Turn the other four". The invitation must accurately describe the destination
  and what the reading offers, without promising an outcome it cannot deliver.

**Keep the explanation conversational and brief.** The same name-card method can apply every day
without needing the same explanation every day. Give its purpose in the context of this reading;
do not switch into instructions beginning "Click below and enter..." by habit. Mention first and
last name clearly, but do not let the form become the subject of the close. No explanation of
where the card sits or whether it adds a position. Never claim the other cards would be worthless
or belong to a stranger without her name. Describe only what the actual reading provides.

**Example for "why won't he commit?"—a worked continuation, not reusable furniture:**

> You can care about him and still need a clearer answer about where you stand.
>
> That's where I'd like to take the reading next, %FIRSTNAME%: what this waiting is costing you,
> what you need from him, and what you want to do if things stay as they are.
>
> To continue, I'll need your first and last name. Your name identifies your personal tarot card,
> which helps me read the other four with your strengths and familiar habits in mind—especially
> when it comes to saying what you need.
>
> [Let's look at your next step](BOOKING).

For higher calling, the close should continue the question of pursuing the interest and beginning
within her existing life. Do not reuse the relationship close by swapping "him" for "calling".

**Read the last body paragraph and the close together.** They should sound like one conversation.
If Marcus suddenly starts describing features, explaining the procedure, or announcing a new
section, rewrite the transition. If the close could be pasted into a different topic with only a
few nouns changed, write it again from the reader's unresolved concern.

**Presentation must preserve that continuity.** Do not introduce the close with a generic
administrative label such as "NOTICE TO READERS". Prefer the letter's normal body treatment;
any visual emphasis should support the invitation. This applies to generated HTML as well as
Markdown: change the builder when its furniture interrupts the voice. Keep `[link text](BOOKING)`
syntax, accurate card counts, and configured parser anchors—or update those anchors when needed.

**The name is required; her sentence is optional.** The booking page also lets her add one line
about what is happening. Never say there is nothing else on the page. If mentioning that box,
make clear that she can leave it empty.

⛔ **Nothing after the link.** The letter goes link → `Marcus` → P.S. The trailing recap in
`what-is-my-higher-calling-close-e.md` predates this rule and is the one place a shipped letter
still disagrees with the spec — re-cut it before it sends.

## The P.S.

Return briefly to a physical image already established in a card block and the significance the
reading has given it. It can be quoted or restated clearly. A literal caption that merely describes
the picture again is not enough; the line should leave her with the thought the image now carries.
Do not add a new claim, a new metaphor to decode, or another sales pitch.

> P.S. One foot in the water for years is still one foot in the water.

## Voice preferences

- **Concrete and conversational.** Describe recognizable objects and actions. Name feelings,
  strengths, or habits when they help explain the reading; do not let abstractions replace it.
- **Mostly short sentences, with room to explain.** Vary the rhythm. Use contractions naturally.
  No quotas for sentence length, contractions, punctuation, or corrective phrases.
- **Clear references.** Every "it", "that", "this", and "them" should have an obvious referent.
  Rewrite unclear references rather than banning ordinary sentence openings.
- **Direct without pretending certainty.** State the interpretation clearly. Use "may" or "could"
  when appropriate; do not turn a possibility into a private fact just to sound confident. Equally,
  do not soften every sentence with "perhaps", "may", "suggest", or "makes me think". Qualify the
  uncertain claim where needed, then develop the thought naturally.
- **Picture before interpretation within card blocks.** The opening may begin with her situation.
- **Read the cards together.** Explain what their relationship and positions add, rather than
  attaching separate dictionary meanings to them.
- **Restrained emphasis.** A short question or occasional punctuation can serve the reading.
  Avoid shouting, repeated exclamations, and manufactured suspense. Reserve capitals for printed
  card names and established design labels.
- **Meaning before verbal cleverness.** Keep a memorable line when it says something clear.
  Remove a polished phrase when a reader has to decode it.

## ⛔ Never

- Any price, sum, discount, donation, checkout or delivery promise. Not the words *price* or *pay*
- Any clock — no deadline, no "only a few", no closing window. She is never compelled
- Any act worked on another person. No hex, curse, spirit, or ritual against anyone
- Completeness alone as the reason to click. Explain the new questions the remaining cards
  address; do not merely promise more words or more cards
- Any plural reader. No "for a list", no "everyone", no "for one woman… for another". One woman is
  reading
- Tarot vocabulary in the letter. No *significator*, no *querent*, no "what crosses you", no
  "past / present / future"
- Unexplained spiritual abstractions or jargon in place of a reading. Her question may use her
  own spiritual vocabulary; Marcus still needs to explain his answer plainly

## Review before it sends

Check comprehension and desire separately. A clear email can be uninteresting; an intriguing one
can leave the offer confusing.

1. **Recognition and flow:** does the opening give her a reason to care and lead directly into
   the first card? Read the first two paragraphs aloud together. Does the email restart with an
   introduction or an explanation of the setup? Remove that restart.
2. **Discovery:** without the booking links, can she say what she learned and what it helps her
   notice or reconsider? Does each card contribute something distinct?
3. **Comprehension:** can a fresh reader explain the image-to-life connections and identify every
   unclear reference? Run the workflow's cold read after the voice edit.
4. **Desire:** what specific question does she now want answered, and why does that question matter
   given the free reading? Curiosity about a hidden card alone is not enough.
5. **Offer:** can she explain what the remaining reading addresses, what to do next, and why her
   name is requested? Does the actual product deliver what the email promises? Could this close
   fit a different question with only a few nouns changed? If so, it is too generic. Read it with
   the preceding paragraph and inspect the HTML: does it still sound and look like Marcus's letter?
6. **Progression:** do the subject, reading, transition, and close pursue the same question while
   each adding something? Mark repeated conclusions; cut repetitions that do not develop the idea.
   Does the email feel distinct from recent sends?
7. **Over-explanation:** is each explanation helping her understand her situation or the offer?
   Remove narration of how Marcus constructs the reading and details about internal card mechanics.
8. **Engagement:** read the whole email after the sentence-level checks. Does it sustain interest,
   retain a direct human voice, and leave an emotionally meaningful thought? A cold-read pass proves
   comprehension only; it does not prove flow, engagement, or conversion.

**Learn from results.** Before comparing variants, name the change being tested and the outcome
that matters. Track clicks and completed reading orders together; a click increase alone does not
establish that more people bought the reading. Keep editorial-test findings separate from actual
send results. Do not turn a winning phrase from one letter into a permanent rule without further
evidence.
