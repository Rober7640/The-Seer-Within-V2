#!/usr/bin/env python3
"""Render a phone mockup of one or more lane pages, as the visitor will see them.

  python3 render_mockup.py LANE.json [LANE.json ...] --out OUT.html [--labels "A,B"] [--title "..."]

Shows, side by side: the /fb lander for the lane (the live card with its four spots, then the
new below-card copy) and Evelyn's first chat messages. When several JSON files are given, a
control switches which lane copy is shown. The card is version 2 (today's /fb style); a version
switch appears only if a lane file still carries more than one card version.

Colors, fonts, the card and the chat are taken from the live /fb page and ChatPage
(origin/Production, 2026-11-18). The section under the card does not exist on /fb yet; its look
here is a proposal. Mockup only: nothing here is built.
"""
import argparse, base64, html, json, os, subprocess, sys, tempfile

ap = argparse.ArgumentParser()
ap.add_argument('lanes', nargs='+')
ap.add_argument('--out', required=True)
ap.add_argument('--labels', default='')
ap.add_argument('--title', default='')
ap.add_argument('--name', default='Anne', help='example first name used in the chat mock')
ap.add_argument('--avatar', default='', help='avatar image; defaults to client/public/evelyn-avatar.png in the repo')
a = ap.parse_args()

lanes = [json.load(open(p)) for p in a.lanes]
labels = [s.strip() for s in a.labels.split(',')] if a.labels else [os.path.basename(p).rsplit('.', 1)[0] for p in a.lanes]
labels += [os.path.basename(p) for p in a.lanes[len(labels):]]

def avatar_uri():
    here = os.path.dirname(os.path.abspath(__file__))
    src = a.avatar or os.path.normpath(os.path.join(here, '../../../../client/public/evelyn-avatar.png'))
    if not os.path.exists(src):
        return ''
    try:  # shrink to a small jpeg so the page stays light (macOS sips)
        tmp = os.path.join(tempfile.mkdtemp(), 'av.jpg')
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', '192', src, '--out', tmp],
                       check=True, capture_output=True)
        src, mime = tmp, 'image/jpeg'
    except Exception:
        mime = 'image/png'
    return f'data:{mime};base64,' + base64.b64encode(open(src, 'rb').read()).decode()

title = a.title or ('Lane Mockup' if len(lanes) > 1 else f"{lanes[0]['name']} Lane Mockup")
data = json.dumps({'lanes': lanes, 'labels': labels, 'name': a.name, 'avatar': avatar_uri()}, ensure_ascii=False)
data = data.replace('</', '<\\/')

