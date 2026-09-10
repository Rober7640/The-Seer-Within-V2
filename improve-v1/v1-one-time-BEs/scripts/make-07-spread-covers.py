#!/usr/bin/env python3
"""One PDF cover PHOTOGRAPH per spread — seven covers, not one cover seven times.

  python3 scripts/make-07-spread-covers.py                      # every key with no PNG yet
  python3 scripts/make-07-spread-covers.py the-ledger sat       # keys or weekday aliases
  python3 scripts/make-07-spread-covers.py --all                # regenerate everything
  python3 scripts/make-07-spread-covers.py --print the-undertow # show the prompt, generate nothing
  python3 scripts/make-07-spread-covers.py --check              # ratio + Letter-crop check
  python3 scripts/make-07-spread-covers.py --sheet              # assets/07-spread-covers.png
  python3 scripts/make-07-spread-covers.py --jpeg               # Letter-cropped .jpg for upload

⭐ WHY THIS FILE EXISTS AND make-07-covers.py DID NOT SOLVE IT.
   Those five candidates had to serve all seven days with ONE image, and requirement 5 of that
   file ("work for all seven spreads") is what ruled out showing a countable spread — 2 up + 5
   down is Thursday's shape and contradicts Wednesday's six. Node 10a already builds the cover
   URL from the spread's own slug (`07-cover-${slug(spread_name)}.jpg`), so a day can have its
   own art for the price of one upload. That kills requirement 5, and with it the compromise.
   ⭐ Each cover now shows ITS OWN spread: the right cards, the right counts, the right shape.

FIVE THINGS EVERY COVER STILL HAS TO DO AT ONCE
  1. Be a PHOTOGRAPH of a real table. The art rule forbids the flat graphic, which rules out
     every 3D ecover convention. Nothing here is rendered.
  2. Carry a QUIET ZONE. Node 10a lays the spread name (40pt), the draw date and her first
     name over the LOWER part of the page on a 5.2in dark scrim. The bottom third of the
     picture must therefore be empty cloth — nothing lying on it at all.
  3. Be PORTRAIT and SURVIVE THE LETTER CROP. `.cover img { object-fit:cover }` centre-crops
     to 8.5x11 = 0.7727. Generators return 0.47-0.67, i.e. TALLER than Letter, so both ends
     get trimmed — up to 19% off each end at 0.47. The layout therefore sits ACROSS THE MIDDLE,
     never against an edge. `--check` proves it per day instead of hoping.
  4. Imply no physical delivery.
  5. Show the DAY'S OWN cards and counts. ⛔ The face-up cards are locked by the shipped
     .html — the email inlines that RWS scan and describes it. Verified against
     copy/07-marcus/daily/*.html, not against a doc:
       grep -o 'tarot-rws/[a-z-]*' copy/07-marcus/daily/07-D-<day>-*.html
     ⭐ And each SHAPE is the spread's own: Mon and Wed are both 1+5 and must not look alike
     (a row carried under one card vs a line of steps); Thu and Sat are both 2+5 (a current
     curving away vs a hand dealt from the opposite chair).

⛔ Image-gen discipline: short, declarative, stdin=DEVNULL. See scripts/gen-image.py.
⛔ The card back is the one thing to check on every re-roll. A deck has ONE back: pale
   blue-grey roses on a fine trellis. Tile grids and ornate red-and-blue are generation noise
   — re-roll the image, do not "fix" the prompt.
"""
import subprocess, sys, os, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LETTER = 8.5 / 11.0                      # 0.7727 — what object-fit:cover crops to
SHEET_W = 1275                           # ~150dpi Letter width, the upload size too

# ── shared blocks — identical in every one of the seven prompts by construction ──────────

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

# The quiet zone and the centre-crop survival are the same instruction said twice: keep the
# cards off both ends. Everything printed on page 1 sits over the lower part of the picture.
QUIET = (
  "THE FRAMING: the whole layout sits ACROSS THE MIDDLE OF THE PICTURE, a little above centre, "
  "with clear empty cloth above it and below it. The camera is pulled back far enough that EVERY "
  "CARD IS COMPLETELY INSIDE THE PICTURE; no card is cut off by any edge and no card touches the "
  "top or the bottom of the frame. THE WHOLE LOWER THIRD OF THE PICTURE IS EMPTY CLOTH: no "
  "cards, no crystals, no objects of any kind lie there, only the printed rings and runes on "
  "bare cream cotton.")

