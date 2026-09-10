#!/usr/bin/env python3
"""Point 07's daily emails at the spread photographs.

  python3 scripts/wire-07-art.py            # patch all seven
  python3 scripts/wire-07-art.py --check     # report only, change nothing

⛔ WHY THIS EXISTS AND build-07-daily.py DOES NOT DO IT. That script is stale — it still
   emits marcus/card-back.jpg — so re-running it regresses the shipped .html. This patches
   the .html in place instead, and is idempotent: run it twice, nothing changes.

WHAT GOES WHERE, and why it is not the other way round

  BEAT 1, hero      -> marcus/07-spread-<day>.jpg   the whole table
  BEAT 10, withhold -> marcus/07-down-<day>.jpg     a crop of the face-down cards only

  The crop carries beat 10 because the caption under it counts them — "These 5 are still
  in my hand". Under the full photograph, which also shows the turned card, that count
  reads wrong. The hero takes the full photograph because it is the strongest picture in
  the email and beat 1 is the only slot big enough for it.

⛔ THE HERO CAPTION HAD TO CHANGE. It read "One off the cut - not yet turned", written
   for art showing face-down cards only. The photograph shows the free card already
   turned, so that line now contradicts its own picture. The replacement states the same
   two counts the pitch runs on: how many are turned, how many are not.

⛔ Wed and Thu had no photograph at all — a coloured table cell standing in for a card
   back. That breaks rule 7 outright: a flat graphic proves nothing. They get the hero.
   ⚠ They still have no face-down image at beat 10, because that slot needs its own
   written copy per day and inventing it here is not this script's job.
"""
import re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S3   = "https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/"

# day -> (file stem, free count word, paid count word)
DAYS = {
    "mon": ("07-D-mon-the-weight",        "one",   "five"),
    "tue": ("07-D-tue-two-doors",         "two",   "six"),
    "wed": ("07-D-wed-small-instruction", "one",   "five"),
    "thu": ("07-D-thu-undertow",          "two",   "five"),
    "fri": ("07-D-fri-the-ledger",        "three", "six"),
    "sat": ("07-D-sat-other-chair",       "two",   "five"),
    "sun": ("07-D-sun-zodiac",            "three", "nine"),
}

def hero_block(day, free, paid):
    cap = f"The cut, this morning &mdash; {free} turned, {paid} not"
    return (
        '  <!-- BEAT 1 · HERO — ⛔ a PHOTOGRAPH of cards already laid. The act, done. -->\n'
        '  <tr><td align="center" style="padding:28px 0 0;">\n'
        f'    <img src="{S3}07-spread-{day}.jpg" alt="{cap}" width="600" '
        'style="display:block;width:100%;max-width:600px;height:auto;">\n'
        f'    <p style="margin:14px 30px 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;'
        f'letter-spacing:.16em;text-transform:uppercase;color:#8A909C;">{cap}</p></td></tr>\n'
    )

def main():
    check = "--check" in sys.argv
    for day, (stem, free, paid) in DAYS.items():
        p = f"{ROOT}/copy/07-marcus/daily/{stem}.html"
        s = open(p).read()
        before, notes = s, []

        # 1 — the hero. Replace the whole BEAT 1 block, whatever shape it is in.
        m = re.search(r'  <!-- BEAT 1 · HERO.*?-->\n(?:.*?\n)*?(?=  <!-- BEAT 4)', s)
        if m:
            s = s[:m.start()] + hero_block(day, free, paid) + "\n" + s[m.end():]
            notes.append("hero photograph" + (" (replaced a flat graphic)" if "backcell" in m.group(0) else ""))
        else:
            notes.append("⚠ NO BEAT 1 BLOCK FOUND")

        # 2 — the face-down crop at beat 10.
        s2 = re.sub(r'(<img src=")[^"]*marcus/07-down-\d+\.jpg(")',
                    rf'\g<1>{S3}07-down-{day}.jpg\g<2>', s)
        if s2 != s:
            notes.append("face-down crop")
            s = s2
        elif "07-down-" not in s:
            notes.append("⚠ no face-down slot in this email")

        changed = s != before
        print(f"{'· ' if check else ('✅' if changed else '—')} {day}  {stem}.html  —  {', '.join(notes)}")
        if changed and not check:
            open(p, "w").write(s)

if __name__ == "__main__":
    main()
