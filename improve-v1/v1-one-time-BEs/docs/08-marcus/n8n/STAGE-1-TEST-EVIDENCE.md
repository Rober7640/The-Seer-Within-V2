# 08 Marcus — Stage 1 cloud execution evidence

Date: 2026-09-11. Workflow: [08 Marcus — Numerology-Anchored Stage 1 / Stage 2 Parked](https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg).

## Daily-email to ten-card report continuity

Execution [`30700`](https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg/executions/30700)
tested the full path from the new **What are my blind spots?** daily edition into a buyer-specific
Tree of Life report for **Hng Ye Ying**, born 16 March 1986.

| Field | Result |
|---|---|
| Status | Success in 154.321 seconds |
| Spread | Tree of Life — 3 fixed face up / 7 buyer-specific face down |
| Fixed email cards | The Moon · Two of Swords · Three of Pentacles |
| Buyer draw | Seven of Pentacles · Ace of Wands · King of Wands · The Hierophant · Queen of Wands · Knight of Cups · The Hanged Man |
| Customer-visible foundation | Life Path 7 · The Seeker |
| Private canon | `LP7`, `EX6`, `PE1`; evidence synthesis passed all five dimensions at 9/10 |
| Personal card | The Lovers, used as a secondary choice-and-commitment lens |
| Private report grade | 9–10/10 across all eight dimensions; 10/10 for question specificity, Life Path recognition, claim support, card fidelity, continuity, and Marcus voice |
| Customer grade | Every applicable dimension 5/5; 40 sound, 0 invented, 0 unsupported claims |
| Rewrite | Not needed; passed on candidate one |
| PDF | `marcus-stage1-ye-ying-numerology-tree_of_life.pdf`, 1.92 MB |

The first ten-card attempt, execution `30699`, reached the writer but returned truncated JSON because
the six-card output budget did not leave enough room for ten full position sections. The writer and
rewrite budgets now scale above six positions: 7,000 tokens for six cards, 14,000 for ten, and
17,500 for twelve, capped at 18,000. The workflow contract test checks the six-card and ten-card
budgets. Execution `30700` proves the ten-card path now completes through both graders and PDFShift.

The accepted report preserved the physical evidence and argument of all three daily-email cards.
It then used the independently drawn seven cards to identify three central blind spots: staying in
private analysis too long, carrying responsibility without showing limits, and appearing more
self-sufficient than the buyer may feel. Stage 1 remained inactive and made no Supabase, payment,
delivery, AWeber, or audio request.

## Second-profile passing execution

Execution `30695` tested the same higher-calling edition with **Hng Ye Ying**, born 16 March 1986.
The deterministic calculation returned Life Path 7, Expression 6, Personality 1, Birthday 7, Soul
Urge 5, and Maturity 4. The visible recognition section named **Life Path 7 · The Seeker**;
Expression 6 and Personality 1 influenced the private synthesis without appearing as customer-facing
number labels. The Lovers remained the separate personal-card lens.

| Field | Result |
|---|---|
| Execution | `30695` |
| Status | Success in 143.309 seconds |
| Canon | `LP7`, `EX6`, `PE1` |
| Fixed cards | The Star · Seven of Pentacles |
| Buyer draw | Eight of Swords · Five of Pentacles · The High Priestess · Ace of Cups |
| Private grade | 9–10/10 across eight dimensions; Life Path recognition 10/10 |
| Customer grade | Every applicable dimension 4–5/5; 33 sound, 0 invented, 0 unsupported claims |
| Rewrite | Not needed; passed on candidate one |
| PDF | `marcus-stage1-ye-ying-numerology-six_questions.pdf`, 1.19 MB |

## Builder-first recognition and passing execution

Execution `30693` proved that naming Life Path 4 was insufficient by itself: the report called the
buyer a Builder, then obscured the idea with phrases such as “structural stewardship” and
“conscious custodian.” The customer gate rejected it and correctly ended at `QA HOLD · NO PDF`.

The prompt hierarchy now requires:

- Life Path 4 to remain plainly **The Builder**: hardworking, practical, organized, loyal and
  dependable, with possible rigidity, overwork, control, perfectionism, or difficulty delegating;
- the personal card to remain secondary; The Lovers can add choice, values, commitment, alignment,
  or shared responsibility, but cannot turn the Builder into a romance or caregiving reading;
- ordinary verbs and concrete examples in place of invented conceptual labels;
- the customer grader to treat the supplied visible Life Path profile and defensible, card-led
  propositions as evidence while still rejecting asserted unknown biography.

