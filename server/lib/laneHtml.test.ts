// Server HTML for belief lanes — what Meta reads at /fb?lane=<id>.
//
//   npx tsx --test server/lib/laneHtml.test.ts      (or: npm run test:lanes)
//
// Two halves:
//   1. the pure rewrite (server/lib/laneHtml.ts) against the REAL client/index.html;
//   2. server/static.ts (the production path) on a real Express app, compared byte for
//      byte — body AND headers — with today's implementation for every non-lane URL.

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { applyLaneHtml, escapeHtml, laneForRequestUrl, laneStaticMarkup, renderLaneHtml } from './laneHtml'
import { serveStatic } from '../static'
import { getLane, type BeliefLane } from '../../shared/beliefLanes'
import { copyRuleFails } from '../../shared/laneCopyRules'

const INDEX = fs.readFileSync(path.resolve(import.meta.dirname, '../../client/index.html'), 'utf-8')
const LANE = getLane('manifest')!

// Every URL that must get today's HTML, untouched.
const PLAIN_URLS = [
  '/fb',
  '/fb?',
  '/fb?lane=',
  '/fb?lane=nope',
  '/fb?lane=astrology', // drafted, not approved — not in the registry
  '/fb?lane=MANIFEST',
  '/fb?lane=__proto__',
  '/fb?lane=toString',
  '/fb?v=a',
  '/fb?utm_source=facebook&utm_campaign=x',
  '/?lane=manifest',
  '/fb2?lane=manifest',
  '/gdn?lane=manifest',
  '/fb-tarot?lane=manifest',
  '/fb-palm?lane=manifest',
  '/fb/chat?lane=manifest', // only the lander serves lane HTML
  '/fb/welcome1?lane=manifest',
  '/fbx?lane=manifest',
]

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&copy;/g, '©')
    .replace(/\s+/g, ' ')
    .trim()

describe('applyLaneHtml — no lane / unknown lane is byte-identical', () => {
  for (const url of PLAIN_URLS) {
    it(`${url} → the input string, untouched`, () => {
      const out = applyLaneHtml(INDEX, url)
      assert.equal(out, INDEX)
      assert.equal(Buffer.compare(Buffer.from(out), Buffer.from(INDEX)), 0)
      assert.equal(laneForRequestUrl(url), undefined)
    })
  }
})

