# Stage 1 compare grade — execution 30667

Source PDF: `output/pdf/marcus-yan-wei-higher-calling-test.pdf`
Question: “What is my higher calling?”
Spread shown: The Six Questions
Cards named: Six of Cups, Queen of Swords, The Star, Queen of Pentacles, Five of Swords, Nine of Wands
Personal card: The Lovers
Grader: `docs/02/n8n/docs/02/02-compare-grade-prompt.md`

## Verdict

I would not sign or send this version. It is coherent and the card pictures it does describe are
accurate, but the buyer receives full readings for only four of the six positions. Too many of its
personal claims come from a broad profile rather than from the cards visible on the page. The final
answer sounds meaningful while remaining broad enough to fit many buyers.

There is also a critical email-to-report continuity failure. The existing higher-calling email uses
The Star and Seven of Pentacles as its fixed face-up cards. This execution generated Six of Cups and
Queen of Swords. The fixed cards must come from the saved daily edition; fulfillment must never
re-create them from the question text.

## Position-by-position claim audit

The counts below cover distinct picture, interpretation, biographical, and recommendation claims.
“Invented” here means the named card or the other visible cards do not carry the assertion. The
report's private numerology process is deliberately ignored because the comparison grader judges
only what the paying reader can inspect on the page.

| Part | Sound | Thin | Invented | Finding |
|---|---:|---:|---:|---|
| Position 1 · Six of Cups | 1 | 1 | 0 | One conventional summary; no picture and no full position reading. |
| Position 2 · Queen of Swords | 1 | 1 | 0 | One conventional summary; no picture and no full position reading. |
| Personal lens · The Lovers | 4 | 4 | 2 | Picture is accurate; “responsible and structured” and loyalty to old expectations are asserted rather than shown. |
| Position 3 · The Star | 6 | 7 | 3 | Card and cross-references are sound; organizer/stabilizer biography and a calling to restore others are not established. |
| Position 4 · Queen of Pentacles | 5 | 8 | 3 | Practical base fits the card; claims about how he cares for others and possible family sacrifice are unsupported. |
| Position 5 · Five of Swords | 5 | 8 | 4 | Conflict frame fits; formative criticism, habitual self-denial, and predicted disapproval go beyond the spread. |
| Position 6 · Nine of Wands | 6 | 8 | 4 | Endurance and boundaries fit; family roles, emotional labour, compassion, and a long-haul temperament are supplied by the writer. |
| **Total** | **28** | **37** | **16** | The problem is not factual card description. It is the volume of personal conclusions carried by no visible card. |

## Ten-line grade

1. **Spread, not a list — 4/5.** There are real cross-references. The best is: “With the Five of
   Swords, the Nine of Wands distinguishes between two kinds of protection: fighting phantom
   battles in your head versus wisely guarding your time and energy in real life.” It loses a point
   because positions 1 and 2 are labels with one-sentence summaries rather than completed readings.
2. **Claims carried by the card — 2/5.** The pictures support the broad direction, but the document
   repeatedly turns a card into unverified biography: “You naturally pour structure and care into
   others. You make environments work. You take responsibility.” Count: sound 28, thin 37,
   invented 16.
3. **Pictures accurate — 3/5.** The Lovers, Star, Queen of Pentacles, Five of Swords, and Nine of
   Wands are described accurately. Six of Cups and Queen of Swords receive no picture description,
   and the PDF contains no card images.
4. **Reversals — n/a.** No card is reversed.
5. **Falsifiable claims — 2/5.** About 11 claims can be checked against his life within a month,
   including whether he is routinely the organizer, avoids conflict, overprotects others, and has
   one hour a week to test a direction. Most are broad temperament claims rather than decisive
   observations.
6. **Invented specifics — 5/5.** Count: 0. It names no possession, season, event count, or other
   concrete fact that the reader could not know. The many card-unsupported personality claims are
   recorded under line 2 instead.
7. **Timing — 5/5.** Dated claims: 0. It makes no unsupported forecast.
8. **Dignity — 2/5.** It does not accuse him, but it flatters him through unearned descriptions:
   “You’re built for the long haul,” and “that makes you compassionate and careful.”
9. **Structure and finish — 4/5.** The argument advances and the synthesis reads cards together.
   The close repeats the same hope/care/structure theme and the missing opening positions leave the
   spread visibly incomplete.
10. **Would you sign it — 2/5.** No. The page is polished, but the answer “build and tend real-world
    spaces—projects, roles, communities, or practices” is too elastic for a paid answer to “What is
    my higher calling?”

**Single best thing:** “With the Five of Swords, the Nine of Wands distinguishes between two kinds
of protection: fighting phantom battles in your head versus wisely guarding your time and energy in
real life.” The writer makes one card change the meaning of another instead of stacking keywords.

