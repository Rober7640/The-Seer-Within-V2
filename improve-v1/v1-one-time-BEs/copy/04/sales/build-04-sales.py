#!/usr/bin/env python3
"""Render the 04 "The Turn" sales emails to AWeber HTML + plain text.

Never hand-edit the HTML or the .txt: change the .md (or the subject choice below), rebuild.

Usage (from this folder):
  python3 build-04-sales.py all                          # the approved three, in send order
  python3 build-04-sales.py 04-S1-your-bridge-week       # one email
  python3 build-04-sales.py <stem> --draft                # a .md outside the approved three
Output: html/<stem>.html + html/<stem>.txt

The approved sequence (operator, 2026-10-11) is three emails, in this order:
  1. 04-S1-your-bridge-week            email 1
  2. 04-S4-re-your-bridge-week         the "RE:" follow-up, sent second
  3. 04-S2-two-months-not-three-weeks  email 2, sent third
04-S3 was not approved.

The shell (evelyn-shell.html) is 09's Evelyn shell, lifted from
docs/09/sales-emails/09-E4-esl-v1-evelyn.html (the 2026-09-25 send) at the same cut points
09's build-09-e7.py uses: everything before its <h1> and everything from the postal-footer row
on, joined at <!--@@BODY@@-->. Banner, postal footer, {{ subscriber.unsubscribe_link }}, table
layout and Outlook wrapper all come from it unchanged. This script then sets the subject and
preheader comments, the hidden preheader, the <title>, the letter's top padding (as 09 does)
and the link colour (#0000EE, operator rule; 09's shell had #0000ff, footer included).

What 04 needs that 09 did not: bullet and numbered lists, an image caption, and one solid
button at the end (#5b2a6e, the colour of the storytelling emails' button).

The build FAILS (and writes nothing) if the visible words of the HTML or the .txt differ from
the words of the .md body, if a link differs from the .md, if a price or a leftover markdown
marker gets through, or if the HTML passes Gmail's ~102 KB clip.
"""
import html as H
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SHELL = os.path.join(HERE, 'evelyn-shell.html')
OUT = os.path.join(HERE, 'html')

SEQUENCE = [
    '04-S1-your-bridge-week',
    '04-S4-re-your-bridge-week',
    '04-S2-two-months-not-three-weeks',
]

# ── Subjects ────────────────────────────────────────────────────────────────────────────────
# The operator has not picked yet (2026-10-11). WORKING choice = option (a) of each.
# To change: edit the letter here, rebuild. The RE: email always takes "RE: " + email 1's subject.
WORKING_SUBJECT = {
    '04-S1-your-bridge-week': 'a',
    '04-S2-two-months-not-three-weeks': 'a',
}
RE_OF = {'04-S4-re-your-bridge-week': '04-S1-your-bridge-week'}

# ── Images: `[IMG: <key>]` in the .md -> hosted file ─────────────────────────────────────────
# Uploaded by the developer (host-be-asset.cjs) from docs/04/product/images/esl/esl-cup-640.jpg.
# ⛔ Never a key under evelyn/tarot/ (live broadcasts point at it).
BASE = 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/backend-04/'
IMAGES = {
    'esl-cup': dict(
        src=BASE + 'esl-cup-640.jpg',
        alt=('A white tea cup seen from above, with tea leaves left inside and seven shapes '
             'circled in red and numbered 1 to 7. The handle is at the lower right.'),
        width=540,
    ),
}

LINK_COLOUR = '#0000EE'   # operator rule: every hyperlink
BUTTON_COLOUR = '#5b2a6e'  # the one solid button, at the end

P = '<p style="margin:0 0 16px;line-height:1.6;">{}</p>'
H2 = ('<h2 style="font-size:20px;line-height:1.35;text-align:center;color:#333333;'
      'margin:26px 0 18px;padding-top:20px;border-top:1px solid #DEE0E8;">{}</h2>')
PS = ('<p style="margin:0 0 16px;line-height:1.6;border-top:1px solid #DEE0E8;'
      'padding-top:24px;margin-top:28px;">{}</p>')
LINK = ('<a target="_blank" rel="noopener noreferrer" href="{url}" '
        'style="color:' + LINK_COLOUR + ';text-decoration:underline;text-underline-offset:3px;">{text}</a>')
