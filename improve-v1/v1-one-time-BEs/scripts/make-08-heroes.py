#!/usr/bin/env python3
"""One hero PHOTOGRAPH per daily topic — the 08 email hero, not a PDF cover.

  python3 scripts/make-08-heroes.py                       # every topic with no PNG yet
  python3 scripts/make-08-heroes.py why-they-go-quiet      # named topics
  python3 scripts/make-08-heroes.py --all                  # regenerate everything
  python3 scripts/make-08-heroes.py --print <key>          # show the prompt, generate nothing
  python3 scripts/make-08-heroes.py --check                # aspect-ratio check

⭐ ADAPTED FROM make-07-spread-covers.py. Same cloth, same deck, same back, same camera
   discipline. Read that file's header before changing anything here — its hard-won rules
   still apply, in particular:
     ⛔ The card back is the one thing to check on every re-roll. A deck has ONE back: pale
        blue-grey roses on a fine trellis. Tile grids and ornate red-and-blue are generation
        noise — re-roll the image, do not "fix" the prompt.
     ⛔ Keep prompts declarative. A longer, shoutier prompt makes codex deliberate past the
        timeout and return nothing.

FOUR WAYS THIS DIFFERS FROM 07, AND WHY
  1. LANDSCAPE, NOT PORTRAIT. 07 made PDF covers cropped to US Letter. These are email heroes
     sitting at ~600px in a 600px-wide template, so they are 3:2 landscape. There is no Letter
     crop to survive and no `--check` for it; `--check` here just proves the file is wider
     than it is tall.
  2. NO TEXT ANYWHERE IN THE PICTURE. The question was burned in for one round and dropped —
     the letter carries it as body copy instead, highlighted in the framing line. See the note
     above png() before reviving it.
  3. ONE FIXED LAYOUT, EVERY MORNING. 07 gave each of its seven spreads its own shape because
     they were seven separate products. This is a daily: she has to recognise it in an inbox
     at a glance, so the shape never changes and only the COUNT does. Two rows of three —
     ⭐ the top row is positions 1-3 and the bottom row is 4-6, which means the top row is
     always the free row and the bottom row is always the paid one. The picture says which
     is which before she reads a word.
  4. VOLUME. 07 generated seven images once. This generates one per topic, ongoing. Generate
     one and look at it before you queue thirty.

⛔ THE FACE-UP CARDS ARE LOCKED BY THE LETTER. The email describes what is painted on each
   turned card. If the picture shows a different card, the letter is wrong on the one thing it
   cannot be wrong about. Check against the written letter, never against a doc:
     grep -o 'FACE UP' -n scripts/make-08-heroes.py   # the prompt
     head -40 docs/08-marcus/daily-email/letters-02/<topic>.md    # the copy
"""
import subprocess, sys, os, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── shared blocks — identical in every prompt by construction ────────────────────────────
# HEAD / BACK / CRYSTALS are lifted from make-07-spread-covers.py unchanged. Keep them that
# way: the two families of image should look like the same table on different mornings.

HEAD = (
  "A real phone photograph, taken from above at an angle, of a tarot reading laid out on a "
  "printed cloth on a wooden table.\n\n"
  "THE CLOTH: a large square of undyed natural cotton, warm cream, with visible woven texture "
  "and a stitched hem. It is printed in black ink only, one colour, like a screen print. In the "
  "middle is a large raven standing in profile facing right, drawn as a detailed woodcut with "
  "heavy black lines. Straight black rays radiate outward behind it like a sunburst. Around that "
  "sit concentric black rings filled with Elder Futhark runes, and an outer border ring of small "
  "alchemical and astrological symbols, stars, crescents and dotted lines.\n\n"
  "THE DECK IS THE CLASSIC RIDER-WAITE-SMITH TAROT, the famous 1909 deck drawn by Pamela Colman "
  "Smith. The face-up cards must look exactly like that deck and no other: flat simple colour "
  "fills in primary yellow, red, blue and green, bold black outlines, slightly naive medieval "
  "drawing, pale cream borders, the card name printed in a plain black-on-white band across the "
  "bottom and a Roman numeral at the top. The card stock looks slightly aged and yellowed.")

