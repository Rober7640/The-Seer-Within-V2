# 07 Marcus Daily Tarot — the art

Two things: the headshot, and how a day's photographs get into an email.

## The masthead headshot

`marcus/07-headshot-v1.jpg`. Four candidates were cut, `plain` was chosen —
[`assets/07-headshot-candidates.png`](../../assets/07-headshot-candidates.png), sources at
`assets/07-headshot-{plain,hands,table}.png`.

Re-cut with `scripts/make-07-headshot.py`.

## How the photographs are wired

**Two images per email, both cut from the same picture.** That is the point — the old
`marcus/07-hero-*` and `07-down-*` were a separate shoot on a different table with a different
deck, so one email showed two decks.

| Beat | Image | Caption it has to satisfy |
|---|---|---|
| 1 · hero | `marcus/07-spread-<day>.jpg` | *The cut, this morning — N turned, M not* |
| 10 · withhold | `marcus/07-down-<day>.jpg`, a crop of the face-down cards only | *These N are still in my hand* |

⛔ **The caption states what the picture actually shows.** The hero once read *"One off the cut —
not yet turned"*, written for art showing only face-down cards. The photograph shows the free card
already turned, so the line contradicted its own picture. The replacement states the two counts the
pitch runs on.

⛔ **Every image shows the act as already done.** The hero is a photograph of cards on a real table
— evidence the cut happened. A flat graphic proves nothing. Card *artwork* is the RWS scan; a card
*on a table* is a photograph.

⛔ **Only Rider-Waite.** A reversed minor has no scan and 404s.

Rebuild and rewire with:

```
python3 scripts/optimize-07-art.py                       # photographs -> assets/email/
node improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs file <src> marcus/<key>
python3 scripts/wire-07-art.py                           # point the .html at them (idempotent)
python3 scripts/preview-07-daily.py                      # rebuild the -preview.html twins
```

⚠ Steps 3 and 4 have no targets right now — `copy/07-marcus/daily/` was cleared, so there are no
`.html` letters to wire art into until new ones are built.

💰 **The card scans are the heaviest thing left**, not the photographs. Live at
`evelyn/tarot-rws/` they run 93–132KB each for a 350×600 image shown at 200px; the same source
re-encoded is ~59KB. That is an encoder difference, not a resolution one — ⛔ do not upscale, they
are only 350px native. Worth ~670KB across a week, but that prefix may be referenced by mail
already sent, so it is an operator call, not a build step.
