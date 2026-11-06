# 11-E5 — Image briefs *(the letter's four images)*

For [`11-E2`](11-E2-esl.md). One new image, three cards as they are.

**Operator, 2026-11-02:** Judgement is shown as the FULL card. The crop below is retired. Hero made, at `img/hero-unsent-letter.jpg`, not yet uploaded.

| ID | What | Source | Display | S3 key |
|---|---|---|---|---|
| `IMG-1` | Hero: three face-down cards + sealed envelope | **New**, generate | 540px wide | `evelyn/backend-11/hero-unsent-letter.jpg` *(proposed)* |
| `IMG-2` | The Hermit | Existing card, whole | 240px wide | `evelyn/tarot-rws/the-hermit.jpg` (live, checked) |
| `IMG-3` | Judgement, full card | Existing card, whole | 240px wide | `evelyn/tarot-rws/judgement.jpg` (live, checked) |
| `IMG-4` | The Devil | Existing card, whole | 240px wide | `evelyn/tarot-rws/the-devil.jpg` (live, checked) |

⛔ Never write to `evelyn/tarot/`. It serves live broadcasts, and `host-be-asset.cjs` refuses it.

---

## IMG-1 — hero

**What she sees:** the moment before Evelyn turned them. Three cards she hasn't seen, and a letter she hasn't got yet.

**Brief**

- Shot straight down from above, on a real table.
- Three tarot cards lying **face-down**, side by side, on dark cloth. Plain dark backs, no pattern that reads as a logo.
- One **sealed, blank** envelope beside them. Old cream paper, flap closed.
- Low, warm light from one side, as from a single lamp. Quiet, late at night.
- Landscape, 3:2. Make it 1080×720, shown at 540.
- Photo, not illustration. Real cloth weave, real paper grain.

**⛔ Reject it if**

- Any card is face-up or tilted so a face shows. That spoils the three cards.
- Anything is written on the envelope: no name, address, stamp, postmark or crest. It's the letter she hasn't got.
- There's text anywhere, including fake writing on the cloth or the card backs.
- There are hands, candles, crystals or skulls. It has to read as a table, not a set.
- A wax seal makes it look like a wedding invitation. A plain closed flap is safest.

**Why it isn't 02's hero:** 02 is three face-down cards alone. The envelope is the difference.

**Alt text:** Three tarot cards lying face-down on dark cloth, with one sealed, blank envelope beside them.

**How:** `codex exec`, one image per call. Upload with `host-be-asset.cjs file <path> evelyn/backend-11/hero-unsent-letter.jpg`.

---

## IMG-2 — the Hermit

**Whole card, unchanged.** Matches the letter: grey cloak, staff, lantern with a star inside, snowy peak.

**Alt text:** The Hermit card: an old man in a grey cloak on a snowy peak, holding up a lantern with a star of light inside it.

⚠ `0-WORKFLOW` says source cards are 350×600. This one is 408×700. Set the width in the email, so it shows at 240px like the others.

---

## IMG-3 — Judgement *(crop retired 2026-11-02, kept for the reasoning)*

**Why:** the card shows people rising out of open coffins. This list can't be filtered for widows (11-A). The angel and the raised arms show. The coffins do not.

**The crop**

| | |
|---|---|
| **Source** | `evelyn/tarot-rws/judgement.jpg`, 350×600 |
| **Box** | left 16, top 16, right 334, **bottom 388** (px from top-left) |
| **Output** | 318×372, no resizing |
| **Keeps** | the angel, trumpet, flag, mountains, and the people's heads and raised arms |
| **Loses** | every coffin, the card's outer border, and the JUDGEMENT name band |

**⛔ The bottom edge is 388, and it can't go lower.** I checked by eye against a ruled zoom of the card. The far coffin's striped side starts at about y=392, in the gap right of the far figures, and it's easy to miss at full size. A crop to y=412, which looks clean at a glance, has it. The nearer coffins start around y=405–435. Lower than 390 also brings in the far figures' bare chests.

**A checked copy of this exact crop:** `/private/tmp/claude-501/-Users-joel-Library-CloudStorage-OneDrive-altius-Fun-Projects-The-Seer-Within-V2-Production-joel-chue-The-Seer-Within-V2-Production/e599f78d-758e-424c-a41a-e5f04468d819/scratchpad/cards/judgement-crop-388.png`. It's a temp file, so cut it again from the box above. Save as JPEG at high quality.

**Rules**

- The crop must be a real file. Don't crop with CSS: email clients strip it, and the coffins come back.
- *(Retired: the operator chose the full card.)*
- Don't overwrite that key: other emails use it. The crop gets its own key.
- Don't upscale it. At 240px it's fine.
- ⚠ The name band is gone, so the card's name comes from the heading above it ("Your second card: Judgement"). That heading must stay right above the image.
- The copy already fits: "An angel in the clouds, blowing a long trumpet. Below, people rising with their arms up, every face turned to the sound."

**Alt text:** The Judgement card: an angel in the clouds blowing a long trumpet, and people below raising their arms toward the sound.

⛔ No coffins or graves in alt text, file names or build notes that reach the send.

---

## IMG-4 — the Devil

**Whole card, unchanged.** The letter needs the loose chains, so it needs the two figures.

**Alt text:** The Devil card: a horned figure squatting on a black block, with a man and a woman below, loose chains around their necks.

⚠ **For the operator.** The two figures are nude, as on the standard card, and this one fills the frame. A crop can't lose that and keep the chains around their necks. I've left it whole. It's the same deck 02 uses, but check it renders fine in a seed send.

---

## Placement

As marked in `11-E2`: `IMG-1` under the deck. `IMG-2/3/4` each only at its own card, under its heading. Never two on screen together.