BACK = (
  "THE FACE-DOWN CARDS all show the classic Rider-Waite back: an allover PALE BLUE-GREY pattern "
  "of small roses on a fine trellis, edge to edge, with a thin white border. Every card is tall "
  "and narrow, true tarot proportion.")

FRAMING = (
  "THE FRAMING: the whole spread sits ACROSS THE MIDDLE of a WIDE picture, the raven cloth reading "
  "clearly behind and around them. The camera is pulled back far enough that EVERY CARD IS "
  "COMPLETELY INSIDE THE PICTURE; no card is cut off by any edge and no card touches the top or "
  "the bottom of the frame.")

CRYSTALS = (
  "AROUND THE EDGES: polished tumbled crystals and small carved stones lie on the cloth and the "
  "bare table beside the cards - rose quartz, green aventurine, black obsidian, speckled jasper, "
  "a purple amethyst point lying diagonally. They lie in loose uneven clusters where they were "
  "put down, two or three touching. Some are half out of frame along the sides.")

CAMERA = (
  "THE PHOTOGRAPH: a WIDE LANDSCAPE picture, clearly wider than it is tall, about three parts "
  "wide to two parts tall. An ordinary snapshot taken on a phone. The cloth is clearly TILTED in "
  "the frame, rotated about fifteen degrees, its corners running out of the picture at different "
  "distances. Soft natural daylight from the upper left, no flash. Everything roughly in focus, "
  "the way a phone camera renders. Warm bare wooden boards visible along the top and left edge. "
  "Natural colour, slightly desaturated, no filter. Cluttered and lived-in, not styled. No "
  "hands, no people, no text and no lettering.")

# ── ONE LAYOUT PER SPREAD ────────────────────────────────────────────────────────────────
# ⭐ Keyed to docs/08-marcus/daily-email/SPREADS.md. Each block is that spread's own "Hero layout" paragraph,
#    written once and reused every morning that spread runs. The COUNT and the named cards change
#    per letter; the SHAPE never changes for a given spread.
# ⛔ A spread laid in the wrong shape is worse than no picture. The letter names the spread out
#    loud, so a Cross laid in rows is a claim the reader can catch.
HAND = ("Laid by hand and it shows: uneven spacing, several cards at slightly wrong angles, one or "
        "two just touching.")

LAYOUTS = {
 # in-house · 6 · the two shipped letters
 "six-questions": (
   "THE LAYOUT: SIX tarot cards in front of the raven, in TWO NEAT ROWS OF THREE - a top row of "
   "three and a bottom row of three, the rows clearly separated by a band of bare cloth. All six "
   "are whole and clearly separate. " + HAND),

 # traditional · 5 · Wirth 1927 · ⛔ MAJOR ARCANA ONLY
 "the-cross": (
   "THE LAYOUT: FIVE tarot cards in a CROSS in front of the raven. ONE CARD IN THE MIDDLE. One "
   "card directly to its LEFT, one directly to its RIGHT, one directly ABOVE it and one directly "
   "BELOW it, each about a card's width clear of the centre so the cross reads as a cross and the "
   "four arms do not touch. The two side cards sit level with the middle of the centre card. All "
   "five upright and whole. " + HAND),

 # traditional · 7 · Papus 1889
 "cross-and-triangle": (
   "THE LAYOUT: SEVEN tarot cards in front of the raven, in TWO SEPARATE FIGURES. LOWER FIGURE - a "
   "CROSS of FOUR cards: one card on the LEFT, one at the TOP directly above the gap between them, "
   "one on the RIGHT level with the left one, and one at the BOTTOM, so the four sit around an "
   "empty square of bare cloth in the middle. UPPER FIGURE, sitting ABOVE and slightly to the "
   "RIGHT of the cross - a TRIANGLE of THREE cards: TWO side by side on the upper row and ONE "
   "centred below them. A clear band of bare cloth separates the triangle from the cross. All "
   "seven upright and whole. " + HAND),

 # traditional · 10 · Zain 1936
 "tree-of-life": (
   "THE LAYOUT: TEN tarot cards in front of the raven, arranged as a TREE in THREE COLUMNS running "
   "DOWN the cloth. At the TOP, ONE card centred. Below it a PAIR side by side, one to the left "
   "and one to the right of centre, with a gap between them. Below that a SECOND PAIR, left and "
   "right, wider apart. Then ONE card centred, in the gap between the two columns. Then a THIRD "
   "PAIR, left and right. Then ONE card centred below them, and finally ONE card centred at the "
   "very BOTTOM, on its own. The three centred cards and the bottom card form a clear straight "
   "spine down the middle with bare cloth on either side of it. All ten upright and whole. " + HAND),
}


