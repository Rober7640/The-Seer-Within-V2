# Tea-leaf reading — what the practice actually is, and what it means for the lander

Researched 2026-08-31, after the operator flagged that our first tea strip showed
symbols far too clearly to be believable.

**The operator was right, and the reason is stronger than "it looks fake".**

---

## 1. The ambiguity IS the practice

> **"Tea leaf reading is very much like a Rorschach (Ink Blot) Test."**
> — [tasseography.com](https://tasseography.com/)

> **"One person may see an egg, while another sees a beetle in the same spot."**

Tasseography is pattern recognition against a deliberately unclear field. The reader's
value is *seeing something in the mess*. A cup with an unmistakable heart in it is not a
reading — it is a logo with tea on it.

The interpretation is explicitly personal: *"translating symbols into meaning is just as
personal and subjective as their identification, with individual language, cultural
exposure, experience, knowledge and mental state contributing."*

---

## 2. Why this matters commercially, not just for authenticity

**If she can see the heart herself, she does not need the seer.** Our first strip handed
away the entire reveal on the lander, before Evelyn said a word.

It also quietly corrupted the panel split. With a visible heart, a bird and a road, she
does not pick on instinct — she picks the symbol she *wants*. Self-selection on the
symbol means the three readings never get a fair comparison, and the "she chose it"
framing is untrue.

With genuine scatter, the tap is instinct, and beat 1 stops being a caption and becomes
the payoff:

> *"There's a bird in yours. Wings out, up near the rim, on the far side from the handle."*

Against an obvious bird that line is redundant. Against scattered leaves it is Evelyn
seeing what she could not.

---

## 3. Reading conventions worth using

| Convention | Source | Status in our build |
|---|---|---|
| Read **from the handle, clockwise**. No handle → start at 12 o'clock | Centre of Excellence, Celesian | ⬜ unused — we use handle = her, but not the sweep |
| **Rim = the present and near future.** Moving down the inside toward the base goes further into the future — *or deeper into the past and the subconscious* | Celesian | ◐ partly used. We had "middle = far off or foundational"; the subconscious reading is richer and unused |
| **Clusters mark the most important theme** — "a gathering of energy, a situation with many moving parts" | Celesian | ⬜ unused. A ready-made way to point at one spot without inventing anything |
| Set an intention before drinking; swirl three times, invert on the saucer | Centre of Excellence | n/a — she is not making the cup |

The handle-clockwise sweep and the cluster rule are the two most useful unclaimed pieces.
Both give the reading something true to say about *where* a thing sits, which is the half
that makes a read feel earned.

---

## 4. What we changed as a result

1. **The three cups are re-shot as genuine scatter.** Real leaf distribution, no legible
   symbol. They differ in texture and density, not in what they depict — she cannot pick
   "the heart" because no heart is visible.
2. **Each cup gains a REVEAL image**: the same photograph with the region RINGED,
   the way the operator's own reference photo had seven formations ringed by a reader.

   🔴 **Ringed, not traced — and the first attempt got this wrong.** It drew a gold
   gull outline, which failed twice over: the line floated across bare porcelain,
   and a drawn bird hands her the answer as a graphic, which is the same mistake as
   the obvious-symbol cups it was meant to fix. Nothing inside the reference photo's
   red rings is inherently a bird or an anchor either. **The circle says look here;
   the seeing stays hers.** The copy supplies the bird, the ring supplies the where.

   The rings must sit on leaf that is genuinely present. Ringing empty porcelain is
   worse than the obvious version, because it asks her to see nothing. Re-check the
   coordinates in `scripts/trace-tea-reveals.mjs` after any re-shoot — the leaves
   land somewhere new every time, and a stale ring is the one unrecoverable fault.
3. **The reveal is attached to beat 1 in the chat**, so she is looking at the traced cup
   while Evelyn names it. The plumbing already exists — `/fb-tarot` attaches card art to
   its opener the same way, and the house copy rule requires the art be in front of her.
4. **Copy unchanged.** All 42 tea bubbles stand. They become reveals rather than captions.

### This is tea-specific

`dream` and `candle` are deliberately NOT changed. Their signs are meant to be seen: she
*recognises* her own recurring dream, and a leaning flame is a visible sign, not a hidden
one. Only tasseography claims to find what a layperson cannot.

---

## What the re-shoot actually produced

The generation brief carried a two-part test: a stranger must NOT be able to name the
shape, and someone TOLD what to look for must be able to find it.

**Part one passed on all three cups. Part two failed on all three** — no planted shape
survived the scatter. That turned out to be the right outcome, and the test was wrong:
demanding a findable-but-not-obvious shape asks a model to thread a needle it cannot
reliably thread, and it is not what a real cup does either. The ring resolves it. All
that is needed is leaf in the right REGION, which every cup has.

The three cups now differ by density and texture — one moderate, one sparse and
rim-weighted, one heavy toward the base — so the choice still feels real without any of
them announcing a symbol.

## Sources

- [Tasseography.com](https://tasseography.com/) — the Rorschach comparison, subjectivity of interpretation
- [Centre of Excellence — A Step-by-Step Guide to Reading Tea Leaves](https://www.centreofexcellence.com/how-to-read-tea-leaves/) — method, handle-clockwise convention
- [Celesian — Tea Leaf Reading: A Beginner's Guide](https://www.celesian.com/blog/tea-leaf-reading-tasseography-beginners-guide) — spatial time mapping, clusters
- [Harney — Tasseography Symbols & Meanings](https://www.harney.com/blogs/news/tasseography) — symbol vocabulary
- [Plum Deluxe — Tea Leaf Reading Symbols](https://www.plumdeluxe.com/blogs/blog/tea-leaf-reading-symbols) — symbol vocabulary
