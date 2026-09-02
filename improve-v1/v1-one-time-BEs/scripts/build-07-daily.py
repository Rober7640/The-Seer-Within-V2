#!/usr/bin/env python3
"""Build a 07-marcus daily email from a block list.

One template so every day is structurally identical to Tuesday, which was built by hand
against 02-E2. Blocks: h2 · p · img · hero(n) · faces(list) · ps.
Inline CTAs are written as [text](c=N) and rendered as ochre links, never buttons.
Emits the sendable file (S3 art) and a -preview file (art inlined for the artifact viewer).
"""
import re, sys, base64, urllib.request

S3   = "https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/"
F    = "Helvetica,Arial,sans-serif"
INK, BODY, MUT, OCH, BLU, RULE, CLOTH = "#16181D", "#24262E", "#8A909C", "#A8721C", "#2E4B6E", "#DDE0E6", "#1A2430"

def links(t, slug):
    return re.sub(r'\[([^\]]+)\]\(c=(\d)\)',
        lambda m: f'<a href="{{{{BOOKING_URL}}}}?c={m.group(2)}&amp;s={slug}" style="color:{OCH};font-weight:bold;">{m.group(1)}</a>', t)

def render(d):
    slug, out = d["slug"], []
    def row(inner, pad="0 40px 0"):
        out.append(f'  <tr><td class="px" style="padding:{pad};">{inner}</td></tr>')
    for kind, val in d["blocks"]:
        if kind == "note":
            out.append(f'\n  <!-- {val} -->')
        elif kind == "h2":
            row(f'<h2 style="margin:0 0 16px;font-size:21px;font-weight:bold;color:{INK};">{val}</h2>', "30px 40px 0")
        elif kind == "p":
            row(f'<p style="margin:0;font-size:16.5px;line-height:1.62;color:{BODY};">{links(val, slug)}</p>', "0 40px 18px")
        elif kind == "hero":
            cards = ('<td width="16">&nbsp;</td>'.join(
                f'<td class="backcell" width="124" height="200" bgcolor="{BLU}" style="width:124px;height:200px;background-color:{BLU};border:2px solid #3E5F86;">&nbsp;</td>'
                for _ in range(val)))
            cap = "One off the cut &mdash; not yet turned" if val == 1 else f"{'Two' if val==2 else 'Three'} off one cut &mdash; not yet turned"
            out.append(f'''  <tr><td align="center" style="padding:26px 20px 0;">
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="{CLOTH}" style="background-color:{CLOTH};"><tr><td style="padding:26px 30px;">
      <table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>{cards}</tr></table>
      <p style="margin:16px 0 0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8FA3BC;text-align:center;">{cap}</p>
    </td></tr></table></td></tr>''')
        elif kind == "img":
            card, alt = val
            out.append(f'''  <tr><td align="center" style="padding:0 20px 20px;">
    <img class="cardimg" src="{S3}{card}.jpg" alt="{alt}" width="200" style="display:block;width:200px;max-width:100%;height:auto;border:1px solid {RULE};"></td></tr>''')
        elif kind == "faces":
            cells, rows = [], []
            for n, t in val:
                cells.append(f'<td width="33%" valign="top" bgcolor="{BLU}" style="width:33%;background-color:{BLU};padding:11px 10px;">'
                             f'<div style="font-size:10px;color:#EAEEF4;font-weight:bold;">{n}</div>'
                             f'<div style="font-size:12px;line-height:1.35;color:#EAEEF4;padding-top:4px;">{t}</div></td>')
            for i in range(0, len(cells), 3):
                chunk = cells[i:i+3]
                rows.append("<tr>" + "".join(chunk) + '<td>&nbsp;</td>' * (3 - len(chunk)) + "</tr>")
            row(f'<table width="100%" cellpadding="0" cellspacing="6" border="0" role="presentation" style="border-collapse:separate;border-spacing:6px;">{"".join(rows)}</table>'
                f'<p style="margin:10px 0 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:{MUT};">These {len(val)} are still in my hand</p>', "26px 40px 0")
        elif kind == "ps":
            row(f'''<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
      <td width="3" bgcolor="{OCH}" style="background-color:{OCH};"></td>
      <td style="padding:13px 16px;font-size:15px;line-height:1.6;color:{BODY};background-color:#FAF7F1;"><b>P.S.</b> {links(val, slug)}</td>
    </tr></table>''', "24px 40px 0")
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
    .container{{width:100%!important;}} .px{{padding-left:22px!important;padding-right:22px!important;}}
    .cardimg{{width:150px!important;}} .backcell{{width:104px!important;height:170px!important;}}
  }}
</style></head>
<body style="margin:0;padding:0;background-color:#EEEFF2;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#EEEFF2;opacity:0;">{d["preheader"]}</div>
<center>
<table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EEEFF2;">
<tr><td align="center" style="padding:24px 10px;">
<table class="container" align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;font-family:{F};">

  <tr><td align="center" style="padding:30px 26px 0;">
    <p style="margin:0;font-size:19px;letter-spacing:.16em;text-transform:uppercase;color:{INK};font-weight:bold;">Marcus Stone</p>
    <p style="margin:7px 0 0;font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:{MUT};">Daily Tarot &middot; The Seer Within</p></td></tr>
  <tr><td style="padding:20px 26px 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td height="1" bgcolor="{RULE}" style="background-color:{RULE};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
  <tr><td align="center" style="padding:18px 26px 0;">
    <p style="margin:0;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:{OCH};font-weight:bold;">{d["day"]} &middot; {d["spread"]}</p></td></tr>

  <!-- BEAT 2 · HEADLINE -->
  <tr><td class="px" style="padding:18px 40px 0;">
    <h1 style="margin:0;font-size:29px;line-height:1.22;font-weight:bold;color:{INK};">{d["headline"]}</h1></td></tr>

  <!-- BEAT 3 · DECK - ⭐ the QUESTION the cards pose, plus the window -->
  <tr><td class="px" style="padding:14px 40px 0;">
    <p style="margin:0;font-size:16.5px;line-height:1.55;font-style:italic;color:#5C6270;">{d["deck"]}</p></td></tr>
'''
    foot = f'''
  <tr><td style="padding:28px 26px 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td height="1" bgcolor="{RULE}" style="background-color:{RULE};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
  <tr><td align="center" style="padding:20px 26px 30px;font-size:12px;line-height:16px;color:{MUT};">
    140 Broadway, Manhattan,<br>New York New York 10005<br>USA<br><br>
    <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" rel="noopener noreferrer" style="color:{OCH};text-decoration:underline;">Unsubscribe</a>
    &nbsp;|&nbsp;
    <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" rel="noopener noreferrer" style="color:{OCH};text-decoration:underline;">Change Subscriber Options</a></td></tr>

</table></td></tr></table></center></body></html>
'''
    html = head + render(d) + foot
    base = f'copy/07-marcus/daily/07-D-{d["file"]}'
    open(base + ".html", "w").write(html)
    pv = html
    for c in d["cards"]:
        pv = pv.replace(S3 + c + ".jpg", "data:image/jpeg;base64," + base64.b64encode(urllib.request.urlopen(S3 + c + ".jpg").read()).decode())
    pv = pv.replace("<title></title>", f'<title>{d["day"]} - {d["spread"]}</title>', 1)
    pv = pv.replace("<!-- 07-D", "<!-- PREVIEW COPY - art inlined for the artifact viewer. DO NOT SEND.\n     Sendable file: " + base.split("/")[-1] + ".html\n     07-D", 1)
    open(base + "-preview.html", "w").write(pv)
    return base, len(html), len(pv)