describe('applyLaneHtml — /fb?lane=manifest', () => {
  const html = applyLaneHtml(INDEX, '/fb?lane=manifest')

  it('resolves the lane wherever ?lane= sits in the query, and through &amp;', () => {
    for (const url of ['/fb?lane=manifest', '/fb?utm_source=fb&lane=manifest&fbclid=abc', '/fb?utm_source=fb&amp;lane=manifest', '/fb?lane=manifest#x']) {
      assert.equal(laneForRequestUrl(url)?.id, 'manifest', url)
    }
  })

  it('rewrites <title>, og:title and og:description, and adds a meta description', () => {
    assert.ok(html.includes(`<title>${escapeHtml(LANE.meta.title)}</title>`))
    assert.ok(html.includes(`<meta property="og:title" content="${escapeHtml(LANE.meta.title)}" />`))
    assert.ok(html.includes(`<meta property="og:description" content="${escapeHtml(LANE.meta.desc)}" />`))
    assert.ok(html.includes(`<meta name="description" content="${escapeHtml(LANE.meta.desc)}" />`))
    assert.equal((html.match(/<title>/g) ?? []).length, 1)
    assert.equal((html.match(/<meta name="description"/g) ?? []).length, 1)
    assert.ok(!html.includes('The Seer Within - Psychic Chat'), 'old title gone')
    assert.ok(!html.includes('reveal your destiny'), 'old description gone (og + twitter)')
  })

  it('adds the photo description on Evelyn\'s picture (og:image:alt and the static img)', () => {
    assert.ok(html.includes(`<meta property="og:image:alt" content="${escapeHtml(LANE.meta.alt)}" />`))
    assert.ok(html.includes(`alt="${escapeHtml(LANE.meta.alt)}"`))
  })

  it('puts the card text and the below-card copy inside #root', () => {
    const root = html.slice(html.indexOf('<div id="root">'), html.indexOf('</div>\n    <script type="module"'))
    const text = textOf(root)
    assert.ok(text.includes(LANE.card.h), 'headline')
    assert.ok(text.includes(LANE.card.s), 'sub-line')
    assert.ok(text.includes(LANE.card.b), 'button')
    assert.ok(text.includes('free to message'), '"free to message"')
    for (const b of LANE.body) {
      if (b.t === 'h' || b.t === 'p') assert.ok(text.includes(b.text), b.text)
      if (b.t === 'list') for (const s of [b.lead, ...b.items, b.closer ?? '']) assert.ok(text.includes(s), s)
      if (b.t === 'faq') for (const it of b.items) assert.ok(text.includes(it.q) && text.includes(it.a), it.q)
    }
    // The headline is the page's one h1; section headings are h2.
    assert.equal((root.match(/<h1[\s>]/g) ?? []).length, 1)
    assert.equal((root.match(/<h2[\s>]/g) ?? []).length, LANE.body.filter((b) => b.t === 'h').length)
    // Both buttons go to the chat, carrying the lane.
    assert.equal((root.match(/href="\/fb\/chat\?lane=manifest"/g) ?? []).length, 2)
  })

  it('changes nothing outside <head> meta and #root', () => {
    const strip = (h: string) =>
      h
        .replace(/<title>[\s\S]*?<\/title>/, '')
        .replace(/\s*<meta (property|name)="(og:title|og:description|og:image:alt|twitter:title|twitter:description|description)" content="[^"]*" \/>/g, '')
        .replace(/<div id="root">[\s\S]*?<\/main><\/div>/, '<div id="root"></div>')
    assert.equal(strip(html), strip(INDEX))
  })

  it('has no hidden text', () => {
    const markup = laneStaticMarkup(LANE)
    assert.ok(!/display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|opacity\s*:\s*0|\shidden[\s>=]|aria-hidden|text-indent\s*:\s*-|left\s*:\s*-\d/i.test(markup), 'no hiding styles')
    assert.ok(markup.includes('background:#ffffff'), 'its own white panel')
    assert.ok(/color:#(111827|374151)/.test(markup), 'dark text on it')
  })

  it('every visible word in the static copy passes the copy rules', () => {
    const text = textOf(laneStaticMarkup(LANE))
    for (const s of text.split(/(?<=[.?])\s+/)) assert.deepEqual(copyRuleFails(s), [], s)
  })
})

describe('renderLaneHtml — escaping', () => {
  it('HTML-escapes every lane string, in text and in attributes', () => {
    const evil: BeliefLane = {
      ...LANE,
      id: 'x"><script>',
      card: { h: '<script>alert(1)</script>', s: 'a & b', b: '"quoted"', sc: "it's <b>" },
      meta: { title: '</title><script>', desc: '" onload="x', alt: '"><img src=x>' },
      body: [{ t: 'h', text: '<h1>' }, { t: 'p', text: '</div>' }, { t: 'list', lead: '<', items: ['>'], closer: '&' }, { t: 'faq', items: [{ q: '<q>', a: '<a>' }] }, { t: 'ask' }],
    }
    const out = renderLaneHtml(INDEX, evil)
    assert.ok(!out.includes('<script>alert(1)'), 'no raw script')
    assert.ok(!out.includes('</title><script>'), 'title not broken out of')
    assert.ok(!out.includes('" onload="x'), 'attribute not broken out of')
    assert.ok(!out.includes('"><img src=x>'), 'alt not broken out of')
    assert.ok(out.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
    assert.ok(out.includes('&quot;quoted&quot;'))
    assert.ok(out.includes('a &amp; b'))
  })

  it('escapes the real copy\'s quotes and apostrophes', () => {
    const html = applyLaneHtml(INDEX, '/fb?lane=manifest')
    assert.ok(html.includes('&quot;You always attract the same kind of man.&quot;'))
    assert.ok(html.includes('It&#39;s free to message Evelyn.'))
  })
})

// ── server/static.ts (production) vs today's implementation ────────────────
// TODAY = the serveStatic that shipped on Production e13e7b7a, inlined verbatim.
function todaysServeStatic(app: express.Express, distPath: string) {
  app.use(express.static(distPath))
  app.use('/{*path}', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'))
  })
}

async function listen(app: express.Express): Promise<{ server: Server; base: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      resolve({ server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` })
    })
  })
}

describe('server/static.ts — production HTML path', () => {
  let dist: string
  let now: { server: Server; base: string }
  let today: { server: Server; base: string }

  before(async () => {
    dist = fs.mkdtempSync(path.join(os.tmpdir(), 'lane-dist-'))
    fs.writeFileSync(path.join(dist, 'index.html'), INDEX)
    const a = express()
    serveStatic(a, dist)
    now = await listen(a)
    const b = express()
    todaysServeStatic(b, dist)
    today = await listen(b)
  })

  after(() => {
    now.server.close()
    today.server.close()
    fs.rmSync(dist, { recursive: true, force: true })
  })

  const HEADERS = ['content-type', 'content-length', 'etag', 'last-modified', 'cache-control', 'accept-ranges']

  for (const url of PLAIN_URLS) {
    it(`${url} → same bytes and headers as today`, async () => {
      const [r1, r2] = await Promise.all([fetch(now.base + url), fetch(today.base + url)])
      assert.equal(r1.status, r2.status)
      const [b1, b2] = await Promise.all([r1.arrayBuffer(), r2.arrayBuffer()])
      assert.equal(Buffer.compare(Buffer.from(b1), Buffer.from(b2)), 0, 'body bytes')
      assert.equal(Buffer.compare(Buffer.from(b1), Buffer.from(INDEX)), 0, 'body is index.html')
      for (const h of HEADERS) assert.equal(r1.headers.get(h), r2.headers.get(h), h)
    })
  }

  it('/fb?lane=manifest → the lane HTML, 200, text/html', async () => {
    const r = await fetch(now.base + '/fb?lane=manifest&utm_source=facebook')
    assert.equal(r.status, 200)
    assert.match(r.headers.get('content-type') ?? '', /^text\/html/)
    const body = await r.text()
    assert.equal(body, renderLaneHtml(INDEX, LANE))
    assert.ok(body.includes(`<title>${escapeHtml(LANE.meta.title)}</title>`))
  })
})
