#!/usr/bin/env python3
"""Five cover candidates for 07's reading PDF — five PROPOSITIONS, not five variations.

  python3 scripts/make-07-covers.py                 # all five
  python3 scripts/make-07-covers.py cut deck        # just those
  python3 scripts/make-07-covers.py --print spread  # show the prompt, generate nothing

⭐ WHERE THIS GOES. Node 10a already renders a `.cover` div — spread name, draw date, her
   first name, three lines of text on a blank page. This replaces that page's background.
   Also the booking page. ⛔ NEVER the daily email: a picture of the artefact is a delivery
   promise by implication, and 07 makes none anywhere.

FIVE THINGS EVERY CANDIDATE HAS TO DO AT ONCE
  1. Be a PHOTOGRAPH of a real table. The art rule forbids the flat graphic, which rules
     out every 3D ecover convention.
  2. Carry a QUIET ZONE — a field of empty cloth the spread name can sit on and stay
     legible. This is the requirement the daily spread photographs do not have.
  3. Be PORTRAIT. Letter is 8.5x11, and every asset made so far is square or landscape.
  4. Imply no physical delivery.
  5. ⭐ Work for ALL SEVEN spreads with no new art. A cover showing eight cards is
     Tuesday's count and contradicts Wednesday. The ones below that show a countable
     spread are the weaker candidates for exactly that reason — noted per entry.

⛔ Image-gen discipline: short, declarative, stdin=DEVNULL. See scripts/gen-image.py.
"""
import subprocess, sys, os, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CLOTH = ("THE CLOTH: a large square of undyed natural cotton, warm cream, with visible woven "
         "texture and a stitched hem. It is printed in black ink only, one colour, like a screen "
         "print. A large raven stands in profile, drawn as a detailed woodcut with heavy black "
         "lines, with straight black rays radiating outward behind it and concentric rings of "
         "Elder Futhark runes around that.")

BACK = ("Every face-down card shows the classic Rider-Waite back: an allover pale blue-grey "
        "pattern of small roses on a fine trellis, edge to edge, with a thin white border. Every "
        "card is tall and narrow, true tarot proportion.")

CAMERA = ("THE PHOTOGRAPH: a TALL PORTRAIT picture, clearly taller than it is wide. An ordinary "
          "snapshot taken on a phone from above. The cloth is tilted in the frame, not square to "
          "it. Soft natural daylight from the upper left, no flash. Everything roughly in focus, "
          "the way a phone camera renders. Warm bare wooden boards along one edge. Natural "
          "colour, slightly desaturated, no filter. Cluttered and lived-in, not styled for the "
          "camera. No hands, no people, no text.")

CRYSTALS = ("Polished tumbled crystals lie in loose uneven clusters where they were put down — "
            "rose quartz, black obsidian, green aventurine, a purple amethyst point. Some are "
            "half out of frame.")

CANDIDATES = {
 "spread": ("Her spread, close",
   "⚠ Shows a countable spread — 2+5 is Thursday's and Saturday's, not every day's.",
   "THE CARDS: two Rider-Waite tarot cards lie FACE UP side by side in the lower middle of the "
   "picture — the classic 1909 deck, flat primary colour fills, bold black outlines, pale cream "
   "borders, the card name in a plain band at the bottom. Five more cards lie FACE DOWN in a row "
   "beneath them. All seven are completely inside the frame. THE UPPER THIRD OF THE PICTURE IS "
   "EMPTY CLOTH with nothing on it at all, just the printed raven and the runes."),

 "cut": ("The cut",
   "⭐ Spread-agnostic — no spread is laid, so no count to contradict. Uses the offer's own word.",
   "THE CARDS: the tarot deck has been CUT INTO TWO PILES, sitting side by side in the lower half "
   "of the picture, both face down and both slightly untidy. One single card lies FACE UP on the "
   "cloth beside them, as if just taken off the top of the left pile — a Rider-Waite card, flat "
   "primary colours, bold black outlines, the name in a band at the bottom. THE UPPER THIRD OF "
   "THE PICTURE IS EMPTY CLOTH with nothing on it at all."),

 "table": ("The whole table",
   "⚠ Countable again, but small enough in frame that the count does not read.",
   "THE CARDS: seen from further back, so the whole cloth fits in the picture. A small spread of "
   "tarot cards is laid in the LOWER HALF only — two face up, four face down, none of them large "
   "in the frame. THE ENTIRE UPPER HALF is the printed raven on empty cloth, with nothing lying "
   "on it."),

 "deck": ("The deck at rest",
   "⭐ Nothing is laid at all. The most spread-agnostic of the five, and the most quiet cloth.",
   "THE CARDS: the whole tarot deck is squared into ONE NEAT STACK sitting low in the picture, "
   "face down, with two or three cards slipped slightly out of true along one edge. Nothing is "
   "turned over and nothing is laid out. THE UPPER TWO THIRDS OF THE PICTURE IS EMPTY CLOTH, "
   "just the printed raven and the rings of runes."),

 "pages": ("The printed reading",
   "⚠ Implies paper. Honest only if the booking page says it is a PDF she can print.",
   "THE PRINTED READING: a small stack of about eight sheets of white paper lies in the LOWER "
   "HALF of the picture, loosely squared and slightly askew. The top sheet is a printed document "
   "— a large serif heading, then paragraphs of small grey body text too small to read, and one "
   "tarot card reproduced small in the margin. Two Rider-Waite cards lie face up on the cloth "
   "beside the pages. THE UPPER THIRD OF THE PICTURE IS EMPTY CLOTH with nothing on it."),
}


def prompt(slug):
    _, _, cards = CANDIDATES[slug]
    head = ("A real phone photograph, taken from above at a slight angle, of a tarot reading "
            "on a printed cloth on a wooden table.")
    return f"{head}\n\n{CLOTH}\n\n{cards}\n\n{BACK}\n\nAROUND THE EDGES: {CRYSTALS}\n\n{CAMERA}"


def one(slug):
    label = CANDIDATES[slug][0]
    path = os.path.join(ROOT, f"assets/07-cover-{slug}.png")
    full = (f"Generate one image and save it to exactly this path: {path}\n\n"
            f"{prompt(slug)}\n\nSave the image to {path} and then stop.")
    r = subprocess.run(["codex", "exec", "--sandbox", "workspace-write",
                        "--skip-git-repo-check", full],
                       stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=600)
    ok = os.path.exists(path)
    return slug, label, ok, (os.path.getsize(path) if ok else 0), (r.stderr or r.stdout)[-300:]


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith("-")]
    want = [a for a in argv if a in CANDIDATES] or list(CANDIDATES)
    if "--print" in sys.argv:
        for s in want:
            print(f"\n{'='*76}\n{s}  —  {CANDIDATES[s][0]}\n{CANDIDATES[s][1]}\n{'='*76}\n{prompt(s)}")
        return
    print(f"generating {len(want)}: {', '.join(want)}\n")
    with cf.ThreadPoolExecutor(max_workers=len(want)) as ex:
        for slug, label, ok, size, tail in ex.map(one, want):
            print(f"{'✅' if ok else '❌'} {slug:<8} {label:<26} {size//1024 if ok else 0}KB")
            if not ok:
                print(f"     {tail.strip()[:250]}")


if __name__ == "__main__":
    main()