# ── one topic per entry ──────────────────────────────────────────────────────────────────
# key: (title, SPREAD KEY into LAYOUTS, n_up, [FACE-UP card descriptions naming their PHYSICAL
#       place in that spread's shape], down_sentence)
# ⛔ The face-up cards are locked by the letter. Check the picture against the written letter,
#    never against a doc.

TOPICS = {
 "why-they-go-quiet": ("Why he goes quiet", "six-questions", 3, [
   "The FOUR OF CUPS lies FACE UP in the TOP-LEFT position - a young man sitting on the ground "
   "under a tree with his arms folded across his chest, three golden cups standing on the grass "
   "in front of him and a hand reaching out of a small cloud beside him offering a fourth cup, "
   "FOUR OF CUPS printed in the band at the bottom.",
   "The THREE OF SWORDS lies FACE UP in the TOP-MIDDLE position - a large red heart pierced "
   "straight through by three grey swords against a grey clouded sky with rain falling, THREE OF "
   "SWORDS printed in the band at the bottom.",
   "The EIGHT OF SWORDS lies FACE UP in the TOP-RIGHT position - a woman standing in wet ground "
   "bound in red cloth with a blindfold over her eyes, eight upright swords stuck in the earth "
   "around her and a castle on a rocky hill behind, EIGHT OF SWORDS printed in the band at the "
   "bottom.",
 ], "The THREE cards of the bottom row all lie FACE DOWN."),

 "what-is-my-higher-calling": ("What is my higher calling", "six-questions", 2, [
   "THE STAR lies FACE UP in the TOP-LEFT position - a naked woman kneeling at the edge of a "
   "pool with one foot in the water and one knee on the land, pouring water from two jugs, one "
   "large eight-pointed yellow star and seven smaller stars in the sky above her and a bird in a "
   "tree behind her, numbered XVII with THE STAR printed in the band at the bottom.",
   "The SEVEN OF PENTACLES lies FACE UP in the TOP-MIDDLE position - a young man leaning on a "
   "long-handled hoe with both hands folded over the top of it, looking at a green leafy bush "
   "with seven golden pentacle discs growing on it, SEVEN OF PENTACLES printed in the band at "
   "the bottom.",
 ], "The remaining card of the top row and all THREE cards of the bottom row lie FACE DOWN."),

 # ── test drive, 2026-09-09 · one letter per spread shape ────────────────────────────────
 "the-risk-i-wont-regret": ("The risk I won't regret", "the-cross", 2, [
   "THE FOOL lies FACE UP as the LEFT ARM of the cross - a young man in a bright flowered tunic "
   "striding towards the edge of a cliff with his head tilted UP and BACK away from the drop, a "
   "white rose in one hand and a small bundle tied to a stick over his shoulder, a little white dog "
   "leaping up at his heels, a white sun behind him and snowy peaks below, numbered 0 with THE FOOL "
   "printed in the band at the bottom.",
   "THE HERMIT lies FACE UP as the RIGHT ARM of the cross - an old grey-bearded man standing alone "
   "on snow in a long grey hooded cloak, head bowed and eyes down, holding up a lantern in his "
   "right hand with a SIX-POINTED STAR glowing inside it instead of a flame, and a long staff in "
   "his left, numbered IX with THE HERMIT printed in the band at the bottom.",
 ], "The card at the TOP of the cross, the card at the BOTTOM of the cross and the card IN THE "
    "MIDDLE all lie FACE DOWN. EVERY ONE OF THE FIVE CARDS IS A MAJOR ARCANUM - a named trump "
    "with a Roman numeral at the top and its name printed in the band at the bottom. There are no "
    "suit cards, no cups, no swords, no pentacles and no wands anywhere in the picture."),

 "what-it-taught-me": ("What that relationship taught me about myself", "cross-and-triangle", 2, [
   "The ACE OF CUPS lies FACE UP on the LEFT of the lower cross - a large golden chalice resting on "
   "an open hand that comes out of a cloud, a white dove descending into the cup carrying a wafer, "
   "FIVE streams of water pouring out of the cup, and lily pads on still water below, ACE OF CUPS "
   "printed in the band at the bottom.",
   "The TWO OF CUPS lies FACE UP at the TOP of the lower cross - a young woman in a white gown and "
   "a young man facing each other and each holding a golden cup, a staff with two entwined snakes "
   "standing between them topped by a RED WINGED LION'S HEAD floating in the air above their heads, "
   "a little house on a green hill behind them, TWO OF CUPS printed in the band at the bottom.",
 ], "The card on the RIGHT of the cross, the card at the BOTTOM of the cross, and all THREE cards "
    "of the triangle above lie FACE DOWN."),

 "whats-blocking-love": ("What's blocking love", "tree-of-life", 3, [
   "The FIVE OF PENTACLES lies FACE UP as the SINGLE CARD AT THE TOP of the tree - two beggars "
   "passing through falling snow at night beneath a tall lit stained-glass church window with five "
   "golden pentacles set into it, one of them a man on wooden crutches with a bell at his neck and "
   "the other a barefoot woman in a ragged shawl with her head down, NEITHER of them looking up at "
   "the window, FIVE OF PENTACLES printed in the band at the bottom.",
   "The SEVEN OF SWORDS lies FACE UP as the LEFT card of the FIRST PAIR below the top - a man in a "
   "red cap creeping away on tiptoe from a camp of tents, carrying FIVE swords bundled awkwardly in "
   "his arms and GRIPPING THEM BY THE BLADES, looking back over his shoulder as he goes, with TWO "
   "more swords left standing upright in the ground behind him, SEVEN OF SWORDS printed in the band "
   "at the bottom.",
   "The EIGHT OF PENTACLES lies FACE UP as the RIGHT card of the FIRST PAIR below the top - a young "
   "craftsman sitting on a wooden bench cutting a pentacle with a hammer and graver, FIVE finished "
   "pentacles mounted one above another on an upright post beside him, one more on the bench, and "
   "ONE LYING ON THE GROUND BY HIS FOOT that he has not picked up, a small town in the distance "
   "behind him, EIGHT OF PENTACLES printed in the band at the bottom.",
 ], "The remaining SEVEN cards of the tree all lie FACE DOWN."),
}

