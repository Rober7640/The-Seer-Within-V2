#!/usr/bin/env python3
"""Render belief-lane JSON files: review HTML page, plain-text page md, keyword counts, voice-rule checks.

  python3 render_lanes.py LANE.json [LANE.json ...] --html OUT.html [--md-dir DIR] [--counts OUT.json]

The JSON is the source of truth. Edit the JSON, re-run, never edit the outputs.
Exit code 1 if any voice-rule check fails.
"""
import re, html, json, sys, os, argparse

def load(path):
    d = json.load(open(path, encoding='utf-8'))
    d['_file'] = os.path.basename(path)
    return d

def send_free(lane):
    # the closing ask reuses the card button and the line under it (v2 if present, else v1)
    c = lane['card'].get('v2') or lane['card']['v1']
    return c['b'], c['sc']

def main_card(lane): return lane['card'].get('v2') or lane['card']['v1']


def when_send(lane):
    """The 'When you send your first name' block is plain h/p entries in body; nothing special."""
    return None

def kw_regex(lane):
    parts = [f"(?P<k_{re.sub(r'[^a-z0-9]', '_', k['key'])}>{k['regex']})" for k in lane['kw']]
    return re.compile('|'.join(parts), re.I)

def keyname(m):
    for g, v in m.groupdict().items():
        if v is not None: return g[2:]

def hl(text, lane, counter=None):
    t = html.escape(text, quote=False)
    rx = kw_regex(lane)
    def sub(m):
        k = keyname(m)
        if counter is not None: counter[k] = counter.get(k, 0) + 1
        return f'<mark class="kw">{m.group(0)}</mark>'
    out = rx.sub(sub, t)
    return out.replace('{Name}', '<span class="nm">{Name}</span>')

def words(s): return len(re.findall(r"[A-Za-z0-9'’]+", s))

def card(lane, v, label, pick):
    extras = ''
    if v.get('alts'):
        extras += f'<div class="alts"><b>{"The other two headlines" if v.get("chosen") else "Headlines 2 and 3, for the operator to choose from"}</b><ul>' + ''.join(f'<li>{html.escape(a, quote=False)}</li>' for a in v['alts']) + '</ul></div>'
    if v.get('why'):
        extras += f'<p class="why">{inl(v["why"])}</p>'
    return f'''<figure class="cardfig">
  <figcaption><span class="vlab">{label}</span>{' <span class="tag pick">Pick</span>' if pick else ''}</figcaption>
  <div class="fbmock">
    <div class="logo">✦ The Seer Within</div>
    <div class="card">
      <div class="av" aria-hidden="true"></div>
      <div class="status">Evelyn Cross is <i></i><b>Online</b></div>
      <div class="div"></div>
      <p class="h chg lc">{hl(v['h'], lane)}</p>
      <p class="s chg lc">{hl(v['s'], lane)}</p>
      <div class="b chg lc">{hl(v['b'], lane)}</div>
      <p class="sc chg lc">{hl(v['sc'], lane)}</p>
      <div class="trust"><span>100% Private &amp; Confidential</span><span>Trusted By 2,400+ Clients</span></div>
    </div>
    <div class="foot">Privacy Policy · Terms of Service · Refund Policy</div>
  </div>{extras}
</figure>'''

