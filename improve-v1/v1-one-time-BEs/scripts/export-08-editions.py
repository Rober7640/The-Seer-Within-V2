#!/usr/bin/env python3
"""Export deterministic, LOCAL-ONLY funnel editions from the email builder and markdown."""
import argparse
import hashlib
import html
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'local/08-marcus/editions.json'


def load_builder():
    spec = importlib.util.spec_from_file_location('marcus_daily_builder', ROOT / 'scripts/build-08-daily.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.ignored = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.ignored += 1
        if tag in ('br', 'p', 'div') and not self.ignored:
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.ignored = max(0, self.ignored - 1)

    def handle_data(self, data):
        if not self.ignored:
            self.parts.append(data)


def plain_text(markdown):
    # Keep paragraph breaks and visible CTA wording, never an HTML payload or URL.
    markdown = re.sub(r'!?\[([^\]]+)\]\([^)]*\)', r'\1', markdown)
    markdown = re.sub(r'\*\*([^*]+)\*\*', r'\1', markdown)
    markdown = re.sub(r'\*([^*\n]+)\*', r'\1', markdown)
    parser = PlainText()
    parser.feed(markdown)
    return re.sub(r'\n{3,}', '\n\n', ''.join(parser.parts)).strip()


def slug_card(name):
    return re.sub(r'^the-', '', name.lower().replace(' ', '-'))


def validate(edition):
    assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', edition['id']), 'invalid edition id'
    assert edition['version'] >= 1, 'invalid version'
    assert isinstance(edition.get('theme'), str) and edition['theme'].strip(), 'reading theme required'
    positions = edition['positions']
    assert len(positions) >= 3, 'spread requires positions'
    assert [p['number'] for p in positions] == list(range(1, len(positions) + 1)), 'positions must cover spread in order'
    assert len({p['id'] for p in positions}) == len(positions), 'duplicate position id'
    free = [p for p in positions if p['visibility'] == 'free']
    paid = [p for p in positions if p['visibility'] == 'paid']
    assert free and paid, 'both free and buyer-drawn positions required'
    assert all(p.get('fixedCard') for p in free), 'free positions require fixed cards'
    assert not any('fixedCard' in p for p in paid), 'paid positions must be drawn per buyer'
    assert len({p['fixedCard']['cardId'] for p in free}) == len(free), 'duplicate fixed cards'
    majors = 'fool|magician|high-priestess|empress|emperor|hierophant|lovers|chariot|strength|hermit|wheel-of-fortune|justice|hanged-man|death|temperance|devil|tower|star|moon|sun|judgement|world'
    card_pattern = rf'(?:{majors}|(?:ace|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king)-of-(?:wands|cups|swords|pentacles))'
    assert all(re.fullmatch(card_pattern, p['fixedCard']['cardId']) for p in free), 'unknown card'
    assert all(isinstance(p['label'], str) and p['label'].strip() for p in positions), 'empty position label'
    assert len(edition['freeEmailText']) > 300, 'complete email required, not a bridge excerpt'
    if 'bookingCopy' in edition:
        assert set(edition['bookingCopy']) == {'headline','intro','bridge','offer','name'}, 'incomplete booking copy'
        assert all(edition['bookingCopy'].values()), 'empty booking copy'


def export(builder=None):
    builder = builder or load_builder()
    editions, sources = [], []
    for source_slug in builder.LOCAL_FUNNEL_EDITIONS:
        cfg = builder.LETTERS[source_slug]
        meta = cfg['funnel']
        parsed = builder.parse(source_slug)  # Builder validates headings/art/close anchors too.
        source = Path(builder.SRC) / (source_slug + '.md')
        raw = source.read_text(encoding='utf-8')
        positions = []
        for card, (card_slug, card_name, _) in zip(parsed['cards'], cfg['cards']):
            heading = plain_text(card['heading']).rstrip('.')
            ordinal, label_card = heading.split(' — ', 1)
            number = {word.lower(): n for n, word in builder.WORD.items()}[ordinal.lower()]
            suffix = '. ' + card_name
            assert label_card.endswith(suffix), 'heading card mismatch'
            label = label_card[:-len(suffix)].strip()
            positions.append(dict(id=f'p{number}', number=number, label=label[0].upper()+label[1:],
                                  visibility='free', fixedCard=dict(cardId=slug_card(card_slug), reversed=False)))
        assert len(meta['paid_labels']) == cfg['down'], f'{source_slug}: paid label count mismatch'
        used = {p['number'] for p in positions}
        total = cfg.get('n_cards', cfg['up'] + cfg['down'])
        remaining = [n for n in range(1, total + 1) if n not in used]
        assert len(remaining) == cfg['down'], 'spread total mismatch'
        for number, label in zip(remaining, meta['paid_labels']):
            positions.append(dict(id=f'p{number}', number=number, label=label, visibility='paid'))
        question = cfg['question'].strip().rstrip('?')
        edition = dict(id=meta['id'], version=meta['version'], slug=meta.get('slug',source_slug),
                       question=question[0].upper()+question[1:]+'?', theme=meta['theme'], spread=meta['spread'],
                       positions=sorted(positions,key=lambda p:p['number']), freeEmailText=plain_text(raw),
                       status='published')
        if 'booking_copy' in meta:
            edition['bookingCopy'] = meta['booking_copy']
        validate(edition)
        editions.append(edition)
        sources.append(dict(editionId=edition['id'], source=str(source.relative_to(ROOT)),
                            sha256=hashlib.sha256(raw.encode()).hexdigest()))
    assert len({e['id'] for e in editions}) == len(editions), 'duplicate edition id'
    assert len({(e['slug'],e['version']) for e in editions}) == len(editions), 'duplicate topic version'
    return dict(schemaVersion=1, publicationScope='local-fixture-only',
                notice='Published status enables local routing only. Historical drafts are not approved for live publication. No publish, send, upload, or production database writes are performed.',
                generatedBy='scripts/export-08-editions.py', sources=sources, editions=editions)


def serialize(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='fail when committed fixture differs; no writes')
    args = parser.parse_args()
    result = serialize(export())
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding='utf-8') != result:
            print('Edition fixture drift: run python3 improve-v1/v1-one-time-BEs/scripts/export-08-editions.py', file=sys.stderr)
            return 1
        print('Edition fixtures match authoritative email sources (local only).')
    else:
        OUTPUT.write_text(result, encoding='utf-8')
        print(f'Exported {len(json.loads(result)["editions"])} local-only editions to {OUTPUT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