CRYSTALS = (
  "AROUND THE EDGES: polished tumbled crystals and small carved stones lie on the cloth and the "
  "bare table beside and above the cards - rose quartz, green aventurine, black obsidian, "
  "speckled jasper, a purple amethyst point lying diagonally. They lie in loose uneven clusters "
  "where they were put down, two or three touching. Some are half out of frame at the top and "
  "along the sides. None of them lie in the empty lower third.")

CAMERA = (
  "THE PHOTOGRAPH: a TALL PORTRAIT picture, clearly taller than it is wide, about three parts "
  "tall to two parts wide. An ordinary snapshot "
  "taken on a phone. The cloth is clearly TILTED in the frame, rotated about twenty degrees, its "
  "corners running out of the picture at different distances. Soft natural daylight from the "
  "upper left, no flash. Everything roughly in focus, the way a phone camera renders. Warm bare "
  "wooden boards visible along the top left and left edge. Natural colour, slightly desaturated, "
  "no filter. Cluttered and lived-in, not styled. No hands, no people, no text and no lettering.")

# ── one CARDS paragraph per spread ───────────────────────────────────────────────────────
# key: (day, title, up, down, face-up cards, shape note, CARDS paragraph)

SPREADS = {
 "the-weight": ("mon", "The Weight", 1, 5, "Ten of Wands",
   "a row carried underneath one card",
   "THE CARDS: six tarot cards on the cloth in front of the raven, in one group. The TEN OF "
   "WANDS lies FACE UP at the top of the group - the Rider-Waite Ten of Wands: a man bent "
   "forward under a bundle of ten wooden staves gathered in both arms, his face hidden behind "
   "them, a small town with two towers on the horizon ahead of him, TEN OF WANDS printed in the "
   "band at the bottom. FIVE cards lie FACE DOWN in one horizontal row beneath it, carrying it, "
   "all five whole and clearly separate. Laid by hand and it shows: uneven spacing, several "
   "cards at slightly wrong angles, one or two just touching."),

 "the-two-doors": ("tue", "The Two Doors", 2, 6, "The Devil · Eight of Cups",
   "two separate groups, a gap between them",
   "THE CARDS: eight tarot cards on the cloth in front of the raven, in TWO SEPARATE GROUPS side "
   "by side with a WIDE GAP of bare cloth between them, a gap at least one card wide, so they "
   "read as two groups and never as one long row. In the LEFT group THE DEVIL lies FACE UP at "
   "the top - a horned goat-headed figure with bat wings squatting on a black half-cube, a torch "
   "in one hand, a naked man and a naked woman with small horns and tails chained by the neck to "
   "the cube below him, numbered XV with THE DEVIL in the band at the bottom - and THREE cards "
   "lie FACE DOWN in a horizontal row beneath it. In the RIGHT group the EIGHT OF CUPS lies FACE "
   "UP at the top - a figure in a red cloak with a staff walking away uphill into rocky ground "
   "with his back turned, eight golden cups stacked in two rows on the shore behind him, a moon "
   "in a clouded night sky above, EIGHT OF CUPS in the band at the bottom - and THREE more cards "
   "lie FACE DOWN in a horizontal row beneath it. All eight are whole and clearly separate. Laid "
   "by hand and it shows: uneven spacing, several cards at slightly wrong angles."),

 "the-small-instruction": ("wed", "The Small Instruction", 1, 5, "Four of Cups",
   "a line of steps climbing away, not a row",
   "THE CARDS: six tarot cards on the cloth in front of the raven, laid in ONE LONG LINE that "
   "climbs from the left of the picture up to the upper right, one card after another like "
   "stepping stones. The card at the near end of the line, lowest and furthest left, lies FACE "
   "UP: the Rider-Waite FOUR OF CUPS - a young man sitting on the grass under a tree with his "
   "arms folded and his legs crossed, three golden cups standing on the ground in front of him "
   "and a fourth cup held out to him from a small grey cloud, FOUR OF CUPS printed in the band "
   "at the bottom. The other FIVE cards lie FACE DOWN along the line above it, each one whole "
   "and clearly separate. Laid by hand and it shows: uneven spacing, several cards at slightly "
   "wrong angles, the line not quite straight."),

 "the-undertow": ("thu", "The Undertow", 2, 5, "Five of Cups · The Moon",
   "a current curving away from the pair",
   "THE CARDS: seven tarot cards on the cloth in front of the raven. TWO lie FACE UP on the "
   "left, one directly above the other. The upper one is the Rider-Waite FIVE OF CUPS - a figure "
   "in a long black cloak standing with his head bowed over three golden cups tipped over and "
   "spilled on the ground, two more cups still standing upright behind him, a river with a small "
   "bridge and a house in the distance, FIVE OF CUPS printed in the band at the bottom. The "
   "lower one is THE MOON - a path running away between two grey towers, a dog and a wolf "
   "howling up at a face in the moon, a crayfish crawling out of a pool in the foreground, "
   "numbered XVIII with THE MOON in the band at the bottom. To the right of that pair, FIVE "
   "cards lie FACE DOWN in a long shallow CURVE that bends away to the right like a current "
   "pulling, each one whole and clearly separate. Laid by hand and it shows: uneven spacing, "
   "several cards at slightly wrong angles."),

 "the-ledger": ("fri", "The Ledger", 3, 6, "Four of Pentacles · Five of Pentacles · Nine of Pentacles",
   "two columns under one card, like an account",
   "THE CARDS: nine tarot cards on the cloth in front of the raven, laid out like a ledger - one "
   "card alone at the top, TWO COLUMNS of three beneath it, and two more side by side at the "
   "bottom of the group. The ledger is a TALL shape of four rows, so the camera is pulled WELL "
   "BACK and every card is SMALL in the picture: the whole nine-card group is compact and fits "
   "inside the middle of the frame, taking up about half the height of the picture, with a broad "
   "band of empty cloth above the top card and a broad band of empty cloth below the bottom "
   "pair. The single card at the top lies FACE UP: the Rider-Waite FOUR OF "
   "PENTACLES - a seated man in a red robe and a gold crown clutching one gold pentacle against "
   "his chest with both arms, another balanced on top of his crown and one under each foot, a "
   "grey town behind him, FOUR OF PENTACLES in the band at the bottom. The LEFT column begins "
   "with a FACE UP card, the FIVE OF PENTACLES - two ragged beggars, one on wooden crutches, "
   "trudging through falling snow past a lit stained-glass church window, FIVE OF PENTACLES in "
   "the band at the bottom - and TWO cards lie FACE DOWN below it. The RIGHT column begins with "
   "a FACE UP card, the NINE OF PENTACLES - a woman in an embroidered yellow gown standing alone "
   "in a walled garden of grape vines, a hooded falcon perched on her gloved hand, NINE OF "
   "PENTACLES in the band at the bottom - and TWO cards lie FACE DOWN below it. TWO more cards "
   "lie FACE DOWN side by side at the bottom of the group. All nine are whole and clearly "
   "separate. Laid by hand and it shows: uneven spacing, the two columns not quite level."),

 "the-other-chair": ("sat", "The Other Chair", 2, 5, "Knight of Cups · Seven of Cups",
   "dealt from the far side of the table, facing away",
   "THE CARDS: seven tarot cards on the cloth in front of the raven, dealt by somebody sitting "
   "on the FAR side of the table, so the whole group faces away and the two face-up cards read "
   "UPSIDE DOWN from where the camera is. The TWO FACE UP cards sit side by side at the far edge "
   "of the group. The left one is the Rider-Waite KNIGHT OF CUPS - a knight in armour on a white "
   "horse walking at a slow pace, holding a single golden cup straight out in front of him, "
   "small wings on his helmet and on his heels, a river and low hills behind him, KNIGHT OF CUPS "
   "printed in the band at the bottom. The right one is the SEVEN OF CUPS - a dark faceless "
   "figure seen from behind in silhouette, looking up at seven golden cups floating in a bank of "
   "cloud, each cup holding something different: a face, a veiled figure, a snake, a castle, "
   "jewels, a wreath, a dragon, SEVEN OF CUPS in the band at the bottom. FIVE cards lie FACE "
   "DOWN in one horizontal row nearer the camera, each one whole and clearly separate. Laid by "
   "hand and it shows: uneven spacing, several cards at slightly wrong angles."),

 "the-zodiac-spread": ("sun", "The Zodiac Spread", 3, 9,
   "Queen of Swords · King of Pentacles · The High Priestess",
   "a full ring of twelve, the houses",
   "THE CARDS: TWELVE tarot cards and no more, laid in a wide RING around the raven, ONE card at "
   "each hour of a clock face and nothing in between, following the printed circle. Count them: "
   "twelve cards, THREE face up and NINE face down. The nine FACE DOWN cards are at two "
   "o'clock, three, four, six, seven, eight, ten, eleven and twelve o'clock. Each card points "
   "inward toward the centre, so cards at the top of the ring are upside down and those at the "
   "sides lie sideways. The whole ring is small in the picture and sits above the middle, with a "
   "wide band of empty cloth below it. THREE cards are FACE UP, at "
   "the nine o'clock, one o'clock and five o'clock positions. At nine o'clock is the QUEEN OF "
   "SWORDS - a crowned woman in a pale robe seated on a carved stone throne, holding one sword "
   "upright in her right hand and her left hand raised open, a bank of cloud below her, QUEEN OF "
   "SWORDS in the band at the bottom. At one o'clock is the KING OF PENTACLES - a bearded king "
   "on a throne carved with bulls' heads, one gold pentacle resting on his knee, his robe "
   "covered all over with grapevines and fruit, a castle wall behind him, KING OF PENTACLES in "
   "the band at the bottom. At five o'clock is THE HIGH PRIESTESS - a seated woman between one "
   "black pillar and one white pillar, a crescent moon at her feet, a partly hidden scroll in "
   "her lap, numbered II with THE HIGH PRIESTESS in the band at the bottom. All twelve are whole "
   "and clearly separate. Laid by hand and it shows: uneven spacing, several at slightly wrong "
   "angles."),
}