def body_html(lane, counter, mdlines):
    out = []; wc = 0
    SEND, FREE = send_free(lane)
    for blk in lane['body']:
        kind = blk['t']
        if kind == 'h':
            out.append(f'<h4 class="sub lc">{hl(blk["text"], lane, counter)}</h4>'); wc += words(blk['text'])
            mdlines += ['', f'**{blk["text"]}**', '']
        elif kind == 'p':
            out.append(f'<p class="lc">{hl(blk["text"], lane, counter)}</p>'); wc += words(blk['text'])
            mdlines += [blk['text'], '']
        elif kind == 'list':
            intro, items, closer = blk['lead'], blk['items'], blk['closer']
            lis = ''.join(f'<li class="lc">{hl(i, lane, counter)}</li>' for i in items)
            out.append(f'<div class="tried"><p class="lc lead">{hl(intro, lane, counter)}</p><ul>{lis}</ul><p class="lc">{hl(closer, lane, counter)}</p></div>')
            wc += words(intro) + sum(words(i) for i in items) + words(closer)
            mdlines += [intro] + [f'- {i}' for i in items] + ['', closer, '']
        elif kind == 'slot':
            sys.exit("slot blocks were dropped on 2026-11-18 (no ?ad= keys); turn it into a 'p' block")
        elif kind == 'faq':
            items = ''
            for it in blk['items']:
                q, a = it['q'], it['a']
                items += f'<div class="qa"><p class="q lc">{hl(q, lane, counter)}</p><p class="a lc">{hl(a, lane, counter)}</p></div>'
                wc += words(q) + words(a)
                mdlines += [f'- **{q}** {a}']
            out.append(f'<div class="faq">{items}</div>'); mdlines.append('')
        elif kind == 'ask':
            out.append(f'<div class="ask"><div class="btn lc">{hl(SEND, lane, counter)}</div><p class="free lc">{hl(FREE, lane, counter)}</p></div>')
            wc += words(SEND) + words(FREE)
            mdlines += [f'Button: "{SEND}". Under it: "{FREE}"', '']
    return '\n'.join(out), wc

def chat_html(lane, mdlines):
    b = ['<div class="sys">Evelyn has joined the chat</div>']
    mdlines += ["Evelyn's first messages:", '']
    for c in lane['chat']:
        kind, t = c['who'], c['text']
        if kind == 'me':
            b.append(f'<div class="bub me">{html.escape(t)}</div>'); mdlines.append(f'- *(she types {t})*')
        else:
            b.append(f'<div class="bub lc{" q" if kind=="q" else ""}">{hl(t, lane).replace("<mark class=\"kw\">","").replace("</mark>","")}</div>')
            mdlines.append(f'- {t}' + ('  ← her first question' if kind == 'q' else ''))
    mdlines += ['', lane['chatnote'], '']
    return '\n'.join(b)

