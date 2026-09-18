# Combining three canonical readings

The runtime receives one approved Life Path entry, one Expression entry, and one Personality entry.
Its job is to form a narrow working hypothesis for the customer's exact question. It must not write
a fourth generic numerology reading.

## Role order

Use the three roles in this order:

1. **Life Path sets the developmental direction.** It suggests the kind of recurring problem or
   capacity through which longer growth may occur.
2. **Expression describes the available instrument.** It suggests how the person may act,
   communicate, build, decide, or contribute while meeting that direction.
3. **Personality describes the visible interface.** It suggests what other people may see first and
   what social presentation may protect or obscure.

This order prevents Personality from being mistaken for inner truth and prevents Expression from
being turned into a promised career.

## Evidence classes

Every private synthesis claim has one of three confidence labels:

| Label | Support required | Permitted use |
|---|---|---|
| `direct` | One canon passage states the pattern in the correct role | A possible trait or behavior to test against a card |
| `reinforced` | Two or three roles independently support the same pattern | A central strength or pressure pattern, still phrased as a hypothesis |
| `pair-inference` | Two passages create a specific tension or complement | A question-specific distinction, choice, or conflict |

No other class is allowed. A claim with no cited passage IDs is discarded before tarot planning.

## How to combine

### Reinforcement

When two roles support the same behavior, describe the amplification and its cost. Do not simply say
the person is “very” independent, sensitive, practical, or expressive.

Example:

```json
{
  "claim": "Taking responsibility may feel natural enough that asking who actually owns the problem is delayed.",
  "support": ["LP6.CONTRIBUTION", "EX6.PRESSURE"],
  "confidence": "reinforced"
}
```

### Tension

When roles pull in different directions, name the decision pressure between them. A useful tension
contains two legitimate needs. It does not make one number mature and another defective.

Example for Life Path 4 and Expression 5:

```json
{
  "claim": "A durable result may matter, while the method used to reach it needs room to change; the real choice may be which structure protects movement instead of stopping it.",
  "support": ["LP4.DIRECTION", "EX5.CHOICE"],
  "confidence": "pair-inference"
}
```

### Visible mismatch

Personality can differ from Life Path or Expression. Describe the possible mismatch between what is
seen and what is being developed or used. Never claim the customer is hiding, masking, or deceiving
unless the question and cards independently carry that conclusion.

Example:

```json
{
  "claim": "Others may meet decisiveness first even when the private task requires patient construction, which can make an unfinished process look more settled than it feels.",
  "support": ["PE1.STYLE", "LP4.DIRECTION"],
  "confidence": "pair-inference"
}
```

### Repeated numbers

If the same number appears in more than one role, retrieve the role-specific passages from both
files. Do not collapse them into one interpretation. State how the shared theme operates in two
different places and identify the risk created by that reinforcement.

### Master numbers

11 and 22 are not ranked above other numbers. Treat them as wider ranges of pressure and capacity.
The private synthesis should prefer the ordinary, observable expression before a grand claim. A
Number 22 passage cannot justify calling someone a master builder; a Number 11 passage cannot prove
intuition, spiritual authority, or unusual perception.

## Question filter

Before any claim reaches the tarot planner, label its relationship to the exact question:

- `central`: directly changes how the question can be answered;
- `supporting`: explains a choice, obstacle, or resource in the question;
- `irrelevant`: true to the canon but unnecessary here.

Discard `irrelevant` claims. Keep at most six synthesis claims for a six-card spread and never more
than one primary claim per position. A longer spread may reuse a claim only when the second use
advances it through a different card and position.

## Tarot mapping

The cards are drawn independently. For each position, the planner must record:

```json
{
  "positionNumber": 3,
  "cardName": "Ten of Cups",
  "cardFact": "A family group stands beneath an arc of ten cups.",
  "canonClaim": "A supported private hypothesis.",
  "canonSupport": ["LP4.RELATIONSHIPS", "EX6.CONTRIBUTION"],
  "cardMeaningSelected": "The image is being used here to examine shared definitions of a good life.",
  "questionEffect": "How this narrows the answer to the customer's exact question.",
  "testablePrompt": "A question that could be answered no as well as yes.",
  "practicalImplication": "A proportionate next step supported by this position."
}
```

The `cardFact` supports the tarot interpretation. `canonSupport` supports the personal lens. Neither
source is allowed to prove the other.

## Synthesis prohibitions

Reject a private synthesis that:

- introduces a numerology meaning absent from the retrieved entries;
- cites the wrong role or a passage that does not carry the claim;
- turns a possible pressure pattern into a past event;
- assigns a job, relationship history, family role, diagnosis, or motive as fact;
- uses an impressive label in place of observable behavior;
- gives every card the same number theme;
- forces all three roles into every position;
- treats the numerology as the reason a tarot card was drawn;
- exposes passage IDs or internal confidence labels in customer copy.

## Private synthesis gate

An independent grader receives the three canon entries, the cited synthesis, the question, and the
spread plan. It checks each claim by exact passage ID. The report cannot proceed when any primary
claim is unsupported, when the role is misused, or when removing the canon would leave the same
interpretation.