TOPICS["why-wont-he-commit"] = ("Why won't he commit", "six-questions", 2, [
    "The KNIGHT OF CUPS lies FACE UP in the TOP-LEFT position: an armoured rider on a pale horse, "
    "holding a gold cup forward in his right hand, a stream across the foreground. "
    "KNIGHT OF CUPS is printed at the bottom.",
    "The TWO OF WANDS lies FACE UP in the TOP-MIDDLE position: a man in a red cloak and cap "
    "standing on a stone battlement, holding a small globe in his right hand and a staff in his "
    "left, another staff fixed beside him. II above, TWO OF WANDS below.",
], "The TOP-RIGHT card and all THREE cards of the BOTTOM ROW lie FACE DOWN.")

TOPICS["what-part-of-me-needs-healing"] = ("What part of myself needs the most healing right now", "six-questions", 2, [
    "The FIVE OF CUPS lies FACE UP in TOP-LEFT: black cloaked figure bowed toward three spilled "
    "gold cups, two gold cups upright behind, river and bridge in the background, V at the top.",
    "STRENGTH lies FACE UP in TOP-MIDDLE: white dressed woman with flower garlands gently holds "
    "the red lion's jaws, infinity symbol above her head, VIII above, STRENGTH below.",
], "The TOP-RIGHT and all THREE BOTTOM ROW cards lie FACE DOWN.")

