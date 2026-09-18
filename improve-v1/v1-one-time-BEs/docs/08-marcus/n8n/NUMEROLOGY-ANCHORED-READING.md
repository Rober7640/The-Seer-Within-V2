# 08 Marcus — numerology-anchored tarot reports

Status: canon-backed Stage 1 implemented and tested, 2026-09-11. This document defines the tarot
integration and report safeguards. The canonical numerology content and combination rules live in
[numerology-canon/README.md](numerology-canon/README.md).

## The decision

Keep the tarot draw independent. Use the buyer's numerology as a private interpretive brief that
changes how Marcus reads every card.

The numbers do not select the spread cards. They help Marcus choose which plausible meaning of each
drawn card matters for this person, in this position, on this question. The customer receives one
coherent tarot reading rather than a tarot report with a separate numerology chapter attached.

The booking page must say plainly that Marcus uses the buyer's full birth name and date of birth to
personalize the reading. The calculations and numerology terminology can remain out of the final
report unless a later product decision makes them part of the visible offer.

## Required intake

Stage 1 and Stage 2 will need:

| Field | Purpose |
|---|---|
| `question` | The exact concern the report must answer |
| `spreadType` or immutable `editionId` | Supplies the spread, positions, and fixed face-up cards |
| `fullBirthName` | Calculates the Expression and Personality Numbers |
| `dateOfBirth` | Calculates the Life Path Number |

`dateOfBirth` uses `YYYY-MM-DD` internally. The production form may display a friendlier date
control, but server-side validation and storage must remove locale ambiguity.

Suggested booking disclosure:

> Marcus uses your full birth name and date of birth to personalize how he reads your cards.

The current Stage 1 workflow accepts these fields and performs a manual test-only calculation.
Production must calculate from trusted saved intake rather than fields sent directly to n8n by a
browser.

## Calculation authority

Reuse `server/lib/numerologyEngine.ts`. Do not recreate a second production calculation inside n8n.

- **Expression Number:** full birth name.
- **Personality Number:** consonants in the full birth name under the same Pythagorean table.
- **Life Path Number:** complete date of birth.
- Preserve master numbers according to the existing engine.
- Save the calculation method/version with the order snapshot.
- Fail explicitly on unsupported names or unmapped results. Do not silently change Aiden's engine
  or invent a normalization policy inside Marcus's workflow.

Stage 1 may use a clearly labelled test-only implementation while the flow is being developed. Its
result must be checked against the existing engine with representative fixtures before Stage 2.

## Workflow shape

```text
question + full birth name + date of birth
                    |
                    v
calculate and save numerology facts
                    |
                    v
retrieve three versioned canon entries
                    |
                    v
build a cited, question-specific private synthesis
                    |
                    v
load fixed face-up cards + draw buyer-specific face-down cards
                    |
                    v
plan the whole spread against the cited synthesis
                    |
                    v
write one continuous Marcus report
                    |
                    v
grade specificity, card fidelity, continuity, and directness
                    |
                    v
render and store the accepted PDF
```

All spread cards are known before the planning step. Do not write one card blindly and then discover
the next. The planner needs the whole spread so that every section performs a different job and the
report does not repeat or contradict itself.

## Canon first, private synthesis second

The workflow must retrieve approved 500–800 word canonical entries for the calculated Life Path,
Expression, and Personality numbers. It must not ask a model to recreate those meanings per order.
The customer-specific model task is limited to combining the three fixed entries for the exact
question and citing the stable passage IDs that support each private claim.

Birthday, Soul Urge, and Maturity calculations may remain in the saved diagnostic snapshot, but
they do not guide report writing until equivalent canonical libraries and combination rules are
approved. This keeps “more numerology” from becoming more unconstrained material.

## Private numerology synthesis

The synthesis is internal generation material. It is not customer-facing copy and it is not a
generic numerology reading. Its claims must cite the approved canon.

```json
{
  "methodVersion": "pythagorean-profile-v2",
  "canonVersion": "marcus-numerology-canon-v1",
  "facts": {
    "lifePathNumber": 4,
    "expressionNumber": 6,
    "personalityNumber": 1
  },
  "canonKeys": ["LP4", "EX6", "PE1"],
  "claims": [
    {
      "claim": "A narrow working hypothesis for the exact question.",
      "support": ["LP4.CHOICE", "EX6.PRESSURE"],
      "confidence": "pair-inference",
      "questionRelevance": "central",
      "disconfirmation": "The observable condition that would make this claim a poor fit."
    }
  ]
}
```

The brief should contain three to six useful constraints. More material encourages vague profiling
and gives the writer too many themes to force into every card.

Treat the brief as a hypothesis for interpretation, not proof of private facts. Prefer language such
as “you may,” “this can look like,” and concrete recognizable behavior. Never diagnose the buyer or
claim that a number proves an event occurred.

## Whole-spread planning record

The planner receives:

- the exact question;
- the edition theme and free-email context;
- every ordered spread position;
- the fixed face-up cards from the daily email;
- the saved buyer-specific face-down draw;
- the accepted private numerology synthesis and the exact support IDs attached to each claim.

The planner does not receive the full canon prose. That material is used by the synthesis and
evidence-grade steps, then removed before tarot planning and customer writing.

It produces one internal record per purchased position:

```json
{
  "positionNumber": 4,
  "positionLabel": "what you need now",
  "cardId": "two-of-pentacles",
  "cardName": "Two of Pentacles",
  "cardAnchor": "Adaptation, competing demands, and active balance.",
  "numerologyEffect": "Her need for certainty can turn preparation into postponement.",
  "specificInterpretation": "Create a contained experiment instead of demanding a final answer.",
  "connectionToEarlierCards": "Changes the earlier problem from finding certainty to creating evidence.",
  "practicalImplication": "Give the interest a fixed weekly place for a defined trial period.",
  "mustNotRepeat": "The earlier section already established fear of choosing incorrectly."
}
```