DAY_ALIAS = {v[0]: k for k, v in SPREADS.items()}
ORDER = ["the-weight", "the-two-doors", "the-small-instruction", "the-undertow",
         "the-ledger", "the-other-chair", "the-zodiac-spread"]


def png(key):
    return os.path.join(ROOT, f"assets/07-cover-{key}.png")


def prompt(key):
    cards = SPREADS[key][6]
    return f"{HEAD}\n\n{cards}\n\n{BACK}\n\n{QUIET}\n\n{CRYSTALS}\n\n{CAMERA}"


# ── generation ───────────────────────────────────────────────────────────────────────────

def one(key):
    path = png(key)
    full = (f"Generate one image and save it to exactly this path: {path}\n\n"
            f"{prompt(key)}\n\nSave the image to {path} and then stop.")
    r = subprocess.run(["codex", "exec", "--sandbox", "workspace-write",
                        "--skip-git-repo-check", full],
                       stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=900)
    ok = os.path.exists(path)
    return key, ok, (os.path.getsize(path) if ok else 0), (r.stderr or r.stdout)[-400:]


# ── the Letter crop, and the checks that ride on it ──────────────────────────────────────

def letter_crop(im):
    """Centre-crop to 8.5x11. This is exactly what `object-fit:cover` does on page 1."""
    w, h = im.size
    if w / h > LETTER:                       # too wide: trim the sides
        nw = int(round(h * LETTER)); box = ((w - nw) // 2, 0, (w - nw) // 2 + nw, h)
    else:                                    # too tall: trim top and bottom equally
        nh = int(round(w / LETTER)); box = (0, (h - nh) // 2, w, (h - nh) // 2 + nh)
    return im.crop(box), box


def check(key):
    """ratio, how much the Letter crop eats off each end, and how busy the type band is."""
    from PIL import Image, ImageStat
    p = png(key)
    if not os.path.exists(p):
        return None
    im = Image.open(p).convert("RGB")
    w, h = im.size
    cropped, box = letter_crop(im)
    trim = round(100 * box[1] / h, 1)        # % lost off the TOP (and the same off the bottom)

    # The quiet zone is the band the scrim + type occupy: the bottom 40% of the printed page.
    # Cloth and black print are near-grey; cards and crystals are not. Colour is the tell.
    band = cropped.crop((0, int(cropped.height * 0.60), cropped.width, cropped.height))
    hsv = band.convert("HSV")
    sat = hsv.split()[1]
    busy = sum(n for v, n in enumerate(sat.histogram()) if v > 70) / (band.width * band.height)
    return dict(key=key, w=w, h=h, ratio=w / h, trim=trim,
                crop=f"{cropped.width}x{cropped.height}", busy=round(100 * busy, 1),
                mean_sat=round(ImageStat.Stat(sat).mean[0], 1))


# ── outputs ──────────────────────────────────────────────────────────────────────────────

def jpegs(keys):
    """Letter-cropped, ~150dpi, JPEG. ⛔ The S3 key ends .jpg and the uploader reads the
    extension for the content type, so a PNG under that key is served as the wrong type."""
    from PIL import Image
    out_dir = os.path.join(ROOT, "assets/07-cover-jpg")
    os.makedirs(out_dir, exist_ok=True)
    made = []
    for k in keys:
        if not os.path.exists(png(k)):
            continue
        im, _ = letter_crop(Image.open(png(k)).convert("RGB"))
        im = im.resize((SHEET_W, int(round(SHEET_W / LETTER))), Image.LANCZOS)
        dst = os.path.join(out_dir, f"07-cover-{k}.jpg")
        for q in (88, 84, 80, 74, 68):
            im.save(dst, "JPEG", quality=q, optimize=True, progressive=True)
            if os.path.getsize(dst) <= 600_000:
                break
        made.append((k, dst, os.path.getsize(dst), q))
    return made


def sheet(keys):
    """All seven, ALREADY Letter-cropped, labelled — judged as a set, not one at a time."""
    from PIL import Image, ImageDraw, ImageFont
    cw, ch, pad, lab = 380, int(round(380 / LETTER)), 16, 32
    cols = len(keys)
    canvas = Image.new("RGB", (cols * (cw + pad) + pad, ch + lab + 2 * pad), (24, 24, 26))
    d = ImageDraw.Draw(canvas)
    try:
        f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 16)
    except OSError:
        f = ImageFont.load_default()
    for i, k in enumerate(keys):
        day, title, up, down = SPREADS[k][0], SPREADS[k][1], SPREADS[k][2], SPREADS[k][3]
        x = pad + i * (cw + pad)
        if os.path.exists(png(k)):
            im, _ = letter_crop(Image.open(png(k)).convert("RGB"))
            canvas.paste(im.resize((cw, ch), Image.LANCZOS), (x, pad))
        else:
            d.rectangle([x, pad, x + cw, pad + ch], fill=(60, 40, 40))
        d.text((x, pad + ch + 8), f"{day.upper()}  {title}", font=f, fill=(240, 236, 226))
        d.text((x, pad + ch + 8 + 15), f"{up} up · {down} down", font=f, fill=(190, 168, 120))
    out = os.path.join(ROOT, "assets/07-spread-covers.png")
    canvas.save(out)
    return out, canvas.size


def main():
    argv = sys.argv[1:]
    flags = {a for a in argv if a.startswith("-")}
    named = [DAY_ALIAS.get(a, a) for a in argv if not a.startswith("-")]
    bad = [a for a in named if a not in SPREADS]
    if bad:
        sys.exit(f"unknown: {', '.join(bad)} — have {', '.join(ORDER)} (or mon..sun)")
    want = [k for k in ORDER if k in named] or ORDER

    if "--print" in flags:
        for k in want:
            d, t, up, dn, cards, shape, _ = SPREADS[k]
            print(f"\n{'='*78}\n{k}  —  {d} · {t}  ({up} up · {dn} down)\n"
                  f"cards: {cards}\nshape: {shape}\n{'='*78}\n{prompt(k)}")
        return

    if "--check" in flags:
        print(f"{'key':<24} {'day':<4} {'size':<11} {'ratio':<7} {'letter crop':<12} "
              f"{'trim/end':<9} {'type band'}")
        for k in want:
            r = check(k)
            if not r:
                print(f"{k:<24} {SPREADS[k][0]:<4} — no PNG")
                continue
            print(f"{k:<24} {SPREADS[k][0]:<4} {r['w']}x{r['h']:<5} {r['ratio']:.3f}   "
                  f"{r['crop']:<12} {r['trim']:>5}%    busy {r['busy']:>4}%  sat {r['mean_sat']}")
        return

    if "--jpeg" in flags:
        for k, dst, size, q in jpegs(want):
            print(f"✅ {k:<24} q{q}  {size//1024:>4}KB  {dst}")
        return

    if "--sheet" in flags:
        out, size = sheet(want)
        print(f"✅ {out}  {size[0]}x{size[1]}")
        return

    todo = want if ("--all" in flags or named) else [k for k in want if not os.path.exists(png(k))]
    if not todo:
        print("nothing to do — every PNG exists (use --all to regenerate)")
        return
    print(f"generating {len(todo)}: {', '.join(todo)}\n")
    with cf.ThreadPoolExecutor(max_workers=len(todo)) as ex:
        for key, ok, size, tail in ex.map(one, todo):
            d, t, up, dn = SPREADS[key][0], SPREADS[key][1], SPREADS[key][2], SPREADS[key][3]
            print(f"{'✅' if ok else '❌'} {key:<24} {d} · {t:<22} {up}up/{dn}dn  "
                  f"{size//1024 if ok else 0}KB")
            if not ok:
                print(f"     {tail.strip()[:300]}")


if __name__ == "__main__":
    main()
