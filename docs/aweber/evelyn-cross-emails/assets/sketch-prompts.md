# Evelyn — 14 sketch prompts (ready to paste)

The **style is locked** (rough amateur pencil sketch, same notebook hand every day). Only the subject changes. Paste each prompt into your image tool, export **vertical** with headroom, save as the **filename** shown, then they get optimized (<200 KB JPEG) and uploaded to `s3://luna-assets-tsw/evelyn/sketches/`.

**Two text exceptions** (days 4 & 13) deliberately keep hand-written text — noted inline.

**Locked style preamble (prepended to every subject):**
> *A rough amateur pencil sketch on plain off-white notebook paper, drawn quickly by an untrained hand. Simple naive linework, uneven and slightly wobbly strokes, proportions a little off the way a real person sketches from memory — not a trained artist. Graphite only, no color, minimal shading. Visible paper texture, a faint eraser mark. Honest and unpolished but clearly recognizable and quietly sincere. Vertical, drawing roughly centered with plain margin. No printed text, no signature.*

> **Anchor the hand:** generate day 1 first, approve it, then use it as a **style/reference image** (or fixed seed) for days 2–14 so the "hand" stays consistent. Reject anything that drifts polished/illustrated and regenerate.

---

1. **`day-01-hands.jpg`** — *Subject: two hands, one gently cupping the other, resting.*
2. **`day-02-oak-reed.jpg`** — *Subject: a large oak tree and a single slender reed bending at the water's edge.*
3. **`day-03-flowers.jpg`** — *Subject: a small bunch of flowers set back on a market shelf, beside a cheaper bunch.*
4. **`day-04-enough.jpg`** — *Subject: the single hand-printed word "ENOUGH", large and alone, centered on the page.* **(text exception — the word IS the drawing; ignore "no printed text" for this one.)**
5. **`day-05-open-hand.jpg`** — *Subject: one open hand, palm up, empty.*
6. **`day-06-teacups.jpg`** — *Subject: two teacups on a table, one slightly closer than the other.*
7. **`day-07-bird-doorway.jpg`** — *Subject: a small bird in an open doorway, mid-flight, about to leave.*
8. **`day-08-two-chairs.jpg`** — *Subject: two simple wooden chairs turned slightly apart from each other.*
9. **`day-09-empty-boat.jpg`** — *Subject: a small empty rowboat drifting alone on still water, no one in it.*
10. **`day-10-window.jpg`** — *Subject: a younger woman seen from behind, standing at a window, looking out.*
11. **`day-11-handbag.jpg`** — *Subject: a man's hand holding a woman's handbag while he waits, relaxed.*
12. **`day-12-fork.jpg`** — *Subject: a country road forking into two paths under an open sky.*
13. **`day-13-pressed-leaf.jpg`** — *Subject: a single pressed autumn leaf taped flat to the notebook page, a short hand-written date beside it.* **(text exception — the small date is intentional.)**
14. **`day-14-key-lock.jpg`** — *Subject: a single key resting in a keyhole of a closed door, not yet turned.*

---

## After you have the raw images
- Drop them in `docs/aweber/evelyn-cross-emails/assets/sketches/` (any format).
- I'll optimize each (`sips` → vertical JPEG <200 KB) and upload to `evelyn/sketches/<filename>`, then hand back the live URLs to paste into each broadcast's `{{SKETCH_URL}}`.
- (The two example emails already reference `day-01-hands.jpg` and `day-06-teacups.jpg`, so those two will render the moment they're uploaded.)
