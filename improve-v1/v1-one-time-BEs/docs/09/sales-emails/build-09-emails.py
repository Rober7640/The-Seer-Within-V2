#!/usr/bin/env python3
"""Re-render a 09 sales email's HTML + plain-text build from its Markdown copy.

The Markdown drives the COPY only. The AWeber shell, the hosted images and the
call-out boxes are lifted from the existing build and re-anchored to the
sentence they currently sit against, so a copy pass never silently drops them.
"""
import html as H
import re
import sys

P     = '<p style="margin:0 0 16px;line-height:1.6;">{}</p>'
CALL  = ('<p style="margin:0 0 16px;line-height:1.6;background:#f4ecf4;'
         'border-left:3px solid #7a4f7a;padding:14px 18px;color:#2c2530;">{}</p>')
H2    = ('<h2 style="font-size:20px;line-height:1.35;text-align:center;color:#333333;'
         'margin:26px 0 18px;padding-top:20px;border-top:1px solid #DEE0E8;">{}</h2>')
H1    = ('<h1 style="font-size:23px;line-height:1.3;color:#1a1a1a;text-align:center;'
         'margin:0 0 10px;">{}</h1>')
SUB   = ('<p style="margin:0 0 16px;line-height:1.6;font-size:17px;color:#4a414c;'
         'text-align:center;margin-bottom:24px;">{}</p>')
PS    = ('<p style="margin:0 0 16px;line-height:1.6;border-top:1px solid #DEE0E8;'
         'padding-top:24px;margin-top:28px;">{}</p>')
MARKER = '\x00IMG-SLOT\x00'
LINK  = ('<a target="_blank" rel="noopener noreferrer" href="{url}" '
         'style="color:#0000ff;text-decoration:underline;text-underline-offset:3px;">{text}</a>')


def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace("'", '&#x27;')


def inline(t):
    t = esc(t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: LINK.format(url=m.group(2), text=m.group(1)), t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t, flags=re.S)
    t = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<em>\1</em>', t, flags=re.S)
    return t


def plain(t):
    """Markdown block -> bare text, for matching against the old build."""
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)
    t = t.replace('**', '').replace('*', '').replace('`', '')
    t = re.sub(r'^#{1,6}\s*', '', t)
    return re.sub(r'\s+', ' ', t).strip()


def strip_tags(s):
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', s))).strip()


def md_body(md):
    """The email itself: after the '---' under **Preview:**, before the notes."""
    body = md.split('\n---\n', 1)[1]
    body = re.split(r'\n---\n\s*##\s', body)[0]
    return [b.strip() for b in re.split(r'\n\s*\n', body) if b.strip()]


def salvage(old):
    """(anchor_text -> [image block lines]) and the set of call-out sentences."""
    lines = old.split('\n')
    imgs, callouts = {}, set()
    for i, ln in enumerate(lines):
        if '<img' in ln and 'aweber-static' not in ln:
            block = [ln]
            if i + 1 < len(lines) and 'font-size:13px' in lines[i + 1]:
                block.append(lines[i + 1])
            imgs.setdefault(strip_tags(lines[i - 1]), []).extend(block)
        if 'background:#f4ecf4' in ln:
            callouts.add(strip_tags(ln))
    return imgs, callouts


def render(md_path, old_path, out_html, out_txt):
    md = open(md_path, encoding='utf-8').read()
    old = open(old_path, encoding='utf-8').read()
    imgs, callouts = salvage(old)

    blocks = md_body(md)
    out, txt = [], []
    used_imgs, used_calls, seen_h1 = set(), set(), False

    for b in blocks:
        if b.startswith('`[IM'):
            out.append(MARKER)                         # photo brief: a slot, not copy
            txt.append('')
            continue
        flat = plain(b)
        if b.startswith('### '):
            out.append(H2.format(inline(b[4:].strip())))
            txt.append(flat[4:] if flat.startswith('### ') else plain(b[4:]))
        elif b.startswith('# ') and not seen_h1:
            seen_h1 = True
            out.append(H1.format(inline(b[2:].strip())))
            txt.append(plain(b[2:]))
        elif b.startswith('#'):
            continue
        elif seen_h1 and len(out) == 1 and b.startswith('*') and not b.startswith('**'):
            out.append(SUB.format(inline(b)))
            txt.append(flat)
        elif b.startswith('P.S.'):
            out.append(PS.format(inline(b)))
            txt.append(flat)
        elif flat in callouts:
            used_calls.add(flat)
            out.append(CALL.format(inline(b)))
            txt.append(flat)
        else:
            out.append(P.format(inline(b)))
            txt.append(flat)

        # plain-text part spells each link out on the line under its sentence
        urls = [m.group(2) for m in re.finditer(r'\[([^\]]+)\]\(([^)]+)\)', b)]
        if urls and txt:
            txt[-1] = txt[-1] + '\n' + '\n'.join(urls)

        for anchor, block in imgs.items():
            if anchor and anchor not in used_imgs and flat.startswith(anchor[:55]):
                out.extend(block)
                used_imgs.add(anchor)
                for cap in block:
                    if 'font-size:13px' in cap:
                        txt.append(strip_tags(cap).replace('capsule. Demo', 'capsule.\nDemo'))

    # any image whose anchor sentence is gone drops into the next Markdown marker slot
    for anchor, block in imgs.items():
        if anchor in used_imgs:
            continue
        if MARKER in out:
            out[out.index(MARKER)] = '\n'.join(block)
            used_imgs.add(anchor)
    out = [o for o in out if o != MARKER]

    missing_i = [a for a in imgs if a not in used_imgs]
    missing_c = [c for c in callouts if c not in used_calls]

    prefix = old[:old.index('<h1 ')]
    suffix = old[old.index('</td></tr><tr><td align="center"'):]

    # keep the shell's subject comment + preheader in step with the Markdown
    subj = re.search(r'\*\*Subject:\*\*\s*(.+)', md).group(1).strip()
    prev = re.search(r'\*\*Preview:\*\*\s*(.+)', md).group(1).strip()
    prefix = re.sub(r'(<!-- Subject: ).*?(\n)', lambda m: m.group(1) + subj + m.group(2), prefix, count=1)
    prefix = re.sub(r'(Preheader: ).*?(\n)', lambda m: m.group(1) + prev + m.group(2), prefix, count=1)
    prefix = re.sub(r'(mso-hide:all;">).*?(</div>)', lambda m: m.group(1) + esc(prev) + m.group(2), prefix, count=1)

    open(out_html, 'w', encoding='utf-8').write(prefix + '\n'.join(out) + suffix)

    foot = strip_tags(suffix[:suffix.index('<a ')]) if '<a ' in suffix else ''
    txt_out = [prev] + [t for t in txt if t]
    body_txt = '\n\n'.join(txt_out)
    body_txt += '\n\n140 Broadway, Manhattan,\nNew York New York 10005\nUSA\n\nUnsubscribe\n{{ subscriber.unsubscribe_link }}\n |  Change Subscriber Options\n{{ subscriber.unsubscribe_link }}\n'
    open(out_txt, 'w', encoding='utf-8').write(body_txt)

    return missing_i, missing_c, len(out)


if __name__ == '__main__':
    mi, mc, n = render(*sys.argv[1:5])
    print(f'  {n} blocks')
    for a in mi:
        print('  ⚠ IMAGE LOST, anchor gone:', a[:70])
    for c in mc:
        print('  ⚠ CALL-OUT LOST, sentence gone:', c[:70])
