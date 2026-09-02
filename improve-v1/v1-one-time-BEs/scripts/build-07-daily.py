#!/usr/bin/env python3
"""Build a 07-marcus daily email from a block list.

One template so every day is structurally identical to Tuesday, which was built by hand
against 02-E2. Blocks: h2 · p · img · hero(n) · faces(list) · ps.
Inline CTAs are written as [text](c=N) and rendered as ochre links, never buttons.
Emits the sendable file (S3 art) and a -preview file (art inlined for the artifact viewer).
"""
import re, sys, base64, urllib.request

S3   = "https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/"
S3ASSET = "https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/"
F    = "Helvetica,Arial,sans-serif"
INK, BODY, MUT, OCH, BLU, RULE, CLOTH = "#16181D", "#24262E", "#8A909C", "#A8721C", "#2E4B6E", "#DDE0E6", "#1A2430"

def links(t, slug):
    return re.sub(r'\[([^\]]+)\]\(c=(\d)\)',
        lambda m: f'<a href="{{{{BOOKING_URL}}}}?c={m.group(2)}&amp;s={slug}" style="color:#0000ff;font-weight:bold;">{m.group(1)}</a>', t)

def render(d):
    slug, out = d["slug"], []
    def row(inner, pad="0 30px 0"):
        out.append(f'  <tr><td class="px" style="padding:{pad};">{inner}</td></tr>')
    for kind, val in d["blocks"]:
        if kind == "note":
            out.append(f'\n  <!-- {val} -->')
        elif kind == "h2":
            row(f'<h2 style="margin:0 0 16px;font-size:21px;font-weight:bold;color:{INK};">{val}</h2>', "30px 30px 0")
        elif kind == "p":
            row(f'<p style="margin:0;font-size:16.5px;line-height:1.62;color:{BODY};">{links(val, slug)}</p>', "0 30px 18px")
        elif kind == "hero":
            # ⛔ No cloth panel behind them. The cards ARE the hero — big, on the sheet.
            card = (f'<td align="center" valign="top" style="padding:0 10px;">'
                    f'<img class="herocard" src="{S3ASSET}card-back.jpg" alt="a face-down card" width="216" '
                    f'style="display:block;width:216px;max-width:100%;height:auto;border-radius:7px;"></td>')
            cap = ("One off the cut &mdash; not yet turned" if val == 1
                   else ("Two" if val == 2 else "Three") + " off one cut &mdash; not yet turned")
            out.append(f'  <tr><td align="center" style="padding:30px 20px 0;">\n'
                       f'    <table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>{card * val}</tr></table>\n'
                       f'    <p style="margin:18px 0 0;font-family:{F};font-size:11px;letter-spacing:.16em;'
                       f'text-transform:uppercase;color:{MUT};">{cap}</p></td></tr>')
        elif kind == "img":
            card, alt = val
            out.append(f'''  <tr><td align="center" style="padding:0 20px 20px;">
    <img class="cardimg" src="{S3}{card}.jpg" alt="{alt}" width="200" style="display:block;width:200px;max-width:100%;height:auto;border:1px solid {RULE};"></td></tr>''')
        elif kind == "faces":
            # A laid spread, not a table of blocks. Each position is a real card BACK image with
            # its name UNDERNEATH, the way cards actually sit on a table — and grouped into the
            # rows the spread has, so the shape of the reading is visible at a glance.
            # `val` is [(group label or None, [(n, position name), ...]), ...]
            groups = val if isinstance(val[0], tuple) and isinstance(val[0][1], list) else [(None, val)]
            blocks = []
            for label, items in groups:
                cells = "".join(
                    f'<td width="{100//max(len(items),1)}%" align="center" valign="top" style="padding:0 5px;">'
                    f'<img src="{S3ASSET}card-back.jpg" alt="a face-down card" width="86" '
                    f'style="display:block;width:86px;max-width:100%;height:auto;border-radius:4px;margin:0 auto;">'
                    f'<div style="font-family:{F};font-size:10px;letter-spacing:.09em;text-transform:uppercase;'
                    f'color:{MUT};line-height:1.35;padding-top:9px;">{t}</div></td>'
                    for t in [(x[1] if isinstance(x, tuple) else x) for x in items])
                lab = (f'<tr><td colspan="{len(items)}" style="font-family:{F};font-size:10px;letter-spacing:.16em;'
                       f'text-transform:uppercase;color:{OCH};font-weight:bold;padding:0 0 10px 5px;">{label}</td></tr>'
                       ) if label else ""
                blocks.append(f'<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" '
                              f'style="margin-bottom:22px;">{lab}<tr>{cells}</tr></table>')
            row("".join(blocks), "26px 30px 8px")
        elif kind == "ps":
            out.append('\n  <!-- P.S. · permanent slot, ratified across all eight letters -->')
            row(f'''<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
      <td width="3" bgcolor="{OCH}" style="background-color:{OCH};"></td>
      <td style="padding:13px 16px;font-size:15px;line-height:1.6;color:{BODY};background-color:#FAF7F1;"><b>P.S.</b> {links(val, slug)}</td>
    </tr></table>''', "24px 30px 0")
    return "\n".join(out)