IMG = ('<p style="margin:24px 0 10px;"><img src="{src}" alt="{alt}" width="{w}" '
       'style="display:block;width:100%;max-width:{w}px;height:auto;margin:auto;border-radius:3px;'
       'font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#555555;"></p>')
CAPTION = '<p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#555555;text-align:center;">{}</p>'
LIST = '<{tag} style="margin:0 0 16px 24px;padding:0;">\n{items}\n</{tag}>'
ITEM = '<li style="margin:0 0 8px;padding-left:4px;line-height:1.6;">{}</li>'
BUTTON = ('<table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" '
          'style="margin:28px auto 26px;"><tr><td align="center" bgcolor="' + BUTTON_COLOUR + '" '
          'style="background:' + BUTTON_COLOUR + ';border-radius:6px;">'
          '<a target="_blank" rel="noopener noreferrer" href="{url}" style="display:inline-block;'
          'padding:15px 30px;font-family:Helvetica,Arial,sans-serif;font-size:18px;font-weight:bold;'
          'line-height:1.2;color:#ffffff;text-decoration:none;border-radius:6px;">{label}</a>'
          '</td></tr></table>')

# AWeber merge tags this build may contain; anything else in {{ }} is a mistake.
TAG_NAME = '{{ subscriber.first_name | capitalize }}'
TAG_FN = '{{ subscriber.first_name | url_encode }}'
TAG_UNSUB = '{{ subscriber.unsubscribe_link }}'

MD_LINK = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
RE_BUTTON = re.compile(r'^`\[BUTTON:\s*([^\]]+)\]\(([^)]+)\)`$')
RE_IMG = re.compile(r'^`\[IMG:\s*([^\]]+)\]`$')
RE_CAPTION = re.compile(r'^\*(?!\*)(.+)(?<!\*)\*$', re.S)
RE_OL = re.compile(r'^\d+\.\s+')
RE_UL = re.compile(r'^-\s+')


# ── markdown helpers ────────────────────────────────────────────────────────────────────────
def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace("'", '&#x27;')


def inline(t):
    """Markdown inline -> HTML: links, **bold**, *italic*."""
    t = esc(t)
    t = MD_LINK.sub(lambda m: LINK.format(url=m.group(2), text=m.group(1)), t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t, flags=re.S)
    t = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<em>\1</em>', t, flags=re.S)
    return t


def flat(t):
    """Markdown inline -> plain words (links keep their text)."""
    t = MD_LINK.sub(r'\1', t)
    t = t.replace('**', '')
    t = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'\1', t, flags=re.S)
    return re.sub(r'[ \t]*\n[ \t]*', ' ', t).strip()


def urls_in(t):
    return [m.group(2) for m in MD_LINK.finditer(t)]


def list_kind(b):
    lines = b.split('\n')
    if all(RE_OL.match(l) for l in lines):
        return 'ol', [RE_OL.sub('', l) for l in lines]
    if all(RE_UL.match(l) for l in lines):
        return 'ul', [RE_UL.sub('', l) for l in lines]
    return None, None


def read_md(stem):
    md = open(os.path.join(HERE, stem + '.md'), encoding='utf-8').read()
    head, rest = md.split('\n---\n', 1)
    body = re.split(r'\n---\n\s*##\s', rest)[0]          # stop at the Notes
    blocks = [b.strip() for b in re.split(r'\n\s*\n', body) if b.strip()]
    options = dict(re.findall(r'^- \(([a-z])\) (.+?)\s*$', head, flags=re.M))
    preheader = re.search(r'^\*\*Preheader:\*\*\s*(.+?)\s*$', head, flags=re.M).group(1)
    return blocks, options, preheader


def subject_for(stem, options):
    if stem in RE_OF:
        _, first_opts, _ = read_md(RE_OF[stem])
        subj = 'RE: ' + subject_for(RE_OF[stem], first_opts)
        assert subj in options.values(), f'{stem}: "{subj}" is not one of its listed RE: options'
        return subj
    return options[WORKING_SUBJECT.get(stem, 'a')]


