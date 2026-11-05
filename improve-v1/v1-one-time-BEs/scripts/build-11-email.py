import re,sys
src,out_real,out_prev=sys.argv[1:4]
t=open(src).read()
body=t.split('---\n',1)[1].rsplit('## Build notes',1)[0]
body=re.sub(r'<!--.*?-->','',body,flags=re.S)
LIQ='{{ subscriber.first_name | capitalize }}'
S3='https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/'
IMGS={
 'IMG-1':(S3+'backend-11/hero-unsent-letter.jpg','Three tarot cards lying face-down on dark cloth, with one sealed, blank envelope beside them'),
 'IMG-2':(S3+'tarot-rws/the-hermit.jpg','The Hermit: an old man alone on a snowy peak, holding up a lantern'),
 'IMG-3':(S3+'tarot-rws/judgement.jpg','Judgement: an angel in the clouds blowing a long trumpet, people below rising with their arms up'),
 'IMG-4':(S3+'tarot-rws/the-devil.jpg','The Devil: a horned figure on a black block, a man and a woman below with loose chains'),
}
def typo(s):
    s=s.replace('&','&amp;')
    s=re.sub(r"(?<=\w)'(?=\w)",'&rsquo;',s)
    s=re.sub(r"(?<=\w)'",'&rsquo;',s)
    s=re.sub(r"(^|[\s(>*])'",r'\1&lsquo;',s)
    s=re.sub(r'(^|[\s(>*])"',r'\1&ldquo;',s)
    s=s.replace('"','&rdquo;').replace("'",'&rsquo;').replace('—','&mdash;')
    return s
def inline(s,bold_links=False):
    links=[]
    def keep(m):
        links.append((m.group(1),m.group(2))); return f'@@L{len(links)-1}@@'
    s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',keep,s)
    s=typo(s)
    s=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',s)
    s=re.sub(r'\*(.+?)\*',r'<em>\1</em>',s)
    for i,(label,url) in enumerate(links):
        st='color:#0000ff;text-decoration:underline;font-weight:bold;'
        s=s.replace(f'@@L{i}@@',f'<a href="{url}" target="_blank" rel="noopener noreferrer" style="{st}">{typo(label)}</a>')
    return s.replace('%FIRSTNAME%',LIQ)
out=[]; seen_head=False
for b in [x.strip() for x in re.split(r'\n\s*\n',body) if x.strip()]:
    b=' '.join(b.split('\n'))
    if b=='---': out.append('<hr style="background:#DEE0E8;border:0;height:1px;margin:22px 0 16px;">'); continue
    m=re.fullmatch(r'`\[(IMG-\d)\]`',b)
    if m:
        src_,alt=IMGS[m.group(1)]
        if src_=='HERO':
            out.append('<!-- HERO: picture not made yet. Brief in 11-E5. Swap this block for the image before any send. -->\n<p style="margin:0 0 22px;"><span style="display:block;background:#1d1b2e;color:#d9d3c7;text-align:center;padding:110px 20px;font-size:14px;">Hero picture goes here: three face-down cards and a sealed, blank envelope</span></p>')
        else:
            if m.group(1)=='IMG-1':
                out.append(f'<p style="margin:0 0 22px;"><img src="{src_}" alt="{typo(alt)}" width="540" style="display:block;width:100%;max-width:540px;height:auto;margin:0 auto;"></p>')
            else:
                out.append(f'<p style="margin:0 0 20px;text-align:center;"><img src="{src_}" alt="{typo(alt)}" width="240" style="display:inline-block;width:240px;max-width:100%;height:auto;"></p>')
        continue
    if b.startswith('# '):
        out.append(f'<p style="margin:0 0 10px;line-height:1.3;font-size:23px;font-weight:bold;color:#1a1a1a;text-align:center;">{inline(b[2:])}</p>'); seen_head=True; continue
    if b.startswith('### '):
        out.append(f'<p style="margin:26px 0 12px;line-height:1.3;font-size:20px;font-weight:bold;color:#1a1a1a;">{inline(b[4:])}</p>'); continue
    if b.startswith('*') and not b.startswith('**') and b.endswith('*') and len(out)==1:
        out.append(f'<p style="margin:0 0 18px;line-height:1.5;font-size:17px;font-style:italic;color:#4a414c;text-align:center;">{inline(b[1:-1])}</p>'); continue
    out.append(f'<p style="margin:0 0 16px;line-height:1.6;">{inline(b)}</p>')
html=f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>The Seer Within &mdash; Evelyn</title>
<style type="text/css">
  body{{-webkit-font-smoothing:antialiased;font-weight:400;line-height:1.5;margin:0;padding:0;width:100%;background-color:#ffffff;}}
  img{{border:0;height:auto;line-height:100%;max-width:100%;outline:none;}}
  table,td{{border-collapse:collapse;border-spacing:0;border:0;}}
  .aw{{color:#333333;font-family:Helvetica,Arial,sans-serif;font-size:16px;}}
  .aw a{{color:#0000ff;text-decoration:underline;}}
  .aw p{{margin:0 0 16px;line-height:1.6;}}
  @media only screen and (max-width:600px){{ .container{{width:100%!important;}} .px{{padding-left:18px!important;padding-right:18px!important;}} }}
</style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">I wasn&rsquo;t looking for them.</div>
<div style="display:none;max-height:0;overflow:hidden;">&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<center>
<table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
  <tr><td align="center">
    <table align="center" class="container aw" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

      <tr><td align="center" style="padding:0 0 12px;"><img src="https://hostedimages-cdn.aweber-static.com/NDQyNzMw/optimized/8bf6df906cab4e11b58e484fe450705a.png" alt="The Seer Within" width="499" height="166" style="display:block;height:166px;width:499px;max-width:100%;"></td></tr>
      <tr><td style="padding:0 0 6px;"><div style="border-top:1px solid #DEE0E8;height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

      <tr><td class="px" style="padding:14px 30px 8px;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#333333;line-height:1.6;text-align:left;">

{chr(10).join(out)}

      </td></tr>

      <tr><td align="center" style="padding:24px 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;color:#000000;">
        140 Broadway, Manhattan,<br>New York New York 10005<br>USA<br><br>
        <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" rel="noopener noreferrer" style="color:#0000ff;text-decoration:underline;">Unsubscribe</a>
        &nbsp;|&nbsp;
        <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" rel="noopener noreferrer" style="color:#0000ff;text-decoration:underline;">Change Subscriber Options</a>
      </td></tr>

    </table>
  </td></tr>
</table>
</center>
</body></html>
'''
open(out_real,'w').write(html)
prev=html.replace(LIQ,'Sarah').replace('{{BOOKING_URL}}','http://localhost:5097/tarot/unsent-letter').replace('?c=','?fn=Sarah&c=')
prev=prev.replace(S3+'backend-11/hero-unsent-letter.jpg','img/hero-unsent-letter.jpg')
open(out_prev,'w').write(prev)
