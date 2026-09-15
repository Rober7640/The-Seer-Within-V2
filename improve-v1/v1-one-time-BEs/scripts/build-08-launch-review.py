#!/usr/bin/env python3
"""Build the twelve selected launch-candidate emails, preserving older versions."""
import argparse
import hashlib
import html
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DAILY = ROOT / 'docs/08-marcus/daily-email'


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--booking-origin', default='http://127.0.0.1:5088')
    args = ap.parse_args()
    spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/build-08-daily.py')
    b = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(b)
    selection = json.loads((DAILY / 'edition-configs/launch-selection-2026-09-14.json').read_text())
    selected = selection['sourceSlugs']
    assert len(selected) == len(set(selected)) == 12
    out = DAILY / 'reviews/launch-twelve/html'
    out.mkdir(parents=True, exist_ok=True)
    cards, manifest, topic_ids = [], [], set()
    for slug in selected:
        cfg = b.LETTERS[slug]
        edition = cfg['funnel']
        topic = edition.get('slug', slug)
        assert topic not in topic_ids, 'duplicate selected topic: ' + topic
        topic_ids.add(topic)
        rendered, data, pre = b.build(slug)
        (Path(b.OUT) / f'{slug}.html').write_text(b.letter_banner(slug, data, pre) + rendered)
        link = f"{args.booking_origin}/booking?edition={edition['id']}&version={edition['version']}"
        preview = rendered.replace('{{BOOKING_URL}}', html.escape(link, quote=True)).replace('%FIRSTNAME%', 'Margaret')
        (out / f'{slug}.html').write_text(preview)
        source = Path(b.SRC) / f'{slug}.md'
        manifest.append(dict(editionId=edition['id'], version=edition['version'], topicSlug=topic,
                             sourceSlug=slug, source=str(source.relative_to(ROOT)),
                             sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                             preview=f'html/{slug}.html', bookingPreviewUrl=link,
                             status='human-review-pending'))
        cards.append(f'<article><p class="meta">{html.escape(edition["id"])} · version {edition["version"]}</p>'
                     f'<h2>{html.escape(data["subject"])}</h2><a href="{slug}.html">Read email</a>'
                     f'<a href="{html.escape(link,quote=True)}">Preview booking page</a></article>')
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Marcus — twelve launch candidates</title><style>
body{margin:0;background:#e6ddc9;color:#211d16;font:18px/1.6 Georgia,serif}main{max-width:1050px;margin:42px auto;padding:0 24px}h1{font-size:40px;line-height:1.1}h2{font-size:25px;line-height:1.3}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:20px}article{background:#f4f1e6;padding:24px;border:1px solid #c4b9a1}.meta{font:13px/1.5 system-ui,sans-serif;overflow-wrap:anywhere;color:#725b43}a{display:block;color:#8f2b1f;margin-top:12px}.note{max-width:780px}header{margin-bottom:32px}</style>
<main><header><h1>Twelve readings for launch review</h1><p class="note">Five rewritten editions plus the seven new mixed-topic readings. This is the selected launch set. Older versions remain in the historical packet.</p>
<p class="note">Human review and production booking links are still required. These links open a local simulation. Nothing has been scheduled or sent.</p>
<a href="../../refresh-five/REVIEW.md">Rewrite notes and handoff</a></header><div class="grid">'''+''.join(cards)+'</div></main></html>'
    (out / 'index.html').write_text(page)
    (out.parent / 'manifest.json').write_text(json.dumps(dict(publicationScope='local-review-only', editions=manifest), ensure_ascii=False, indent=2)+'\n')
    print(f'Built {len(manifest)} selected editions at {out / "index.html"}')


if __name__ == '__main__':
    main()