PAGE = r'''<title>__TITLE__</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
/* Layout: a control bar, then two phone-width columns (the lander, then the chat), stacked on narrow screens. */
:root{
  --bg:#e9edf0; --paper:#ffffff; --ink:#1a2430; --muted:#5a6672; --line:#cfd6dd; --accent:#6b21a8; --accent-soft:#efe5f8;
  --f-ui:"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  /* the live /fb page and chat: one fixed look in both themes */
  --fb-deep:#0f172a; --fb-mid:#1e3a5f; --fb-gold:#d4ae35; --fb-gold-soft:#f6edd0; --fb-ink:#111827; --fb-body:#4b5563; --fb-text:#374151;
  --fb-faint:#9ca3af; --fb-pill:#f9fafb; --fb-rule:#e5e7eb; --fb-p6:#9333ea; --fb-p8:#6b21a8; --fb-p1:#f3e8ff; --fb-p9:#581c87;
  --fb-green:#22c55e; --fb-green2:#16a34a; --fb-green4:#4ade80; --fb-white:#ffffff; --fb-card:rgba(255,255,255,.95); --fb-chatbg:#f7f8fa; --fb-foot:rgba(255,255,255,.45);
  --f-fbs:"Playfair Display", Georgia, serif; --f-fbi:"Inter", system-ui, -apple-system, sans-serif;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#11161b;--paper:#1a2128;--ink:#e3e9ee;--muted:#9aa6b1;--line:#2c3640;--accent:#c9a2f0;--accent-soft:#2a1f36;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#11161b;--paper:#1a2128;--ink:#e3e9ee;--muted:#9aa6b1;--line:#2c3640;--accent:#c9a2f0;--accent-soft:#2a1f36;color-scheme:dark}
body{background:var(--bg);color:var(--ink);font:15px/1.55 var(--f-ui);margin:0}
.wrap{max-width:900px;margin:0 auto;padding-block:28px 56px;padding-left:max(16px, env(safe-area-inset-left, 0px));padding-right:max(16px, env(safe-area-inset-right, 0px))}
h1.t{font:600 26px/1.2 var(--f-ui);margin:0 0 6px;text-wrap:balance}
.lede{color:var(--muted);margin:0 0 18px;max-width:70ch}
.bar{display:flex;flex-wrap:wrap;gap:14px 22px;align-items:flex-end;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-bottom:22px}
.ctl{display:flex;flex-direction:column;gap:6px;min-width:0}
.ctl > span{font:600 11px/1 var(--f-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
[hidden]{display:none !important}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;flex-wrap:wrap}
.seg button{font:500 14px var(--f-ui);padding:8px 12px;border:0;background:transparent;color:var(--ink);cursor:pointer}
.seg button + button{border-left:1px solid var(--line)}
.seg button[aria-pressed="true"]{background:var(--accent);color:var(--paper)}
.ctl.wide{flex-basis:100%}
.heads{display:flex;flex-direction:column;gap:6px}
.heads button{display:flex;gap:10px;align-items:baseline;text-align:left;font:500 15px/1.35 var(--f-ui);padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink);cursor:pointer}
.heads button .n{flex:none;font:600 12px/1.35 var(--f-ui);color:var(--muted);min-width:1.2em}
.heads button .tg{flex:none;margin-left:auto;font:600 11px/1.35 var(--f-ui);letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.heads button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft)}
.heads button[aria-pressed="true"] .n{color:var(--accent)}
.hwhy{font:400 13px/1.45 var(--f-ui);color:var(--muted);margin:2px 0 0;max-width:80ch}
select{font:500 14px var(--f-ui);padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);max-width:100%}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:26px;align-items:start}
.col{min-width:0;display:flex;flex-direction:column;gap:8px}
.cap{font:600 13px/1.3 var(--f-ui);color:var(--muted)}
.cap b{color:var(--ink)}
.phone{box-sizing:border-box;width:100%;max-width:400px;margin:0 auto;border-radius:30px;border:9px solid #0b0e12;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.18);background:var(--fb-deep)}

/* ---- the lander ---- */
.fb{position:relative;background:linear-gradient(180deg,var(--fb-deep),var(--fb-mid));padding:26px 14px 18px;font-family:var(--f-fbi)}
.fb::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.7;background-image:radial-gradient(1.5px 1.5px at 20px 30px,#fff,transparent),radial-gradient(1px 1px at 90px 40px,#fff,transparent),radial-gradient(1.5px 1.5px at 160px 120px,rgba(255,255,255,.9),transparent),radial-gradient(1px 1px at 250px 200px,rgba(255,255,255,.7),transparent),radial-gradient(1.5px 1.5px at 330px 80px,rgba(255,255,255,.8),transparent);background-size:360px 300px}
.fb > *{position:relative}
.logo{display:flex;justify-content:center;align-items:center;gap:8px;color:var(--fb-gold);font:400 25px/1 var(--f-fbs);margin:0 0 54px}
.logo i{font-style:normal;color:#d8b4fe;font-size:22px}
.card{display:flow-root;background:var(--fb-card);border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,.35);padding:0 18px 20px;text-align:center}
.av{width:96px;height:96px;border-radius:50%;border:4px solid var(--fb-white);margin:-48px auto 20px;background:#e9d5ff center/cover no-repeat;box-shadow:0 8px 18px rgba(0,0,0,.25)}
.status{background:var(--fb-pill);border:1px solid #f3f4f6;border-radius:999px;padding:8px;font:400 14px var(--f-fbi);color:var(--fb-body)}
.status i{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--fb-green);margin:0 5px 0 2px}
.status b{color:var(--fb-green2);font-weight:600}
.rule{width:64px;height:2px;background:var(--fb-rule);margin:22px auto}
.h{font:400 24px/1.25 var(--f-fbs);color:var(--fb-ink);margin:0 0 14px;text-wrap:balance}
.s{font:400 15px/1.6 var(--f-fbi);color:var(--fb-body);margin:0 0 22px}
.btn{display:block;width:100%;box-sizing:border-box;border:0;border-radius:8px;padding:15px 14px;font:600 16px/1.3 var(--f-fbi);color:var(--fb-white);background:linear-gradient(90deg,var(--fb-p6),var(--fb-p8));box-shadow:0 8px 16px rgba(107,33,168,.3)}
.sc{font:italic 400 12px/1.4 var(--f-fbi);color:var(--fb-faint);margin:12px 0 0}
.trust{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 18px;margin-top:16px;font:400 10px/1.3 var(--f-fbi);letter-spacing:.06em;text-transform:uppercase;color:var(--fb-faint)}

.more{background:var(--fb-card);border-radius:16px;margin-top:18px;padding:26px 20px 24px;text-align:left;color:var(--fb-text)}
.more h3{font:700 21px/1.25 var(--f-fbs);color:var(--fb-ink);margin:26px 0 10px;text-wrap:balance}
.more h3:first-child{margin-top:0}
.more p{font:400 16.5px/1.65 var(--f-fbi);margin:0 0 12px}
.tried{background:var(--fb-gold-soft);border-radius:12px;padding:14px 16px;margin:4px 0 14px}
.tried p{margin:0 0 8px}
.tried ul{list-style:none;margin:0 0 8px;padding:0;display:grid;gap:7px}
.tried li{font:400 16px/1.45 var(--f-fbi);padding-left:24px;position:relative}
.tried li::before{content:"✓";position:absolute;left:2px;top:0;color:#9a7b14;font-weight:600}
.story{border-left:3px solid var(--fb-p6);background:var(--fb-p1);color:var(--fb-p9);border-radius:0 10px 10px 0;padding:12px 14px;margin:6px 0 14px}
.story p{margin:0;font:400 16px/1.55 var(--f-fbi)}
.story .k{display:block;font:600 10.5px/1 var(--f-fbi);letter-spacing:.08em;text-transform:uppercase;color:var(--fb-p8);margin-bottom:6px}
details{border-top:1px solid var(--fb-rule);padding:2px 0}
details:last-of-type{border-bottom:1px solid var(--fb-rule)}
summary{cursor:pointer;list-style:none;font:600 16px/1.4 var(--f-fbi);color:var(--fb-ink);padding:13px 28px 13px 0;position:relative}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";position:absolute;right:4px;top:10px;font:400 22px/1 var(--f-fbi);color:var(--fb-p6)}
details[open] summary::after{content:"–"}
details p{font-size:15.5px;margin:0 0 14px}
.ask{text-align:center;margin-top:24px}
.more .ask .sc{font:italic 400 12px/1.4 var(--f-fbi);color:var(--fb-faint);margin:12px 0 0}
.foot{text-align:center;color:var(--fb-foot);font:400 11.5px/1.6 var(--f-fbi);margin-top:18px}

/* ---- the chat ---- */
.chat{background:var(--fb-chatbg);font-family:var(--f-fbi);display:flex;flex-direction:column;min-height:640px}
.ch{background:var(--fb-mid);color:var(--fb-white);display:flex;align-items:center;justify-content:space-between;padding:14px 16px}
.ch .who{display:flex;align-items:center;gap:12px}
.ch .ava{width:40px;height:40px;border-radius:50%;border:2px solid var(--fb-gold);background:#e9d5ff center/cover no-repeat;position:relative}
.ch .ava::after{content:"";position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;background:var(--fb-green);border:2px solid var(--fb-mid)}
.ch b{display:block;font:700 18px/1 var(--f-fbs)}
.ch small{font:500 12px var(--f-fbi);color:var(--fb-green4)}
.ch .x{font:400 13px var(--f-fbi);color:rgba(255,255,255,.7)}
.vol{background:var(--fb-p1);color:var(--fb-p9);font:500 12px var(--f-fbi);text-align:center;padding:8px}
.msgs{flex:1;padding:16px;display:flex;flex-direction:column;gap:12px}
.m{max-width:82%;border-radius:16px;padding:11px 15px;font:400 15px/1.55 var(--f-fbi);box-shadow:0 1px 2px rgba(0,0,0,.05)}
.m.e{align-self:flex-start;background:var(--fb-white);color:#1f2937;border:1px solid #f3f4f6;border-bottom-left-radius:4px}
.m.me{align-self:flex-end;background:var(--fb-p6);color:var(--fb-white);border-bottom-right-radius:4px}
.m.q{outline:2px solid var(--fb-gold);outline-offset:2px}
.inp{background:var(--fb-white);border-top:1px solid #f3f4f6;padding:12px 14px}
.inp div{background:#f3f4f6;border-radius:999px;padding:12px 16px;font:400 14px var(--f-fbi);color:#6b7280}
.legend{font-size:13px;color:var(--muted);margin:4px auto 0;max-width:400px}
.legend .gq{display:inline-block;width:12px;height:12px;border:2px solid var(--fb-gold);border-radius:4px;vertical-align:-2px;margin-right:4px}
.notes{margin-top:28px;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:16px 18px}
.notes h2{font:600 15px/1.3 var(--f-ui);margin:0 0 8px}
.notes ul{margin:0;padding-left:18px}
.notes li{margin:5px 0}
@media (prefers-reduced-motion: no-preference){.m{animation:pop .25s ease-out both}}
@keyframes pop{from{transform:translateY(4px)}to{transform:none}}
</style>

<div class="wrap">
  <h1 class="t">__TITLE__</h1>
  <p class="lede">The lane page as she'd see it on a phone, then Evelyn's first messages after she taps the button. Mockup only: nothing is built. The card and the chat copy the live /fb look; the section under the card is new, and its look is a proposal.</p>

  <div class="bar">
    <div class="ctl" id="srcctl"><span>Copy</span><div class="seg" id="src"></div></div>
    <div class="ctl wide" id="headctl"><span>Headline: pick one</span><div class="heads" id="heads"></div><p class="hwhy" id="hwhy"></p></div>
    <div class="ctl" id="verctl"><span>Card</span><div class="seg" id="ver">
      <button type="button" id="v1" data-v="v1" aria-pressed="false">Version 1 · her words</button>
      <button type="button" id="v2" data-v="v2" aria-pressed="true">Version 2 · /fb style</button>
    </div></div>
  </div>

  <div class="cols">
    <div class="col"><div class="cap"><b>The page</b> · <span id="link"></span></div>
      <div class="phone"><div class="fb" id="page"></div></div></div>
    <div class="col"><div class="cap"><b>After she taps the button</b> · example name "<span id="nm"></span>"</div>
      <div class="phone"><div class="chat" id="chat"></div></div>
      <p class="legend"><span class="gq"></span>Evelyn's first question</p></div>
  </div>

  <div class="notes" id="notes"></div>
</div>

<script>
const D = __DATA__;
const st = {lane: 0, v: 'v2', hd: 0};
const multiVer = D.lanes.some(L => L.card.v1 && L.card.v2);
if (multiVer) { try { const s = JSON.parse(localStorage.getItem('lane-mockup') || '{}'); if (s.v) st.v = s.v; } catch (e) {} }
const cardOf = L => L.card[st.v] || L.card.v2 || L.card.v1;
const headsOf = c => [c.h].concat(c.alts || []);
function renderHeads() {
  const c = cardOf(D.lanes[st.lane]), H = headsOf(c), box = document.getElementById('heads');
  if (st.hd >= H.length) st.hd = 0;
  box.replaceChildren();
  H.forEach((t, i) => {
    const b = el('button'); b.type = 'button'; b.setAttribute('aria-pressed', String(i === st.hd));
    b.append(el('span', 'n', String(i + 1)), el('span', '', t));
    if (i === 0) b.append(el('span', 'tg', c.chosen ? 'Your pick' : 'Writer\'s pick'));
    b.onclick = () => { st.hd = i; draw(); }; box.append(b);
  });
  document.getElementById('headctl').hidden = H.length < 2;
  const w = document.getElementById('hwhy'); w.textContent = c.why ? c.why.replace(/<[^>]+>/g, '') : ''; w.hidden = !c.why;
}
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const nm = t => t.replace(/\{Name\}/g, D.name).replace(/\{her first name\}/g, D.name);

function renderPage() {
  const L = D.lanes[st.lane], c = cardOf(L), P = document.getElementById('page');
  P.replaceChildren();
  const logo = el('div', 'logo'); logo.append(el('i', '', '✦'), document.createTextNode('The Seer Within')); P.append(logo);
  const card = el('div', 'card');
  const av = el('div', 'av'); if (D.avatar) av.style.backgroundImage = `url(${D.avatar})`; av.setAttribute('role', 'img'); av.setAttribute('aria-label', L.meta.alt || 'Evelyn Cross');
  const status = el('div', 'status'); status.append(document.createTextNode('Evelyn Cross is '), el('i'), el('b', '', 'Online'));
  card.append(av, status, el('div', 'rule'), el('h2', 'h', headsOf(c)[st.hd] || c.h), el('p', 's', c.s), el('div', 'btn', c.b), el('p', 'sc', c.sc));
  const tr = el('div', 'trust'); tr.append(el('span', '', '100% Private & Confidential'), el('span', '', 'Trusted By 2,400+ Clients')); card.append(tr);
  P.append(card);
  const more = el('div', 'more');
  for (const b of L.body) {
    if (b.t === 'h') more.append(el('h3', '', b.text));
    else if (b.t === 'p') more.append(el('p', '', b.text));
    else if (b.t === 'list') {
      const box = el('div', 'tried'); if (b.lead) box.append(el('p', '', b.lead));
      const ul = el('ul'); b.items.forEach(i => ul.append(el('li', '', i))); box.append(ul);
      if (b.closer) box.append(el('p', '', b.closer)); more.append(box);
    } else if (b.t === 'faq') {
      b.items.forEach(it => { const d = el('details'); d.append(el('summary', '', it.q), el('p', '', it.a)); more.append(d); });
    } else if (b.t === 'ask') {
      const a = el('div', 'ask'); a.append(el('div', 'btn', c.b), el('p', 'sc', c.sc)); more.append(a);
    }
  }
  P.append(more, el('div', 'foot', 'Privacy Policy · Terms of Service · Refund Policy'));
  P.append(el('div', 'foot', '© Cosmo Numerology Pte Ltd. For Entertainment Purposes Only.'));
  document.getElementById('link').textContent = L.link;
}
function renderChat() {
  const L = D.lanes[st.lane], C = document.getElementById('chat');
  C.replaceChildren();
  const h = el('div', 'ch'), who = el('div', 'who'), ava = el('div', 'ava'); if (D.avatar) ava.style.backgroundImage = `url(${D.avatar})`;
  const t = el('div'); t.append(el('b', '', 'Evelyn Cross'), el('small', '', 'Online Now')); who.append(ava, t); h.append(who, el('span', 'x', 'Exit'));
  const m = el('div', 'msgs');
  for (const x of L.chat) m.append(el('div', 'm ' + (x.who === 'me' ? 'me' : x.who === 'q' ? 'e q' : 'e'), nm(x.text)));
  const inp = el('div', 'inp'); inp.append(el('div', '', 'Type your answer…'));
  C.append(h, el('div', 'vol', 'Turn up your volume for the best experience.'), m, inp);
  document.getElementById('nm').textContent = D.name;
}
function renderNotes() {
  const L = D.lanes[st.lane], N = document.getElementById('notes'); N.replaceChildren();
  const items = (L.open || []); if (!items.length) { N.hidden = true; return; } N.hidden = false;
  N.append(el('h2', '', `Open decisions for this lane (${D.labels[st.lane]})`));
  const ul = el('ul'); items.forEach(o => ul.append(el('li', '', o))); N.append(ul);
}
function draw() {
  document.querySelectorAll('#ver button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === st.v)));
  document.querySelectorAll('#src button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === st.lane)));
  renderHeads(); renderPage(); renderChat(); renderNotes();
}
const src = document.getElementById('src');
D.labels.forEach((l, i) => { const b = el('button', '', l); b.type = 'button'; b.id = 'src' + i; b.onclick = () => { st.lane = i; st.hd = 0; draw(); }; src.append(b); });
if (D.lanes.length < 2) document.getElementById('srcctl').hidden = true;
if (!multiVer) document.getElementById('verctl').hidden = true;
document.querySelectorAll('#ver button').forEach(b => b.onclick = () => { st.v = b.dataset.v; try { localStorage.setItem('lane-mockup', JSON.stringify({v: st.v})); } catch (e) {} draw(); });
draw();
</script>
'''

out = PAGE.replace('__TITLE__', html.escape(title)).replace('__DATA__', data)
open(a.out, 'w').write(out)
print(f'wrote {a.out} ({len(out)//1024} KB, {len(lanes)} lane(s))')
