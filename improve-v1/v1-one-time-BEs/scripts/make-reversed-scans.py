#!/usr/bin/env python3
"""Backfill the missing reversed tarot scans by rotating the upright ones 180 degrees.

  python3 improve-v1/v1-one-time-BEs/scripts/make-reversed-scans.py          # report only
  python3 improve-v1/v1-one-time-BEs/scripts/make-reversed-scans.py --write  # create them

⭐ WHY THIS IS NOT INVENTING ART. A reversed card is the same card the other way up — that
   is what "reversed" means at a real table. The 22 existing `-reversed.png` files are
   themselves 180-degree rotations of their uprights. This does the identical thing for the
   56 minors, which never got the same treatment.

⛔ THE BUG IT CLOSES. Node 7 of the fulfilment workflow now appends "(reversed)" to a card's
   marker, and node 10a turns that into a `-reversed.jpg` filename. That is correct — but
   only the majors had such a file, so a reversed MINOR resolved to a 403 and PDFShift
   renders the page with a silent gap. In a PDF somebody paid for.

⛔ Never writes the S3 prefix `evelyn/tarot/` — that serves live broadcasts. Upload with
   `node improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs card <slug>...`, which
   targets `evelyn/tarot-rws/` and refuses the frozen prefix.
"""
import os, sys, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DECK = os.path.join(ROOT, "assets/tarot-rws")
SKIP = ("face-down", "index")

def uprights():
    for p in sorted(glob.glob(os.path.join(DECK, "*.png"))):
        s = os.path.basename(p)[:-4]
        if s.endswith("-reversed") or any(k in s for k in SKIP):
            continue
        yield s, p

def main():
    write = "--write" in sys.argv
    made, have = [], []
    for slug, path in uprights():
        out = os.path.join(DECK, f"{slug}-reversed.png")
        if os.path.exists(out):
            have.append(slug); continue
        made.append(slug)
        if write:
            Image.open(path).rotate(180, expand=True).save(out)
    print(f"{len(have)} already had a reversed scan")
    print(f"{len(made)} {'created' if write else 'MISSING (run with --write)'}")
    if made:
        print("\n".join("  " + s for s in made[:8]) + ("\n  …" if len(made) > 8 else ""))
    if write and made:
        print("\nnow upload them:")
        print("  node improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs card " + " ".join(f"{s}-reversed" for s in made))

if __name__ == "__main__":
    main()
