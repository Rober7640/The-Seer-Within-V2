#!/usr/bin/env python3
"""Build a local review index and edition-bound previews; never publish or send."""
import argparse
import html
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DAILY = ROOT / 'docs/08-marcus/daily-email'


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--booking-origin', default='http://127.0.0.1:5091')
    args = ap.parse_args()
    b = module(ROOT / 'scripts/build-08-daily.py', 'batch_builder')
    batch = json.loads((DAILY / 'edition-configs/mixed-batch-2026-09-14.json').read_text())
    existing = ['why-they-go-quiet', 'why-wont-he-commit', 'what-part-of-me-needs-healing',
                'what-is-my-higher-calling', 'what-are-my-blind-spots']
    out = DAILY / 'reviews/mixed-batch/html'
    out.mkdir(parents=True, exist_ok=True)
    cards = []
    for slug in existing + list(batch):
        rendered, data, pre = b.build(slug)
        cfg = b.LETTERS[slug]
        edition = cfg['funnel']
        if slug in batch:
            hero = ROOT / 'assets/email' / f'08-hero-{slug}.jpg'
            assert hero.exists(), f'Missing new hero: {slug}'
            (Path(b.OUT) / f'{slug}.html').write_text(b.letter_banner(slug, data, pre) + rendered)
        link = f"{args.booking_origin}/booking?edition={edition['id']}&version={edition['version']}"
        preview = rendered.replace('{{BOOKING_URL}}', html.escape(link, quote=True))
        preview = preview.replace('%FIRSTNAME%', 'Margaret')
        (out / f'{slug}.html').write_text(preview)
        status = 'New daily — review copy' if slug in batch else 'Existing edition — readiness issues noted'
        cards.append(f'<article><p class="status">{status}</p><h2>{html.escape(data["subject"])}</h2>'
                     f'<p>{html.escape(edition["id"])} · version {edition["version"]}</p>'
                     f'<a href="{slug}.html">Read the daily</a> '
                     f'<a href="{html.escape(link,quote=True)}">Preview its booking page</a></article>')
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Marcus — twelve-daily review</title><style>
body{margin:0;background:#e6ddc9;color:#211d16;font:17px/1.6 Georgia,serif}main{max-width:1050px;margin:48px auto;padding:0 24px}h1{font-size:42px;line-height:1.1}h2{font-size:25px;line-height:1.3;margin:10px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}article{background:#f4f1e6;padding:26px;border:1px solid #c4b9a1}.status{font:12px/1.5 system-ui,sans-serif;text-transform:uppercase;letter-spacing:1px;color:#725b43}a{color:#8f2b1f;display:block;margin-top:10px}header{margin-bottom:32px}.note{max-width:760px}</style>
<main><header><p class="status">Marcus Stone · editorial review</p><h1>Twelve daily readings</h1>
<p class="note"><a href="../../launch-twelve/html/index.html">Open the updated launch set with five rewritten editions</a></p>
<p class="note">Five existing editions and seven new readings. These are local review previews. Booking links open the matching local edition; no emails are scheduled or sent.</p>
<p class="note">The existing five retain their original text and version. Their old intake wording and other readiness findings are recorded in the batch review notes. They are not certified send-ready.</p></header><div class="grid">'''+''.join(cards)+'</div></main></html>'
    (out/'index.html').write_text(page)
    print(f'Built {len(cards)} review previews at {out / "index.html"}')


if __name__ == '__main__':
    main()