| Field | Builder-first result |
|---|---|
| Execution | `30694` |
| Status | Success in 130.402 seconds |
| Final node | `26 · REPORT READY — DOWNLOAD PDF` |
| Visible foundation | `Life Path 4 · The Builder` with fixed strengths and growth edges |
| Personal card | The Lovers, explicitly subordinate to the Builder foundation |
| Cards | The Star · Seven of Pentacles · Two of Pentacles · Queen of Pentacles · The Moon · Five of Pentacles |
| Synthesis grade | Five dimensions at 9/10; no evidence issues |
| Private grade | 9–10/10 across eight dimensions; Life Path recognition 10/10 |
| Customer grade | Every applicable dimension 5/5; 34 sound, 0 invented, 0 unsupported claims |
| Rewrite | Not needed; passed on candidate one |
| PDF | `marcus-stage1-yan-wei-numerology-six_questions.pdf`, 1.21 MB |

This supersedes `30691` as the current passing baseline.

## Node-22 repair and passing execution

Execution `30688` did not hang. It failed closed at `22 · Enforce customer-view grade` after the
second candidate still contained six unsupported personal claims. The clearest fault was customer
copy that exposed an internal “saved message” label and repeated an unverified claim about “years.”

The 37-node repair makes four changes:

- writer and rewriter inputs rename the fixed email interpretation and forbid exposing workflow labels;
- unsupported biographical time spans must be converted into card-led, rejectable hypotheses;
- citation confidence is derived from citation count and role instead of trusting a model label;
- a second customer-grade rejection ends at `QA HOLD · NO PDF` with its reason and rewrite instructions.

| Field | Post-repair result |
|---|---|
| Execution | `30691` |
| Status | Success in 137.465 seconds |
| Final node | `26 · REPORT READY — DOWNLOAD PDF` |
| Canon | `marcus-numerology-canon-v1`; `LP4`, `EX6`, `PE1` |
| Synthesis grade | All five dimensions 9/10; no unsupported, generic, misused-role, or invented claims |
| Cards | The Star · Seven of Pentacles · The Emperor · Four of Swords · Eight of Wands · Nine of Cups |
| Private report grade | 10, 9, 9, 10, 10, 9, 9 across the seven dimensions |
| Customer report grade | All applicable dimensions 4–5/5; 18 sound, 10 thin, 0 invented, 0 unsupported |
| Rewrite | Not needed; passed on candidate one |
| PDF | `marcus-stage1-yan-wei-numerology-six_questions.pdf`, 1.18 MB |

This supersedes `30684` as the current passing baseline. The explicit QA-hold branch is also covered
by a local contract test, ensuring a rejected second candidate cannot reach PDFShift.

## Canon-backed passing execution

| Field | Result |
|---|---|
| Execution | `30684` |
| Status | Success in 189.802 seconds |
| Final node | `26 · REPORT READY — DOWNLOAD PDF` |
| Question | `What is my higher calling?` |
| Derived profile | Life Path 4 · Expression 6 · Personality 1 |
| Canon selection | Version `marcus-numerology-canon-v1`; exactly `LP4`, `EX6`, and `PE1` |
| Synthesis evidence grade | Citation accuracy 9 · question specificity 9 · role discipline 9 · falsifiability 9 · restraint 9; no unsupported, generic, misused-role, or invented claims |
| Personal tarot card | The Lovers |
| Fixed cards | The Star · Seven of Pentacles |
| Buyer draw | Wheel of Fortune · Ace of Swords · The Chariot · The Hierophant |
| Editorial path | The customer-view gate requested one bounded rewrite; the second candidate passed |
| Private scores | Question specificity 9 · profile effect 9 · claim support 9 · card fidelity 10 · continuity 9 · practical value 9 · Marcus voice 9 |
| Customer-view scores | Claims carried 5 · picture accuracy 5 · falsifiable claims 4 · invented specifics 5 · timing 5 · dignity 5 · structure 5 · would sign 5 |
| Customer-view counts | 24 sound · 6 thin · 0 invented · 0 invented specifics · 0 unsupported · 0 dated claims |
| Artifact | `marcus-stage1-yan-wei-numerology-six_questions.pdf` |
| n8n binary | `data`, `application/pdf`, 1.18 MB |

The flow calculated the numbers locally, selected only the matching versioned entries, and allowed
the synthesis model to see the question plus those three entries. Each synthesis claim cited exact
passage IDs and passed an independent evidence grade before any card planning occurred. The tarot
planner then bound each saved card to one approved synthesis claim. The customer writer received a
scrubbed plan: no raw birth name, birth date, canon text, evidence IDs, or private number labels.

The first canon-backed run, execution `30683`, reached PDF but exposed a weakness in the final gate:
the customer grader awarded passing scores while also listing seven unsupported personal claims.
The writer prompt was tightened and the gate now treats any listed unsupported claim as a failure.
Execution `30684` exercised that rule, took the one permitted rewrite, and finished with zero listed
unsupported claims. This is the current technical baseline. The workflow remained inactive and made
no Supabase, payment, delivery, email, or audio request.