`cardId`, `cardName`, position facts, and draw order come from saved workflow data. A model never
gets authority to rename or replace them.

## Writing rules

The final writing call receives the complete approved plan and writes the report in one pass.

For every paid position:

1. Describe a concrete, accurate feature of the Rider-Waite card.
2. Explain what that feature suggests in this exact position.
3. Let the private birth profile narrow or alter the interpretation.
4. Connect it to the question and the other cards.
5. Give a practical implication where the position supports one.

The report names the Life Path number and its fixed archetype in a dedicated recognition section.
This is the primary customer-facing foundation. Its strengths and pressure patterns should be stated
in familiar language before they are applied to the question. Expression and Personality labels,
numbers, calculations, canon passages, and evidence IDs remain private.

The personal card is visible but subordinate. It explains how the Life Path may approach choices and
commitments; it does not rename the customer or replace a drawn card. For a Life Path 4 customer with
The Lovers, the reading remains about **The Builder**. The Lovers may add conscious choice, alignment,
reciprocity, and shared responsibility. It must not convert the reading into romance, caregiving, or
a vague relational identity.

## Specificity gate

The report does not pass merely because it is polished or emotionally warm. The grader must answer:

> How did the private birth profile materially change this card's interpretation?

Each paid position must do at least one of these:

- narrow a card's broad meaning to a specific pattern;
- reveal a tension between the buyer's natural strength and familiar avoidance;
- change how an earlier card should be understood;
- produce a question-specific choice or next step;
- explain why this card has a different implication for this buyer.

Reject the report when:

- removing the cited canon synthesis would leave substantially the same interpretation;
- numbers appear only as personality adjectives;
- several sections repeat one profile trait;
- a section could be pasted into a different question unchanged;
- the conclusion retreats into broad phrases such as “trust yourself,” “find balance,” or “embrace
  your journey” without explaining what that means here;
- the writer changes a saved card, position, orientation, or count;
- the report claims certainty about another person's thoughts or promises an outcome.

The final conclusion must answer the original question, identify the central tension shown by the
combined reading, and state what the buyer can do with that understanding.

## n8n stages

### Stage 1 — manual test

Update the current manual input node to collect `question`, `spreadType`, `fullBirthName`, and
`dateOfBirth`. Then add:

1. calculation and test-fixture validation;
2. exact canon retrieval and cited private synthesis;
3. independent card preparation;
4. whole-spread plan generation;
5. one complete report-writing pass;
6. specificity and structural grading;
7. PDF rendering and manual download.

Use fictional birth details for recorded tests. Test at least two different profiles against the
same question and exact same fixed face-up cards. The reports should differ in reasoning and
recommendations, not merely in names or adjectives.

Also test one profile against two spread sizes. Card count, paid-section count, and plan count must
remain derived from the spread.

### Stage 2 — Supabase and paid fulfillment

After the Stage 1 reports pass editorial review:

1. store validated birth intake privately;
2. calculate numerology server-side with the shared engine;
3. retrieve and persist the exact canon version, keys, calculated facts, and cited synthesis in the immutable order snapshot;
4. load or save the buyer-specific draw atomically;
5. save the private synthesis, spread plan, candidates, grader verdict, and accepted report version;
6. render and store the private PDF;
7. reuse the accepted report and identical draw/profile for purchased audio;
8. keep birth details and reading content out of analytics and payment metadata.

Retries must reuse the same order snapshot, calculation version, cards, plan inputs, and accepted
artifact. A retry must never recalculate under a newer method or redraw the cards silently.

## Acceptance tests

- [ ] The existing engine and Stage 1 calculate identical numbers for approved fixtures.
- [x] The editorial canon compiles to exactly 33 entries and 264 stable passages; every entry contains 500–800 prose words.
- [x] Every private synthesis claim cites an existing passage in the saved canon version; deterministic validation and execution `30684` passed.
- [x] Unsupported preserved number 33 fails before generation rather than falling back to a generic meaning.
- [ ] Same birth name and date always produce the same saved numerology facts under one method version.
- [ ] Same question and edition retain the fixed face-up cards across buyers.
- [ ] Different buyers receive independently saved face-down draws.
- [ ] Two different birth profiles applied to the same cards produce materially different reasoning.
- [ ] Each paid position records a non-generic `numerologyEffect`.
- [x] The final writer preserves every saved structural fact in the six-card Stage 1 run.
- [x] The report gates reject missing structure, private-machinery leakage, unsupported private claims, and reports below the configured private/customer score thresholds.
- [ ] Six-card and non-six-card fixtures generate the exact required number of planned and written sections.
- [ ] PDF and audio use the same accepted report, draw, and profile snapshot.
- [x] The recorded Stage 1 run used only the manually supplied test profile and made no Supabase, payment, customer-delivery, or audio request.
- [x] Stage 2 remains inactive until private-data handling, schema, payment verification, and delivery are tested.

## Decisions still required before production

- What “full birth name” means in customer-facing language and how to handle changed/adopted names.
- Supported scripts, accents, hyphens, apostrophes, and transliteration policy.
- The unresolved master-number 33 mapping if a visible personal tarot card remains part of the offer.
- Whether the final report ever names the calculated numbers or keeps them entirely behind Marcus's reading.
- Retention and deletion rules for full birth name and date of birth.