**Single worst thing:** “Your higher calling is to build and tend real-world spaces—projects,
roles, communities, or practices—where people experience stability, care, and renewed hope because
of how you structure and hold things.” The list covers almost every caring occupation or activity,
so it sounds like an answer without making a discriminating claim.

**Does he feel read, or processed?** Processed. The report uses his name and sustains one theme, but
the same reliable, responsible, caring, conflict-avoidant profile is pressed into each card. The
recommendations resemble a well-written general coaching workbook more than observations only this
spread could have produced.

**Does he come back?** Probably not. He may keep the practical exercises, but the central purchase
question remains unresolved. The report gives permission to explore several kinds of service; it
does not help him distinguish which calling is his or what evidence would separate one candidate
from another.

## Required workflow changes

### 1. Make the daily edition authoritative

The booking link must carry an `editionId`, not just a question. Resolve that ID to a saved record
containing:

- the exact question and spread definition;
- every numbered position and label;
- the fixed face-up card IDs, names, orientations, and image URLs;
- the approved text already sent for those face-up cards;
- the exact email hero URL and asset version.

Node 3 must accept the fixed cards from this record. Remove the
`hash(question + spreadType)` fixed-card generation. Only the still-hidden positions are drawn for
the buyer, excluding the fixed cards already in the edition.

For the manual Stage 1 test, add those edition fields to the editable fixture. Stage 2 will replace
the fixture with a Supabase lookup by `editionId`.

### 2. Plan and write every spread position

Change the private plan from `buyerFaceDown` only to all authoritative positions.

- Positions already shown in the email receive the saved email meaning plus a
  `fullSpreadContribution`: what becomes clearer about that card after the remaining cards turn.
- Buyer-drawn positions keep their current full plan requirements.
- The personal card remains a separate lens and never consumes a spread position.

Change the writer schema from keys for `buyerFaceDown` to `position_1` through the final saved
position. Positions 1 and 2 should preserve the meaning the subscriber already read, then add a
short new paragraph connecting each to the now-complete spread. This gives the PDF wholeness without
charging the buyer for a verbatim repeat of the email.

### 3. Validate completeness in code

The structural gate must iterate over `positions`, not `buyerFaceDown`. It should fail before grading
unless:

- there is exactly one section for every numbered position;
- card ID, name, orientation, position number, and label match the saved draw;
- fixed positions match the saved edition;
- the personal card is present once and separate;
- `heroImageUrl` and every `cardImageUrl` use an approved asset host.

The current model grader is instructed to omit positions 1 and 2, so its 9/10 scores cannot detect
this missing-product problem. Update its prompt to grade all positions, then run the independent
like-for-like rubric as a second editorial view. Image and position completeness must remain hard
code checks rather than model opinions.

### 4. Render the visual product

Update node 20 to render:

1. a cover using the exact email `heroImageUrl`;
2. a full-spread overview with every card now face up in the spread's correct formation;
3. the personal-card image beside its lens reading;
4. one image beside every position section, including positions 1 and 2;
5. a clear label on positions first seen in the email, such as “The card you first saw.”

Use the existing hosted Rider–Waite assets:

`https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/<card-slug>.jpg`

The higher-calling hero already exists at:

`https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/08/08-hero-what-is-my-higher-calling.jpg`

PDFShift can load these public URLs. Add a preflight node that checks every required asset returns a
successful image response before rendering, so a customer never receives a PDF with broken boxes.

### 5. Persist the visual contract for production

Stage 2 should save the edition ID, hero asset version, full authoritative position array, personal
card, buyer draw, accepted report version, and rendered PDF URL against the order. Retries must reuse
that saved data. They must never redraw a buyer card or resolve a newer hero.

## Acceptance tests

- The same `editionId` produces the same question, hero, fixed cards, position labels, and saved free
  interpretations at email, booking, and fulfillment.
- Two buyers on the same edition share only the edition's face-up cards; their hidden cards are
  independently drawn and persisted.
- A six-card spread yields six report sections and seven card images when the separate personal card
  is included.
- An eight-card spread yields eight report sections without a hard-coded layout or count.
- Every image URL is fetched successfully before PDFShift runs.
- Extracted PDF text contains every position number, label, and exact card name once.
- Rendered pages are visually checked for image loading, clipping, orphan headings, and excess blank
  space.

```text
DIMENSION                        SCORE  NOTE
1  spread, not a list             4/5   strong cross-references; positions 1–2 incomplete
2  claims carried by the card     2/5   sound 28 / thin 37 / invented 16
3  pictures accurate              3/5   accurate where described; two omitted; no images
4  reversals real                 n/a   no reversals
5  falsifiable claims             2/5   count: 11
6  invented specifics             5/5   count: 0
7  timing                         5/5   dated claims: 0
8  dignity                        2/5   repeated flattering personality claims
9  structure and finish           4/5   coherent argument; incomplete spread
10 would you sign it              2/5   no; central answer is too elastic
                                  29/45 scorable
WORDS: 3529   POSITIONS: 6 named / 4 fully read
```
