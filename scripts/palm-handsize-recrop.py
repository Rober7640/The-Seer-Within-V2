"""Re-crop the hand-size strip from a SQUARE panel back to its natural LANDSCAPE panel.

Why
---
Joel, 2026-07-14 call: "I think the image is a bit still too small... if we can't do
left, right, maybe we can do top down so that we can make that image a bit bigger,
because this image is more of a horizontal image rather than a vertical image."

He is right, and it is measurable. Each 745x745 panel holds only ~722x392 of actual
content (aspect 1.84:1) — roughly 47% of every tile is empty white. The square panel
was a deliberate earlier trade (f12e992): the measuring hand overlaps the baked-in
"Big hands"/"Small hands" label horizontally, so a tight SQUARE crop would have had to
erase the label — and without the labels the two options look nearly identical, which
kills the whole point of the image.

Stacking the options top-down (1 column) removes that trade entirely: a full-width tile
wants a landscape panel, so we can crop the dead vertical margin, keep the labels, and
the hands roughly double in size.

The rule that must not be broken
--------------------------------
BOTH halves are cropped with the IDENTICAL box. The panels differ only in how large the
hand is relative to the arm — crop them with different boxes and that difference dies,
taking the meaning of the image with it. This is why we crop vertically only and keep
each half's full width: no horizontal box to get wrong.

Usage:  python scripts/palm-handsize-recrop.py
"""

from PIL import Image

SRC = "client/public/palm/hand-size-strip.png"

# Vertical crop box, measured from the CURRENT (artifact-cleaned) strip:
#   LEFT  content y 179..570   RIGHT content y 180..574
# Union = 179..574, plus an 8px breathing margin => 171..582.
TOP, BOTTOM = 171, 583  # bottom exclusive
MARGIN_NOTE = "8px margin around the union of both halves' content bounds"


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    W, H = im.size
    half = W // 2
    print(f"in : {W}x{H}  (panel {half}x{H}, aspect {half / H:.2f}:1)")

    if (W, H) != (1490, 745):
        raise SystemExit(f"unexpected source dims {W}x{H} — expected 1490x745. Re-measure before cropping.")

    new_h = BOTTOM - TOP
    out = Image.new("RGBA", (W, new_h), (255, 255, 255, 255))

    # Same box on both halves — vertical only, full width each.
    for i in range(2):
        left = i * half
        panel = im.crop((left, TOP, left + half, BOTTOM))
        out.paste(panel, (left, 0))

    out.save(SRC)
    print(f"out: {W}x{new_h}  (panel {half}x{new_h}, aspect {half / new_h:.2f}:1)")
    print(f"     cropped {H - new_h}px of dead vertical margin ({MARGIN_NOTE})")
    print(f"\n  NEXT: set palmReads.ts HAND_SIZE.strip to {{ width: {W}, height: {new_h} }}")


if __name__ == "__main__":
    main()
