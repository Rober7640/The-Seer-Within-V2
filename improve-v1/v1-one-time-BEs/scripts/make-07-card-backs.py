#!/usr/bin/env python3
"""Generate 07's face-down candidates — SIX DISTINCT BACKS, shot as a real spread.

  python3 scripts/make-07-card-backs.py          # all six
  python3 scripts/make-07-card-backs.py bone oxblood   # just those

WHAT WENT WRONG LAST TIME (assets/07-card-back-candidates.png, superseded)
  Five "options" that were one option five times: navy ground, ochre filigree,
  same border, same weight, all dark. Nothing to choose BETWEEN. And they were flat
  vectors, which the art rule had already ruled out.

⛔ THE ART RULE (07-P2). A card's own artwork is the RWS scan. A card ON A TABLE is a
   PHOTOGRAPH — it is a moment, and a moment has to have happened. So each candidate
   here is a photograph of a real table, not a card-back graphic on white.

HOW THESE ARE BUILT DIFFERENTLY
  1. SIX GENUINELY DISTINCT BACKS. Three axes move together — ground colour, motif
     TYPE (allover / single emblem / lattice / blind emboss / radial / near-empty),
     and ink. Two candidates never share a family.
  2. LIGHTER. The old set was near-black cards on black linen by candlelight; the
     backs were barely legible at email size. Ground cloth is undyed oatmeal linen
     and the light is open dawn, not a single candle.
  3. LAID IN THE SPREAD'S SHAPE. ⛔ Not a 3x2 grid. Tuesday's Two Doors is THREE
     BEHIND ONE DOOR AND THREE BEHIND THE OTHER, so the six sit as two groups of
     three with a real gap between them. The shape of the reading has to be visible.
  4. THE REST OF THE DECK SQUARED BEHIND. That detail is why h3-deck won the last
     pick — you can see what the cards were cut from, this morning, by somebody.

  The scene is held CONSTANT across all six on purpose. The back is the variable;
  if the cloth and light moved too, the comparison would be worthless.

Per clay-ad-codex-dispatch: call `codex exec` directly, one subprocess per image.
⛔ Do not route through codex-rescue and do not name the imagegen skill in the prompt.
"""
import subprocess, sys, os, concurrent.futures as cf

OUT = "assets"

# ── the constant half: same table, same light, same layout, every time ──────────
SCENE = """A real overhead photograph of a tarot spread on a table, shot from above at
a slight angle, about 75 degrees, the way somebody standing at the table sees it.

THE SURFACE: undyed oatmeal linen, softly creased, laid over pale oak. Warm and LIGHT
— this is an open, bright pre-dawn room, not a candlelit one.
THE LIGHT: low warm early daylight coming in from the left, soft and generous, with
gentle shadows. The scene must read BRIGHT and legible, never murky, never black.
PROPS, sparse and lived-in, never an evenly spaced flatlay: one short candle stub in a
small brass dish, unlit or just snuffed; two or three rough quartz and amethyst pieces;
a small brass bowl at the right edge.
THE REST OF THE DECK sits squared in a neat stack at the top of the frame, face down —
you must be able to see what these cards were cut from.

THE LAYOUT — this matters more than anything else in the shot:
SIX face-down cards, arranged as TWO SEPARATE GROUPS OF THREE, with a clear empty gap
of about one card's width between the two groups. Group one on the left, group two on
the right, each group a tidy row of three. It must read as two sets of three, NOT as a
six-card grid and NOT as one row of six.
The cards are slightly imperfect — not perfectly parallel, a little off square. Styled
to death reads as stock.

Cards sharp, props softer, shallow depth of field.
NO hands, no people, no text, no lettering, no face-up cards, no white studio ground."""

RULES = """Photorealistic. Real objects, real table, real light. It must look like a
photograph somebody took, not a render and not a graphic. Do not add any text,
watermark, caption or lettering anywhere in the image."""

# ── the variable half: six backs that share no family ───────────────────────────
BACKS = {
 "bone": ("Bone ground, indigo allover",
  """THE CARD BACKS: a pale BONE / cream card stock — LIGHT cards, clearly lighter than
  the linen. The design is a fine allover repeating pattern in deep INDIGO BLUE: small
  four-petal florets on a diagonal lattice, edge to edge, with a thin double indigo rule
  just inside the border. Dark ink on a light card."""),

 "oxblood": ("Oxblood, single cream emblem",
  """THE CARD BACKS: a deep OXBLOOD RED card, the red of an old playing-card back. The
  design is ONE single centred emblem in warm cream — a simple six-point compass star
  inside a plain circle — and nothing else. Wide empty red margin all around it. Bold,
  simple, and completely unlike a filigree pattern."""),

 "verdigris": ("Pale verdigris, brass lattice",
  """THE CARD BACKS: a pale SAGE-VERDIGRIS GREEN card, chalky and soft. The design is a
  fine geometric interlocking lattice in tarnished BRASS — thin straight lines forming
  hexagons, mechanical and even, like an old apothecary tin. No curves, no florals."""),

 "blind": ("Tan stock, blind emboss, no colour",
  """THE CARD BACKS: warm undyed TAN card stock with NO PRINTED COLOUR AT ALL. The design
  is BLIND EMBOSSED — the pattern is pressed into the card and shows only as raised
  texture catching the raking light, tone on tone. A large centred medallion with a
  plain ring around it. The whole back is one colour; only the shadow reveals the pattern."""),

 "slate": ("Slate blue-grey, silver guilloche",
  """THE CARD BACKS: a pale SLATE BLUE-GREY card. The design is a precise SILVER guilloche
  — the fine engine-turned rosette pattern found on banknotes and old watch dials, thin
  concentric silver line-work rippling across the whole card. Austere, technical, modern.
  No botanical shapes anywhere."""),

 "ivory": ("Ivory, near empty, one small sigil",
  """THE CARD BACKS: a plain IVORY card, almost entirely EMPTY. A single small gold sigil
  sits dead centre — a simple crescent over a dot, no bigger than a thumbnail — and a
  single hairline gold rule runs close to the card's edge. Nothing else. Maximum restraint,
  the opposite of an allover pattern."""),
}


def one(slug):
    label, back = BACKS[slug]
    path = os.path.abspath(f"{OUT}/07-back-{slug}.png")
    prompt = (f"Generate one image and save it to exactly this path: {path}\n\n"
              f"{SCENE}\n\n{back.strip()}\n\n{RULES}\n\n"
              f"Save the image to {path} and then stop. Do not create any other files.")
    r = subprocess.run(
        ["codex", "exec", "--full-auto", "--skip-git-repo-check", prompt],
        capture_output=True, text=True, timeout=900)
    ok = os.path.exists(path)
    size = os.path.getsize(path) if ok else 0
    return slug, label, ok, size, (r.stderr or r.stdout)[-400:]


def main():
    want = [a for a in sys.argv[1:] if a in BACKS] or list(BACKS)
    print(f"generating {len(want)}: {', '.join(want)}\n")
    os.makedirs(OUT, exist_ok=True)
    # 3 at a time — 6 concurrent codex sessions invites rate limiting.
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for slug, label, ok, size, tail in ex.map(one, want):
            print(f"{'✅' if ok else '❌'} {slug:<10} {label:<34} {size//1024 if ok else 0}KB")
            if not ok:
                print(f"     {tail.strip()[:300]}")


if __name__ == "__main__":
    main()