def inl(text):
    """Escape, then turn **bold**, *italic* and `code` markers into tags."""
    t = html.escape(text, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<i>\1</i>', t)
    return re.sub(r'`(.+?)`', r'<code>\1</code>', t)

def note_md(t):
    """notes are small HTML; flatten to markdown."""
    t = re.sub(r'</?(b|strong)>', '**', t); t = re.sub(r'</?(i|em)>', '*', t)
    return re.sub(r'</?code>', '`', t)

def lane_label(lane): return f"Lane {lane['num']}"
def lane_path(lane): return lane['link']

def render_lane(lane):
    """-> (section_html, mdblock lines, counts dict)"""
    counter = {}; mdl = []
    bhtml, wc = body_html(lane, counter, mdl)
    cardcount = {}
    for f in ('h', 's', 'b', 'sc'): hl(main_card(lane)[f], lane, cardcount)
    chtml = chat_html(lane, mdl)
    rows = ''; cnt = {}
    for k in sorted(lane['kw'], key=lambda x: -x['hi']):
        key, label, tgt, lo, hi = k['key'], k['label'], k['target'], k['lo'], k['hi']
        a = counter.get(key, 0); cnt[key] = dict(label=label, target=tgt, actual=a, card=cardcount.get(key, 0), in_range=lo <= a <= hi, status='in range' if lo <= a <= hi else ('over' if a > hi else 'under'))
        ok = lo <= a <= hi
        st = '<span class="st ok">in range</span>' if ok else f'<span class="st off">{"over" if a > hi else "under"}</span>'
        rows += f'<tr><td>{label}</td><td class="num">{tgt}</td><td class="num"><b>{a}</b></td><td>{st}</td><td class="num dim">{cardcount.get(key, 0)}</td></tr>'
    notes = ''.join(f'<li>{n}</li>' for n in lane['notes'])
    words_html = ''
    if lane.get('words'):
        words_html = '\n  <h3>What the words data says</h3>\n  <ul class="notes">' + ''.join(f'<li>{inl(w)}</li>' for w in lane['words']) + '</ul>\n'
    kw_html = ''
    if lane.get('keywords'):
        kw_html = '\n  <h3>Keywords</h3>\n  <div class="tw"><table class="m"><thead><tr><th>Role</th><th>Words</th></tr></thead><tbody>' + \
            ''.join(f'<tr><td>{html.escape(k["role"], quote=False)}</td><td>{inl(k["words"])}</td></tr>' for k in lane['keywords']) + '</tbody></table></div>\n'
    directive_html = ''
    if lane.get('directive'):
        directive_html = f'\n  <h3>Directive for later chat</h3>\n  <p class="note">Kept in the chat prompt so the lane stays alive after the first messages.</p>\n  <p class="directive">{html.escape(lane["directive"], quote=False)}</p>\n'
    open_html = ''
    if lane.get('open'):
        open_html = '\n  <h3>Open</h3>\n  <ul class="notes">' + ''.join(f'<li>{html.escape(o, quote=False)}</li>' for o in lane['open']) + '</ul>\n'
    m = lane['meta']
    cl = lane['card']
    cards_html = '\n    '.join(card(lane, cl[k], lab, pick and len(cl) > 1) for k, lab, pick in (('v1', 'Version 1 · her words', True), ('v2', "Version 2 · today\\'s /fb style", False)) if k in cl)
    cardtag = 'v2' if 'v2' in cl else 'v1'
    sec = f'''
<section class="lane" id="{lane['id']}">
  <p class="eyebrow">{lane_label(lane)} · <code>{lane_path(lane)}</code></p>
  <h2>{lane['name']}</h2>
  <p class="belief">{html.escape(lane['belief'])}</p>
  <p class="note"><b>Status.</b> {html.escape(lane['status'])}</p>
{words_html}{kw_html}
  <h3>First screen · the /fb card, four text spots changed</h3>
  <div class="cards">
    {cards_html}
  </div>
  <p class="legend">Dashed = the four spots that change. Logo, avatar, Busy → Online status, 3-second button delay, trust row and footer stay as they are on /fb. The button opens the chat.</p>

  <h3>What Meta reads in the page code</h3>
  <dl class="meta">
    <div><dt>Page title</dt><dd class="lc">{hl(m['title'], lane)}</dd></div>
    <div><dt>Description</dt><dd class="lc">{hl(m['desc'], lane)}</dd></div>
    <div><dt>Photo description</dt><dd class="lc">{hl(m['alt'], lane)}</dd></div>
  </dl>

  <h3>Below the card · {wc} words</h3>
  <article class="copy">
{bhtml}
  </article>

  <h3>Keyword count · below the card</h3>
  <div class="tw"><table class="m">
    <thead><tr><th>Keyword</th><th class="num">Target</th><th class="num">Actual</th><th>Status</th><th class="num">Also on card ({cardtag})</th></tr></thead>
    <tbody>{rows}</tbody>
  </table></div>
  <p class="note">Counted by script from the copy above: headings, list, FAQ and the closing ask. The card, the chat and the page code aren't counted.</p>

  <h3>Evelyn's first messages</h3>
  <div class="chat">
{chtml}
  </div>
  <p class="note">{html.escape(lane['chatnote'])}</p>

{directive_html}
  <h3>Notes</h3>
  <ul class="notes">{notes}</ul>
{open_html}</section>'''
    return sec, wc, cnt

def lane_md(lane, counts):
    """Complete lane doc in markdown, same wording as the HTML."""
    m = lane['meta']
    cards = [(lane['card'][k], t) for k, t in (('v1', 'First screen, version 1 (her words)'), ('v2', "First screen, version 2 (today's `/fb` style)")) if k in lane['card']]
    L = [f"<!-- generated from {lane['_file']} by render_lanes.py — edit the JSON, not this file -->", '',
         f"# {lane_label(lane)} · {lane['name']} (`{lane_path(lane)}`)", '', f"Status: {lane['status']}", '', lane['belief'], '']
    if lane.get('words'):
        L += ['## What the words data says', ''] + [f'- {w}' for w in lane['words']] + ['']
    if lane.get('keywords'):
        L += ['## Keywords', '', '| Role | Words |', '|---|---|'] + [f"| {k['role']} | {k['words']} |" for k in lane['keywords']] + ['']
    for v, title in cards:
        L += [f'## {title}', '', f"- **Headline:** {v['h']}", f"- **Sub-line:** {v['s']}", f"- **Button:** {v['b']}", f"- **Under the button:** {v['sc']}"]
        if v.get('alts'): L.append('- Other headlines: ' + ' / '.join('*' + a + '*' for a in v['alts']))
        L.append('')
        if v.get('why'): L += [v['why'], '']
    L += ['## Page title and description', '', f"- Title: {m['title']}", f"- Description: {m['desc']}", f"- Photo description: {m['alt']}", '',
          '## Below the card', '',
          'In order. The card itself is the first screen above.', '']
    mdl = []
    body_html(lane, {}, mdl)
    L += mdl
    L += ['## Keyword count, below the card', '', f'| Keyword | Target | Actual | Status | Also on card ({"v2" if "v2" in lane["card"] else "v1"}) |', '|---|---|---|---|---|']
    for k in sorted(lane['kw'], key=lambda x: -x['hi']):
        c = counts[k['key']]
        L.append(f"| {c['label']} | {c['target']} | {c['actual']} | {c['status']} | {c['card']} |")
    L += ['', "## Evelyn's first messages", '']
    cl = []; chat_html(lane, cl)
    L += cl[2:]
    if lane.get('directive'): L += ['## Directive for later chat', '', lane['directive'], '']
    if lane.get('notes'): L += ['## Notes', ''] + [f'- {note_md(n)}' for n in lane['notes']] + ['']
    if lane.get('open'): L += ['## Open', ''] + [f'- {o}' for o in lane['open']] + ['']
    return '\n'.join(L).rstrip() + '\n'

# ---------- voice-rule checks (ported from check_lanes.py; lane ids come from the data) ----------
BAN = re.compile(r"\b(psychic|tarot|readings?|fortunes?|spells?|magic\w*|chatbot|prices?|god|church|soul\w*|bless\w*|prayers?|pray\w*|holiday)\b", re.I)
AI = re.compile(r"\bAI\b")
PRED = re.compile(r"\b(predict\w*|forecast\w*|will happen|guarantee\w*|heal\w*|trauma|money|abundance|career|wealth)\b", re.I)

def copy_strings(lane):
    """Every copy string of a lane, in page order."""
    out = []
    for v in ('v1', 'v2'):
        if v not in lane['card']: continue
        c = lane['card'][v]; out += [c['h'], c['s'], c['b'], c['sc']] + list(c.get('alts', []))
    out += [lane['meta'][k] for k in ('title', 'desc', 'alt')]
    SEND, FREE = send_free(lane)
    for b in lane['body']:
        t = b['t']
        if t in ('h', 'p'): out.append(b['text'])
        elif t == 'list': out += [b['lead']] + b['items'] + [b['closer']]
        elif t == 'slot': sys.exit("slot blocks were dropped on 2026-11-18 (no ?ad= keys); turn it into a 'p' block")
        elif t == 'faq':
            for it in b['items']: out += [it['q'], it['a']]
        elif t == 'ask': out += [SEND, FREE]
    out += [c['text'] for c in lane['chat'] if c['who'] != 'me']
    return [re.sub(r'\s+', ' ', s).strip() for s in out]

def run_checks(lanes):
    items = [(l['id'], t) for l in lanes for t in copy_strings(l)]
    fails = []
    # operator-facing strings: the directive is held to the full rules (but kept out of the sentence stats);
    # `open` discusses banned words on purpose (soul, soulmate), so only the punctuation rules apply to it.
    dirs = set()
    for l in lanes:
        d = l.get('directive', '')
        if d: items.append((l['id'], d)); dirs.add(d)
        for o in l.get('open', []):
            for ch in ('$', '!'):
                if ch in o: fails.append((l['id'], ch, ch, o))
    for l in lanes:
        c = main_card(l); n = 1 + len(c.get('alts', []))
        if n != 3: fails.append((l['id'], 'headlines', f'{n} headlines', 'write 3: card.v2.h (your recommendation) + 2 in alts, for the operator to choose'))
    for lane, t in items:
        for m in BAN.finditer(t): fails.append((lane, 'banned', m.group(0), t))
        for m in AI.finditer(t): fails.append((lane, 'banned', 'AI', t))
        if '$' in t: fails.append((lane, '$', '$', t))
        if '!' in t: fails.append((lane, '!', '!', t))
        if re.search(r'soul ?mate', t, re.I): fails.append((lane, 'soulmate', '', t))
        if re.search(r'by morning', t, re.I): fails.append((lane, 'by morning', '', t))
        for m in PRED.finditer(t): fails.append((lane, 'prediction/health/money', m.group(0), t))
    sents = []
    for lane, t in items:
        if t in dirs: continue
        for s in re.split(r'(?<=[.?])\s+', t):
            if re.search(r'\bfree\b', s, re.I) and not re.search(r"messag|chat|isn't free", s, re.I):
                fails.append((lane, 'free not beside message/chat', '', s))
            w = len(re.findall(r"[A-Za-z0-9'’]+", s))
            if w: sents.append((lane, w, s))
    print('copy strings checked:', len(items))
    print('fails:', len(fails))
    for f in fails: print('  ', f)
    for l in lanes:
        k = sum(len(re.findall(r'\bkarmic\b', t, re.I)) for i, t in items if i == l['id'])
        S = [x for x in sents if x[0] == l['id']]
        le10 = sum(1 for x in S if x[1] <= 10)
        con = sum(1 for x in S if re.search(r"\b\w+'(s|t|re|ve|ll|d|m)\b", x[2], re.I))
        print(f"{l['id']}: karmic uses = {k}; sentences {len(S)}, <=10 words {le10} ({100*le10/len(S):.0f}%), with a contraction {con} ({100*con/len(S):.0f}%)")
        for x in S:
            if x[1] > 12: print(f'   >12 ({x[1]}): {x[2]}')
    return len(fails)

def page(lanes, sections):
    nav = ''.join(f'<a href="#{l["id"]}">{lane_label(l)} · {l["name"]}</a>' for l in lanes)
    desc = ', '.join(f'{l["name"]} (<code>{lane_path(l)}</code>)' for l in lanes)
    if len(lanes) > 1:
        desc = ', '.join(f'{l["name"]} (<code>{lane_path(l)}</code>)' for l in lanes[:-1]) + f' and {lanes[-1]["name"]} (<code>{lane_path(lanes[-1])}</code>)'
    nwords = {1: 'one', 2: 'two', 3: 'three', 4: 'four'}.get(len(lanes), str(len(lanes)))
    openl = ''.join(f'<br><b>{l["name"]}:</b> ' + ' '.join(html.escape(o, quote=False) for o in l.get('open', [])) for l in lanes if l.get('open'))
    return HEAD + f'''
<nav class="top" aria-label="Sections"><div class="in">
  {nav}
</div></nav>
<main class="wrap">
  <p class="eyebrow">Evelyn · belief lanes · copy only, nothing built</p>
  <h1>Belief Lane Pages</h1>
  <ul class="summary">
    <li><b>What this is.</b> Complete page copy for {nwords} lanes, {desc}. Each has the first screen, the page code Meta reads, the copy below the card, keyword counts and Evelyn's first messages.</li>
    <li><b>Layout.</b> The live /fb card, unchanged. Only the headline, sub-line, button and the line under it change. Everything else sits below the card.</li>
    <li><b>Still open.</b>{openl}</li>
  </ul>
  <div class="legendbar"><span><span class="sw k">word</span> a lane keyword</span><span><span class="sw d">text</span> a copy spot that changes on the card</span></div>
{''.join(sections)}
</main>
'''

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('lanes', nargs='+')
    ap.add_argument('--html'); ap.add_argument('--md-dir'); ap.add_argument('--counts')
    a = ap.parse_args()
    lanes = [load(p) for p in a.lanes]
    sections = []; counts = {}; allcnt = {}
    for l in lanes:
        sec, wc, cnt = render_lane(l)
        sections.append(sec); allcnt[l['id']] = cnt
        counts[l['id']] = dict(words=wc, counts=[dict(key=k, label=v['label'], target=v['target'], actual=v['actual'], in_range=v['in_range']) for k, v in cnt.items()])
    if a.html:
        open(a.html, 'w', encoding='utf-8').write(page(lanes, sections))
    if a.md_dir:
        os.makedirs(a.md_dir, exist_ok=True)
        for l in lanes:
            open(os.path.join(a.md_dir, f"{l['num']}-{l['name'].lower()}.md"), 'w', encoding='utf-8').write(lane_md(l, allcnt[l['id']]))
    if a.counts:
        json.dump(counts, open(a.counts, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    for lid, c in counts.items():
        print(f"== {lid}: {c['words']} words below the card")
        for v in c['counts']:
            print(f"   {v['label']:<28} target {v['target']:<5} actual {v['actual']}  {'ok' if v['in_range'] else 'OUT OF RANGE'}")
    sys.exit(1 if run_checks(lanes) else 0)

HEAD = f'''<title>Belief Lane Pages</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&family=Playfair+Display:wght@400&family=Inter:ital,wght@0,400;0,600;1,400&display=swap">
<style>
/* Layout: one reading column per lane: card pair → page code → the page copy as she'd read it → counts → chat. */
:root{{
  --bg:#edf1f0; --paper:#ffffff; --ink:#1c282c; --muted:#56676b; --line:#d2dbd9;
  --accent:#a95f22; --accent-soft:#f6ebe0; --pick:#2c6a55; --pick-soft:#e3f0ea;
  --warn:#9c3f2b; --warn-soft:#f7e6e1; --slot:#5a4aa0; --slot-soft:#ece9f7; --bubble:#f1f4f3;
  --kw-bg:#fbefd9; --kw-line:#c98a3c;
  --f-display:"Instrument Serif", Georgia, "Times New Roman", serif;
  --f-copy:"Source Serif 4", Georgia, "Times New Roman", serif;
  --f-ui:"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --f-mono:"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
  /* the live /fb card's own look, fixed in both themes */
  --fb-night1:#1b1f45; --fb-night2:#24365c; --fb-gold:#d4b25c; --fb-card:#f3f4f6; --fb-ink:#111827;
  --fb-body:#4b5563; --fb-faint:#9ca3af; --fb-pill:#f9fafb; --fb-rule:#e5e7eb; --fb-p1:#9333ea; --fb-p2:#6b21a8;
  --fb-green:#22c55e; --fb-green2:#16a34a; --fb-white:#ffffff; --fb-foot:#a7adc4; --fb-av1:#cfc6bf; --fb-av2:#6d5a7d;
  --fb-kw:#f3e6fb; --fb-kwl:#a855f7; --fb-dash:#c98a3c;
  --f-fbs:"Playfair Display", Georgia, serif; --f-fbi:"Inter", system-ui, -apple-system, sans-serif;
}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{
  --bg:#10171a; --paper:#172125; --ink:#e2eae7; --muted:#9db0ac; --line:#2b3b3f;
  --accent:#e2a565; --accent-soft:#2c2419; --pick:#86c9ad; --pick-soft:#16302a;
  --warn:#ec9a85; --warn-soft:#35201b; --slot:#b7a9f0; --slot-soft:#251f3d; --bubble:#1e2b2f;
  --kw-bg:#3a2c18; --kw-line:#d79a4e; color-scheme:dark}}}}
:root[data-theme="dark"]{{
  --bg:#10171a; --paper:#172125; --ink:#e2eae7; --muted:#9db0ac; --line:#2b3b3f;
  --accent:#e2a565; --accent-soft:#2c2419; --pick:#86c9ad; --pick-soft:#16302a;
  --warn:#ec9a85; --warn-soft:#35201b; --slot:#b7a9f0; --slot-soft:#251f3d; --bubble:#1e2b2f;
  --kw-bg:#3a2c18; --kw-line:#d79a4e; color-scheme:dark}}
*{{box-sizing:border-box}}
body{{background:var(--bg);color:var(--ink);font:15px/1.6 var(--f-ui);margin:0}}
.wrap{{max-width:880px;margin:0 auto;padding-block:28px 80px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
body::before{{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--bg)}}
nav.top{{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg);border-bottom:1px solid var(--line)}}
nav.top .in{{max-width:880px;margin:0 auto;padding-block:10px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;gap:6px 18px;flex-wrap:wrap;font-size:13px}}
nav.top a{{color:var(--muted);text-decoration:none}}
nav.top a:hover,nav.top a:focus-visible{{color:var(--ink);text-decoration:underline}}
h1{{font:400 46px/1.05 var(--f-display);margin:6px 0 12px;text-wrap:balance}}
h2{{font:400 38px/1.08 var(--f-display);margin:0 0 6px;text-wrap:balance}}
h3{{font:600 12px/1.3 var(--f-ui);letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:38px 0 12px}}
p{{margin:0 0 10px}}
code{{font:500 12.5px var(--f-mono);background:var(--bg);padding:1px 5px;border-radius:3px;overflow-wrap:anywhere}}
a{{color:var(--accent)}}
:focus-visible{{outline:2px solid var(--accent);outline-offset:2px}}
.eyebrow{{font:500 12px/1.3 var(--f-mono);color:var(--accent);letter-spacing:.04em;margin:0 0 4px}}
.summary{{list-style:none;padding:0;margin:0 0 14px;display:grid;gap:8px;max-width:72ch}}
.summary li{{padding-left:14px;border-left:2px solid var(--line)}}
.summary b{{font-weight:600}}
.legendbar{{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:var(--muted);margin-top:14px}}
.legendbar .sw{{display:inline-block;padding:0 6px;border-radius:2px;margin-right:4px}}
.legendbar .sw.k{{background:var(--kw-bg);border-bottom:1.5px solid var(--kw-line);color:var(--ink)}}
.legendbar .sw.d{{outline:1.5px dashed var(--accent);outline-offset:1px;color:var(--ink)}}
section.lane{{margin-top:60px;padding-top:28px;border-top:2px solid var(--ink)}}
.belief{{font:400 19px/1.45 var(--f-copy);max-width:60ch;color:var(--ink)}}
mark.kw{{background:var(--kw-bg);color:inherit;border-bottom:1.5px solid var(--kw-line);padding:0 1px;border-radius:2px}}
/* /fb card mock */
.cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:18px;align-items:start}}
.cardfig{{margin:0;min-width:0}}
.cardfig figcaption{{font:600 12px/1.3 var(--f-ui);color:var(--muted);margin-bottom:8px;display:flex;align-items:center;gap:8px}}
.tag{{display:inline-block;font:600 10px/1 var(--f-ui);letter-spacing:.08em;text-transform:uppercase;padding:4px 6px;border-radius:3px}}
.tag.pick{{background:var(--pick);color:var(--paper)}}
.fbmock{{max-width:440px;margin:0 auto;border-radius:14px;padding:22px 16px 16px;background:linear-gradient(180deg,var(--fb-night1),var(--fb-night2))}}
.fbmock p{{margin:0}}
.fbmock .logo{{text-align:center;color:var(--fb-gold);font:400 25px/1 var(--f-fbs);margin:0 0 52px}}
.fbmock .card{{position:relative;background:var(--fb-card);border-radius:16px;padding:58px 18px 18px;text-align:center}}
.fbmock .av{{position:absolute;top:-44px;left:50%;transform:translateX(-50%);width:88px;height:88px;border-radius:50%;border:4px solid var(--fb-white);background:radial-gradient(circle at 50% 36%,var(--fb-av1) 0 24%,var(--fb-av2) 25% 100%)}}
.fbmock .status{{background:var(--fb-pill);border-radius:999px;padding:8px;font:400 14px var(--f-fbi);color:var(--fb-body)}}
.fbmock .status i{{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--fb-green);margin:0 4px 0 2px}}
.fbmock .status b{{color:var(--fb-green2);font-weight:600}}
.fbmock .div{{width:56px;height:2px;background:var(--fb-rule);margin:20px auto}}
.fbmock .h{{font:400 24px/1.22 var(--f-fbs);color:var(--fb-ink);margin:0 0 12px;text-wrap:balance}}
.fbmock .s{{font:400 15px/1.55 var(--f-fbi);color:var(--fb-body);margin:0 0 18px}}
.fbmock .b{{background:linear-gradient(90deg,var(--fb-p1),var(--fb-p2));color:var(--fb-white);border-radius:8px;padding:14px 12px;font:600 16px/1.3 var(--f-fbi)}}
.fbmock .sc{{font:italic 400 12px/1.4 var(--f-fbi);color:var(--fb-faint);margin-top:10px}}
.fbmock .trust{{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 20px;margin-top:16px;font:400 10.5px/1.3 var(--f-fbi);letter-spacing:.06em;text-transform:uppercase;color:var(--fb-faint)}}
.fbmock .foot{{text-align:center;color:var(--fb-foot);font:400 11.5px var(--f-fbi);margin-top:16px}}
.fbmock .chg{{outline:1.5px dashed var(--fb-dash);outline-offset:4px;border-radius:3px}}
.fbmock mark.kw{{background:var(--fb-kw);border-bottom-color:var(--fb-kwl);color:inherit}}
.fbmock .b mark.kw{{background:transparent;border-bottom-color:var(--fb-white)}}
.legend{{font-size:13px;color:var(--muted);margin:12px 0 0;max-width:72ch}}
/* page code */
dl.meta{{margin:0;display:grid;gap:0;background:var(--paper);border:1px solid var(--line);border-radius:6px}}
dl.meta > div{{display:grid;grid-template-columns:150px 1fr;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);min-width:0}}
dl.meta > div:last-child{{border-bottom:0}}
dl.meta dt{{font:600 11px/1.6 var(--f-mono);color:var(--muted);text-transform:uppercase;letter-spacing:.05em}}
dl.meta dd{{margin:0;font:400 16px/1.5 var(--f-copy);min-width:0}}
/* page copy */
.copy{{background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:24px 26px}}
.copy .sub{{font:400 25px/1.2 var(--f-display);margin:28px 0 10px;text-wrap:balance}}
.copy .sub:first-child{{margin-top:0}}
.copy p{{font:400 17px/1.6 var(--f-copy);max-width:62ch}}
.tried{{border-left:2px solid var(--line);padding-left:16px;margin:4px 0 14px}}
.tried ul{{margin:0 0 10px;padding-left:20px;font:400 17px/1.6 var(--f-copy)}}
.tried li{{margin:0 0 4px}}
.faq{{display:grid;gap:14px}}
.faq .q{{font:600 17px/1.4 var(--f-copy);margin:0 0 2px}}
.faq .a{{margin:0}}
.ask{{border-top:1px solid var(--line);margin-top:22px;padding-top:18px;display:grid;gap:8px;max-width:390px}}
.ask .btn{{background:var(--fb-p2);color:var(--fb-white);border-radius:8px;padding:13px;text-align:center;font:600 16px/1.3 var(--f-ui)}}
.ask .btn mark.kw{{background:transparent;color:inherit}}
.ask .free{{font:400 15px var(--f-copy);margin:0;color:var(--muted)}}
/* counts */
.tw{{overflow-x:auto;border:1px solid var(--line);border-radius:6px;background:var(--paper)}}
table.m{{border-collapse:collapse;width:100%;min-width:520px;font-size:14px}}
table.m th{{font:600 11px/1.3 var(--f-ui);text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);background:var(--bg)}}
table.m td{{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}}
table.m tr:last-child td{{border-bottom:0}}
table.m .num{{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}}
table.m .dim{{color:var(--muted)}}
.st{{display:inline-block;font:600 11px/1 var(--f-ui);padding:4px 7px;border-radius:999px;white-space:nowrap}}
.st.ok{{background:var(--pick-soft);color:var(--pick)}}
.st.off{{background:var(--warn-soft);color:var(--warn)}}
.note{{color:var(--muted);font-size:13.5px;margin-top:8px;max-width:72ch}}
/* chat */
.chat{{background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:18px;display:grid;gap:8px;max-width:540px}}
.chat .sys{{font:400 12px var(--f-ui);color:var(--muted);text-align:center}}
.bub{{background:var(--bubble);border-radius:14px 14px 14px 4px;padding:9px 13px;font:400 16px/1.45 var(--f-copy);max-width:88%;justify-self:start}}
.bub.q{{border:1px solid var(--accent);background:var(--accent-soft)}}
.bub.me{{justify-self:end;background:var(--accent);color:var(--paper);border-radius:14px 14px 4px 14px;font:400 14px/1.4 var(--f-ui)}}
.bub .nm{{color:var(--accent)}}
ul.notes{{margin:0;padding-left:20px;max-width:72ch}}
ul.notes li{{margin:0 0 6px}}
@media (max-width:560px){{h1{{font-size:38px}}h2{{font-size:31px}}.copy{{padding:18px 16px}}dl.meta > div{{grid-template-columns:1fr;gap:2px}}@media (prefers-reduced-motion: reduce){{*{{scroll-behavior:auto}}}}
.alts{{font:400 13px/1.45 var(--f-ui);color:var(--muted);margin-top:10px}}
.alts ul{{margin:4px 0 0;padding-left:18px}}
.why{{font:400 13px/1.45 var(--f-ui);color:var(--muted);margin:8px 0 0}}
.directive{{background:var(--paper);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:6px;padding:14px 16px;font:400 15px/1.55 var(--f-copy);max-width:72ch}}
</style>'''

if __name__ == '__main__':
    main()
