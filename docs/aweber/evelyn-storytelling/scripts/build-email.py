#!/usr/bin/env python3
"""Render an Evelyn storytelling email (.md) to AWeber-ready HTML.

Usage:
  python3 build-email.py ../emails/01-grandma-moses.md            # preview (inbox strip, local image)
  python3 build-email.py ../emails/01-grandma-moses.md --send \
      --image-url https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/story/01-grandma-moses.jpg

Source format (see ../README.md, "Source file format"):
  **Subject:** / **Preheader:** / **Campaign:** / **Bucket:** header lines
  **Content:** ... **Pitch:** ... **→ Button label** ... — Evelyn ... **P.S.** ...
  Markers: [IMAGE] path | alt | caption line 1 / caption line 2 | width(px, default 220) | noborder
           [LINK] first-person text-link label
           ➤ outcome line · **1. Lesson lead.** rest · Here are 3 things ... (heading)
  Inline:  **bold**  __underline__  "quotes" → curly
Everything after the P.S. paragraph (sources, notes) is ignored.
"""
import argparse, html, os, re, sys

LINK = '#0000EE'      # operator rule: every hyperlink is #0000EE
BUTTON = '#5b2a6e'    # the one solid button, at the end
BANNER = 'https://hostedimages-cdn.aweber-static.com/NDQyNzMw/optimized/8bf6df906cab4e11b58e484fe450705a.png'
LANDER = 'https://www.theseerwithin.com/evelyn/'


def field(src, name):
    m = re.search(r'^\*\*' + name + r':\*\*\s*`?(.+?)`?\s*$', src, re.M)
    if not m:
        sys.exit(f'missing **{name}:** line')
    return m.group(1).strip()


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'__(.+?)__', r'<u>\1</u>', t)
    t = re.sub(r'"([^"]+)"', r'&ldquo;\1&rdquo;', t)
    return t.replace("'", '&rsquo;')


def button(label, url):
    return (f'        <p style="margin:22px 0 22px;text-align:center;">\n'
            f'          <a href="{url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;'
            f'background:{BUTTON};color:#ffffff;font-size:18px;font-weight:bold;text-decoration:none;'
            f'padding:14px 26px;border-radius:6px;">{inline(label)} &rarr;</a>\n        </p>')


def blocks(text, url, image_url):
    out = []
    for p in [x.strip() for x in text.split('\n\n') if x.strip()]:
        if p.startswith('[IMAGE]'):
            parts = [s.strip() for s in p[len('[IMAGE]'):].split('|')]
            src = image_url or parts[0]
            alt = parts[1] if len(parts) > 1 else ''
            cap = '<br>'.join(inline(c.strip()) for c in parts[2].split(' / ')) if len(parts) > 2 and parts[2] else ''
            w = int(parts[3]) if len(parts) > 3 and parts[3] else 220
            border = '' if len(parts) > 4 and parts[4] == 'noborder' else 'border:1px solid #DEE0E8;'
            out.append(f'        <p style="margin:6px 0 22px;text-align:center;">\n'
                       f'          <img src="{src}" alt="{html.escape(alt)}" width="{w}" style="display:block;width:{w}px;'
                       f'max-width:{"60" if w <= 240 else "80"}%;height:auto;margin:0 auto;{border}">\n'
                       + (f'          <span style="display:block;margin-top:8px;font-size:12px;line-height:1.4;color:#888888;">{cap}</span>\n' if cap else '') +
                       f'        </p>')
        elif p.startswith('[LINK]'):
            out.append(f'        <p style="margin:18px 0 22px;text-align:center;font-size:18px;"><a href="{url}" '
                       f'target="_blank" rel="noopener noreferrer" style="color:{LINK};font-weight:bold;'
                       f'text-decoration:underline;">{inline(p[len("[LINK]"):].strip())} &rarr;</a></p>')
        elif p.startswith('➤'):
            out.append(f'        <p style="margin:0 0 10px;padding-left:4px;"><span style="color:{BUTTON};">&#10148;</span>'
                       f'&nbsp; {inline(p[1:].strip())}</p>')
        elif re.match(r'\*\*\d\.', p):
            out.append(f'        <p style="margin:0 0 16px;padding-left:14px;border-left:3px solid #DEE0E8;">{inline(p)}</p>')
        elif re.match(r'Here are \w+ things', p):
            out.append(f'        <p style="margin:8px 0 16px;"><strong>{inline(p)}</strong></p>')
        else:
            out.append(f'        <p style="margin:0 0 16px;">{inline(p)}</p>')
    return '\n\n'.join(out)