TOPICS["what-are-my-blind-spots"] = ("What are my blind spots?", "tree-of-life", 3, [
    "THE MOON lies FACE UP as the SINGLE CARD AT THE TOP of the tree: a full moon above two "
    "stone towers, a dog and a wolf facing upward, a winding path between them, and a small "
    "crayfish emerging from a pool at the bottom, numbered XVIII with THE MOON printed below.",
    "The TWO OF SWORDS lies FACE UP as the LEFT card of the FIRST PAIR below the top: a "
    "blindfolded woman seated before the sea, holding two long swords crossed over her chest, "
    "a crescent moon above and rocks rising from the water behind, TWO OF SWORDS printed below.",
    "The THREE OF PENTACLES lies FACE UP as the RIGHT card of the FIRST PAIR below the top: a "
    "craftsman standing on a bench inside a stone building while two other people face him, one "
    "of those two holding the building plan, with three pentacles in the arch above, THREE OF "
    "PENTACLES printed below.",
], "The remaining SEVEN cards of the tree all lie FACE DOWN.")

ORDER = list(TOPICS)


# ── THE STILL-DOWN PICTURE, ONE PER SPREAD ──────────────────────────────────────────────
# ⛔ NOT a flat row. The letter shows the spread in its real shape in the hero, then names the
#    face-down positions and shows them again. A flat row of backs under a Tree of Life breaks
#    the formation the hero just established (operator, 2026-09-09). So each spread gets its
#    own still-down picture: the SAME formation with the DEFAULT turned positions lifted off —
#    bare cloth where they lay — and every remaining position face down.
# ⚠ The turned positions are the spread's default cut (SPREADS.md). A letter that turns a
#    different set needs its own picture; there is no per-letter override yet.
# The flat row (08-backs-<n>.jpg) survives only for "six-questions", whose bottom row IS a row.
BACKS = {
 "the-cross": (
   "THE LAYOUT: THREE tarot cards in a straight VERTICAL LINE in front of the raven - one at the "
   "TOP, one in the MIDDLE and one at the BOTTOM, each about a card's width apart. To the LEFT "
   "and to the RIGHT of the middle card there is only BARE CLOTH, where two more cards would "
   "complete a cross but do not. All three cards lie FACE DOWN. No card is face up anywhere in "
   "the picture. " + HAND),
 "cross-and-triangle": (
   "THE LAYOUT: FIVE tarot cards in front of the raven, in TWO SEPARATE FIGURES. LOWER FIGURE - "
   "only TWO cards of a cross remain: one on the RIGHT and one at the BOTTOM; where the LEFT and "
   "TOP arms of the cross would lie there is only BARE CLOTH. UPPER FIGURE, above and slightly "
   "to the right - a TRIANGLE of THREE cards: two side by side on the upper row and one centred "
   "below them. All five cards lie FACE DOWN. No card is face up anywhere in the picture. "
   + HAND),
 "tree-of-life": (
   "THE LAYOUT: SEVEN tarot cards forming the LOWER PART of a tree in THREE COLUMNS running down "
   "the cloth. From the top: a PAIR side by side, wide apart, one left and one right of centre; "
   "below them ONE card centred in the gap between the columns; below that a SECOND PAIR, left "
   "and right; then ONE card centred; then ONE card centred at the very BOTTOM on its own. ABOVE "
   "the top pair there is a clear band of BARE CLOTH where three more cards would sit but do "
   "not. All seven cards lie FACE DOWN. No card is face up anywhere in the picture. " + HAND),
}


