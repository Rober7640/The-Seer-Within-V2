# Marcus numerology canon

Status: compiled and connected to the inactive Stage 1 workflow for technical testing. The prose
must still be approved before production use.

## Why this exists

The workflow should not ask a model to invent what Life Path 4, Expression 6, or Personality 1
means every time a customer buys a reading. That makes the interpretation drift from one execution
to the next and encourages generic personality language.

This directory holds one reusable interpretation for every number the current calculator can
return for the three approved roles:

- **Life Path:** 1–9, 11, 22
- **Expression:** 1–9, 11, 22
- **Personality:** 1–9, 11, 22

That is 33 entries. Every entry is 500–800 words and is divided into stable, addressable passages.
The workflow calculates three numbers, retrieves three approved entries, and combines them for the
customer's question. It does not regenerate the underlying numerology meanings.

The current engine reduces 10 to 1, so there is no Number 10 entry. It can also preserve 33, but 33
is outside this approved set. A 33 result must fail closed until its meaning, calculation treatment,
and personal-card behavior are explicitly approved.

## Source files

- [Life Path canon](life-path.md)
- [Expression canon](expression.md)
- [Personality canon](personality.md)
- [Combination and evidence rules](COMBINATION-RULES.md)
- [n8n integration plan](N8N-INTEGRATION.md)
- [Entry shape](ENTRY-SHAPE.md)
- [Worked 4/6/1 higher-calling synthesis](profile-4-6-1-higher-calling.example.json)

Markdown is the editorial source of truth. The included build step compiles the entries into a
versioned JSON artifact for local tests and future Supabase rows. Generated JSON must never become
the place where copy is edited.

Compile and validate all entries with:

```sh
node improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/numerology-canon/compile-canon.cjs
```

Retrieve the exact three-entry pack for the current 4/6/1 test profile with:

```sh
node improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/numerology-canon/select-canon.cjs 4 6 1
```

The compiler creates `marcus-numerology-canon-v1.json`. It validates all 33 keys, all 264 stable
passages, and the 500–800 prose-word boundary before writing the runtime artifact.

## What each number means in its role

The same number cannot be copied unchanged across all three files.

| Role | The question it answers | It must not be treated as |
|---|---|---|
| Life Path | What kind of development or recurring curriculum may organize the person's longer direction? | A job title, fixed destiny, or complete personality |
| Expression | How may this person use abilities, communicate, decide, and contribute? | A guarantee of talent, success, or vocation |
| Personality | What outward style or social strategy may other people meet first? | The person's inner motive or private emotional truth |

The entries are hypotheses within the product's numerology method. They are not evidence that an
event occurred or that the customer behaves in one fixed way.

## Runtime use

```text
validated birth name + date of birth
                  |
                  v
shared server calculation
                  |
                  v
LP, Expression, Personality numbers + method version
                  |
                  v
retrieve three exact canon entries + canon version
                  |
                  v
build an evidence-backed private synthesis for this question
                  |
                  v
map distinct supported tensions to the complete tarot spread
                  |
                  v
write, grade, render
```

The private synthesis may be generated for each customer because the combination and question are
specific. The three source readings are fixed. Every synthesis claim must cite one or more passage
IDs from these files, such as `LP4.PRESSURE` or `EX6.CONTRIBUTION`.

## Required saved snapshot

The order/report snapshot must save:

```json
{
  "numerologyMethodVersion": "pythagorean-profile-v2",
  "canonVersion": "marcus-numerology-canon-v1",
  "numbers": {
    "lifePath": 4,
    "expression": 6,
    "personality": 1
  },
  "canonKeys": ["LP4", "EX6", "PE1"],
  "synthesisClaims": [
    {
      "claim": "A supported, question-specific working hypothesis.",
      "support": ["LP4.CHOICE", "EX6.PRESSURE"],
      "confidence": "pair-inference"
    }
  ]
}
```

Retries must reuse this snapshot. A later canon edit must not silently alter an existing order.

## Editorial acceptance

Before the canon is connected to n8n:

- [ ] All 33 entries contain 500–800 words excluding headings and the word-count line.
- [ ] Every required passage ID occurs exactly once in its entry.
- [ ] The role-specific files do materially different work.
- [ ] No entry asserts a buyer's biography, diagnosis, future event, or another person's motive.
- [ ] Strength and pressure expressions are both concrete enough to recognize and reject.
- [ ] Reality checks include disconfirming questions, not leading questions that always fit.
- [ ] No number is assigned a tarot card inside the canon.
- [ ] Combination tests cover repeated numbers, conflicting numbers, master numbers, and three
      different profiles applied to the same question and spread.
- [ ] A reader-facing report never exposes the passage IDs or presents the canon as proof.

## Connection status

The inactive 37-node Stage 1 cloud workflow now uses exact canon retrieval and evidence-backed
synthesis. A separate `life-path-recognition.json` file supplies the fixed customer-facing archetype,
four plain strengths, three growth edges, and core description for each supported Life Path. Life
Path is the visible primary anchor; Expression and Personality influence the reading privately, and
the personal tarot card remains subordinate. Execution `30694` selected `LP4`, `EX6`, and `PE1`,
named Life Path 4 as **The Builder**, passed the synthesis and both report grades on its first
candidate, and produced a graded 1.21 MB PDF. This proves the technical path; it does not approve the 33 source
readings or authorize production activation.