def build(d):
    head = f'''<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"><head>
<title></title><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- 07-D {d["day"].upper()} - {d["spread"]}. Marcus Stone daily. {d["free"]} face up + {d["paid"]} face down = {d["free"]+d["paid"]}.
     Built by scripts/build-07-daily.py from one template, so every day matches Tuesday, which was
     built by hand against copy/02/02-E2-esl-v1.md.
     SHAPE: {d["shape"]}
     ⛔ NO PRICE, NO DELIVERY PROMISE - both live on the booking page, statements 5 and 6.
     ⛔ HERO IS FACE DOWN. Faces appear only at their own unit.
     ⛔ FIRST CTA COMES AFTER THE FREE READ COMPLETES (00e beat 11).
     ⛔ THREE TEXT CTAs, NO BUTTON - every CTA is a sentence with a permission verb (02-E2 rule).
     Subject:   {d["subject"]}
     Preheader: {d["preheader"]}
     Sends 6pm SGT = 6am ET.  CTAs -> booking page, ?c=1..3&s={d["slug"]}.
     TWO BRACE TOKENS, OPPOSITE MEANINGS: the Liquid name tag must reach AWeber INTACT;
     {{{{BOOKING_URL}}}} must be substituted BEFORE sending. A brace sweep eats the name tag. -->
<style>
  body,a{{word-break:break-word;}} table{{border-collapse:collapse;}}
  @media only screen and (max-width:600px){{
    .container{{width:100%!important;}} .px{{padding-left:18px!important;padding-right:18px!important;}}
    .cardimg{{width:150px!important;}} .herocard{{width:140px!important;}}
  }}
</style></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">{d["preheader"]}</div>
<center>
<table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
<tr><td align="center" style="padding:0;">
<table class="container" align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;font-family:{F};">

  <tr><td align="center" style="padding:30px 26px 0;">
    <p style="margin:0;font-size:19px;letter-spacing:.16em;text-transform:uppercase;color:{INK};font-weight:bold;">Marcus Stone</p>
    <p style="margin:7px 0 0;font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:{MUT};">Daily Tarot &middot; The Seer Within</p></td></tr>
  <tr><td style="padding:20px 26px 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td height="1" bgcolor="{RULE}" style="background-color:{RULE};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
  <tr><td align="center" style="padding:18px 26px 0;">
    <p style="margin:0;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:{OCH};font-weight:bold;">{d["day"]} &middot; {d["spread"]}</p></td></tr>

  <!-- BEAT 2 · HEADLINE -->
  <tr><td class="px" style="padding:18px 30px 0;">
    <h1 style="margin:0;font-size:29px;line-height:1.22;font-weight:bold;color:{INK};">{d["headline"]}</h1></td></tr>

  <!-- BEAT 3 · DECK - ⭐ the QUESTION the cards pose, plus the window -->
  <tr><td class="px" style="padding:14px 30px 0;">
    <p style="margin:0;font-size:16.5px;line-height:1.55;font-style:italic;color:#5C6270;">{d["deck"]}</p></td></tr>
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
    html = head + render(d) + foot
    base = f'copy/07-marcus/daily/07-D-{d["file"]}'
    open(base + ".html", "w").write(html)
    pv = html
    for c in d["cards"]:
        pv = pv.replace(S3 + c + ".jpg", "data:image/jpeg;base64," + base64.b64encode(urllib.request.urlopen(S3 + c + ".jpg").read()).decode())
    # the card BACK too — it appears in the hero and once per face-down position, and the
    # artifact viewer's CSP blocks every S3 request, so a preview without it renders empty boxes.
    back = S3ASSET + "card-back.jpg"
    pv = pv.replace(back, "data:image/jpeg;base64," + base64.b64encode(urllib.request.urlopen(back).read()).decode())
    pv = pv.replace("<title></title>", f'<title>{d["day"]} - {d["spread"]}</title>', 1)
    pv = pv.replace("<!-- 07-D", "<!-- PREVIEW COPY - art inlined for the artifact viewer. DO NOT SEND.\n     Sendable file: " + base.split("/")[-1] + ".html\n     07-D", 1)
    open(base + "-preview.html", "w").write(pv)
    return base, len(html), len(pv)
