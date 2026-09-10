#!/usr/bin/env python3
"""Contact sheet for the six 07 card-back candidates.

  python3 scripts/make-07-back-sheet.py

TWO PANELS, because judging art at art size is how the last round went wrong.

  PANEL A — all six side by side, big enough to see the design.
  PANEL B — ⭐ THE DECIDING TEST. Each one at 540px, which is the actual width the
            photograph occupies inside a 600px email with 30px gutters. A back that
            is handsome at 1250px and vanishes at 540px is not a candidate, it is a
            picture. The previous round chose on the big view and shipped a back that
            was illegible in the inbox.

The generator crops every candidate to a common 3:2 — they come back at different
aspect ratios and an uncropped grid would compare framings, not designs.
"""
from PIL import Image, ImageDraw, ImageFont

import sys

# Round 2 (default) — one real deck, six tables. Round 1 varied the back instead;
# the operator's reference photos showed that was the wrong axis.
ROUNDS = {
  "fd": ("07-fd-", "assets/07-facedown-candidates.png",
         "07 - face-down candidates: one deck, six tables",
         "Real RWS back throughout. Deck fanned in an arc; the six laid as two groups of three.",
    [("blue",    "Deep blue crushed velvet, pillar candles"),
     ("altar",   "Printed rune altar cloth, crystals"),
     ("oxblood", "Oxblood velvet, brass, dried flowers"),
     ("oak",     "Bare oak, no cloth, window light"),
     ("green",   "Dark green baize, brass desk lamp"),
     ("shawl",   "Embroidered plum shawl, incense")]),
  "back": ("07-back-", "assets/07-card-back-candidates-v2.png",
           "07 - face-down candidates: six distinct backs (SUPERSEDED)",
           "Round 1. Wrong axis - a deck has one back.",
    [("bone",      "Bone ground, indigo allover floret"),
     ("oxblood",   "Oxblood, single cream emblem"),
     ("verdigris", "Pale verdigris, brass hex lattice"),
     ("blind",     "Tan stock, blind emboss, no colour"),
     ("slate",     "Slate grey, silver guilloche"),
     ("ivory",     "Ivory, near empty, one sigil")]),
}
PREFIX, OUTFILE, TITLE, SUBTITLE, CANDS = ROUNDS[
    sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] in ROUNDS else "fd"]
BG, INK, MUT = (238, 236, 232), (22, 24, 29), (122, 128, 140)
PAD, GAP = 34, 18


def font(sz, bold=False):
    for p in ("/System/Library/Fonts/Supplemental/Helvetica.ttc",
              "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(p, sz, index=1 if bold else 0)
        except Exception:
            pass
    return ImageFont.load_default(sz)


def crop32(im):
    """Centre-crop to 3:2, biased slightly low — the cards sit below the deck."""
    w, h = im.size
    tw, th = (w, int(w / 1.5)) if w / h < 1.5 else (int(h * 1.5), h)
    left, top = (w - tw) // 2, min(int((h - th) * 0.62), h - th)
    return im.crop((left, top, left + tw, top + th))


def strip(w):
    return [(s, d, crop32(Image.open(f"assets/{PREFIX}{s}.png")).resize(
        (w, int(w / 1.5)), Image.LANCZOS)) for s, d in CANDS]


def main():
    A_W, B_W = 620, 540                      # comparison width / true email width
    a, b = strip(A_W), strip(B_W)
    a_h, b_h = int(A_W / 1.5), int(B_W / 1.5)

    f_hd, f_nm, f_ds, f_note = font(30, True), font(21, True), font(17), font(16)
    head_a, head_b = 62, 78
    lab = 52                                  # label block under each tile

    panel_a_h = head_a + 2 * (a_h + lab) + GAP
    panel_b_h = head_b + 3 * (b_h + lab) + 2 * GAP
    W = PAD * 2 + A_W * 3 + GAP * 2
    H = PAD * 2 + panel_a_h + 40 + panel_b_h

    sheet = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(sheet)
    y = PAD

    d.text((PAD, y), TITLE, font=f_hd, fill=INK)
    d.text((PAD, y + 34), SUBTITLE, font=f_note, fill=MUT)
    y += head_a

    for i, (s, desc, im) in enumerate(a):
        col, row = i % 3, i // 3
        x = PAD + col * (A_W + GAP)
        ty = y + row * (a_h + lab)
        sheet.paste(im, (x, ty))
        d.text((x, ty + a_h + 9), s, font=f_nm, fill=INK)
        d.text((x, ty + a_h + 31), desc, font=f_ds, fill=MUT)
    y += 2 * (a_h + lab) + GAP + 40

    d.text((PAD, y), "TRUE EMAIL SIZE — 540px, the width it actually occupies in the inbox",
           font=f_hd, fill=INK)
    d.text((PAD, y + 34), "Judge here, not above. If the back does not read at this size it is not a candidate.",
           font=f_note, fill=MUT)
    y += head_b

    for i, (s, desc, im) in enumerate(b):
        col, row = i % 2, i // 2
        x = PAD + col * (B_W + GAP + 60)
        ty = y + row * (b_h + lab)
        sheet.paste(im, (x, ty))
        d.text((x, ty + b_h + 9), s, font=f_nm, fill=INK)
        d.text((x, ty + b_h + 31), desc, font=f_ds, fill=MUT)

    out = OUTFILE
    sheet.save(out)
    print(f"wrote {out}  {sheet.size[0]}x{sheet.size[1]}")


if __name__ == "__main__":
    main()
