#!/usr/bin/env python3
"""Generate 07's face-down photograph — SIX TABLES, one real deck.

  python3 scripts/make-07-facedown.py             # all six
  python3 scripts/make-07-facedown.py blue green  # just those

⭐ WHY THE VARIABLE CHANGED (operator reference photos, 2026-09-03)
  Round 1 varied the CARD BACK and held the table constant. Wrong axis. The operator's
  reference shots settle it: one shows the ACTUAL Rider-Waite back — pale blue-green,
  rose emblem, serpent glyphs. We ship RWS faces from assets/tarot-rws/. A deck has ONE
  back, and it is that one. Inventing six backs made six decks that do not exist.

  So the back is now CONSTANT and correct, and the six vary the TABLE.

WHAT THE REFERENCES ALSO CORRECTED
  ⛔ NOT styled editorial. They are real snapshots — a slight angle, ordinary light,
     clutter at the frame edge. Round 1 looked like a furniture catalogue.
  ⛔ NOT plain neutral linen. Blue crushed velvet in one, a printed raven-and-rune altar
     cloth in the other. Characterful, coloured surfaces. Round 1 over-corrected from
     "too dark" straight into bland.
  ⭐ THE DECK IS FANNED IN AN ARC behind the spread, not squared in a stack. It proves a
     real deck was handled by a person — which is the hero's whole job.
  ⛔ CARD PROPORTION. Tarot is TALL, about 1.73 high to wide. Round 1 came back squat and
     the cards read as tiles or playing cards.

Per clay-ad-codex-dispatch: `codex exec` direct, one subprocess per image.
"""
import subprocess, sys, os, concurrent.futures as cf

OUT = "assets"

# ── constant: the deck, the layout, the feel ───────────────────────────────────
# One paragraph, plain sentences. See the note above before making this longer.
CORE = """The rest of the deck is fanned out in a wide sweeping arc across the table,
dozens of overlapping cards face down. In front of the fan, six cards lie face down in
two groups of three, with a clear gap between the two groups. Every card shows the same
pale blue-green Rider-Waite back with a white rose at its centre. The cards are tall and
narrow, true tarot proportion. Shot handheld from above at about 65 degrees, a little
off-centre and slightly tilted, ordinary indoor light with honest shadows. It looks like
an ordinary photograph somebody took at their own table, not a styled magazine shot.
No hands, no people, no text."""

TABLES = {
 "blue":    ("Deep blue crushed velvet, pillar candles",
   "A real photograph of a tarot reading in progress on a small table covered in deep "
   "blue crushed velvet. Three cream pillar candles stand along the back edge."),

 "altar":   ("Printed rune altar cloth, crystals",
   "A real photograph of a tarot reading in progress on a printed cotton altar cloth "
   "laid over bare wood. The cloth has a large dark illustration in the middle and a "
   "ring of rune-like symbols printed around its border. Tumbled crystals — rose "
   "quartz, obsidian, green aventurine, amethyst — lie scattered around the edges."),

 "oxblood": ("Oxblood velvet, brass, dried flowers",
   "A real photograph of a tarot reading in progress on deep oxblood red velvet. A "
   "tarnished brass bowl and a small brass candlestick with a lit candle sit to one "
   "side, with a few dried dark red flowers laid loosely beside them."),

 "oak":     ("Bare oak, no cloth, window light",
   "A real photograph of a tarot reading in progress on a bare warm oak table with no "
   "cloth at all, the grain and the joins of the boards visible. Clear daylight comes "
   "from a window on the left. A chipped enamel mug and two clear quartz points sit "
   "off to one side."),

 "green":   ("Dark green baize, brass desk lamp",
   "A real photograph of a tarot reading in progress on dark green baize, the felted "
   "green of an old card table, worn at the edges. A brass desk lamp throws a warm "
   "pool of light from the upper left and the corners of the frame fall into shadow."),

 "shawl":   ("Embroidered plum shawl, incense",
   "A real photograph of a tarot reading in progress on an embroidered plum-purple "
   "shawl with gold thread-work and a knotted fringe, thrown over the table so it "
   "drapes unevenly. A stick of incense burns in a wooden holder with a thin line of "
   "smoke rising."),
}


def one(slug):
    label, table = TABLES[slug]
    path = os.path.abspath(f"{OUT}/07-fd-{slug}.png")
    prompt = (f"Generate one image and save it to exactly this path: {path}\n\n"
              f"{table} {CORE}\n\nSave the image to {path} and then stop.")
    r = subprocess.run(["codex", "exec", "--sandbox", "workspace-write",
                        "--skip-git-repo-check", prompt],
                       stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=600)
    ok = os.path.exists(path)
    return slug, label, ok, (os.path.getsize(path) if ok else 0), (r.stderr or r.stdout)[-400:]


def main():
    want = [a for a in sys.argv[1:] if a in TABLES] or list(TABLES)
    print(f"generating {len(want)}: {', '.join(want)}\n")
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for slug, label, ok, size, tail in ex.map(one, want):
            print(f"{'✅' if ok else '❌'} {slug:<9} {label:<40} {size//1024 if ok else 0}KB")
            if not ok:
                print(f"     {tail.strip()[:300]}")


if __name__ == "__main__":
    main()
