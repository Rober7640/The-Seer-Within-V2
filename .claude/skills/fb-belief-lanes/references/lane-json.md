# The lane JSON

One file per lane: `improve-v1/belief-lanes/lanes/<n>-<name>.json`. It is the only copy source.
`render_lanes.py` builds the review page and the lane doc from it. At wiring time, the registry
entry is made from it too. Edit the JSON, then re-render. Never edit the outputs.

Worked examples: `1-manifestation.json` and `4-astrology.json`.

```json
{
  "id": "manifest",                 // the ?lane= value: short, lowercase, never renamed once live
  "num": 1,                         // the README lanes table number
  "name": "Manifestation",
  "link": "/fb?lane=manifest",
  "status": "Complete copy, awaiting approval",
  "belief": "One sentence: what's really going on, in this lane's terms",
  "words": ["Finding with numbers, e.g. 'Of 70 buyer lines, ~4 said manifest, most said attract'"],
  "keywords": [{"role": "Main", "words": "manifest, manifesting, manifested"}],
  "kw": [{"key": "manifest", "label": "manifest / manifesting", "regex": "\\bmanifest\\w*", "target": "6–8", "lo": 6, "hi": 8}],
  "card": {
    "v2": {"h": "headline 1 (recommended, or the operator's choice)", "alts": ["headline 2", "headline 3"], "why": "what each angle bets on",
           "s": "sub-line", "b": "button", "sc": "line under the button", "chosen": "2026-11-18 (only once the operator picks)"}
  },
  "parked": {"note": "optional: copy kept for later, never rendered or checked", "card_v1": {}},
  "meta": {"title": "…", "desc": "…", "alt": "…"},
  "body": [
    {"t": "h", "text": "Section heading"},
    {"t": "p", "text": "Paragraph"},
    {"t": "list", "lead": "You've done the work.", "items": ["…"], "closer": "optional line after the items"},
    {"t": "faq", "items": [{"q": "…", "a": "…"}]},
    {"t": "ask"}
  ],
  "chat": [{"who": "e", "text": "Evelyn line"}, {"who": "me", "text": "{her first name}"}, {"who": "q", "text": "Evelyn's first question"}],
  "chatnote": "What her answer gives the later chat",
  "directive": "3–5 sentences for the later chat steps",
  "notes": ["Reviewer notes: bends, placeholders, why a line is there"],
  "open": ["Decisions that are the operator's"]
}
```

## Field notes

- **`words`, `keywords`**: the stage 1 result. A reviewer should be able to see why each keyword
  was chosen without re-running anything. Add a "Keep out" row whenever the lane has tempting
  words that must stay off the page (pattern and family do: trauma, heal, attachment style). It's
  what stops the next writer adding them back in.
- **`kw`**: the regexes count over the below-card copy only (not the card or the chat).
  Put longer phrases first so "law of attraction" isn't also counted as "attract". The `lo` and
  `hi` range comes from the budgets in `01-keyword-placement.md`.
- **`card`**: only the four spots on the live `/fb` card. Everything else on the card (avatar,
  status, trust row, footer) is fixed and is not data. Since 2026-11-18 a lane has one card,
  `v2` (today's `/fb` style). Version 1 (her words) is parked: don't write it unless the operator
  brings it back.
- **Headlines**: always three, `h` plus two in `alts`, for the operator to choose from. They
  share the sub-line and button, so each must read right above them. Until the operator picks,
  `h` is the writer's recommendation; after, `h` is the operator's choice and `chosen` holds the
  date. The checker voice-checks all three and fails a lane without exactly three.
- **`parked`**: copy kept for later (an old `card.v1`, say). The renderer ignores it, so it is
  never shown or checked. Don't move anything out of `parked` without the operator asking.
- **`body`**: the order is the page order. Every `h` heading carries a keyword phrase worded the
  way she'd ask it. The `When you send your first name` block (free chat + the honest letter
  line) is repeated in each lane on purpose, so every lane file stands alone.
- **`ask`**: carries no text. It repeats the card's button and the line under it, taken from
  `card.v2`.
- There is no `slot` block. Per-ad story lines and the `?ad=` key were dropped on 2026-11-18:
  every ad in a lane links to the same `/fb?lane=<id>`, so one-ad wording stays in the ad. The
  renderer fails a lane that still has one.
- **`chat`**: the six beats in `02-chat-openers.md`. `{Name}` is replaced with her first name.
  `me` is her reply. `q` marks the first question.
- **`directive`**: what the later chat steps are told so the lane doesn't vanish after the opener
  (see `references/wiring.md`, laneDirective). Cover:
  - where she came from;
  - her words to reuse;
  - the lane's belief;
  - what Evelyn never does in this lane.

  It's given to the model, not shown to her, but it follows the voice rules anyway, because the
  model echoes what it's given.
- **`open`**: the operator's decisions only. Funnel-wide ones (D1–D4) stay in the README; don't
  repeat them per lane.
