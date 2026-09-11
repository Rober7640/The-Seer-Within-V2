#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""08 · MARCUS DAILY — the BROADSHEET builder.

  python3 scripts/build-08-daily.py

Regenerates docs/08-marcus/daily-email/html/{template,why-they-go-quiet,
what-is-my-higher-calling  }).html from docs/08-marcus/daily-email/letters-02/*.md.

Renders docs/08-marcus/daily-email/letters-02/*.md into the editorial-broadsheet design that won
the 2026-09-09 bake-off (designs/01-broadsheet.html), plus a tokenised template.html.

⭐ THE DESIGN LIVES HERE, NOT IN THE OUTPUT FILES. Four fixes were hand-patched into
   the HTML earlier and silently destroyed by the next rebuild. Every one of them is
   now a property of this generator:
     · heroes are .jpg   (the .png key 403s and ships alt text instead of the spread)
     · the SQUARE headshot (the round one is masked onto WHITE — four white corners
       on newsprint; it is only correct on a #ffffff ground)
     · the closing act carries real top padding (it once butted the ask panel)
     · the panel boundary is an explicit per-letter anchor, never a "face down" regex
   Plus: the reveal beat's bold openers are inline emphasis, never headings, and never
   trigger card art; heading count is ASSERTED equal to card-art count.

Copy is transferred MECHANICALLY from the markdown. Nothing is retyped.
`%`-formatting is used throughout so {{PLACEHOLDER}} braces need no escaping.

  python3 build08.py            # letters (S3 baked) + template.html (tokenised)
"""
import re, os, sys, html as H

# ROOT is derived from this file's own location: scripts/ sits next to docs/.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs/08-marcus/daily-email/letters-02")
OUT = os.path.join(ROOT, "docs/08-marcus/daily-email/html")

# ── the live S3 prefixes, baked into the letters, tokenised in the template ──
S3       = "https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com"
HERO_P   = S3 + "/marcus/08"
HEADSH_P = S3 + "/marcus/08"
CARD_P   = S3 + "/evelyn/tarot-rws"

# ── the broadsheet palette ───────────────────────────────────────────────────
GROUND, PAPER = "#dbd1b9", "#f4f1e6"     # the desk, the newsprint
INK, HEADINK  = "#14120f", "#0d0c0a"
MUTED, HAIR   = "#5b5343", "#c4b9a1"
ACCENT        = "#8f2b1f"                # oxidised press red — used TWICE only
BOXBG, BOXHAIR = "#eae4d2", "#b8ab8e"

DISPLAY = ("'Bodoni Moda','Bodoni MT',Didot,'Didot LT STD','Hoefler Text',Garamond,"
           "'Times New Roman',Times,serif")
TEXT    = "'Spectral',Georgia,Cambria,'Times New Roman',Times,serif"
ALTF    = "Georgia,'Times New Roman',Times,serif"   # alt-text face, always present

# ⛔ These must cover the LARGEST spread in docs/08-marcus/daily-email/SPREADS.md, not the largest letter.
#    They stopped at 6 while the spread was fixed at six cards; the roster now runs to twelve, and
#    a KeyError here is the first thing a big spread hits.
_W = ("One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve "
      "Thirteen Fourteen Fifteen").split()
_R = "I II III IV V VI VII VIII IX X XI XII XIII XIV XV".split()
WORD  = {i + 1: w for i, w in enumerate(_W)}
ROMAN = {i + 1: r for i, r in enumerate(_R)}
ORD   = {i + 1: w.upper() for i, w in enumerate(_W)}

# ── per-letter facts ─────────────────────────────────────────────────────────
# `panel_start` / `crosshead_start` are LITERAL opening words, not patterns. The
# letters name the face-down cards in ordinary body copy, so any "face down" regex
# grabs the reveal beat and swallows half the letter into the ask panel. The build
# asserts each anchor matches exactly one paragraph, so a rewrite that moves the
# line fails loudly instead of shipping a mis-drawn page.
LETTERS = {
 "why-they-go-quiet": dict(
   question="why he goes quiet",
   up=3, down=6-3,
   cards=[("four-of-cups", "The Four of Cups",
           "The Four of Cups &mdash; a young man under a tree, arms folded, three cups "
           "on the grass and a fourth held out of a cloud"),
          ("three-of-swords", "The Three of Swords",
           "The Three of Swords &mdash; a red heart pierced by three swords under a grey "
           "cloud and falling rain"),
          ("eight-of-swords", "The Eight of Swords",
           "The Eight of Swords &mdash; a bound and blindfolded woman standing in wet "
           "ground, eight swords upright around her, a castle on the rock behind")],
   hero_alt=("Six Rider&ndash;Waite cards laid out on a table &mdash; three face up in "
             "the top row, three still face down in the bottom row"),
   panel_start="I can't turn those three yet.",
   crosshead_start="That's the three I can turn."),
 "what-is-my-higher-calling": dict(
   question="what is my higher calling",
   up=2, down=6-2,
   cards=[("the-star", "The Star",
           "The Star &mdash; a woman kneeling at the edge of a pool, pouring from two "
           "jugs, one great eight-pointed star and seven smaller ones above her"),
          ("seven-of-pentacles", "The Seven of Pentacles",
           "The Seven of Pentacles &mdash; a man leaning on a long-handled hoe, both "
           "hands folded over the top of it, looking at seven gold discs on a bush")],
   hero_alt=("Six Rider&ndash;Waite cards laid out on a table &mdash; two face up, four "
             "still face down"),
   panel_start="I can't turn those four yet.",
   crosshead_start="That's the two I can turn."),
  }

# ── test drive, 2026-09-09 · one letter per spread shape in docs/08-marcus/daily-email/SPREADS.md ──
LETTERS.update({
 "the-risk-i-wont-regret": dict(
   question="the risk I won't regret",
   up=2, down=3, n_cards=5,
   cards=[("the-fool", "The Fool",
           "The Fool &mdash; a young man striding toward a cliff edge with his head tilted up and "
           "away from the drop, a white rose in one hand, a small bundle on a stick over his "
           "shoulder and a little white dog at his heels"),
          ("the-hermit", "The Hermit",
           "The Hermit &mdash; an old man alone on snow in a long grey hooded cloak, head bowed, "
           "holding up a lantern with a six-pointed star inside it")],
   hero_alt=("Five Rider&ndash;Waite cards laid in a cross on the reading cloth &mdash; two face "
             "up on the left and right arms, three still face down"),
   panel_start="Give me the go-ahead and I'll turn the other three.",
   crosshead_start="That's the two I can turn.",
   backs="the-cross"),
 "whats-blocking-love": dict(
   question="what's blocking love",
   up=3, down=7, n_cards=10,
   cards=[("five-of-pentacles", "The Five of Pentacles",
           "The Five of Pentacles &mdash; two beggars in falling snow beneath a tall lit church "
           "window with five gold pentacles in the glass, neither of them looking up"),
          ("seven-of-swords", "The Seven of Swords",
           "The Seven of Swords &mdash; a man in a red cap creeping away from a camp with five "
           "swords held by their blades, two more left standing in the ground behind him"),
          ("eight-of-pentacles", "The Eight of Pentacles",
           "The Eight of Pentacles &mdash; a young man cutting a pentacle at a bench, five "
           "finished ones mounted up a post beside him and one lying on the ground by his foot")],
   hero_alt=("Ten Rider&ndash;Waite cards laid out as a tree on the reading cloth &mdash; three "
             "face up at the top, seven still face down below"),
   panel_start="Give me the go-ahead and I'll turn the other seven.",
   crosshead_start="That's the three I can turn.",
   backs="tree-of-life"),
 "what-it-taught-me": dict(
   question="what that relationship taught me about myself",
   up=2, down=5, n_cards=7,
   cards=[("ace-of-cups", "The Ace of Cups",
           "The Ace of Cups &mdash; a great gold cup resting on an open hand out of a cloud, a "
           "white dove coming down into it, five streams pouring over the rim and lily pads on "
           "the water below"),
          ("two-of-cups", "The Two of Cups",
           "The Two of Cups &mdash; a young woman and a young man facing each other holding gold "
           "cups, a staff wound with two snakes between them and a winged lion&rsquo;s head in "
           "the air above")],
   hero_alt=("Seven Rider&ndash;Waite cards on the reading cloth &mdash; two face up, five still "
             "face down"),
   panel_start="Give me the go-ahead and I'll turn the other five.",
   crosshead_start="That's the two I can turn.",
   backs="cross-and-triangle"),
})

LETTERS.update({
   "why-they-go-quiet-close-a": dict(
     LETTERS["why-they-go-quiet"],
     panel_start="Give me the go-ahead and I'll turn the other three.",
     hero="why-they-go-quiet",
     backs=3,
   ),
   "what-is-my-higher-calling-close-e": dict(
     LETTERS["what-is-my-higher-calling"],
     panel_start="Give me the go-ahead and I'll turn the other four.",
     hero="what-is-my-higher-calling",
     backs=4,
   ),
})


# Same spread and assets; tests the revised clarity-first writing guidance.
LETTERS["what-is-my-higher-calling-test-clarity"] = dict(
    LETTERS["what-is-my-higher-calling-close-e"],
    panel_start="The remaining four cards",
    opening_paragraphs=1, close_style="boxed",
    crosshead_start="Those are the two cards in today's free reading.",
)


# Tests the revised opening and progression with the same cards and artwork.
LETTERS["what-is-my-higher-calling-test-flow"] = dict(
    LETTERS["what-is-my-higher-calling-close-e"],
    opening_paragraphs=1, close_style="boxed",
    panel_start="The remaining four cards",
    crosshead_start="The question now is",
)


LETTERS["why-wont-he-commit"] = dict(
    question="why won't he commit",
    up=2, down=4, n_cards=6, opening_paragraphs=1, close_style="boxed",
    cards=[("knight-of-cups", "The Knight of Cups",
            "The Knight of Cups — an armoured rider on a pale horse holding a gold cup forward"),
           ("two-of-wands", "The Two of Wands",
            "The Two of Wands — a man on a battlement holding a small globe and a staff")],
    hero_alt="Six Rider–Waite cards on a reading cloth — the Knight of Cups and Two of Wands face up, four face down",
    panel_start="The remaining four cards",
    crosshead_start="The question now is",
    backs=4,
)


LETTERS["what-part-of-me-needs-healing"] = dict(
    question="what part of myself needs the most healing right now",
    up=2, down=4, n_cards=6, opening_paragraphs=1, close_style="letter",
    cards=[("five-of-cups", "The Five of Cups",
            "The Five of Cups — a cloaked figure faces three fallen cups; two stand behind"),
           ("strength", "Strength",
            "Strength — a woman with flowers gently holds a lion's jaws")],
    hero_alt="Six Rider–Waite cards on a cloth — Five of Cups and Strength face up, four face down",
    panel_start="That is where",
    crosshead_start="The question now is",
    backs=4,
)


LETTERS["what-are-my-blind-spots"] = dict(
    question="what are my blind spots?",
    up=3, down=7, n_cards=10, opening_paragraphs=1, close_style="letter",
    display_deck=True,
    cards=[("the-moon", "The Moon",
            "The Moon — a full moon above two stone towers, a dog and wolf looking upward, a "
            "winding path, and a small crayfish emerging from the pool below"),
           ("two-of-swords", "The Two of Swords",
            "The Two of Swords — a blindfolded woman beside the sea holding two swords across "
            "her chest, with a crescent moon and rocks behind her"),
           ("three-of-pentacles", "The Three of Pentacles",
            "The Three of Pentacles — a craftsman on a bench faces two people inside a stone "
            "building; one of the other people holds the plan")],
    hero_alt="Ten Rider–Waite cards arranged as a Tree of Life — The Moon, Two of Swords, and Three of Pentacles face up; seven cards face down",
    panel_start="To continue,",
    crosshead_start="Three of the ten cards are face up.",
    backs="tree-of-life",
)



# Local funnel fixtures only. These historical drafts are NOT approved live editions.
# Free cards/labels and complete email copy are parsed from the letter above/on disk.
# Paid labels live here because conversational closes do not expose machine-readable positions.
LOCAL_FUNNEL_EDITIONS = {'what-part-of-me-needs-healing': {'id': 'healing-v1',
                                   'version': 1,
                                   'theme': 'What needs healing now and where support can begin',
                                   'paid_labels': ['What you’ve been holding back',
                                                   'What you blame yourself for',
                                                   'What support you can accept',
                                                   'Where you can begin'],
                                   'spread': {'id': 'six-questions',
                                              'name': 'The Six Questions',
                                              'version': 1},
                                   'booking_copy': {'headline': 'Let’s look at what you need now.',
                                                    'intro': 'Continue your reading on what needs '
                                                             'healing—and where you can begin.',
                                                    'bridge': 'The Five of Cups and Strength '
                                                              'brought us to the hurt you’ve been '
                                                              'trying to put aside. The next cards '
                                                              'explore what you’ve found hardest '
                                                              'to ask for, and what accepting '
                                                              'support could look like.',
                                                    'offer': 'In your full reading, I’ll bring '
                                                             'these cards together around your '
                                                             'question: what still needs your '
                                                             'attention, what you may be blaming '
                                                             'yourself for, and a first step you '
                                                             'can consider.',
                                                    'name': 'I’ll use the strengths and habits '
                                                            'your personal card represents as '
                                                            'another way to explore how you ask '
                                                            'for support—and how you respond when '
                                                            'someone offers it.'}},
 'why-wont-he-commit': {'id': 'commitment-v1',
                        'version': 1,
                        'theme': 'The gap between affection and commitment, and the buyer’s next step',
                        'paid_labels': ['What waiting costs you',
                                        'What you need from him',
                                        'What you’ve been accepting',
                                        'What your next step is'],
                        'spread': {'id': 'six-questions',
                                   'name': 'The Six Questions',
                                   'version': 1},
                        'booking_copy': {'headline': 'Let’s look at where you go from here.',
                                         'intro': 'Continue your reading on why he won’t commit, '
                                                  'what you need from him, and what you want to do '
                                                  'next.',
                                         'bridge': 'The Knight of Cups and Two of Wands showed '
                                                   'affection alongside hesitation. The next cards '
                                                   'bring the focus back to you: what waiting '
                                                   'costs you, what you need from him, and how you '
                                                   'want to respond.',
                                         'offer': 'In your full reading, I’ll bring these cards '
                                                  'together to help you consider what you want to '
                                                  'ask him for, what you’re willing to accept, and '
                                                  'your next step if his answer stays uncertain.',
                                         'name': 'I’ll use the strengths and habits your personal '
                                                 'card represents as another way to explore how '
                                                 'you express what you need—and what makes it '
                                                 'difficult to ask him for a clear answer.'}},
 'why-they-go-quiet': {'id': 'quiet-v1',
                       'version': 1,
                       'theme': 'What another person’s silence means and how the buyer can respond',
                       'paid_labels': ["What he's protecting",
                                       "What you've been doing inside his quiet",
                                       'What ends it'],
                       'spread': {'id': 'six-questions',
                                  'name': 'The Six Questions',
                                  'version': 1}},
 'what-is-my-higher-calling': {'id': 'higher-calling-v1',
                               'version': 1,
                               'theme': 'Recognizing a calling and deciding what deserves more room',
                               'paid_labels': ['What this has already cost you',
                                               "What you'd have to put down",
                                               "Who you'd have to stop being",
                                               'Where it starts'],
                               'spread': {'id': 'six-questions',
                                          'name': 'The Six Questions',
                                          'version': 1}},
 'what-is-my-higher-calling-test-flow': {'id': 'higher-calling-v2',
                                           'slug': 'what-is-my-higher-calling',
                                         'version': 2,
                                         'theme': 'Moving from waiting toward a concrete first step in a calling',
                                         'paid_labels': ['What waiting has cost you',
                                                         'What you may need to let go of',
                                                         'What needs to change',
                                                         'Where you can begin'],
                                         'spread': {'id': 'six-questions',
                                                    'name': 'The Six Questions',
                                                    'version': 1}}}
for _slug, _metadata in LOCAL_FUNNEL_EDITIONS.items():
    LETTERS[_slug]["funnel"] = _metadata

# ── copy transfer ────────────────────────────────────────────────────────────
def inline(s):
    """Escape, then apply only the markdown these letters actually use."""
    s = H.escape(s, quote=False).replace("\n", " ")
    s = re.sub(r"(?<=[A-Za-z])'(?=[A-Za-z])", "&rsquo;", s)      # curly apostrophe
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)",
               r'<em style="font-style:italic;">\1</em>', s)
    s = re.sub(r"\[([^\]]+)\]\(BOOKING\)",
               '<a href="{{BOOKING_URL}}" target="_blank" rel="noopener noreferrer" '
               'style="color:%s;text-decoration:underline;font-weight:bold;">\\1</a>'
               % ACCENT, s)
    return s.replace("—", "&mdash;").replace("–", "&ndash;")


# ── row helpers · every cell carries bgcolor + background-color + color ──────
def td(cls, pad, body, bg=PAPER, font=TEXT, size="17px", lh="29px", col=INK,
       extra="", align=""):
    c = ' class="%s"' % cls if cls else ""
    a = ' align="%s"' % align if align else ""
    return ('  <tr><td%s%s bgcolor="%s" style="padding:%s;background-color:%s;'
            'font-family:%s;font-size:%s;line-height:%s;mso-line-height-rule:exactly;'
            'color:%s;%s">%s</td></tr>\n' % (c, a, bg, pad, bg, font, size, lh, col,
                                             extra, body))


def para(text, pad, cls="px", **kw):
    return td(cls, pad, '<p style="margin:0;">%s</p>' % text,
              extra="text-align:left;", **kw)


def rules(pad, spec):
    """A stack of solid rules: spec = [(height, colour), …]."""
    rows = "".join(
        '      <tr><td height="%d" bgcolor="%s" style="background-color:%s;height:%dpx;'
        'font-size:0;line-height:0;">&nbsp;</td></tr>\n' % (h, c, c, h) for h, c in spec)
    return ('  <tr><td class="px" bgcolor="%s" style="padding:%s;background-color:%s;">\n'
            '    <table width="100%%" cellpadding="0" cellspacing="0" border="0" '
            'role="presentation">\n%s    </table></td></tr>\n' % (PAPER, pad, PAPER, rows))


SCOTCH = [(5, INK), (3, PAPER), (1, INK)]     # masthead: thick over thin
DOUBLE = [(3, INK), (3, PAPER), (1, INK)]     # section break above each card
FOLIO  = [(1, INK), (2, PAPER), (3, INK)]     # foot of the page
HAIRLINE = [(1, HAIR)]


def framed_img(src, alt, w, h, maxw, frame_style=""):
    """A press cut: 1px ink frame, the image fluid inside it.

    ⛔ SIZING — width:100% + max-width in PX. A hard px width sets the table's
       min-content width and pins the email open past 600px, which .container cannot
       override, and every line of copy clips on a phone. The width/height ATTRIBUTES
       are for Outlook, which ignores percentages and needs the real ratio.
    """
    return ('      <tr><td bgcolor="%s" style="background-color:%s;padding:1px;'
            'font-size:0;line-height:0;"><img src="%s" alt="%s" width="%d" height="%d" '
            'style="display:block;width:100%%;max-width:%dpx;height:auto;border:0;'
            'outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;'
            'font-family:%s;font-size:13px;line-height:20px;color:%s;%s"></td></tr>\n'
            % (INK, INK, src, alt, w, h, w, ALTF, PAPER, frame_style))



HILITE = "#f6e58f"          # marker-pen yellow, light enough to keep black text readable

def hilite(html_line, question):
    """Flash the morning's question inside the deck line, so a reader scanning the top of
    the letter knows what is being read for before she reads anything else.
    ⛔ background-color on a <span> is the only highlight Outlook's Word engine renders, and
       it MUST carry an explicit color or a dark-mode client inverts the text but not the
       ground and the words vanish into the yellow."""
    import html as _h
    q = _h.escape(question, quote=False)
    # ⛔ inline() has ALREADY curled the apostrophes in html_line. Apply the same transform
    #    here or any question with an apostrophe silently loses its highlight — it did.
    q = re.sub(r"(?<=[A-Za-z])'(?=[A-Za-z])", "&rsquo;", q)
    if q not in html_line:
        return html_line
    return html_line.replace(
        q, '<span style="background-color:%s;color:#1a1a1a;">%s</span>' % (HILITE, q), 1)


def hero_header(question):
    """⛔ UNUSED, kept only as a warning. The morning's question is burned INTO the hero
    photograph by scripts/make-08-heroes.py at generation time — a caption printed on the
    picture, not an HTML row above it. Do not re-enable this."""
    return ('      <tr><td bgcolor="%s" style="background-color:%s;padding:0 0 10px;'
            'font-family:%s;font-size:20px;line-height:26px;mso-line-height-rule:exactly;'
            'color:%s;text-align:left;">'
            '<span style="background-color:%s;color:#1a1a1a;">%s</span></td></tr>\n'
            % (PAPER, PAPER, DISPLAY, INK, HILITE, question))


def caption(label, italic, size="11px", lh="18px", pad="9px 0 0"):
    return ('      <tr><td bgcolor="%s" style="background-color:%s;padding:%s;'
            'font-family:%s;font-size:%s;line-height:%s;mso-line-height-rule:exactly;'
            'color:%s;text-align:left;"><span style="color:%s;letter-spacing:1.3px;">'
            '%s</span>%s</td></tr>\n'
            % (PAPER, PAPER, pad, TEXT, size, lh, MUTED, INK, label, italic))


# ── the page ─────────────────────────────────────────────────────────────────
HEAD = """<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" lang="en"><head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>The Seer Within &mdash; Marcus</title>
<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,700;1,6..96,400&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<!--<![endif]-->
<style type="text/css">
  body{-webkit-font-smoothing:antialiased;margin:0;padding:0;width:100%%;background-color:#dbd1b9;}
  img{border:0;height:auto;line-height:100%%;max-width:100%%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
  table,td{border-collapse:collapse;border-spacing:0;border:0;}
  body,a{word-break:break-word;}   /* a word too long for the column breaks instead
                                        of widening the table */
  @media only screen and (max-width:600px){
    .container{width:100%%!important;max-width:100%%!important;}
    .px{padding-left:20px!important;padding-right:20px!important;}
    .pxp{padding-left:18px!important;padding-right:18px!important;}
    .nameplate{font-size:31px!important;line-height:36px!important;letter-spacing:2px!important;}
    .deck{font-size:19px!important;line-height:29px!important;}
    .head{font-size:21px!important;line-height:27px!important;}
    .pull{font-size:19px!important;line-height:28px!important;}
    .signoff{font-size:22px!important;line-height:28px!important;}
    .dline{font-size:9px!important;letter-spacing:.8px!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:%(ground)s;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:%(ground)s;opacity:0;">%(preheader)s</div>
<div style="display:none;max-height:0;overflow:hidden;">&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<center>
<!-- THE DESK · the darker newsprint ground the sheet lies on. The colour change IS the
     edge of the paper: no border, nothing for Outlook to drop. -->
<table align="center" cellpadding="0" cellspacing="0" border="0" width="100%%" bgcolor="%(ground)s" role="presentation" style="background-color:%(ground)s;">
<tr><td align="center" bgcolor="%(ground)s" style="padding:30px 12px 36px;background-color:%(ground)s;">
<table class="container" align="center" cellpadding="0" cellspacing="0" border="0" width="600" bgcolor="%(paper)s" role="presentation" style="max-width:600px;width:100%%;background-color:%(paper)s;">
"""


def masthead(headshot_src):
    return (
    '\n  <!-- MASTHEAD · a nameplate, not a logo lockup: portrait, name set large and\n'
    '       tracked wide, the role between two short rules, then the Scotch double rule\n'
    '       (thick over thin) that says newspaper before a single word is read.\n'
    '       ⛔ THE PORTRAIT IS 08-headshot.jpg, the SQUARE original. The round variant is\n'
    '          masked onto WHITE and this masthead is newsprint, so the circle would ship\n'
    '          with four white corners. A framed square mugshot is the right form anyway. -->\n'
    '  <tr><td align="center" bgcolor="%s" style="padding:34px 30px 0;background-color:%s;">\n'
    '    <table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center"><tr>\n'
    '      <td bgcolor="%s" style="background-color:%s;padding:1px;font-size:0;line-height:0;">'
    '<img src="%s" alt="Marcus Stone" width="90" height="90" style="display:block;width:90px;'
    'height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;'
    'font-family:%s;font-size:12px;line-height:16px;color:%s;"></td>\n'
    '    </tr></table></td></tr>\n'
    % (PAPER, PAPER, INK, INK, headshot_src, ALTF, PAPER)
    + td("nameplate px", "16px 52px 0", "Marcus Stone", font=DISPLAY, size="43px",
         lh="48px", col=HEADINK, extra="letter-spacing:4px;", align="center")
    + '  <tr><td align="center" bgcolor="%s" style="padding:12px 30px 0;background-color:%s;">\n'
      '    <table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center"><tr>\n'
      '      <td width="34" valign="middle" bgcolor="%s" style="background-color:%s;width:34px;'
      'font-size:0;line-height:0;"><table width="34" cellpadding="0" cellspacing="0" border="0" '
      'role="presentation"><tr><td height="1" bgcolor="%s" style="background-color:%s;height:1px;'
      'font-size:0;line-height:0;">&nbsp;</td></tr></table></td>\n'
      '      <td valign="middle" bgcolor="%s" style="background-color:%s;padding:0 12px;'
      'font-family:%s;font-size:13px;line-height:16px;mso-line-height-rule:exactly;color:%s;'
      'font-style:italic;letter-spacing:1.6px;white-space:nowrap;">Daily Tarot Reader</td>\n'
      '      <td width="34" valign="middle" bgcolor="%s" style="background-color:%s;width:34px;'
      'font-size:0;line-height:0;"><table width="34" cellpadding="0" cellspacing="0" border="0" '
      'role="presentation"><tr><td height="1" bgcolor="%s" style="background-color:%s;height:1px;'
      'font-size:0;line-height:0;">&nbsp;</td></tr></table></td>\n'
      '    </tr></table></td></tr>\n'
      % (PAPER, PAPER, PAPER, PAPER, INK, INK, PAPER, PAPER, TEXT, MUTED,
         PAPER, PAPER, INK, INK)
    + rules("20px 52px 0", SCOTCH))


def dateline(n_cards=None):
    cell = ('      <td class="dline" align="%s" valign="top" bgcolor="%s" '
            'style="background-color:%s;font-family:%s;font-size:10px;line-height:15px;'
            'mso-line-height-rule:exactly;color:%s;letter-spacing:1.4px;">%s</td>\n')
    return ('\n  <!-- DATELINE · two cells, allowed to wrap, so nothing can push the table wide.\n'
            '       ⛔ text-transform does not work in Outlook\'s Word engine — every\n'
            '          capitalised label in this file is TYPED in capitals. -->\n'
            '  <tr><td class="px" bgcolor="%s" style="padding:8px 52px 0;background-color:%s;">\n'
            '    <table width="100%%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>\n'
            % (PAPER, PAPER)
            + cell % ("left", PAPER, PAPER, TEXT, MUTED, "MORNING EDITION")
            + cell % ("right", PAPER, PAPER, TEXT, MUTED,
                      "%s CARDS &middot; ONE QUESTION"
                      % (ORD[n_cards] if n_cards else "{{CARDS_TOTAL_CAPS}}"))
            + '    </tr></table></td></tr>\n'
            + rules("8px 52px 0", HAIRLINE))


def backs_block(src, n, w=494, h=166):
    """The still-face-down cards, shown. Sits right after the crosshead names them.
    ⛔ For a NAMED-SHAPE spread the picture is per SPREAD (08-backs-<spread>.jpg): the same
       formation as the hero with the turned positions lifted off. A flat row of backs under a
       Tree of Life broke the formation the hero had just established (operator, 2026-09-09).
       The per-COUNT letterbox row (08-backs-<n>.jpg) survives only for six-questions, whose
       bottom row really is a row."""
    return ('\n  <!-- THE %s STILL DOWN · same cloth as the hero, the turned cards lifted off.\n'
            '       No caption: the crosshead directly above has just named them. -->\n'
            '  <tr><td class="px" bgcolor="%s" style="padding:22px 52px 0;'
            'background-color:%s;">\n'
            '    <table width="100%%" cellpadding="0" cellspacing="0" border="0" '
            'role="presentation" style="max-width:496px;">\n' % (ORD[n], PAPER, PAPER)
            + framed_img(src, "%d tarot cards still face down, in their places on the reading "
                              "cloth" % n, w, h, w)
            + '    </table></td></tr>\n')


def hero_block(src, alt, upw, downw, n_cards=None, question=None):
    return ('\n  <!-- HERO · the press photograph. Inset to the text measure, not full-bleed:\n'
            '       a photograph in a newspaper sits inside the column, framed by a hairline,\n'
            '       and carries a caption under a rule.\n'
            '       ⛔ THE HERO IS .jpg, NOT .png. The .png key on S3 returns 403 and the\n'
            '          reader gets alt text where the spread should be. This bit once. -->\n'
            '  <tr><td class="px" bgcolor="%s" style="padding:28px 52px 0;background-color:%s;">\n'
            '    <table width="100%%" cellpadding="0" cellspacing="0" border="0" '
            'role="presentation" style="max-width:496px;">\n' % (PAPER, PAPER)
            + framed_img(src, alt, 494, 329, 494)
            + '      <tr><td height="1" bgcolor="%s" style="background-color:%s;height:1px;'
              'font-size:0;line-height:0;">&nbsp;</td></tr>\n' % (HAIR, HAIR)
            + caption("THE TABLE THIS MORNING",
                      ' &mdash; <em style="font-style:italic;">%s cards on one question. '
                      '%s of them are looking back at you. %s of them are not. '
                      'Rider&ndash;Waite&ndash;Smith deck, 1909.</em>'
                      % (WORD[n_cards].lower() if n_cards else "{{CARDS_TOTAL_WORD}}",
                         upw, downw))
            + '    </table></td></tr>\n')


def card_block(n, heading_html, card_src, card_alt, card_name_html, readings,
               sec_label=None, fig=None, pos=None):
    """Section furniture, repeated once per TURNED card so the page has a beat:
       double rule → headline in the display serif → framed press cut on the column
       axis → ruled caption → the reading in body copy.
       ⛔ Face-down positions get NO picture. Only turned cards."""
    sec_label = sec_label or ORD[n]
    fig = fig or ROMAN[n]
    pos = pos or ORD[n]
    out = ('\n  <!-- ══ CARD %s ══ -->\n' % sec_label
           + rules("34px 52px 0", DOUBLE)
           + td("head px", "18px 52px 0", heading_html, font=DISPLAY, size="26px",
                lh="33px", col=HEADINK, extra="font-weight:bold;text-align:left;")
           + '  <tr><td class="px" bgcolor="%s" style="padding:20px 52px 0;background-color:%s;">\n'
             '    <table width="250" cellpadding="0" cellspacing="0" border="0" '
             'role="presentation" align="left" style="width:100%%;max-width:250px;">\n'
             % (PAPER, PAPER)
           + framed_img(card_src, card_alt, 248, 425, 248)
           + '      <tr><td height="1" bgcolor="%s" style="background-color:%s;height:1px;'
             'font-size:0;line-height:0;">&nbsp;</td></tr>\n' % (HAIR, HAIR)
           + caption("FIG. %s &middot; POSITION %s" % (fig, pos),
                     '<br><em style="font-style:italic;">Turned. %s.</em>' % card_name_html,
                     size="10.5px", lh="17px", pad="8px 0 0")
           + '    </table></td></tr>\n')
    for i, r in enumerate(readings):
        out += para(r, "22px 52px 0" if i == 0 else "16px 52px 0")
    return out


def reveal_block(crosshead, items):
    """The hinge of the letter, so it gets the one device a newspaper reserves for a
       hinge: a crosshead across the measure, ruled above and below, in the display
       serif — then the still-down positions as a ruled sidebar list.
       ⛔ The sidebar's bold openers are INLINE EMPHASIS inside body paragraphs. They
          are not headings and they never get card art: there is no art for a card
          that is still face down."""
    ch = ""
    for i, t in enumerate(crosshead):
        pad = ("18px 0 4px" if i == 0 else
               ("0 0 18px" if i == len(crosshead) - 1 else "0 0 4px"))
        ch += ('      <tr><td class="pull" bgcolor="%s" style="background-color:%s;'
               'padding:%s;font-family:%s;font-size:21px;line-height:31px;'
               'mso-line-height-rule:exactly;color:%s;text-align:left;">'
               '<p style="margin:0;">%s</p></td></tr>\n'
               % (PAPER, PAPER, pad, DISPLAY, HEADINK, t))
    rows = ""
    for i, t in enumerate(items):
        pad = "0" if i == len(items) - 1 else "0 0 14px"
        rows += ('          <tr><td bgcolor="%s" style="background-color:%s;padding:%s;'
                 'font-family:%s;font-size:16.5px;line-height:28px;'
                 'mso-line-height-rule:exactly;color:%s;text-align:left;">'
                 '<p style="margin:0;">%s</p></td></tr>\n'
                 % (PAPER, PAPER, pad, TEXT, INK, t))
    return ('\n  <!-- ══ THE REVEAL ══ -->\n'
            '  <tr><td class="px" bgcolor="%s" style="padding:30px 52px 0;background-color:%s;">\n'
            '    <table width="100%%" cellpadding="0" cellspacing="0" border="0" role="presentation">\n'
            '      <tr><td height="1" bgcolor="%s" style="background-color:%s;height:1px;'
            'font-size:0;line-height:0;">&nbsp;</td></tr>\n%s'
            '      <tr><td height="1" bgcolor="%s" style="background-color:%s;height:1px;'
            'font-size:0;line-height:0;">&nbsp;</td></tr>\n'
            '    </table></td></tr>\n' % (PAPER, PAPER, INK, INK, ch, INK, INK)
            + '\n  <!-- THE POSITIONS STILL DOWN · a ruled sidebar, the same hairline device\n'
              '       the P.S. uses at the foot. Two cells, fixed 2px gutter: Outlook-proof. -->\n'
              '  <tr><td class="px" bgcolor="%s" style="padding:22px 52px 0;background-color:%s;">\n'
              '    <table width="100%%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>\n'
              '      <td width="2" bgcolor="%s" valign="top" style="background-color:%s;width:2px;'
              'font-size:0;line-height:0;">&nbsp;</td>\n'
              '      <td bgcolor="%s" style="background-color:%s;padding:0 0 0 18px;">\n'
              '        <table width="100%%" cellpadding="0" cellspacing="0" border="0" role="presentation">\n'
              '%s        </table></td>\n    </tr></table></td></tr>\n'
              % (PAPER, PAPER, HAIR, HAIR, PAPER, PAPER, rows))


def ask_block(paras):
    """A boxed editorial insert on slightly darker stock, ruled all round, with the one
       letterspaced label in the one accent colour. The link stays a sentence inside a
       paragraph — never a button, never the last thing in the letter."""
    rows = ""
    for i, t in enumerate(paras):
        pad = "16px 24px 22px" if i == len(paras) - 1 else "16px 24px 0"
        rows += ('      <tr><td class="pxp" bgcolor="%s" style="background-color:%s;'
                 'padding:%s;font-family:%s;font-size:17px;line-height:29px;'
                 'mso-line-height-rule:exactly;color:%s;text-align:left;">'
                 '<p style="margin:0;">%s</p></td></tr>\n'
                 % (BOXBG, BOXBG, pad, TEXT, INK, t))
    return ('\n  <!-- ══ THE ASK ══ -->\n'
            '  <tr><td class="px" bgcolor="%s" style="padding:30px 52px 0;background-color:%s;">\n'
            '    <table width="100%%" cellpadding="0" cellspacing="0" border="0" '
            'role="presentation" bgcolor="%s" style="background-color:%s;border:1px solid %s;">\n'
            '      <tr><td class="pxp" bgcolor="%s" style="background-color:%s;padding:20px 24px 0;'
            'font-family:%s;font-size:10.5px;line-height:16px;mso-line-height-rule:exactly;'
            'color:%s;letter-spacing:2.2px;text-align:left;">NOTICE TO READERS</td></tr>\n'
            '      <tr><td class="pxp" bgcolor="%s" style="background-color:%s;padding:6px 24px 0;">'
            '<table width="100%%" cellpadding="0" cellspacing="0" border="0" role="presentation">'
            '<tr><td height="1" bgcolor="%s" style="background-color:%s;height:1px;font-size:0;'
            'line-height:0;">&nbsp;</td></tr></table></td></tr>\n%s'
            '    </table></td></tr>\n'
            % (PAPER, PAPER, BOXBG, BOXBG, INK, BOXBG, BOXBG, TEXT, ACCENT,
               BOXBG, BOXBG, BOXHAIR, BOXHAIR, rows))


def signoff(name, sig_src):
    return ('\n  <!-- SIGN-OFF · a columnist\'s name, set in the nameplate face over a short\n'
            '       rule. ⛔ the portrait is at the TOP: two photographs of one man is one\n'
            '       too many.\n'
            '       ⛔ the rule and the name are SEPARATE rows of the 600px container. Nested\n'
            '          in one little table together, the 46px rule cell sets the table width\n'
            '          and the name wraps to "Ma / rcu / s". It did exactly that once. -->\n'
            '  <tr><td class="px" bgcolor="%s" style="padding:26px 52px 0;background-color:%s;">\n'
            '    <table width="46" cellpadding="0" cellspacing="0" border="0" role="presentation" '
            'align="left"><tr><td height="2" bgcolor="%s" style="background-color:%s;height:2px;'
            'font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>\n'
            % (PAPER, PAPER, INK, INK)
            + '  <tr><td class="px" bgcolor="%s" style="padding:10px 52px 0;'
              'background-color:%s;">' % (PAPER, PAPER)
            + '<img src="%s" alt="%s" width="280" height="93" '
              'style="display:block;width:280px;max-width:70%%;height:auto;border:0;outline:none;'
              'text-decoration:none;-ms-interpolation-mode:bicubic;font-family:%s;font-size:22px;'
              'line-height:30px;color:%s;">' % (sig_src, name, DISPLAY, HEADINK)
            + '</td></tr>\n')


# ⛔ The sign-off is his HANDWRITING, not type. The signature is a photograph of pen on paper
#    with the paper knocked out to the exact PAPER colour (#f4f1e6), so it sits on the page
#    with no visible rectangle. ⚠ If the page ground ever stops being that colour, the
#    signature must be re-flattened onto the new one or a pale box appears around it.
#    Its alt text is the name, so a client that blocks images still signs the letter.


def ps_block(paras):
    """After a dinkus, the printer's mark for a break in the setting. Quiet: muted ink,
       italic, no fill, no accent."""
    out = td("", "26px 52px 0", "&#42;&nbsp;&nbsp;&nbsp;&#42;&nbsp;&nbsp;&nbsp;&#42;",
             size="13px", lh="16px", col=MUTED, align="center")
    for i, t in enumerate(paras):
        out += td("px", ("16px 52px 0" if i == 0 else "12px 52px 0"),
                  '<p style="margin:0;">%s</p>' % t, size="15.5px", lh="26px",
                  col=MUTED, extra="font-style:italic;text-align:left;")
    return out


def folio_and_footer():
    cell = ('      <td class="dline" align="%s" valign="top" bgcolor="%s" '
            'style="background-color:%s;font-family:%s;font-size:10px;line-height:15px;'
            'mso-line-height-rule:exactly;color:%s;letter-spacing:1.4px;">%s</td>\n')
    return ('\n  <!-- ══ FOLIO · the foot of the page ══ -->\n'
            + rules("36px 52px 0", FOLIO)
            + '  <tr><td class="px" bgcolor="%s" style="padding:9px 52px 0;background-color:%s;">\n'
              '    <table width="100%%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>\n'
              % (PAPER, PAPER)
            + cell % ("left", PAPER, PAPER, TEXT, MUTED, "THE SEER WITHIN")
            + cell % ("right", PAPER, PAPER, TEXT, MUTED, "PAGE ONE")
            + '    </tr></table></td></tr>\n'
            + '\n  <!-- FOOTER · the printer\'s imprint. Physical address + both AWeber links are\n'
              '       what keeps the send CAN-SPAM clean; do not trim either. Set in the text\n'
              '       serif at legal-notice size, because nothing in a newspaper is Helvetica. -->\n'
              '  <tr><td class="px" align="left" bgcolor="%s" style="padding:22px 52px 40px;'
              'background-color:%s;font-family:%s;font-size:11.5px;line-height:19px;'
              'mso-line-height-rule:exactly;color:%s;text-align:left;">\n'
              '    Marcus Stone &middot; The Seer Within<br>\n'
              '    140 Broadway, Manhattan, New York New York 10005, USA<br>\n'
              '    <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" '
              'rel="noopener noreferrer" style="color:%s;text-decoration:underline;">Unsubscribe</a>\n'
              '    &nbsp;&middot;&nbsp;\n'
              '    <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" '
              'rel="noopener noreferrer" style="color:%s;text-decoration:underline;">'
              'Change Subscriber Options</a></td></tr>\n'
              % (PAPER, PAPER, TEXT, MUTED, MUTED, MUTED)
            + '\n</table></td></tr></table></center></body></html>\n')


# ── parse ────────────────────────────────────────────────────────────────────
def parse(slug):
    cfg = LETTERS[slug]
    with open(os.path.join(SRC, slug + ".md"), encoding="utf-8") as source_file:
        paras = [x.strip() for x in source_file.read().split("\n\n") if x.strip()]
    d = {"subject": paras[0][len("Subject: "):].strip(), "salutation": paras[1],
         "total": len(paras)}
    sig = next(i for i, x in enumerate(paras) if x == "Marcus")
    d["ps"] = paras[sig + 1:]

    def anchor(key):
        hits = [i for i, x in enumerate(paras) if x.startswith(cfg[key])]
        assert len(hits) == 1, "%s: %s matched %d paragraphs" % (slug, key, len(hits))
        return hits[0]

    ps_ = anchor("panel_start")
    pe = next(i for i in range(ps_, sig) if "](BOOKING)" in paras[i])
    # Anything between the ask box and the signature is the closing act. It may be EMPTY.
    # ⚠ There used to be an assertion here that a letter never closes on the link. That rule
    #   was asserted from taste and the evidence was always against it — both letters that
    #   scored 24/25 in test-01 close on the link in their P.S. Operator killed the trailing
    #   acts on 2026-09-09 as a distraction from the close, so the rule is gone with them.
    d["panel"] = paras[ps_:pe + 1]
    d["closing_act"] = paras[pe + 1:sig]

    # body starts at 2: the framing line is ORDINARY BODY COPY in its natural place.
    # ⛔ It must never go back to being a small muted caption — in broadsheet it is
    #    promoted to the DECK, which is prominent, which was the whole point.
    body = paras[2:ps_]
    is_head = lambda t: re.match(r"^\*\*.*\*\*$", t)
    first_h = next(i for i, x in enumerate(body) if is_head(x))
    opening_count = cfg.get("opening_paragraphs", 0)
    assert 0 <= opening_count < first_h, "%s: missing deck after opening" % slug
    d["opening"] = body[:opening_count]
    d["deck"], d["editors_note"] = body[opening_count], body[opening_count + 1:first_h]

    sec = body[first_h:]
    ch = next(i for i, x in enumerate(sec) if x.startswith(cfg["crosshead_start"]))
    # ⛔ The reveal beat is OPTIONAL. A letter whose close names a face-down position itself
    #    folds the inventory into the crosshead instead — running both prints the same
    #    sentence twice about 80 words apart and the letter reads as if it restarts.
    #    See the *-close-*.md letters for the shape that does this.
    rv = next((i for i in range(ch, len(sec)) if x_is_reveal(sec[i], is_head)), None)
    if rv is None:                                   # no reveal beat: crosshead, then tail
        end = ch
        d["crosshead"], d["items"] = [sec[ch]], []
        d["tail"] = sec[ch + 1:]
    else:
        end = rv
        while end + 1 < len(sec) and x_is_reveal(sec[end + 1], is_head):
            end += 1
        d["crosshead"] = sec[ch:rv]
        d["items"] = sec[rv:end + 1]
        d["tail"] = sec[end + 1:]                   # validate, then the turn
    assert d["crosshead"], "%s: empty crosshead" % slug
    assert not d["items"] or len(d["items"]) == cfg["down"], \
        "%s: %d still-down items vs %d face down" % (slug, len(d["items"]), cfg["down"])
    assert not any(is_head(t) for t in sec[ch:]), "%s: a heading after the cards" % slug

    # cards: heading, then its readings, up to the crosshead
    cards, cur = [], None
    for t in sec[:ch]:
        if is_head(t):
            cur = {"heading": t, "readings": []}
            cards.append(cur)
        else:
            assert cur is not None, "%s: reading before any heading" % slug
            cur["readings"].append(t)
    d["cards"] = cards
    assert len(cards) == len(cfg["cards"]) == cfg["up"], \
        "%s: %d headings vs %d card images" % (slug, len(cards), len(cfg["cards"]))
    for c, (cslug, cname, _alt) in zip(cards, cfg["cards"]):
        got = re.sub(r"^\*\*(.*)\*\*$", r"\1", c["heading"]).strip().rstrip(".").split(". ")[-1]
        assert got == cname, "%s: heading says %r, art is %r" % (slug, got, cname)
    return d


def x_is_reveal(t, is_head):
    """A still-down item: opens on a bold fragment but is NOT wholly bold."""
    return t.startswith("**") and not is_head(t)


# ── assemble ─────────────────────────────────────────────────────────────────
def build(slug, tok=False):
    cfg = LETTERS[slug]
    d = parse(slug)
    pre = re.sub(r"<[^>]+>", "", inline(d["ps"][0].replace("P.S. ", "", 1)))
    # ⛔ The hero is named for the SPREAD, not the slug. A variant letter (a different close
    #    on the same morning's cards) reuses its parent's photograph — the cards on the table
    #    have not changed. Without `hero`, a variant asks S3 for a file that was never made
    #    and the reader gets alt text where the spread should be.
    hero_src = ("{{HERO_URL}}/{{HERO_FILE}}" if tok
                else "%s/08-hero-%s.jpg" % (HERO_P, cfg.get("hero", slug)))
    head_src = ("{{HEADSHOT_URL}}/{{HEADSHOT_FILE}}" if tok
                else "%s/08-headshot.jpg" % HEADSH_P)

    out = [HEAD % {"ground": GROUND, "paper": PAPER,
                   "preheader": "{{PREHEADER}}" if tok else pre}]
    out.append(masthead(head_src))
    out.append(dateline(cfg.get("n_cards", cfg["up"] + cfg["down"])))

    out.append('\n  <!-- ══ INTRO ══\n'
               '       The greeting sits in body copy; the framing line is set as the DECK —\n'
               '       the standfirst under a masthead — and any aside is set as an editor\'s\n'
               '       note, ruled top and bottom, because that is exactly what it is.\n'
               '       Not one word of any of it is changed. -->\n')
    out.append(para(inline(d["salutation"]), "26px 52px 0"))
    for t in d["opening"]:
        out.append(para(inline(t), "14px 52px 0"))
    deck_copy = (hilite(inline(d["deck"]), cfg["question"])
                 if cfg.get("question") and not tok else inline(d["deck"]))
    # A conversational opening continues in body type; the legacy standalone deck
    # keeps its display treatment. Do not let the mobile .deck rule enlarge this copy.
    if d["opening"] and not cfg.get("display_deck"):
        out.append(para(deck_copy, "14px 52px 0"))
    else:
        out.append(para(deck_copy, "14px 52px 0", cls="deck px", font=DISPLAY,
                        size="22px", lh="33px", col=HEADINK))
    if d["editors_note"]:
        rows = "".join(
            '      <tr><td bgcolor="%s" style="background-color:%s;padding:11px 0 12px;'
            'font-family:%s;font-size:14.5px;line-height:23px;mso-line-height-rule:exactly;'
            'color:%s;font-style:italic;text-align:left;"><p style="margin:0;">%s</p>'
            '</td></tr>\n' % (PAPER, PAPER, TEXT, MUTED, inline(t))
            for t in d["editors_note"])
        out.append('  <tr><td class="px" bgcolor="%s" style="padding:24px 52px 0;'
                   'background-color:%s;">\n    <table width="100%%" cellpadding="0" '
                   'cellspacing="0" border="0" role="presentation">\n'
                   '      <tr><td height="1" bgcolor="%s" style="background-color:%s;height:1px;'
                   'font-size:0;line-height:0;">&nbsp;</td></tr>\n%s'
                   '      <tr><td height="1" bgcolor="%s" style="background-color:%s;height:1px;'
                   'font-size:0;line-height:0;">&nbsp;</td></tr>\n    </table></td></tr>\n'
                   % (PAPER, PAPER, HAIR, HAIR, rows, HAIR, HAIR))

    out.append(hero_block(hero_src, "{{HERO_ALT}}" if tok else cfg["hero_alt"],
                          WORD[cfg["up"]], WORD[cfg["down"]],
                          n_cards=None if tok else cfg.get("n_cards", cfg["up"] + cfg["down"]),
                          question=None if tok else cfg.get("question")))

    # ⭐ POSITIONS ARE THE SPREAD'S OWN, NOT A RE-COUNT. A seven-card spread turning positions
    #    1, 2 and 5 prints FIG. V / POSITION FIVE on its third block. A letter whose turned cards
    #    are the first N needs no `positions` key — the default is 1..N.
    positions = cfg.get("positions") or list(range(1, cfg["up"] + 1))
    assert len(positions) == cfg["up"], \
        "%s: %d positions vs %d turned" % (slug, len(positions), cfg["up"])
    for i, c in enumerate(d["cards"], 1):
        cslug, cname, calt = cfg["cards"][i - 1]
        pos = positions[i - 1]
        csrc = "{{CARD_URL}}/{{CARD_FILE}}" if tok else "%s/%s.jpg" % (CARD_P, cslug)
        out.append(card_block(i, inline(re.sub(r"^\*\*(.*)\*\*$", r"\1", c["heading"])),
                              csrc, "{{CARD_ALT}}" if tok else calt,
                              inline(cname), [inline(r) for r in c["readings"]],
                              sec_label=ORD[pos], fig=ROMAN[pos], pos=ORD[pos]))

    out.append(reveal_block([inline(t) for t in d["crosshead"]],
                            [inline(t) for t in d["items"]]))
    if cfg.get("backs"):
        bk = cfg["backs"]
        if isinstance(bk, int):          # the flat row · six-questions only
            src, w, h, n = "%s/marcus/08/08-backs-%d.jpg" % (S3, bk), 494, 166, bk
        else:                            # a spread slug · its own formation, hero-sized
            src, w, h, n = "%s/marcus/08/08-backs-%s.jpg" % (S3, bk), 494, 329, cfg["down"]
        out.append(backs_block("{{BACKS_URL}}/{{BACKS_FILE}}" if tok else src, n, w, h))
    out.append('\n  <!-- ══ VALIDATE · then the turn ══ -->\n')
    for i, t in enumerate(d["tail"]):
        out.append(para(inline(t), "24px 52px 0" if i == 0 else "16px 52px 0"))
    if cfg.get("close_style", "letter" if d["opening"] else "boxed") == "letter":
        # The invitation continues the letter without an administrative heading.
        for t in d["panel"]:
            out.append(para(inline(t), "16px 52px 0"))
    else:
        out.append(ask_block([inline(t) for t in d["panel"]]))
    out.append('\n  <!-- ══ THE CLOSING ACT · hers. ⛔ the letter never closes on the link.\n'
               '       ⛔ REAL TOP PADDING. It once had padding:0 and butted the ask panel. -->\n')
    for i, t in enumerate(d["closing_act"]):
        out.append(para(inline(t), "26px 52px 0" if i == 0 else "16px 52px 0"))
    out.append(signoff("Marcus Stone",
                       "{{SIG_URL}}/{{SIG_FILE}}" if tok
                       else "%s/marcus/08/08-signature.jpg" % S3))
    out.append(ps_block([inline(t) for t in d["ps"]]))
    out.append(folio_and_footer())
    return "".join(out), d, pre


# ── the tokenised shell ──────────────────────────────────────────────────────
TPL_BANNER = """<!-- 08 · MARCUS DAILY — HTML TEMPLATE · EDITORIAL BROADSHEET
     ============================================================================
     THE template for every Marcus daily. Adopted 2026-09-09 after the five-design
     bake-off in html/designs/ — 01-broadsheet won. The other four stay as the record.

     ⭐ THIS FILE IS GENERATED. The design lives in the BUILDER, not here. Four fixes
        were once hand-patched into the output and destroyed by the next rebuild; if
        you edit this file by hand the next copy change will eat it. Change the
        generator.

     THE LOOK · a columnist's page in a morning paper. Ink on newsprint.
       ground  #dbd1b9 (the desk)      paper #f4f1e6 (newsprint)
       ink     #14120f  headline #0d0c0a  muted #5b5343  hairline #c4b9a1
       accent  #8f2b1f (oxidised press red) — used TWICE only: the one link, and the
               NOTICE TO READERS label. Nothing else is coloured.
     Typography · display = Bodoni Moda (nameplate, headlines, deck, crosshead, sign-off),
       falling back to Bodoni MT / Didot / Hoefler Text / Times — all newspaper faces.
       Body = Spectral, falling back to Georgia. THE FALLBACK IS THE DESIGN; the webfont
       is a bonus, because it will not load in Outlook and often not in Gmail.

     THE ORDER, top to bottom:
       masthead (portrait, nameplate, role, Scotch rule) → dateline → intro (greeting,
       DECK, optional editor's note) → hero → one block per TURNED card (double rule,
       headline, framed cut, FIG. caption, reading) → the reveal (crosshead + ruled
       sidebar of the positions still down) → validate → turn → the ask box → the
       closing sequence (the job, then the act) → sign-off → P.S. → folio → imprint

     ── PLACEHOLDERS ───────────────────────────────────────────────────────────
     Asset + link tokens, substituted before the send:

     {{HEADSHOT_URL}}   S3 prefix, NO trailing slash. Live:
                          https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/08
     {{HEADSHOT_FILE}}  ⛔ 08-headshot.jpg — the SQUARE original, NOT
                        08-headshot-round.jpg. The round asset is masked onto WHITE, and
                        this masthead is newsprint, so it would ship four white corners.
                        The round one is only ever correct on a #ffffff ground.
     {{HERO_URL}}       S3 prefix, NO trailing slash. Same prefix as the headshot.
     {{HERO_FILE}}      ⛔ 08-hero-<slug>.jpg — .jpg, NOT .png. The source art is PNG but
                        what is HOSTED is JPEG; the .png key returns 403 and the reader
                        gets alt text where the spread should be. This bit once already.
     {{HERO_ALT}}       What is on the table, and how many of the six are turned.
     {{CARD_URL}}       S3 prefix for the Rider-Waite art, NO trailing slash. Live:
                          https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws
     {{CARD_FILE}}      One card, e.g. four-of-cups.jpg. Source art is 350x600.
     {{CARD_ALT}}       The card's name and what is painted on it.
     {{BOOKING_URL}}    The booking page. EVERY href in the body is this literal string —
                        there is exactly one link in a letter, inside the ask box.
     {{PREHEADER}}      Inbox preview line. Plain text, ~90 chars.
     {{SUBJECT}}        Comment only — this file never renders the subject.

     Copy slots (repeat the row as often as the letter needs):

     {{SALUTATION}}       "%FIRSTNAME%,"
     {{DECK}}             ⭐ the framing line — "Marcus. Six cards on one question this
                          morning: <question>. <N> up, <N> face down. Rider–Waite." It is
                          the standfirst, set large in the display face. ⛔ It must never
                          go back to being a small muted caption: it carries the question
                          the whole spread answers, and caption styling is what an eye skips.
     {{EDITORS_NOTE}}     an aside before the first card, ruled top and bottom. OMIT THE
                          WHOLE BLOCK when the letter has none (what-is-my-higher-calling
                          has none — it goes straight from the deck to the hero).
     {{CARDS_UP_WORD}}    "Three" / "Two" — how many are turned, in the hero caption.
     {{CARDS_DOWN_WORD}}  "Three" / "Four" — how many are not.
     {{CARD_HEADING}}     the card's line, e.g. "One — what the quiet actually is. The
                          Four of Cups."
     {{FIG_ROMAN}}        I, II, III …    {{POSITION_WORD}}  ONE, TWO, THREE …
     {{CARD_NAME}}        "The Four of Cups" — the FIG. caption's second line.
     {{BODY_PARAGRAPH}}   one paragraph of the reading, or of the validate/turn beat.
     {{CROSSHEAD}}        the hinge lines before the sidebar ("That's the three I can
                          turn." / "The other three are the ones you want."), set in the
                          display face between two rules.
     {{STILL_DOWN_ITEM}}  one face-down position in the ruled sidebar.
                          ⛔ These open on a BOLD FRAGMENT inside a body paragraph. They
                             are inline emphasis, NOT headings, and they never get card
                             art — there is no art for a card that is still face down.
     {{ASK_PARAGRAPH}}    one paragraph in the NOTICE TO READERS box. The link lives in
                          the last one, inline in the sentence — never a button.
     {{CLOSING_ACT}}      the closing sequence AFTER the ask box — repeat the row per
                          paragraph. Currently two: the job (the thing she writes down)
                          and then the act. ⛔ There is always at least one: the letter
                          never closes on the link.
     {{SIGNATURE}}        "Marcus" — no title, no credentials, no second photograph.
     {{PS}}               the P.S., after the dinkus.

     ── HARD RULES ─────────────────────────────────────────────────────────────
     ⛔ Copy is VERBATIM from letters-02/<slug>.md. Not one word is rewritten. Only the
        newspaper furniture (dateline, FIG. captions, NOTICE, folio, imprint) is written
        here, and it is the only thing ever set in capitals — letter copy keeps its own.
     ⛔ text-transform and font-variant:small-caps do NOT work in Outlook's Word engine.
        Every capitalised label is TYPED in capitals.
     ⛔ %FIRSTNAME% is the ESP merge tag and must reach AWeber INTACT. It is NOT a build
        token: any brace sweep must match {{...}} literally and leave % alone.
     ⛔ Every cell carries bgcolor + background-color + an explicit color. That is the
        dark-mode defence; a cell setting only one of the pair is what goes white-on-white.
     ⛔ A picture is width:100% + max-width in PX, never a hard px width. A hard width
        sets the table's min-content and pins the email open past 600px, which .container
        cannot override, and every line of copy clips on a phone.
     ⛔ The sign-off rule and the name are SEPARATE rows. Nested in one table the 46px
        rule sets the width and the name wraps to "Ma / rcu / s". It did that once.
     ⛔ No price, no clock, no deadline anywhere (08 SHAPE.md).
     ============================================================================
     Subject: {{SUBJECT}} -->
"""


def build_template():
    out = [TPL_BANNER, HEAD % {"ground": GROUND, "paper": PAPER,
                               "preheader": "{{PREHEADER}}"}]
    out.append(masthead("{{HEADSHOT_URL}}/{{HEADSHOT_FILE}}"))
    out.append(dateline())
    out.append('\n  <!-- ══ INTRO ══ greeting in body copy, the framing line as the DECK,\n'
               '       then the optional editor\'s note. -->\n')
    out.append(para("{{SALUTATION}}", "26px 52px 0"))
    out.append(para("{{DECK}}", "14px 52px 0", cls="deck px", font=DISPLAY,
                    size="22px", lh="33px", col=HEADINK))
    out.append('  <!-- EDITOR\'S NOTE · ⛔ DELETE THIS WHOLE ROW when the letter has no aside\n'
               '       before the first card. Do not leave it empty. -->\n'
               '  <tr><td class="px" bgcolor="%s" style="padding:24px 52px 0;background-color:%s;">\n'
               '    <table width="100%%" cellpadding="0" cellspacing="0" border="0" role="presentation">\n'
               '      <tr><td height="1" bgcolor="%s" style="background-color:%s;height:1px;'
               'font-size:0;line-height:0;">&nbsp;</td></tr>\n'
               '      <tr><td bgcolor="%s" style="background-color:%s;padding:11px 0 12px;'
               'font-family:%s;font-size:14.5px;line-height:23px;mso-line-height-rule:exactly;'
               'color:%s;font-style:italic;text-align:left;"><p style="margin:0;">'
               '{{EDITORS_NOTE}}</p></td></tr>\n'
               '      <tr><td height="1" bgcolor="%s" style="background-color:%s;height:1px;'
               'font-size:0;line-height:0;">&nbsp;</td></tr>\n    </table></td></tr>\n'
               % (PAPER, PAPER, HAIR, HAIR, PAPER, PAPER, TEXT, MUTED, HAIR, HAIR))
    out.append(hero_block("{{HERO_URL}}/{{HERO_FILE}}", "{{HERO_ALT}}",
                          "{{CARDS_UP_WORD}}", "{{CARDS_DOWN_WORD}}"))
    out.append('\n  <!-- ⬇ REPEAT THIS WHOLE GROUP ONCE PER TURNED CARD, in the order they\n'
               '       fell. Three of them in why-they-go-quiet, TWO in\n'
               '       what-is-my-higher-calling. ⛔ Face-down positions get no picture. -->\n')
    out.append(card_block(1, "{{CARD_HEADING}}", "{{CARD_URL}}/{{CARD_FILE}}",
                          "{{CARD_ALT}}", "{{CARD_NAME}}", ["{{BODY_PARAGRAPH}}"],
                          sec_label="— repeat per turned card",
                          fig="{{FIG_ROMAN}}", pos="{{POSITION_WORD}}"))
    out.append(reveal_block(["{{CROSSHEAD}}"], ["{{STILL_DOWN_ITEM}}"]))
    out.append('\n  <!-- ══ VALIDATE · then the turn ══ -->\n')
    out.append(para("{{BODY_PARAGRAPH}}", "24px 52px 0"))
    out.append('\n  <!-- The one link, inline in the LAST ask paragraph, never a button:\n'
               '       <a href="{{BOOKING_URL}}" target="_blank" rel="noopener noreferrer"\n'
               '          style="color:%s;text-decoration:underline;font-weight:bold;">LINK TEXT</a>\n'
               '  -->\n' % ACCENT)
    out.append(ask_block(["{{ASK_PARAGRAPH}}"]))
    out.append('\n  <!-- ══ THE CLOSING ACT · hers. ⛔ the letter never closes on the link.\n'
               '       ⛔ REAL TOP PADDING. It once had padding:0 and butted the ask panel. -->\n')
    out.append(para("{{CLOSING_ACT}}", "26px 52px 0"))
    out.append(signoff("Marcus Stone", "{{SIG_URL}}/{{SIG_FILE}}"))
    out.append(ps_block(["{{PS}}"]))
    out.append(folio_and_footer())
    return "".join(out)


def letter_banner(slug, d, pre):
    return ("<!-- 08 · MARCUS DAILY — %s — EDITORIAL BROADSHEET\n"
            "     Subject:   %s\n"
            "     Preheader: %s\n"
            "     Copy rendered VERBATIM from docs/08-marcus/daily-email/letters-02/%s.md.\n"
            "     Design: html/template.html (broadsheet). ⭐ GENERATED — edit the builder,\n"
            "     never this file: hand patches here are destroyed by the next rebuild.\n"
            "     %d turned cards, %d still face down.\n"
            "     ⚠ IMAGE URLS ARE BAKED IN. {{BOOKING_URL}} is the only placeholder left.\n"
            "     Live assets, all verified 200:\n"
            "       headshot + hero  %s/\n"
            "       card art         %s/\n"
            "     ⛔ The heroes are .jpg, NOT .png — the .png key on S3 returns 403.\n"
            "     ⛔ The masthead portrait is the SQUARE 08-headshot.jpg. The round variant\n"
            "        is masked onto white and would ship four white corners on newsprint.\n"
            "     ⛔ %%FIRSTNAME%% is the ESP merge tag and must reach AWeber INTACT. Any\n"
            "        brace sweep must match {{...}} literally and leave %% alone.\n"
            "     ⛔ No price, no clock, no deadline anywhere in this file (08 SHAPE.md). -->\n"
            % (slug, d["subject"], pre, slug, len(d["cards"]), len(d["items"]),
               HERO_P, CARD_P))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for slug in LETTERS:
        html, d, pre = build(slug, tok=False)
        open(os.path.join(OUT, slug + ".html"), "w", encoding="utf-8").write(
            letter_banner(slug, d, pre) + html)
        print("built %-28s paras=%2d cards=%d down=%d crosshead=%d ask=%d tail=%d close=%d note=%d"
              % (slug, d["total"], len(d["cards"]), len(d["items"]), len(d["crosshead"]),
                 len(d["panel"]), len(d["tail"]), len(d["closing_act"]),
                 len(d["editors_note"])))
    open(os.path.join(OUT, "template.html"), "w", encoding="utf-8").write(build_template())
    print("built template.html (tokenised broadsheet)")
