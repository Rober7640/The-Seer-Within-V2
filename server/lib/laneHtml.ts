// Server HTML for a belief-lane lander (/fb?lane=<id>) — what Meta reads.
//
// Meta matches the page's words to the ad's words, and its crawler reads the HTML
// the server sends, not what React renders afterwards. Every route serves the same
// index.html ("The Seer Within - Psychic Chat"), so without this a lane page would
// look to Meta exactly like plain /fb.
//
// With a valid lane on /fb this rewrites <title>, og:title and og:description (and
// their twitter: twins), adds a meta description and og:image:alt, and puts a static
// copy of the card text and the below-card copy inside <div id="root">. createRoot()
// (client/src/main.tsx) REPLACES that markup on mount, so a visitor with JavaScript
// sees the React page; the static copy is the same words, visible, on a white panel.
// No hidden text: nothing here is display:none, tiny or off-screen.
//
// 🔴 /fb WITH NO LANE, OR AN UNKNOWN LANE, IS BYTE-IDENTICAL. applyLaneHtml returns its
// input string untouched (the same reference) unless getLane() resolves, and the
// prod path in server/static.ts then keeps today's res.sendFile exactly.
//
// PURE: no I/O, no clock, no env. Unit-tested in laneHtml.test.ts.

import { getLane, laneChatPath, LANE_LANDER_PATH, type BeliefLane } from '../../shared/beliefLanes'

/** HTML-escape for both text and double-quoted attribute values. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * The lane a request URL asks for, or undefined. Only the lander path itself
 * (/fb) serves a lane — never /fb/chat, /fb2, /gdn or /. `&amp;` is undone first,
 * as client/src/lib/funnel.ts linkParams() does, for links copied out of email.
 */
export function laneForRequestUrl(url: string): BeliefLane | undefined {
  const q = url.indexOf('?')
  const path = (q < 0 ? url : url.slice(0, q)).split('#')[0]
  if (path !== LANE_LANDER_PATH) return undefined
  if (q < 0) return undefined
  const params = new URLSearchParams(url.slice(q + 1).split('#')[0].replace(/&amp;/gi, '&'))
  return getLane(params.get('lane'))
}

function setMetaContent(html: string, attr: 'property' | 'name', key: string, value: string): string {
  const re = new RegExp(`<meta ${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" content="[^"]*"\\s*/?>`)
  return html.replace(re, () => `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`)
}

/** The visible static copy that sits inside #root until React mounts. */
export function laneStaticMarkup(lane: BeliefLane): string {
  const e = escapeHtml
  const chat = e(laneChatPath(lane.id))
  const ink = 'color:#111827'
  const body = 'color:#374151'
  const button =
    'display:block;text-align:center;padding:16px 24px;border-radius:8px;background:#7e22ce;color:#ffffff;font-weight:600;text-decoration:none'
  const under = 'text-align:center;font-size:13px;color:#4b5563;font-style:italic;margin:12px 0 0'
  const out: string[] = []
  out.push(
    `<main data-lane-static="${e(lane.id)}" style="max-width:28rem;margin:24px auto;padding:24px;background:#ffffff;${body};font-family:Inter,system-ui,sans-serif;font-size:16px;line-height:1.6;border-radius:16px">`,
  )
  out.push(`<p style="text-align:center;font-family:'Playfair Display',Georgia,serif;font-size:24px;${ink};margin:0 0 16px">The Seer Within</p>`)
  out.push(
    `<p style="text-align:center;margin:0 0 16px"><img src="/evelyn-avatar.png" alt="${e(lane.meta.alt)}" width="112" height="112" style="border-radius:50%;object-fit:cover"></p>`,
  )
  out.push(`<h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;line-height:1.25;text-align:center;${ink};margin:0 0 16px">${e(lane.card.h)}</h1>`)
  out.push(`<p style="text-align:center;margin:0 0 24px">${e(lane.card.s)}</p>`)
  out.push(`<p style="margin:0"><a href="${chat}" style="${button}">${e(lane.card.b)}</a></p>`)
  out.push(`<p style="${under}">${e(lane.card.sc)}</p>`)
  out.push(`<section style="margin-top:32px;border-top:1px solid #e5e7eb;padding-top:8px">`)
  for (const b of lane.body) {
    if (b.t === 'h') {
      out.push(`<h2 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;line-height:1.3;${ink};margin:24px 0 8px">${e(b.text)}</h2>`)
    } else if (b.t === 'p') {
      out.push(`<p style="margin:0 0 12px">${e(b.text)}</p>`)
    } else if (b.t === 'list') {
      out.push(`<p style="margin:0 0 8px">${e(b.lead)}</p>`)
      out.push(`<ul style="margin:0 0 12px;padding-left:20px">`)
      for (const it of b.items) out.push(`<li>${e(it)}</li>`)
      out.push(`</ul>`)
      if (b.closer) out.push(`<p style="margin:0 0 12px">${e(b.closer)}</p>`)
    } else if (b.t === 'faq') {
      for (const it of b.items) {
        out.push(`<h3 style="font-size:16px;font-weight:600;${ink};margin:16px 0 4px">${e(it.q)}</h3>`)
        out.push(`<p style="margin:0 0 12px">${e(it.a)}</p>`)
      }
    } else if (b.t === 'ask') {
      out.push(`<p style="margin:24px 0 0"><a href="${chat}" style="${button}">${e(lane.card.b)}</a></p>`)
      out.push(`<p style="${under}">${e(lane.card.sc)}</p>`)
    }
  }
  out.push(`</section>`)
  out.push(
    `<p style="text-align:center;font-size:13px;color:#4b5563;margin:32px 0 0"><a href="/privacy" style="color:#4b5563">Privacy Policy</a> · <a href="/terms" style="color:#4b5563">Terms of Service</a> · <a href="/refund" style="color:#4b5563">Refund Policy</a></p>`,
  )
  out.push(`<p style="text-align:center;font-size:13px;color:#4b5563;margin:8px 0 0">&copy; Cosmo Numerology Pte Ltd. For Entertainment Purposes Only.</p>`)
  out.push(`</main>`)
  return out.join('')
}