def backs_png(spread):
    return os.path.join(ROOT, f"assets/08-backs-{spread}.png")


def backs_prompt(spread):
    return f"{HEAD}\n\n{BACKS[spread]}\n\n{BACK}\n\n{FRAMING}\n\n{CRYSTALS}\n\n{CAMERA}"



# ⛔ NO TEXT IN THE PICTURE. The morning's question was burned into the hero for one round
#    and then dropped (operator, 2026-09-09): the letter already carries it as body copy, with
#    a yellow flash on the question in the framing line, and that is enough. Text in the image
#    also had to be re-rolled for spelling and could not be edited without regenerating.
#    Two things learned if it is ever revived: it must be HEADLINE-sized (a caption-sized line
#    at 900px is ~8px once the hero is displayed at 494px and cannot be read), and the top band
#    has to be kept clear of cards and crystals.

def png(key):
    return os.path.join(ROOT, f"assets/08-hero-{key}.png")


def prompt(key):
    _title, spread, _up, faces, down = TOPICS[key]
    layout = LAYOUTS[spread]
    cards = "THE CARDS: " + " ".join(faces) + " " + down
    return f"{HEAD}\n\n{layout}\n\n{cards}\n\n{BACK}\n\n{FRAMING}\n\n{CRYSTALS}\n\n{CAMERA}"


def check():
    try:
        from PIL import Image
    except ImportError:
        sys.exit("pip install pillow to use --check")
    bad = 0
    for k in ORDER:
        p = png(k)
        if not os.path.exists(p):
            print(f"·  {k}: not generated"); continue
        w, h = Image.open(p).size
        ok = w > h
        bad += not ok
        print(f"{'✅' if ok else '❌'} {k}: {w}x{h} ratio {w/h:.2f} "
              f"{'' if ok else '← PORTRAIT, re-roll: the hero must be landscape'}")
    sys.exit(1 if bad else 0)


def main():
    args = [a for a in sys.argv[1:]]
    if "--check" in args:
        check()
    if "--print" in args:
        for k in [a for a in args if a in TOPICS] or ORDER:
            print(f"───── {k}\n{prompt(k)}\n")
        return
    tmp = os.path.join(ROOT, "assets", ".08-prompts")
    os.makedirs(tmp, exist_ok=True)
    jobs = []
    if "--backs" in args:
        # python3 scripts/make-08-heroes.py --backs tree-of-life the-cross
        for k in [a for a in args if a in BACKS] or list(BACKS):
            pf = os.path.join(tmp, f"backs-{k}.txt")
            open(pf, "w").write(backs_prompt(k))
            jobs.append((backs_png(k), pf))
    else:
        keys = [a for a in args if a in TOPICS]
        if not keys:
            keys = ORDER if "--all" in args else [k for k in ORDER if not os.path.exists(png(k))]
        if not keys:
            print("nothing to do — every topic already has a PNG. --all to regenerate."); return
        for k in keys:
            pf = os.path.join(tmp, f"{k}.txt")
            open(pf, "w").write(prompt(k))
            jobs.append((png(k), pf))

    def one(job):
        out, pf = job
        path = os.path.abspath(out)
        p = (f"Generate one image and save it to exactly this path: {path}\n\n"
             f"{open(pf).read().strip()}\n\nSave the image to {path} and then stop.")
        r = subprocess.run(
            ["codex", "exec", "--sandbox", "workspace-write", "--skip-git-repo-check", p],
            stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=900)
        ok = os.path.exists(path)
        return out, ok, (os.path.getsize(path) if ok else 0), (r.stderr or r.stdout)[-300:]

    with cf.ThreadPoolExecutor(max_workers=max(1, len(jobs))) as ex:
        for out, ok, size, tail in ex.map(one, jobs):
            print(f"{'✅' if ok else '❌'} {os.path.basename(out)}  {size//1024 if ok else 0}KB")
            if not ok:
                print(f"   {tail.strip()[:250]}")


if __name__ == "__main__":
    main()
