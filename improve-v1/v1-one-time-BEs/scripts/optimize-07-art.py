#!/usr/bin/env python3
"""Turn 07's spread photographs into email assets.

  python3 scripts/optimize-07-art.py            # build every day
  python3 scripts/optimize-07-art.py mon fri    # just those
  python3 scripts/optimize-07-art.py --sheet    # check the FACEDOWN crops, build nothing

Each day's assets/07-<day>-rws.png makes two files in assets/email/:

  07-spread-<day>.jpg   the whole table. BEAT 1, the hero.
  07-down-<day>.jpg     a crop of that same photograph showing ONLY the face-down
                        cards. BEAT 10, where the count is the pitch.

⭐ BOTH COME FROM ONE PHOTOGRAPH on purpose. The old marcus/07-hero-* and 07-down-*
   were separate shoots on a different table with a different deck, so an email showed
   two decks. A crop cannot disagree with the picture it was cut from.

⭐ SIZING — 900px, not 1200. These photographs are texture: woven cloth, printed runes,
   patterned card backs. That is expensive to encode, and at 1200px every day overshot
   its budget even at the quality floor. Measured on mon/sat/sun, 1200px q70 costs
   270-345KB and 900px q82 costs 210-275KB - so dropping resolution buys BOTH a smaller
   file and a cleaner one. 900px is still a true retina asset on a phone, where the
   image lands at about 390 CSS px. ⛔ Do not trade quality for width here: a spread
   photo that turns to mush stops being evidence, which is the whole job.

   The crop ships narrower still, at 800px. It is a detail of a picture the reader has
   already seen in full further up the same email, so it carries less weight than the
   hero and does not need to answer as much zoom.

⛔ Upload under NEW keys. host-be-asset.cjs sets immutable cache headers, so overwriting
   marcus/07-hero-1.jpg would leave caches serving the old dark deck for a year.
"""
import sys, os
from PIL import Image

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT    = os.path.join(ROOT, "assets/email")
WIDTH  = {"spread": 900, "down": 800}   # see the sizing note below
FLOOR  = 74            # never encode worse than this
BUDGET = {"spread": 235_000, "down": 150_000}

# The face-down cards, as a fraction of each photograph (left, top, right, bottom).
# Checked with --sheet; the shapes differ per day, so these are not derivable.
FACEDOWN = {
    "mon": (0.11, 0.40, 0.92, 0.92),   # one row under the Ten of Wands
    "tue": (0.05, 0.48, 0.98, 0.92),   # three behind each door
    "wed": (0.18, 0.11, 0.97, 0.70),   # the line of steps
    "thu": (0.25, 0.33, 0.99, 0.82),   # the curve of the current
    "fri": (0.25, 0.385, 0.85, 1.00),   # two columns plus the two at the foot
    "sat": (0.04, 0.42, 0.97, 0.88),   # the row nearest the camera
    "sun": (0.13, 0.06, 0.91, 0.88),   # ⚠ nine sit all round the ring, so this cannot
                                       # exclude the three face-up. It reframes tight on the
                                       # ring instead - the one day the two images are close.
}


def encode(im, path, budget):
    """Largest quality that fits the budget. Returns (quality, bytes)."""
    lo, hi, best = FLOOR, 88, None
    while lo <= hi:
        q = (lo + hi) // 2
        im.save(path, "JPEG", quality=q, optimize=True, progressive=True, subsampling=1)
        n = os.path.getsize(path)
        if n <= budget:
            best = (q, n); lo = q + 1
        else:
            hi = q - 1
    if best is None:                       # even the floor overshoots - keep the floor
        im.save(path, "JPEG", quality=FLOOR, optimize=True, progressive=True, subsampling=1)
        best = (FLOOR, os.path.getsize(path))
    else:                                  # re-encode at the winner
        im.save(path, "JPEG", quality=best[0], optimize=True, progressive=True, subsampling=1)
    return best


def resized(im, width):
    if im.width <= width:
        return im.convert("RGB")
    h = round(im.height * width / im.width)
    return im.convert("RGB").resize((width, h), Image.LANCZOS)


def crop(im, day):
    l, t, r, b = FACEDOWN[day]
    return im.crop((round(l * im.width), round(t * im.height),
                    round(r * im.width), round(b * im.height)))


def sheet(days):
    """Draw each crop box over its photograph so the boxes can be judged, not guessed."""
    from PIL import ImageDraw, ImageFont
    W = 460
    try: f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia.ttf", 20)
    except Exception: f = ImageFont.load_default()
    tiles = []
    for d in days:
        im = Image.open(f"{ROOT}/assets/07-{d}-rws.png").convert("RGB")
        g = ImageDraw.Draw(im)
        l, t, r, b = FACEDOWN[d]
        g.rectangle([l*im.width, t*im.height, r*im.width, b*im.height], outline=(220, 40, 40), width=9)
        tiles.append((d, resized(im, W)))
    H = max(t.height for _, t in tiles)
    out = Image.new("RGB", (len(tiles)*(W+16)+16, H+52), (250, 247, 241))
    g = ImageDraw.Draw(out)
    for i, (d, t) in enumerate(tiles):
        x = 16 + i*(W+16)
        out.paste(t, (x, 16)); g.text((x, H+24), d, font=f, fill=(26, 26, 26))
    p = f"{ROOT}/assets/07-crop-check.png"
    out.save(p); print(p, out.size)


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith("-")]
    days = argv or [d for d in FACEDOWN if os.path.exists(f"{ROOT}/assets/07-{d}-rws.png")]
    if "--sheet" in sys.argv:
        return sheet(days)

    os.makedirs(OUT, exist_ok=True)
    total = 0
    for d in days:
        src = f"{ROOT}/assets/07-{d}-rws.png"
        if not os.path.exists(src):
            print(f"❌ {d}  no photograph at {src}"); continue
        im = Image.open(src)
        for kind, img in (("spread", im), ("down", crop(im, d))):
            path = f"{OUT}/07-{kind}-{d}.jpg"
            r = resized(img, WIDTH[kind])
            q, n = encode(r, path, BUDGET[kind])
            total += n
            print(f"✅ 07-{kind}-{d}.jpg  {r.width}x{r.height}  q{q}  {n//1024}KB")
    print(f"\n{len(days)} days · {total//1024}KB total · {total//1024//max(1,len(days))}KB per email")


if __name__ == "__main__":
    main()