// The canonical site. A lane page's og:url and canonical point at the production
// URL even when dev serves it — that is what canonical is for, and it is the URL the
// ad actually sends her to. Kept here (not from the request) so renderLaneHtml stays pure.
const SITE_ORIGIN = 'https://www.theseerwithin.com'

/** The lane's clean canonical URL (no tracking params). */
function laneCanonical(lane: BeliefLane): string {
  return `${SITE_ORIGIN}${LANE_LANDER_PATH}?lane=${lane.id}`
}

/**
 * schema.org JSON-LD for a lane: a WebPage (name, description, keywords, image) and,
 * from the lane's own FAQ, a FAQPage. Returned as an object; the caller serialises it
 * and neutralises `<` so no lane string can break out of the <script>.
 */
export function laneJsonLd(lane: BeliefLane): Record<string, unknown> {
  const canonical = laneCanonical(lane)
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebPage',
      name: lane.meta.title,
      description: lane.meta.desc,
      url: canonical,
      inLanguage: 'en',
      keywords: lane.meta.keywords.join(', '),
      about: { '@type': 'Thing', name: lane.name },
      isPartOf: { '@type': 'WebSite', name: 'The Seer Within', url: SITE_ORIGIN },
      primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/evelyn-avatar.png`, caption: lane.meta.alt },
    },
  ]
  const faq = lane.body.find((b) => b.t === 'faq')
  if (faq && faq.t === 'faq') {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.items.map((it) => ({
        '@type': 'Question',
        name: it.q,
        acceptedAnswer: { '@type': 'Answer', text: it.a },
      })),
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

/** The extra <head> tags for a lane: keywords, og:url, canonical, JSON-LD. */
export function laneHeadExtras(lane: BeliefLane): string {
  const canonical = laneCanonical(lane)
  // JSON-LD is raw JSON inside <script>, NOT HTML-escaped — but `<` is neutralised so
  // a lane string can never close the <script> or open a new tag.
  const ld = JSON.stringify(laneJsonLd(lane)).replace(/</g, '\\u003c')
  return [
    `<meta name="keywords" content="${escapeHtml(lane.meta.keywords.join(', '))}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<script type="application/ld+json">${ld}</script>`,
  ].join('\n    ')
}

/** Rewrite index.html for one lane. Callers go through applyLaneHtml. */
export function renderLaneHtml(html: string, lane: BeliefLane): string {
  const { title, desc, alt } = lane.meta
  let out = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
  out = setMetaContent(out, 'property', 'og:title', title)
  out = setMetaContent(out, 'property', 'og:description', desc)
  out = setMetaContent(out, 'name', 'twitter:title', title)
  out = setMetaContent(out, 'name', 'twitter:description', desc)
  // meta description: replace one if the template ever gains it, else add it after <title>.
  if (/<meta name="description" content="[^"]*"\s*\/?>/.test(out)) {
    out = setMetaContent(out, 'name', 'description', desc)
  } else {
    out = out.replace(/<\/title>/, () => `</title>\n    <meta name="description" content="${escapeHtml(desc)}" />`)
  }
  out = out.replace(
    /(<meta property="og:image" content="[^"]*"\s*\/?>)/,
    (m) => `${m}\n    <meta property="og:image:alt" content="${escapeHtml(alt)}" />`,
  )
  // Rich metadata (keywords, og:url, canonical, JSON-LD) just before </head>.
  out = out.replace(/<\/head>/, () => `    ${laneHeadExtras(lane)}\n  </head>`)
  out = out.replace(/<div id="root"><\/div>/, () => `<div id="root">${laneStaticMarkup(lane)}</div>`)
  return out
}

/**
 * The HTML to send for this request URL. Returns `html` itself — the same string,
 * unchanged — unless the URL is /fb with a lane the registry knows.
 */
export function applyLaneHtml(html: string, url: string): string {
  const lane = laneForRequestUrl(url)
  return lane ? renderLaneHtml(html, lane) : html
}