## Numerology-anchored passing execution

| Field | Result |
|---|---|
| Execution | `30672` |
| Status | Success |
| Final node | `26 · REPORT READY — DOWNLOAD PDF` |
| Question | `What is my higher calling?` |
| Derived profile | Life Path 4 · Expression 6 · Personality 1; Birthday 4, Soul Urge 5, and Maturity 1 also calculated |
| Personal tarot card | The Lovers |
| Spread | `six_questions` — 2 fixed face up / 4 buyer-specific face down |
| Fixed cards | The Star · Seven of Pentacles, preserved from the saved daily email edition |
| Buyer draw | Ten of Cups · Six of Pentacles · Six of Cups · Temperance |
| Editorial result | Passed private-support and customer-view graders on the first candidate; no rewrite |
| Private scores | Question specificity 9 · Profile effect 9 · Claim support 9 · Card fidelity 10 · Continuity 9 · Practical value 9 · Marcus voice 9 |
| Customer-view scores | Claims carried 5 · Picture accuracy 5 · Falsifiable claims 4 · Invented specifics 5 · Timing 5 · Dignity 5 · Structure 5 · Would sign 5 |
| Customer-view counts | 40 sound · 10 thin · 0 invented · 0 invented specifics · 0 dated claims |
| Artifact | `marcus-stage1-yan-wei-numerology-six_questions.pdf` |
| n8n binary | `data`, `application/pdf`, 1.18 MB |

The accepted report included all six positions and card images, including the two positions first
seen in the email. The conclusion narrowed the calling to designing and leading a practical,
structured way for people to move from scattered pressure toward a more whole life. The
customer-view grader's remaining advisory concern was that its two example forms could still feel
too much like model-selected career forms. That weakness prompted the reusable-canon decision below.

The later [reusable canon](numerology-canon/README.md) revision now supplies 33 fixed Life Path,
Expression, and Personality entries with exact evidence passages. Execution `30672` proves the
earlier expanded flow and dual grading path; execution `30684` supersedes it as the canon-backed
technical baseline.

Raw full birth name and date of birth were used by the n8n calculation node. Only the derived
numbers, personal card, question, and spread context were included in OpenAI request bodies. The
workflow made no Supabase, payment, delivery, or audio request and remained inactive.

Execution `30666` provided earlier fail-closed evidence. The writer incorrectly used the
four paid section slots for two fixed cards and only two paid cards. The final grader rejected it.
The report schema was changed to require exact keys such as `position_3` through `position_6`, so a
writer can no longer spend a purchased-position slot on a fixed face-up card.

## Passing execution

| Field | Result |
|---|---|
| Execution | `30661` |
| Status | Success |
| Started | `2026-09-10T09:14:36.987Z` |
| Finished | `2026-09-10T09:15:20.771Z` |
| Final node | `9 · REPORT READY — DOWNLOAD PDF` |
| Test question | `What is my higher calling?` |
| Spread | `six_questions` — 2 fixed face up / 4 buyer-specific face down |
| Fictional test buyer | Maya Lewis |
| Personal card | The Hermit |
| QA | Four paid sections; saved draw bound by n8n; exact structure preserved |
| Artifact | `marcus-stage1-maya-lewis-six_questions.pdf` |
| n8n binary | `data`, `application/pdf`, 135 kB; Download button visible in final-node output |

The fixed face-up cards were Six of Cups and Queen of Swords. The buyer draw was Nine of
Pentacles, Two of Pentacles, Queen of Wands, and King of Pentacles. OpenAI supplied the prose only;
n8n attached each prose slot to the saved position and card before rendering. PDFShift returned the
file, and the final node preserved it as a named PDF binary.

No Supabase record, payment, webhook, email, customer delivery, or audio request was made. The
workflow remained inactive throughout; it was executed manually in the editor.

## Fail-closed evidence

Two earlier executions were deliberately retained as useful evidence:

- `30659` stopped at the structural gate after the writer paraphrased a canonical position label.
  The workflow was changed so structural facts now come only from the saved n8n draw.
- `30660` stopped because the writer left the synthesis/conclusion incomplete. Minimum substantive
  lengths and placeholder rejection were added before the passing execution.

Neither failed execution reached PDFShift.

## Reproduce

1. Open `2 · TEST INPUTS — EDIT ME` in the cloud workflow.
2. Set `question`, `spreadType`, `displayFirstName`, `fullBirthName`, and `dateOfBirth`.
3. Click **Execute workflow**.
4. Open `26 · REPORT READY — DOWNLOAD PDF`, select **Binary**, and download `data`.

The current supported spread types are `three`, `six_questions`, `adaptive_eight`, `tree_of_life`,
and `twelve_houses`. Stage 2 remains parked until the Supabase schema and verified payment-event
contract are approved.
