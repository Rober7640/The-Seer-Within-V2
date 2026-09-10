#!/usr/bin/env python3
"""Marcus's headshot for the daily-email masthead — candidates, contact sheet, email asset.

  python3 scripts/make-07-headshot.py                 # generate every missing candidate
  python3 scripts/make-07-headshot.py plain table     # just those
  python3 scripts/make-07-headshot.py --all           # regenerate, overwriting
  python3 scripts/make-07-headshot.py --print plain   # show the composed prompt, generate nothing
  python3 scripts/make-07-headshot.py --sheet         # build the contact sheet, generate nothing
  python3 scripts/make-07-headshot.py --asset plain   # cut the chosen one into the email asset

⭐ THE MAN IS ALREADY DECIDED. `uploads/avatars/hi-def/marcus.png` at the REPO ROOT is the
   face the V2 chat service already shows for Marcus Stone, and a subscriber who writes back
   meets it. So `app` is a candidate in its own right, and the three generated ones describe
   THE SAME MAN — one MAN paragraph, shared verbatim, exactly the way 07-art-prompt.md shares
   HEAD and TAIL across the seven days. Only the framing and the mood change.

⭐ THE REGISTER IS THE ART RULE's, not a studio's: an ordinary phone snapshot of somebody's
   real practice, flat daylight, everything in focus, no grade. See docs/07-marcus/07-art-prompt.md.
   A styled corporate portrait belongs to a different offer.

⭐ THE DECIDING TEST IS PANEL B, and it is the whole reason this script draws a sheet at all.
   The masthead shows the face at 56 CSS px. Panel B rebuilds the real masthead — wordmark,
   tracking, rule, ochre day line — around each candidate at that exact size. A portrait that
   is handsome at 900px and turns to porridge at 56px is not a candidate. (Same mistake the
   card backs made once: scripts/make-07-back-sheet.py, panel B.)

⛔ Prompt length and stdin: see the header of scripts/gen-image.py. Both cost an hour.
"""
import concurrent.futures as cf
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(os.path.dirname(ROOT))
APP_AVATAR = os.path.join(REPO, "uploads/avatars/hi-def/marcus.png")

# ── the shared paragraphs ──────────────────────────────────────────────────────────────────
# ⛔ Identical in every candidate. Change one word here and the four stop being one man.
MAN = (
    "THE MAN: he is about seventy. Long grey-white hair, thinning at the front, combed back "
    "off his forehead and falling past his collar. A full white beard, untrimmed, reaching the "
    "middle of his chest, a little grey still in the moustache. A long weathered face, deep-set "
    "pale eyes under heavy brows, strong lines across the forehead and beside the mouth. He "
    "wears a heavy dark brown corduroy jacket over a patterned scarf. He is calm and unhurried "
    "and faintly amused. No hat, no rings, no costume, nothing theatrical."
)

CAMERA = (
    "THE PHOTOGRAPH: an ordinary snapshot taken on a phone by somebody standing in the room "
    "with him. Flat natural daylight from a window on the left, no flash and no studio lighting, "
    "gentle shadows. Everything roughly in focus, the way a phone camera renders. Natural "
    "colour, slightly desaturated, no filter and no colour grading, not retouched. A real room "
    "on a real morning, not a portrait session. A SQUARE picture, the same width as its height. "
    "No text anywhere in the image."
)

# ── the candidates ─────────────────────────────────────────────────────────────────────────
CANDIDATES = {
 "plain": ("Plain wall, straight on",
   "⭐ Nothing behind him, so the face survives the shrink to 56px. The letterhead reading.",
   "THE FRAMING: a tight head-and-shoulders picture. His head fills most of the frame and the "
   "top of his shoulders sits along the bottom edge. He is looking straight into the camera, "
   "mouth closed, the beginning of a smile. Behind him is a plain warm off-white plaster wall "
   "with nothing hanging on it."),

 "table": ("Looked up from the cards",
   "⚠ Shelves behind him. Reads as his practice at full size; can go muddy small.",
   "THE FRAMING: he is sitting at a wooden table, seen from the chest up and slightly from one "
   "side. Along the bottom edge of the picture lie the corner of a cream cotton cloth printed "
   "in black ink and two tarot cards face up on it, close to the camera and cut off by the "
   "frame. He has just looked up from them, straight into the camera. Behind him a wall of low "
   "shelves with jars and books on them, plain and unfussy."),

 "hands": ("Hands on the deck, looking down",
   "⚠ His eyes are down, so it is warmer and less confronting — and a smaller face.",
   "THE FRAMING: seen from a little above and to one side, from the chest up. His hands rest on "
   "the table in front of him, one of them flat on top of a squared face-down deck of tarot "
   "cards. He is looking down at the deck, not at the camera. His face is in the upper half of "
   "the picture and clearly lit. A bare wooden table, nothing else on it."),
}