# ── render ──────────────────────────────────────────────────────────────────────────────────
def render(stem):
    blocks, options, preheader = read_md(stem)
    subject = subject_for(stem, options)

    out, txt, words, md_urls = [], [], [], []
    last_img = None
    for b in blocks:
        m = RE_IMG.match(b)
        if m:
            img = IMAGES[m.group(1).strip()]
            out.append(IMG.format(src=img['src'], alt=esc(img['alt']), w=img['width']))
            last_img = img['src']
            continue
        if last_img and RE_CAPTION.match(b) and '\n' not in b:
            out.append(CAPTION.format(inline(b)))
            txt.append(flat(b) + '\n' + last_img)            # plain text: the photo, as a link
            words.append(flat(b))
            last_img = None
            continue
        if last_img:                                        # an image with no caption
            txt.append(last_img)
            last_img = None

        m = RE_BUTTON.match(b)
        if m:
            label, url = m.group(1).strip(), m.group(2).strip()
            out.append(BUTTON.format(url=esc(url), label=esc(label)))
            txt.append(label + '\n' + url)
            words.append(label)
            md_urls.append(url)
            continue

        kind, items = list_kind(b)
        if kind:
            out.append(LIST.format(tag=kind, items='\n'.join(ITEM.format(inline(i)) for i in items)))
            marks = [f'{n}. ' if kind == 'ol' else '- ' for n in range(1, len(items) + 1)]
            txt.append('\n'.join(mk + flat(i) for mk, i in zip(marks, items)))
            words.extend(flat(i) for i in items)
            for i in items:
                md_urls.extend(urls_in(i))
            continue

        if b.startswith('### '):
            out.append(H2.format(inline(b[4:].strip())))
            txt.append(flat(b[4:]))
            words.append(flat(b[4:]))
            continue
        assert not b.startswith('#'), f'{stem}: unexpected heading level: {b[:60]}'

        out.append((PS if b.startswith('P.S.') else P).format(inline(b)))
        u = urls_in(b)
        txt.append(flat(b) + ''.join('\n' + x for x in u))
        words.append(flat(b))
        md_urls.extend(u)

    shell = open(SHELL, encoding='utf-8').read()
    prefix, suffix = shell.split('<!--@@BODY@@-->')
    sub1 = lambda pat, rep, s: re.subn(pat, lambda _m: rep, s, count=1)
    prefix, n1 = sub1(r'<!-- Subject: [^\n]*\n', '<!-- Subject: ' + subject + '\n', prefix)
    prefix, n2 = sub1(r'Preheader: [^\n]*\n', 'Preheader: ' + preheader + '\n', prefix)
    prefix, n3 = sub1(r'AWeber: [^\n]*-->',
                      'AWeber: preserve subscriber Liquid tags. Offer URL https://theseerwithin.com/offers/wiccan/tea-reading '
                      '(04 The Turn). Built from copy/04/sales/' + stem + '.md by build-04-sales.py, never hand-edited. -->',
                      prefix)
    prefix, n4 = sub1(r'<title>[^<]*</title>', '<title>The Seer Within — Evelyn · The Turn</title>', prefix)
    # Hidden preheader + a zero-width filler so the inbox preview stops at the preheader
    # (same filler the storytelling emails use).
    prefix, n5 = sub1(r'(<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">)[^<]*(</div>)',
                      '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">' + esc(preheader) + '</div>'
                      '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">'
                      + '&zwnj;&nbsp;' * 30 + '</div>', prefix)
    prefix, n6 = sub1(r'<td class="letter" style="padding:14px 30px 8px;',
                      '<td class="letter" style="padding:22px 30px 8px;', prefix)
    assert (n1, n2, n3, n4, n5, n6) == (1,) * 6, 'the shell changed shape: ' + str((n1, n2, n3, n4, n5, n6))
    suffix = suffix.replace('color:#0000ff', 'color:' + LINK_COLOUR)

    letter = '\n'.join(out)
    page = prefix + letter + suffix

    body_txt = '\n\n'.join(t for t in txt if t)
    footer_txt = ('\n\n140 Broadway, Manhattan,\nNew York New York 10005\nUSA\n\n'
                  'Unsubscribe: ' + TAG_UNSUB + '\nChange Subscriber Options: ' + TAG_UNSUB + '\n')
    text = body_txt + footer_txt

    check(stem, page, letter, body_txt, words, md_urls)

    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, stem + '.html'), 'w', encoding='utf-8').write(page)
    open(os.path.join(OUT, stem + '.txt'), 'w', encoding='utf-8').write(text)

    codes = [re.search(r'[?&]c=(\d+)', u).group(1) for u in md_urls]
    kb = len(page.encode('utf-8')) / 1024
    print(f'{stem}\n  subject:   {subject}\n  preheader: {preheader}\n'
          f'  links:     c={", ".join(codes)}  (in page order)\n'
          f'  size:      {kb:.1f} KB html, {len(text.encode("utf-8")) / 1024:.1f} KB txt, '
          f'{len(" ".join(words).split())} words. Checks PASS')
    return subject, preheader, codes, kb


