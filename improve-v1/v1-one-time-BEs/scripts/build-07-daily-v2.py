#!/usr/bin/env python3
"""Build the seven Marcus daily emails from their APPROVED markdown sources.

  python3 scripts/build-07-daily-v2.py            # all seven
  python3 scripts/build-07-daily-v2.py mon sun    # just those
  python3 scripts/build-07-daily-v2.py --check    # parse + report, write nothing

⛔ WHY THIS REPLACES scripts/build-07-daily.py, WHICH IS STALE AND MUST NOT BE RUN.
   That script (a) keeps the copy in a python dict, so shipping approved prose means
   re-keying it by hand — the one operation that can silently reword an approved letter;
   (b) emits `marcus/card-back.jpg` for the hero and for every face-down position, which
   is the art that the spread photographs replaced; and (c) has no slot for the per-day
   face-down crop or the position-label table. Running it regresses all seven emails.
   This builder reads the .md instead, so the source of truth for a sentence is the file
   the operator approved, and a rebuild can never disagree with it.

⛔ THE BUILDER NEVER WRITES COPY. Every word in the output is lifted from the markdown.
   The only strings this file owns are chrome: the wrapper, the beat comments it passes
   through, the card `alt` text (art metadata, carried over verbatim from the shipped
   build), the masthead and the AWeber footer.
   ⭐ The masthead headshot is `marcus/07-headshot-v1.jpg`, cut by scripts/make-07-headshot.py.
   The key is VERSIONED because host-be-asset.cjs sets immutable cache headers — a new face
   is a new `-v2` key and a one-line edit here, never an overwrite of the old one.

WHAT MAPS TO WHAT

  front matter table   ->  header comment, spread name, counts, card slugs, link slug
  **Subject** / **Preheader**  ->  header comment + the hidden preheader div
  # line               ->  BEAT 2 headline (h1)
  *italic-only* line   ->  the deck line (after BEAT 3), or the "Tomorrow…" line at the foot
  ### line             ->  a unit heading (h2)
  `[IMG-n — the photograph: the cut…]`   ->  BEAT 1 hero, marcus/07-spread-<day>.jpg
  `[IMG-n — the RWS scan…]`              ->  the card at its own unit, evelyn/tarot-rws/<slug>.jpg
  `[IMG-n — the photograph, cropped…]`   ->  the withhold, marcus/07-down-<day>.jpg
  **Label** · a · b · c                  ->  the ochre position rows under that crop
  *These N are still in my hand*         ->  its caption
  **P.S.** …            ->  the permanent P.S. slot
  anything else         ->  a body paragraph

⛔ TWO BRACE TOKENS THAT MEAN OPPOSITE THINGS — never sweep braces.
   `{{ subscriber.first_name | capitalize }}`  AWeber Liquid. Must reach the send INTACT.
   `{{BOOKING_URL}}`                            ours. Substituted at send time.
   Both are passed through untouched; only the `&` inside a link URL is escaped, to `&amp;`.

⛔ THE `&s=` VALUE IS A REGISTRY KEY and is taken from the markdown, never guessed. Short
   forms (`undertow`, `zodiac`, `other-chair`) silently disable the workflow's duplicate-tier
   guard. `--check` asserts every one against scripts/07-spreads.json, which is THE registry.

⭐ The seven days, their keys and their sources are READ from scripts/07-spreads.json. Nothing
   about a spread is restated here. For the fuller agreement — counts, cards, art, covers,
   the ladder — run `node scripts/check-07-registry.mjs`.

After building, run `python3 scripts/preview-07-daily.py` to refresh the -preview twins.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DAILY = f"{ROOT}/copy/07-marcus/daily"
S3_CARD = "https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/"
S3_ART = "https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/"

F = "Helvetica,Arial,sans-serif"
INK, BODY, MUT, OCH, RULE = "#16181D", "#24262E", "#8A909C", "#A8721C", "#DDE0E6"
DECK_INK = "#5C6270"

DAY_NAME = {"mon": "Monday", "tue": "Tuesday", "wed": "Wednesday", "thu": "Thursday",
            "fri": "Friday", "sat": "Saturday", "sun": "Sunday"}

# ⭐ scripts/07-spreads.json IS the registry. A new spread is a key there plus its .md and its
#    art — never an edit in this file. ⛔ A daily's `&s=` must be one of these keys exactly.
with open(f"{ROOT}/scripts/07-spreads.json", encoding="utf-8") as _f:
    _REG = json.load(_f)
REGISTRY = set(_REG["spreads"])

# ⛔ KEYED ON THE SPREAD KEY, NOT THE WEEKDAY, and it must stay that way.
#    This used to be `{s["day"]: …}`, which is a dict comprehension over thirty spreads into
#    seven slots: twenty-three were dropped, last-one-wins, silently. It also read
#    s["built_email"]["email_md"] unconditionally and so raised KeyError on any spread whose
#    art has not been shot — i.e. every spread between Phase 2 and Phase 3.
#
# ⭐ The source file is a CONVENTION, not a registry field, until the art is wired:
#       daily/07-D3-<spread-key>.md
#    Once wire-07-art.py writes `built_email`, that wins, so a renamed file still resolves.
def _stem(key, s):
    be = s.get("built_email") or {}
    if be.get("email_md"):
        return os.path.splitext(os.path.basename(be["email_md"]))[0]
    return f"07-D3-{key}"

STEMS = {k: _stem(k, s) for k, s in sorted(
    _REG["spreads"].items(), key=lambda kv: kv[1].get("day_number", 0))}

def weekday(key):
    """The weekday a spread runs, which is its OPENING SHAPE — never its identity."""
    return _REG["spreads"][key]["day"]

# Card `alt` text — art metadata, carried over verbatim from the shipped build so a
# rebuild cannot quietly change what a screen reader is told about the painting.
ALT = {
    # ── the three-card formats (2026-09-06) ──
    "nine-of-wands": "The Nine of Wands - a man leaning on a staff with a bandage wrapped round his head, looking sideways, eight more staves standing upright in a row behind him",
    "eight-of-swords": "The Eight of Swords - a woman in a red dress bound in white cloth and blindfolded, eight swords planted upright in the mud around her, a castle on a hill behind, and nobody else in the picture",
    "page-of-pentacles": "The Page of Pentacles - a young man in a green tunic holding a single gold coin up in both hands at eye level and looking at it, a ploughed field behind him with nothing growing in the furrows",
    # ── day 9 candidates (2026-09-06). ⚠ Added for BOTH remaining candidate cards, so no
    #    letter loses the bake-off to a missing dict entry instead of to its prose.
    "the-hanged-man": "The Hanged Man - a man hanging upside down by one ankle from a living wooden crosspiece with green leaves on it, his free leg crossed behind, a yellow glow around his head",
    "knight-of-pentacles": "The Knight of Pentacles - an armoured knight on a heavy black horse standing still with all four feet on the ground, holding a single coin, a ploughed field behind him",
    # ── batch 1 of the 30-day test (2026-09-06) ──
    "two-of-cups": "The Two of Cups - a man and a woman facing each other, each holding a cup out to the other, a winged lion's head over a caduceus above them",
    "eight-of-wands": "The Eight of Wands - eight staves flying through open sky above a green landscape and a river, none of them landed and nobody in the picture",
    "the-hierophant": "The Hierophant - a robed figure seated between two stone pillars with one hand raised, two crossed keys at his feet and two men kneeling in front of him",
    "six-of-cups": "The Six of Cups - six cups filled with white flowers in a courtyard, a small figure handing one of them to another",
    "four-of-swords": "The Four of Swords - a man carved in stone lying flat on a tomb with his hands together, three swords on the wall above him and a fourth beneath him",
    "six-of-pentacles": "The Six of Pentacles - a merchant holding up a set of scales in one hand and dropping coins from the other into the hands of two kneeling figures",
    "ten-of-pentacles": "The Ten of Pentacles - a stone courtyard under an archway with an old man and two dogs to one side, a man and woman talking in the arch, a child beside them, ten coins across the scene",
    # ── the shipped seven ──
    "eight-of-cups": "The Eight of Cups - a figure walking uphill away from eight stacked cups, under the moon",
    "five-of-cups": "The Five of Cups - a cloaked figure looking down at three spilled cups, two still standing behind, a bridge and a house beyond",
    "five-of-pentacles": "The Five of Pentacles - two figures moving through snow past a lit stained-glass window",
    "four-of-cups": "The Four of Cups - a young man under a tree, arms folded, three cups before him and a fourth held out of a cloud",
    "four-of-pentacles": "The Four of Pentacles - a seated figure clutching one coin, one balanced on the head, two beneath the feet, a town behind",
    "king-of-pentacles": "The King of Pentacles - a robed king on a throne carved with bulls, a coin in one hand, grapevines all over his robe and a castle behind",
    "knight-of-cups": "The Knight of Cups - an armoured rider on a walking white horse, holding a single cup out in front of him, winged helm, a river behind",
    "nine-of-pentacles": "The Nine of Pentacles - a woman alone in a walled garden of vines, a hooded falcon on her gloved hand",
    "queen-of-swords": "The Queen of Swords - a crowned woman on a stone throne holding an upright sword, one hand raised, clouds below her",
    "seven-of-cups": "The Seven of Cups - a dark figure in silhouette before seven cups floating in cloud, each holding a different vision",
    "ten-of-wands": "The Ten of Wands - a figure bent forward carrying ten staves in both arms, a town in the distance",
    "the-devil": "The Devil - a horned figure on a block, two people chained below, the chains hanging loose",
    "the-high-priestess": "The High Priestess - a seated figure between a black and a white pillar, a crescent moon at her feet, a partly hidden scroll in her lap",
    "the-moon": "The Moon - a path between two towers, a dog and a wolf howling, a crayfish coming out of the pool",
}


# ── inline copy ────────────────────────────────────────────────────────────────────────────
def typo(t):
    """Entities and typography. ⛔ Runs on PROSE ONLY — never on a URL, never on a brace token."""
    t = t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    t = t.replace("'", "&rsquo;").replace("’", "&rsquo;")
    t = t.replace("—", "&mdash;").replace("–", "&ndash;")
    t = t.replace("·", "&middot;").replace("…", "&hellip;")
    return t


def emphasis(t):
    """**bold** -> <b>, *italic* -> <i>. Bold first, or the italic rule eats its asterisks."""
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"\*(.+?)\*", r"<i>\1</i>", t)
    return t


def inline(t):
    """Markdown inline -> email HTML, with the two brace tokens carried through untouched.

    Links are lifted out first and re-inserted last, so `typo` never sees a URL: it would
    turn the `&` of `?c=1&s=the-weight` into `&amp;` twice, and there is no version of that
    which still resolves.
    """
    links = []

    def stash(m):
        links.append((m.group(1), m.group(2)))
        return f"\x00{len(links) - 1}\x00"

    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", stash, t)
    t = emphasis(typo(t))
    for i, (label, url) in enumerate(links):
        href = url.replace("&", "&amp;")          # the ONLY escape a URL gets
        anchor = (f'<a href="{href}" style="color:#0000ff;font-weight:bold;">'
                  f'{emphasis(typo(label))}</a>')
        t = t.replace(f"\x00{i}\x00", anchor)
    return t


# ── rows ───────────────────────────────────────────────────────────────────────────────────
def p(t):
    return (f'  <tr><td class="px" style="padding:0 30px 18px;">'
            f'<p style="margin:0;font-size:16.5px;line-height:1.62;color:{BODY};">{t}</p></td></tr>')


def h1(t):
    return (f'  <tr><td class="px" style="padding:18px 30px 0;">\n'
            f'    <h1 style="margin:0;font-size:29px;line-height:1.22;font-weight:bold;'
            f'color:{INK};">{t}</h1></td></tr>')


def h2(t):
    return (f'  <tr><td class="px" style="padding:30px 30px 0;">'
            f'<h2 style="margin:0 0 16px;font-size:21px;font-weight:bold;color:{INK};">{t}</h2></td></tr>')


def deck(t):
    return (f'  <tr><td class="px" style="padding:14px 30px 0;">\n'
            f'    <p style="margin:0;font-size:16.5px;line-height:1.55;font-style:italic;'
            f'color:{DECK_INK};">{t}</p></td></tr>')


def tomorrow(t):
    return (f'  <tr><td class="px" style="padding:0 30px 18px;">'
            f'<p style="margin:0;font-size:16.5px;line-height:1.62;color:{BODY};">'
            f'<span style="font-size:13.5px;font-style:italic;color:{MUT};">{t}</span></p></td></tr>')


def hero(key, caption):
    return (f'\n  <!-- BEAT 1 · HERO — ⛔ a PHOTOGRAPH of cards already laid. The act, done. -->\n'
            f'  <tr><td align="center" style="padding:28px 0 0;">\n'
            f'    <img src="{S3_ART}07-spread-{key}.jpg" alt="{caption}" width="600" '
            f'style="display:block;width:100%;max-width:600px;height:auto;">\n'
            f'    <p style="margin:14px 30px 0;font-family:{F};font-size:11px;letter-spacing:.16em;'
            f'text-transform:uppercase;color:{MUT};">{caption}</p></td></tr>')


def card(slug):
    alt = ALT.get(slug)
    if alt is None:
        raise SystemExit(f"⛔ no alt text on file for card '{slug}' — add it to ALT before building")
    return (f'  <tr><td align="center" style="padding:0 20px 20px;">\n'
            f'    <img class="cardimg" src="{S3_CARD}{slug}.jpg" alt="{alt}" width="200" '
            f'style="display:block;width:200px;max-width:100%;height:auto;border:1px solid {RULE};">'
            f'</td></tr>')


def facedown(key, groups, caption, n):
    """The withhold: ONE photograph of the real layout, the position names beneath it.

    ⛔ Not a cut-out card tiled n times — a card shot at 75° is foreshortened, reads as a
    square tile, and drags black cloth corners onto the white sheet.
    """
    rows = ""
    for label, items in groups:
        rows += (f'<tr><td style="font-family:{F};font-size:10px;letter-spacing:.16em;'
                 f'text-transform:uppercase;color:{OCH};font-weight:bold;padding:14px 0 3px;">'
                 f'{label}</td></tr>'
                 f'<tr><td style="font-family:{F};font-size:13px;line-height:1.5;color:{MUT};">'
                 f'{items}</td></tr>')
    return (f'\n  <!-- BEAT 10/11 · THE WITHHOLD — the paid positions, still face down. -->\n'
            f'  <tr><td align="center" style="padding:28px 0 0;">\n'
            f'    <img src="{S3_ART}07-down-{key}.jpg" alt="{n} cards lying face down" width="600" '
            f'style="display:block;width:100%;max-width:600px;height:auto;"></td></tr>\n'
            f'  <tr><td class="px" style="padding:4px 30px 0;">'
            f'<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">'
            f'{rows}</table>'
            f'<p style="margin:16px 0 0;font-family:{F};font-size:11px;letter-spacing:.12em;'
            f'text-transform:uppercase;color:{MUT};">{caption}</p></td></tr>')


def ps(t):
    return ('\n  <!-- P.S. · permanent slot, ratified across all eight letters -->\n'
            f'  <tr><td class="px" style="padding:24px 30px 0;">'
            f'<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>\n'
            f'      <td width="3" bgcolor="{OCH}" style="background-color:{OCH};"></td>\n'
            f'      <td style="padding:13px 16px;font-size:15px;line-height:1.6;color:{BODY};'
            f'background-color:#FAF7F1;"><b>P.S.</b> {t}</td>\n'
            f'    </tr></table></td></tr>')


# ── the markdown ───────────────────────────────────────────────────────────────────────────
IMG = re.compile(r"^`\[IMG-\d+\s*[—-]\s*(.+?)\]`$")
ITALIC_ONLY = re.compile(r"^\*([^*]+)\*$")
GROUP = re.compile(r"^\*\*(.+?)\*\*\s*·\s*(.+)$")
HAND = re.compile(r"^\*These (\d+) are still in my hand\*$")


def parse(path):
    raw = open(path, encoding="utf-8").read()
    lines = raw.split("\n")

    def cell(key):
        m = re.search(rf"^\|\s*\*\*{key}\*\*\s*\|(.+?)\|\s*$", raw, re.M)
        return m.group(1).strip() if m else ""

    title = lines[0]
    # ⛔ `07-D\d*`, not `07-D`. The 30-day test's letters are `07-D3-…` and the old pattern
    #    refused every one of them with "cannot read the title line". Same generation-number
    #    blindness that made copy-check.cjs skip every D2 file silently in 2026-09.
    m = re.match(r"^#\s*07-D\d*\s*·\s*(\w+)\s*[—-]\s*(.+?)\s*\*\(", title)
    if not m:
        raise SystemExit(f"⛔ {path}: cannot read the title line")
    spread = m.group(2).strip()

    free = int(re.search(r"\*\*(\d+)\*\*", cell("Free")).group(1))
    paid = int(re.search(r"\*\*\+?(\d+)\*\*", cell("Paid")).group(1))
    shape = re.sub(r"\s+", " ", cell("Shape"))
    slug = re.search(r"s=([a-z0-9-]+)", cell("Links")).group(1)
    cards = [c.split("/")[-1] for c in re.findall(r"`([a-z0-9/-]+)`", cell("Cards"))]

    subject = re.search(r"^\*\*Subject\*\*\s*[—-]\s*`(.+)`\s*$", raw, re.M).group(1)
    preheader = re.search(r"^\*\*Preheader\*\*\s*[—-]\s*(.+?)\s*$", raw, re.M).group(1)

    start = next(i for i, l in enumerate(lines)
                 if l.strip() == "---" and i > lines.index(
                     next(l for l in lines if l.startswith("**Preheader**"))))
    body = [l.rstrip() for l in lines[start + 1:]]
    return dict(spread=spread, free=free, paid=paid, shape=shape, slug=slug, cards=cards,
                subject=subject, preheader=preheader, body=body)


def render(key, d):
    out, i, card_i = [], 0, 0
    body, signed_off = d["body"], False
    while i < len(body):
        line = body[i].strip()
        i += 1
        if not line:
            continue

        if line.startswith("<!--"):
            out.append(f"\n  {line}")
            continue

        m = IMG.match(line)
        if m:
            what = m.group(1)
            if "RWS scan" in what:
                out.append(card(d["cards"][card_i]))
                card_i += 1
            elif "cropped" in what:
                groups, caption, n = [], "", str(d["paid"])
                while i < len(body):
                    nxt = body[i].strip()
                    if not nxt or nxt.startswith("<!--"):
                        i += 1 if not nxt else 0
                        if not nxt:
                            continue
                        break
                    g = GROUP.match(nxt)
                    h = HAND.match(nxt)
                    if g:
                        label, items = g.group(1), g.group(2)
                        items = " &middot; ".join(typo(x.strip()) for x in items.split("·"))
                        groups.append((typo(label), items))
                        i += 1
                    elif h:
                        n, caption = h.group(1), typo(nxt.strip("*"))
                        i += 1
                        break
                    else:
                        break
                out.append(facedown(key, groups, caption, n))
            else:                                        # the hero photograph
                cap = ""
                while i < len(body):
                    nxt = body[i].strip()
                    if not nxt:
                        i += 1
                        continue
                    mm = ITALIC_ONLY.match(nxt)
                    if mm and nxt.lower().startswith("*the cut"):
                        cap, i = typo(mm.group(1)), i + 1
                    break
                out.append(hero(key, cap))
            continue

        if line.startswith("# "):
            out.append(h1(inline(line[2:].strip())))
            continue
        if line.startswith("### "):
            out.append(h2(inline(line[4:].strip())))
            continue
        if line.startswith("**P.S.**"):
            out.append(ps(inline(line[len("**P.S.**"):].strip())))
            continue

        mm = ITALIC_ONLY.match(line)
        if mm:
            out.append(tomorrow(inline(mm.group(1))) if signed_off else deck(inline(mm.group(1))))
            continue

        out.append(p(inline(line)))
        if line.startswith("— Marcus"):
            signed_off = True
    return "\n".join(out)


# ── the wrapper ────────────────────────────────────────────────────────────────────────────
def build(key, d):
    total = d["free"] + d["paid"]
    # ⛔ Subject and Preheader stay RAW here so the line can be pasted straight into AWeber.
    #    An entity in a subject field sends as the literal characters `&rsquo;`.
    head = f'''<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"><head>
<title></title><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- 07-D {DAY_NAME[weekday(key)].upper()} - {d["spread"]}. Marcus Stone daily. {d["free"]} face up + {d["paid"]} face down = {total}.
     Built by scripts/build-07-daily-v2.py from daily/{STEMS[key]}.md, which holds the
     APPROVED prose. ⛔ The builder writes no copy — rebuild it, don't edit it here.
     ⛔ scripts/build-07-daily.py is STALE (it emits marcus/card-back.jpg). Never run it.
     SHAPE: {d["shape"]}
     ⛔ NO PRICE, NO DELIVERY PROMISE - both live on the booking page, statements 5 and 6.
     ⛔ HERO IS A PHOTOGRAPH of the cut already laid. Faces appear only at their own unit.
     ⛔ FIRST CTA COMES AFTER THE FREE READ COMPLETES (00e beat 11).
     ⛔ THREE TEXT CTAs, NO BUTTON - every CTA is a sentence with a permission verb (02-E2 rule).
     Subject:   {d["subject"]}
     Preheader: {d["preheader"]}
     Sends 6pm SGT = 6am ET.  CTAs -> booking page, ?c=1..3&s={d["slug"]}.
     ⛔ `s=` IS A REGISTRY KEY. A short form silently disables the duplicate-tier guard.
     TWO BRACE TOKENS, OPPOSITE MEANINGS: the Liquid name tag must reach AWeber INTACT;
     {{{{BOOKING_URL}}}} must be substituted BEFORE sending. A brace sweep eats the name tag. -->
<style>
  body,a{{word-break:break-word;}} table{{border-collapse:collapse;}}
  @media only screen and (max-width:600px){{
    .container{{width:100%!important;}} .px{{padding-left:18px!important;padding-right:18px!important;}}
    .cardimg{{width:150px!important;}}
  }}
</style></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">{typo(d["preheader"])}</div>
<center>
<table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
<tr><td align="center" style="padding:0;">
<table class="container" align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;font-family:{F};">

  <!-- MASTHEAD - the headshot sits BESIDE the wordmark, never above it. Stacked, it would push
       the h1 a further 56px down the preview pane, and the h1 is the only thing selling the open.
       ⛔ The circle is painted into the JPEG on white; border-radius is belt-and-braces, because
       Outlook's Word engine drops it. ⛔ Group width is 56+12+~191 = 259px, which is what keeps
       it on ONE line at 320px (26px gutters leave 268px). A bigger face wraps the wordmark. -->
  <tr><td align="center" style="padding:30px 26px 0;">
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center" style="margin:0 auto;">
      <tr>
        <td width="56" valign="middle" style="width:56px;padding:0 12px 0 0;">
          <img src="{S3_ART}07-headshot-v1.jpg" alt="Marcus Stone" width="56" height="56" style="display:block;width:56px;height:56px;border:0;border-radius:28px;background-color:#F1EFEA;font-family:{F};font-size:9px;line-height:11px;color:{MUT};"></td>
        <td valign="middle" align="left" style="text-align:left;">
          <p style="margin:0;font-size:19px;letter-spacing:.16em;text-transform:uppercase;color:{INK};font-weight:bold;">Marcus Stone</p></td>
      </tr>
    </table>
    <p style="margin:7px 0 0;font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:{MUT};">Daily Tarot &middot; The Seer Within</p></td></tr>
  <tr><td style="padding:20px 26px 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td height="1" bgcolor="{RULE}" style="background-color:{RULE};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
  <tr><td align="center" style="padding:18px 26px 0;">
    <p style="margin:0;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:{OCH};font-weight:bold;">{DAY_NAME[weekday(key)]} &middot; {d["spread"]}</p></td></tr>
'''
    foot = f'''
  <tr><td style="padding:28px 26px 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td height="1" bgcolor="{RULE}" style="background-color:{RULE};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
  <tr><td align="center" style="padding:20px 26px 30px;font-size:12px;line-height:16px;color:{MUT};">
    140 Broadway, Manhattan,<br>New York New York 10005<br>USA<br><br>
    <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" rel="noopener noreferrer" style="color:#0000ff;text-decoration:underline;">Unsubscribe</a>
    &nbsp;|&nbsp;
    <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" rel="noopener noreferrer" style="color:#0000ff;text-decoration:underline;">Change Subscriber Options</a></td></tr>

</table></td></tr></table></center></body></html>
'''
    return head + render(key, d) + foot


# ── checks that run on every build ─────────────────────────────────────────────────────────
def audit(key, d, html):
    bad = []
    if d["slug"] not in REGISTRY:
        bad.append(f"`s={d['slug']}` is NOT a registry key")
    for s in re.findall(r"&amp;s=([a-z0-9-]+)", html):
        if s not in REGISTRY:
            bad.append(f"link carries a non-registry key `s={s}`")
    if "{{ subscriber.first_name | capitalize }}" not in html:
        bad.append("the AWeber Liquid name tag is missing or mangled")
    if "{{BOOKING_URL}}" not in html:
        bad.append("{{BOOKING_URL}} is missing")
    if re.search(r"\$\s?[\d,]", html):
        bad.append("A PRICE reached a letter")
    if re.search(r"\b(?:within|inside)\s+(?:24 ?h(?:ours?)?|(?:three|3) (?:days|nights))\b", html, re.I):
        bad.append("A DELIVERY PROMISE reached a letter")
    tiers = sorted(set(re.findall(r"\?c=(\d)&amp;", html)))
    if tiers != ["1", "2", "3"]:
        bad.append(f"CTA tiers are {tiers}, expected 1/2/3")
    if any("card-back" in u for u in re.findall(r'<img[^>]+src="([^"]+)"', html)):
        bad.append("the retired card-back art is in the output")
    if html.count("07-headshot-v1.jpg") != 1:
        bad.append("masthead headshot missing or duplicated")
    if html.count(f"07-spread-{key}.jpg") != 1:
        bad.append("hero photograph missing or duplicated")
    if html.count(f"07-down-{key}.jpg") != 1:
        bad.append("face-down crop missing or duplicated")
    if len(re.findall(r"tarot-rws/", html)) != len(d["cards"]):
        bad.append(f"card scans: {len(re.findall(r'tarot-rws/', html))} rendered, "
                   f"{len(d['cards'])} declared")
    return bad


def words(html):
    text = re.sub(r"<!--.*?-->", " ", html, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\{\{[^}]*\}\}", " ", text)
    text = re.sub(r"&[a-z]+;", " ", text)
    return len(text.split())


def main():
    args = sys.argv[1:]
    check = "--check" in args
    days = [a for a in args if a in STEMS] or list(STEMS)
    unknown = [a for a in args if a not in STEMS and not a.startswith("-")]
    if unknown:
        raise SystemExit(f"⛔ not a spread key: {', '.join(unknown)}\n"
                         "   ⚠ weekday arguments (mon/tue/…) no longer address a spread — the "
                         "thirty run several spreads per weekday.\n"
                         f"   have: {', '.join(list(STEMS)[:6])} …")
    fail = False
    asked = [a for a in args if a in STEMS]
    unwritten = []
    for key in days:
        src = f"{DAILY}/{STEMS[key]}.md"
        if not os.path.exists(src):
            # ⭐ STAGING, NOT FAILURE. The 30-day test writes six letters, reads the money, then
            #    writes the rest. So 24 spreads legitimately have no .md between waves. A spread
            #    named ON THE COMMAND LINE is different — you asked for it, so its absence is a
            #    real error.
            if key in asked:
                print(f"❌ {key}  no markdown source at {src}")
                fail = True
            else:
                unwritten.append(key)
            continue
        d = parse(src)
        html = build(key, d)
        problems = audit(key, d, html)
        imgs = len(re.findall(r'<img ', html))
        if not check:
            open(f"{DAILY}/{STEMS[key]}.html", "w", encoding="utf-8").write(html)
        flag = "  ⚠ NEAR GMAIL'S 102KB CLIP" if len(html.encode()) > 92_000 else ""
        print(f"{'·' if check else '✅'} {key}  {STEMS[key]}.html  "
              f"{words(html):>5} words  {len(html.encode()):>6} bytes  {imgs} images  "
              f"s={d['slug']}{flag}")
        for b in problems:
            print(f"     ❌ {b}")
            fail = True
    if unwritten:
        print(f"\n⚠ {len(unwritten)} spread(s) have no letter yet — not built, not a failure:")
        print(f"   {' · '.join(unwritten)}")
        print("   ⛔ Phase 4: six letters, then read the money at five sends, then the rest.")
    if fail:
        sys.exit(1)
    if not check:
        print("\nNow refresh the previews:  python3 scripts/preview-07-daily.py")


if __name__ == "__main__":
    main()
