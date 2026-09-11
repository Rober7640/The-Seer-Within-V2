# n8n integration for the reusable canon

This design is implemented in the inactive Marcus Stage 1 workflow. Its technical integration has
passed a live manual test; the canon prose still requires editorial approval before production use.
This does not authorize activation or production fulfillment.

## Stage 1 source

`build-numerology-workflow.py` loads `marcus-numerology-canon-v1.json` while generating the
workflow JSON. The generated calculation/selection node may contain the compiled entries as static
workflow data for manual tests. It selects exactly three records by role and calculated number.

Do not paste the editorial prose into prompts by hand. The Markdown files remain authoritative and
the compiler must run before the workflow JSON is regenerated.

## Production source

Stage 2 should store compiled entries in a read-only, versioned Supabase table or a versioned server
artifact. A row needs:

- `canon_version`
- `canon_key`
- `role`
- `number`
- `word_count`
- `sections_json`
- `content_hash`
- `status`

Only an approved immutable version can be attached to an order. Editing copy creates a new version;
it does not mutate the version already cited by a paid report.

## Node changes

```text
validated manual/order input
        |
        v
calculate LP / Expression / Personality
        |
        v
select LPn / EXn / PEn from approved canon
        |
        v
validate role, number, version, word count, 24 passage IDs
        |
        v
generate 3–6 question-specific synthesis claims with citations
        |
        v
validate every citation exists in the selected entries
        |
        v
private support grader checks claim against cited passage text
        |
        v
whole-spread tarot planner assigns one supported claim per position
        |
        v
strip numbers, canon prose, IDs and confidence labels
        |
        v
Marcus writer -> structural gate -> customer-view grader -> PDF
```

The former private planner did two jobs: it invented the numerology profile and planned the cards.
The implemented flow splits those jobs. The first model call synthesizes only from the selected
canon, and an independent grader checks that synthesis. The second model plans the tarot spread
from the accepted synthesis. A weak numerology inference therefore fails before it can shape the
cards.

## Synthesis output contract

Each of at most six claims must contain:

```json
{
  "claim": "A concrete question-specific working hypothesis.",
  "support": ["LP4.CHOICE", "EX6.PRESSURE"],
  "confidence": "pair-inference",
  "questionRelevance": "central",
  "disconfirmation": "An observable condition that would make this a poor fit."
}
```

Allowed confidence values are `direct`, `reinforced`, and `pair-inference`. Allowed relevance values
are `central` and `supporting`. The validator rejects unknown IDs, an ID from an unselected entry,
duplicate claims, missing disconfirmation, unsupported numbers, and more claims than spread
positions.

## Prompt boundaries

The synthesis model receives the exact question and the three selected canon entries. It does not
receive tarot cards. This prevents the model from quietly changing a number's meaning to fit a card.

The tarot planner receives the accepted synthesis, all cards, positions, email meanings, and the
exact question. It may select a claim for a position but may not add a new numerology claim.

The Marcus writer receives reader-facing interpretations with the internal machinery removed. It
does not receive raw birth name, date of birth, canon prose, passage IDs, confidence labels, or
number labels. The private grader receives the full evidence chain. The customer-view grader sees
only what the buyer will see.

## Cost and consistency

This design removes per-order generation of three base readings. One customer-specific synthesis is
still needed because 11 × 11 × 11 possible role combinations interact differently with the question.
The synthesis is shorter and auditable: it selects and combines approved material instead of
recreating numerology doctrine.

## Required tests before another report render

- [x] 4/6/1 selects only `LP4`, `EX6`, and `PE1` from canon v1.
- [x] The same inputs always select byte-identical entries through version and content-hash checks.
- [x] 33 and any absent number fail before an OpenAI node.
- [x] A fabricated passage ID fails the deterministic evidence validator.
- [ ] A deliberately injected, syntactically valid but semantically unsupported claim fails the private grader. Live execution `30691` proves the passing path, not this negative case.
- [ ] Repeated numbers retain separate role entries and do not collapse into one meaning.
- [ ] Two profiles applied to one fixed spread produce distinct supported claims while preserving
      every saved card and position.
- [x] Writer and customer-view grader payloads contain no birth data, canon IDs, or number labels.
- [ ] Retry uses the saved canon version, keys, synthesis, and cards.