# ── checks: any failure stops the build before a file is written ─────────────────────────────
def visible(letter_html):
    t = re.sub(r'</?(a|strong|em|b|i|u|span)\b[^>]*>', '', letter_html)   # inline: no gap
    t = re.sub(r'<[^>]+>', ' ', t)                                          # block: a gap
    return re.sub(r'\s+', ' ', H.unescape(t)).strip()


def check(stem, page, letter, body_txt, words, md_urls):
    want = re.sub(r'\s+', ' ', ' '.join(words)).strip()

    # 1 — words verbatim, HTML and text
    got_html = visible(letter)
    assert got_html == want, f'{stem}: HTML words differ from the .md\n  md:   {want[:300]}\n  html: {got_html[:300]}'
    txt_words = '\n'.join(l for l in body_txt.split('\n') if not l.startswith('https://'))
    txt_words = re.sub(r'(?m)^(\d+\. |- )', '', txt_words)
    assert re.sub(r'\s+', ' ', txt_words).strip() == want, f'{stem}: .txt words differ from the .md'

    # 2 — links exactly as in the .md, in order; every one written out in the .txt
    hrefs = [H.unescape(h) for h in re.findall(r'href="(https://theseerwithin\.com/[^"]+)"', page)]
    assert hrefs == md_urls, f'{stem}: links differ from the .md\n  {hrefs}\n  {md_urls}'
    for u in md_urls:
        assert u in body_txt, f'{stem}: link missing from the .txt: {u}'
    assert len(re.findall(r'bgcolor="' + BUTTON_COLOUR, page)) == 1, f'{stem}: expected exactly one button'
    for style in re.findall(r'<a [^>]*style="([^"]*)"', page):
        assert 'color:' + LINK_COLOUR in style or 'color:#ffffff' in style, f'{stem}: a link is not {LINK_COLOUR}: {style}'

    # 3 — merge tags: only the three known ones, the name tag intact
    leftover = page.replace(TAG_NAME, '').replace(TAG_FN, '').replace(TAG_UNSUB, '')
    assert '{{' not in leftover, f'{stem}: stray merge tag'   # (CSS has "}}", so test the opener)
    assert TAG_NAME in letter, f'{stem}: greeting name tag missing'
    # fn= stays optional: if AWeber rejects url_encode, it comes out of the .md links (see handoff)
    assert page.count(TAG_FN) == sum(u.count(TAG_FN) for u in md_urls), f'{stem}: an fn= tag got lost'

    # 4 — nothing that is not copy
    for s in (got_html, body_txt):
        for bad in ('[IMG', '[BUTTON', '**', '`', '###', '@@BODY@@', 'Angle:', 'Counts and checks', 'Status:'):
            assert bad not in s, f'{stem}: leftover "{bad}"'
        assert '*' not in s, f'{stem}: leftover markdown asterisk'

    # 5 — no price
    for s in (got_html, body_txt):
        assert not re.search(r'\$\s?\d|\bUSD\b|\b(35|45)\b|\bprice\b', s, flags=re.I), f'{stem}: price leaked'
    assert '$' not in H.unescape(page), f'{stem}: a $ is in the HTML'

    # 6 — Gmail clips HTML past ~102 KB
    assert len(page.encode('utf-8')) < 100 * 1024, f'{stem}: HTML over 100 KB, Gmail will clip it'


def main():
    stems = SEQUENCE if (len(sys.argv) < 2 or sys.argv[1] == 'all') else sys.argv[1:]
    draft = '--draft' in stems                              # build an unapproved .md anyway
    stems = [s for s in stems if s != '--draft'] or SEQUENCE
    for stem in stems:
        if stem not in SEQUENCE and not draft:
            sys.exit(f'⛔ {stem} is not in the approved sequence (1 → RE: → 2). Add --draft to build it anyway.')
        render(stem)


if __name__ == '__main__':
    main()