APP = ("app", "The face the app already shows",
       "⭐ Free, and already Marcus everywhere else. Candlelit and dark — a different register "
       "from the daylight art rule.")


def prompt(slug):
    _, _, framing = CANDIDATES[slug]
    head = ("A real photograph of an older man, taken indoors, a picture somebody took of him "
            "one morning where he works.")
    return f"{head}\n\n{MAN}\n\n{framing}\n\n{CAMERA}"


def path_for(slug):
    return os.path.join(ROOT, f"assets/07-headshot-{slug}.png")


# Where the face sits in each picture, as a fraction of it (left, top, right, bottom).
# ⭐ THE WHOLE FRAME IS NOT THE HEADSHOT. `table` and `hands` put the face in the upper
#    third, so an uncropped circle ships a corduroy shoulder at 56px. Panel A of the sheet
#    draws the crop that actually ships, so these are checked, never guessed - the same
#    arrangement as FACEDOWN in scripts/optimize-07-art.py.
FACE = {
    "plain": (0.14, 0.00, 0.88, 0.74),   # tight on the face; the wall adds nothing at 56px
    "table": (0.20, 0.00, 0.72, 0.52),   # face in the upper third, cards at the foot
    "hands": (0.42, 0.04, 0.90, 0.52),   # he sits right of centre and looks down
    "app":   (0.00, 0.00, 1.00, 1.00),   # square already, and centred
}


def one(slug):
    label = CANDIDATES[slug][0]
    path = path_for(slug)
    full = (f"Generate one image and save it to exactly this path: {path}\n\n"
            f"{prompt(slug)}\n\nSave the image to {path} and then stop.")
    r = subprocess.run(["codex", "exec", "--sandbox", "workspace-write",
                        "--skip-git-repo-check", full],
                       stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=600)
    ok = os.path.exists(path)
    return slug, label, ok, (os.path.getsize(path) if ok else 0), (r.stderr or r.stdout)[-300:]


# ── the email asset ────────────────────────────────────────────────────────────────────────
def circle(im, px, slug=None):
    """Crop to the face, square it, mask to a circle, composite onto WHITE.

    ⭐ The circle is baked into the pixels, not asked for with border-radius. Outlook's Word
       engine drops border-radius and would show a square; the email background is #FFFFFF, so
       a circle painted on white is round in every client that exists.
    """
    from PIL import Image, ImageDraw
    l, t, r, b = FACE.get(slug, (0.0, 0.0, 1.0, 1.0))
    im = im.convert("RGB").crop((round(l * im.width), round(t * im.height),
                                 round(r * im.width), round(b * im.height)))
    w, h = im.size
    s = min(w, h)
    # bias the square upward - a head-and-shoulders picture keeps its face in the upper half
    left, top = (w - s) // 2, min(int((h - s) * 0.30), h - s)
    im = im.crop((left, top, left + s, top + s)).resize((px, px), Image.LANCZOS)
    m = Image.new("L", (px * 4, px * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, px * 4 - 1, px * 4 - 1), fill=255)
    out = Image.new("RGB", (px, px), (255, 255, 255))
    out.paste(im, (0, 0), m.resize((px, px), Image.LANCZOS))
    # A hairline in the masthead's own rule colour. ⭐ Not decoration: a daylight portrait
    # against a pale wall has no edge of its own on a #FFFFFF sheet, and without this the
    # circle dissolves into the page at 56px. Drawn IN, so Outlook gets it too.
    ring = max(1, round(px / 56))
    ImageDraw.Draw(out).ellipse((0, 0, px - 1, px - 1), outline=(221, 224, 230), width=ring)
    return out