def plain(content, pitch, label, ps, url):
    """Plain-text alternative for AWeber body_text."""
    raw = html.unescape(url)
    lines = []
    for p in [x.strip() for x in (content + '\n\n' + pitch).split('\n\n') if x.strip()]:
        if p.startswith('[IMAGE]'):
            continue
        if p.startswith('[LINK]'):
            lines.append(p[len('[LINK]'):].strip() + ': ' + raw)
            continue
        lines.append(re.sub(r'\*\*|__', '', p))
    lines += [label + ': ' + raw, '— Evelyn', 'P.S. ' + re.sub(r'\*\*|__', '', ps) + ' ' + raw]
    return '\n\n'.join(lines) + '\n'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('md')
    ap.add_argument('--send', action='store_true', help='no inbox preview strip; requires --image-url if the email has an image')
    ap.add_argument('--image-url', help='hosted (S3) URL for the [IMAGE]; required with --send')
    ap.add_argument('--out', help='output path (default: alongside the .md, .html)')
    a = ap.parse_args()

    src = open(a.md, encoding='utf-8').read()
    subject, pre = field(src, 'Subject'), field(src, 'Preheader')
    campaign, bucket = field(src, 'Campaign'), field(src, 'Bucket')
    if a.send and '[IMAGE]' in src and not a.image_url:
        sys.exit('--send needs --image-url (the photo must be hosted, not a local file)')

    # The lander reads campaign / bucket / src (EvelynLanderPage.readParams) — utm_* alone never
    # reaches the chat. Same shape as the reframe deck's legacyCtaUrl, minus the {!email} prefill.
    url = (f'{LANDER}?bucket={bucket}&amp;src=aweber&amp;campaign={campaign}'
           f'&amp;utm_source=aweber&amp;utm_medium=email&amp;utm_campaign={campaign}')
    # Preferred: the minted /e/<code> short link (email_link_codes row carries campaign, bucket,
    # src AND the chat notes — Big Idea / Reading Recap / Open Loop / Continue Seed — so Evelyn
    # knows which email the reader came from). {!email} = AWeber merge tag, prefills the lander.
    m = re.search(r'^\*\*Short Link:\*\*\s*`([^`]+)`', src, re.M) or \
        re.search(r'^\*\*Short Link:\*\*\s*(https://\S+)', src, re.M)
    if m:
        url = m.group(1).replace('&', '&amp;')
    elif a.send:
        print('⚠ no **Short Link:** — falling back to the plain ?campaign= link; the chat will NOT get this email\'s notes')
    content = src.split('**Content:**', 1)[1].split('**Pitch:**', 1)[0]
    rest = src.split('**Pitch:**', 1)[1]
    pitch = rest.split('**→', 1)[0]
    label = re.search(r'\*\*→ (.+?)\*\*', rest).group(1)
    ps = rest.split('**P.S.**', 1)[1].strip().split('\n\n', 1)[0].strip()

    image_url = a.image_url
    if not a.send and not image_url:
        # preview: resolve the local image relative to the output file
        m = re.search(r'^\[IMAGE\]\s*([^|]+)', src, re.M)
        if m:
            md_dir = os.path.dirname(os.path.abspath(a.md))
            out_dir = os.path.dirname(os.path.abspath(a.out)) if a.out else md_dir
            image_url = os.path.relpath(os.path.join(md_dir, m.group(1).strip()), out_dir)

    strip = '' if a.send else f'''
<div style="background:#f3f4f6;border-bottom:1px solid #DEE0E8;padding:14px 16px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#333;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:4px;">Preview — inbox view (not part of the email)</div>
    <div><strong>From:</strong> Evelyn Cross</div>
    <div><strong>Subject:</strong> {html.escape(subject)}</div>
    <div style="color:#666;"><strong style="color:#333;">Preheader:</strong> {html.escape(pre)}</div>
  </div>
</div>'''

    doc = f'''<!DOCTYPE html>
<!-- Evelyn storytelling email · source: {os.path.basename(a.md)} · built by docs/aweber/evelyn-storytelling/scripts/build-email.py{' · SEND build' if a.send else ' · PREVIEW build'} -->
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>The Seer Within — Evelyn</title>
<style type="text/css">
  body{{-webkit-font-smoothing:antialiased;font-weight:400;line-height:1.5;margin:0;padding:0;width:100%;background-color:#ffffff;}}
  img{{border:0;height:auto;line-height:100%;max-width:100%;outline:none;}}
  table,td{{border-collapse:collapse;border-spacing:0;border:0;}}
  .aw{{color:#333333;font-family:Helvetica,Arial,sans-serif;font-size:16px;}}
  .aw a{{color:{LINK};text-decoration:underline;}}
  .aw p{{margin:0 0 16px;line-height:1.6;}}
  @media only screen and (max-width:600px){{ .container{{width:100%!important;}} .px{{padding-left:18px!important;padding-right:18px!important;}} }}
</style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">{strip}
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">{html.escape(pre)}</div>
<div style="display:none;max-height:0;overflow:hidden;">&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<center>
<table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
  <tr><td align="center">
    <table align="center" class="container aw" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
      <tr><td align="center" style="padding:16px 0 12px;">
        <img src="{BANNER}" alt="The Seer Within" width="499" height="166" style="display:block;height:166px;width:499px;max-width:100%;">
      </td></tr>
      <tr><td style="padding:0 0 6px;"><div style="border-top:1px solid #DEE0E8;height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
      <tr><td class="px" style="padding:12px 30px 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#333333;line-height:1.6;text-align:left;">

{blocks(content, url, image_url)}

        <hr style="background:#DEE0E8;border:0;height:1px;margin:22px 0;">

{blocks(pitch, url, image_url)}

{button(label, url)}

        <p style="margin:0 0 20px;">&mdash; Evelyn</p>

        <p style="margin:0 0 16px;"><strong>P.S.</strong> {inline(ps)} <a href="{url}" target="_blank" rel="noopener noreferrer" style="color:{LINK};text-decoration:underline;">Start here</a>.</p>
      </td></tr>
      <tr><td align="center" style="padding:24px 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;color:#000000;">
        140 Broadway, Manhattan,<br>New York New York 10005<br>USA<br><br>
        <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" rel="noopener noreferrer" style="color:{LINK};text-decoration:underline;">Unsubscribe</a>
        &nbsp;|&nbsp;
        <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" rel="noopener noreferrer" style="color:{LINK};text-decoration:underline;">Change Subscriber Options</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</center>
</body>
</html>
'''
    out = a.out or os.path.splitext(a.md)[0] + ('.send.html' if a.send else '.html')
    if a.send:
        doc = re.sub(r'\n\s*\n', '\n', doc)          # drop blank lines (smaller, same render)
    open(out, 'w', encoding='utf-8').write(doc)
    if a.send:
        open(os.path.splitext(out)[0] + '.txt', 'w', encoding='utf-8').write(plain(content, pitch, label, ps, url))
    words = len(re.sub(r'\*\*|__|➤|\[LINK\]|\[IMAGE\][^\n]*', '', content + pitch).split())
    cw = len(re.sub(r'\*\*|__|➤|\[IMAGE\][^\n]*', '', content).split())
    print(f'wrote {out}  ·  {words} words  ·  content/pitch {round(100*cw/words)}/{100-round(100*cw/words)}')


if __name__ == '__main__':
    main()