def asset(slug):
    """assets/email/07-headshot.jpg — 168px source for a 56px slot, i.e. 3x retina."""
    from PIL import Image
    src = APP_AVATAR if slug == "app" else path_for(slug)
    if not os.path.exists(src):
        sys.exit(f"⛔ no candidate at {src}")
    out = os.path.join(ROOT, "assets/email/07-headshot.jpg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    circle(Image.open(src), 168, slug).save(out, "JPEG", quality=88, optimize=True,
                                      progressive=True, subsampling=1)
    print(f"✅ {out}  168x168  {os.path.getsize(out) // 1024}KB   (from {slug})")
    print("   host it:  node scripts/host-be-asset.cjs file assets/email/07-headshot.jpg "
          "marcus/07-headshot-v1.jpg")


# ── the contact sheet ──────────────────────────────────────────────────────────────────────
def font(sz, bold=False):
    from PIL import ImageFont
    for p in ("/System/Library/Fonts/Supplemental/Helvetica.ttc",
              "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(p, sz, index=1 if bold else 0)
        except Exception:
            pass
    return ImageFont.load_default(sz)


def tracked(d, xy, text, f, fill, em):
    """Letter-spaced text. PIL has no tracking, and the masthead is nothing but tracking."""
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + em
    return x - xy[0] - em


def tracked_w(d, text, f, em):
    return sum(d.textlength(c, font=f) for c in text) + em * (len(text) - 1)


def plain(t):
    """Helvetica has no star or warning glyph, and PIL draws a tofu box for each one."""
    return "".join(" " if ord(c) > 0x2000 else c for c in t).strip()


def wrap(d, text, f, width):
    lines, line = [], ""
    for w in plain(text).split():
        t = f"{line} {w}".strip()
        if d.textlength(t, font=f) > width and line:
            lines.append(line)
            line = w
        else:
            line = t
    return lines + ([line] if line else [])


def masthead(cand, im, day="MONDAY · THE WEIGHT"):
    """Panel B — the REAL masthead at 600px, the width the email actually occupies.

    Mirrors build-07-daily-v2.py's build() head: 26px gutters, 30px top, 19px/.16em wordmark,
    10px/.26em strapline, a 1px #DDE0E6 rule, the ochre day line.
    """
    from PIL import Image, ImageDraw
    W, INK, MUT, OCH, RULE = 600, (22, 24, 29), (138, 144, 156), (168, 114, 28), (221, 224, 230)
    AV, GUT = 56, 12
    sheet = Image.new("RGB", (W, 190), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    f_nm, f_st, f_dy = font(19, True), font(10), font(10, True)

    name_w = tracked_w(d, "MARCUS STONE", f_nm, 19 * 0.16)
    group = (AV + GUT + name_w) if im is not None else name_w
    x = (W - group) / 2
    y = 30
    if im is not None:
        sheet.paste(im.resize((AV, AV), Image.LANCZOS), (int(x), y))
        x += AV + GUT
    tracked(d, (x, y + (AV - 19) / 2 - 3 if im is not None else y), "MARCUS STONE",
            f_nm, INK, 19 * 0.16)

    y += (AV if im is not None else 22) + 7
    st = "DAILY TAROT · THE SEER WITHIN"
    tracked(d, ((W - tracked_w(d, st, f_st, 10 * 0.26)) / 2, y), st, f_st, MUT, 10 * 0.26)
    y += 12 + 20
    d.rectangle([26, y, W - 26, y], fill=RULE)
    y += 18
    tracked(d, ((W - tracked_w(d, day, f_dy, 10 * 0.2)) / 2, y), day, f_dy, OCH, 10 * 0.2)
    return sheet.crop((0, 0, W, y + 34))


def sheet():
    from PIL import Image, ImageDraw
    BG, INK, MUT = (238, 236, 232), (22, 24, 29), (122, 128, 140)
    PAD, GAP, A_W = 34, 18, 430

    have = [(s,) + CANDIDATES[s][:2] for s in CANDIDATES if os.path.exists(path_for(s))]
    if os.path.exists(APP_AVATAR):
        have.append(APP)
    if not have:
        sys.exit("⛔ nothing to draw — generate the candidates first")

    src = {s: Image.open(APP_AVATAR if s == "app" else path_for(s)) for s, _, _ in have}
    big = {s: circle(src[s], A_W, s) for s, _, _ in have}
    tiny = {s: circle(src[s], 168, s) for s, _, _ in have}
    heads = {s: masthead(s, tiny[s]) for s, _, _ in have}
    control = masthead(None, None)

    f_hd, f_nm, f_ds, f_note = font(30, True), font(21, True), font(17), font(16)
    lab, n = 62, len(have)
    LBL_X, LBL_W = 640, 520          # panel B's label column, right of the 600px masthead
    W = PAD * 2 + max(A_W * n + GAP * (n - 1), LBL_X + LBL_W)
    H = PAD * 2 + 62 + A_W + lab + 46 + 78 + (n + 1) * (control.height + 40)

    out = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(out)
    y = PAD
    d.text((PAD, y), "07 · Marcus's headshot — four candidates, one man", font=f_hd, fill=INK)
    d.text((PAD, y + 34), "Circle-cropped exactly as the email asset is cut. Judge the FACE here; "
                          "judge the CHOICE in panel B.", font=f_note, fill=MUT)
    y += 62

    for i, (s, label, note) in enumerate(have):
        x = PAD + i * (A_W + GAP)
        out.paste(big[s], (x, y))
        d.text((x, y + A_W + 9), s, font=f_nm, fill=INK)
        d.text((x, y + A_W + 32), label, font=f_ds, fill=MUT)
    y += A_W + lab + 46

    d.text((PAD, y), "TRUE MASTHEAD — 56px, the size it ships at", font=f_hd, fill=INK)
    d.text((PAD, y + 34), "Decide here, not above. The control at the bottom is today's header, "
                          "with no photograph at all.", font=f_note, fill=MUT)
    y += 78

    for s, label, note in have:
        out.paste(heads[s], (PAD, y))
        d.text((PAD + LBL_X, y + 20), s, font=f_nm, fill=INK)
        d.text((PAD + LBL_X, y + 46), label, font=f_ds, fill=MUT)
        for j, ln in enumerate(wrap(d, note, f_ds, LBL_W)):
            d.text((PAD + LBL_X, y + 72 + j * 22), ln, font=f_ds, fill=MUT)
        y += control.height + 40
    out.paste(control, (PAD, y))
    d.text((PAD + LBL_X, y + 20), "control", font=f_nm, fill=INK)
    d.text((PAD + LBL_X, y + 46), "shipped today - no headshot", font=f_ds, fill=MUT)

    p = os.path.join(ROOT, "assets/07-headshot-candidates.png")
    out.save(p)
    print(f"wrote {p}  {out.size[0]}x{out.size[1]}  ({n} candidates + control)")


def main():
    argv = sys.argv[1:]
    if "--sheet" in argv:
        return sheet()
    if "--asset" in argv:
        want = [a for a in argv if a in CANDIDATES or a == "app"]
        return asset(want[0] if want else "plain")

    want = [a for a in argv if not a.startswith("-")]
    bad = [w for w in want if w not in CANDIDATES]
    if bad:
        sys.exit(f"unknown candidate(s): {', '.join(bad)} — have {', '.join(CANDIDATES)}")
    if "--print" in argv:
        for s in want or list(CANDIDATES):
            print(f"\n{'='*76}\n{s}  —  {CANDIDATES[s][0]}\n{CANDIDATES[s][1]}\n{'='*76}\n{prompt(s)}")
        return

    todo = want or [s for s in CANDIDATES
                    if "--all" in argv or not os.path.exists(path_for(s))]
    if not todo:
        print("nothing to do — every candidate exists (use --all to regenerate)")
        return
    print(f"generating {len(todo)}: {', '.join(todo)}\n")
    with cf.ThreadPoolExecutor(max_workers=len(todo)) as ex:
        for slug, label, ok, size, tail in ex.map(one, todo):
            print(f"{'✅' if ok else '❌'} {slug:<7} {label:<30} {size//1024 if ok else 0}KB")
            if not ok:
                print(f"     {tail.strip()[:250]}")


if __name__ == "__main__":
    main()
