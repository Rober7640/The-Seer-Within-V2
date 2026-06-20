/**
 * Luna email assembler — the "typesetter" stage. Fills template A (text-light) or
 * template C (chart-wheel) with generated copy + a picked blurb, producing
 * send-ready HTML.
 *
 * It replaces content regions in the committed templates using STABLE ASCII anchors
 * (style fragments, comment markers, the LV-XX / "READ MY CHART LIVE" placeholders),
 * robust to the curly quotes/em-dashes in the copy. Every replacement asserts it
 * matched — a missing anchor throws loudly rather than shipping a broken email. The
 * original templates stay untouched as the human previews.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import type { LunaEmailCopy } from './lunaContentGenerator';
import type { PickedBlurb } from './lunaBlurbs';
import type { DayPlan } from './dailySkyEditor';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_DIR = path.resolve(__dirname, '../../docs/kit/luna-voss-emails');
const TEMPLATES = {
  A: path.join(KIT_DIR, 'luna-email-template-A-daily-sky.html'),
  C: path.join(KIT_DIR, 'luna-email-template-C-chart-wheel.html'),
};

const PLACEHOLDER_ADDRESS = 'The Seer Within, 123 Placeholder St, Suite 100, City, ST 00000, USA';
const PARA_STYLE = "font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:17px; line-height:28px; color:#1C2230;";

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const esc = (s: string) => s.replace(/&(?!(?:amp|lt|gt|#\d+|[a-z]+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[dt.getUTCDay()]}, ${MONTHS[m - 1]} ${d}`;
}

/** Replace exactly one anchored region; throw if the anchor isn't found. */
function region(html: string, re: RegExp, fn: (...g: string[]) => string, label: string): string {
  if (!re.test(html)) throw new Error(`[assembler] anchor not found: ${label}`);
  return html.replace(re, (...args) => fn(...(args as string[])));
}

export interface WheelMeta { src: string; alt: string; caption: string; }
export interface AssembleOpts { template?: 'A' | 'C'; address?: string; wheel?: WheelMeta; }

export interface AssembledEmail {
  date: string;
  template: 'A' | 'C';
  subject: string;       // set in Kit's subject field (not embedded in HTML)
  preheader: string;
  pillar: string;
  blurbId: string;
  source: string;        // 'haiku' | 'fallback'
  html: string;
}

function defaultWheel(plan: DayPlan): WheelMeta {
  const ap = plan.headlineAspect;
  return {
    src: `https://theseerwithin.com/assets/luna/daily/${plan.date}.png`,
    alt: `The sky on ${plan.date}: ${plan.headline ?? 'the day’s planets and aspects'}.`,
    caption: ap ? `${ap.planet1.toUpperCase()} ${ap.aspectSymbol} ${ap.planet2.toUpperCase()}` : "TODAY'S SKY",
  };
}

export function assembleEmail(copy: LunaEmailCopy, blurb: PickedBlurb, plan: DayPlan, opts: AssembleOpts = {}): AssembledEmail {
  const template = opts.template ?? 'A';
  let html = readFileSync(TEMPLATES[template], 'utf8');
  const kicker = plan.pillar === 'Your Timing Window' ? 'YOUR TIMING WINDOW' : "TODAY'S SKY";

  const paras = copy.bodyText.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  const bodyHtml = paras.map((p, i) =>
    `              <p style="margin:${i === paras.length - 1 ? '0 0 0 0' : '0 0 18px 0'}; ${PARA_STYLE}">\n                ${esc(p)}\n              </p>`,
  ).join('\n');

  // ── Shared regions (identical anchors in A and C) ──
  html = region(html, /(opacity:0;">)([\s\S]*?)(\s*&nbsp;&zwnj;)/,
    (_m, a, _b, c) => `${a}\n    ${esc(copy.preheader)}${c}`, 'preheader');
  html = region(html, /(&#9790;<\/span>&nbsp;)([\s\S]*?)(<\/div>)/,
    (_m, a, _b, c) => `${a} ${kicker} &middot; ${dateLabel(plan.date)}\n              ${c}`, 'kicker');
  html = region(html, /(<h1 class="lv-h1"[^>]*>)([\s\S]*?)(<\/h1>)/,
    (_m, a, _b, c) => `${a}\n                ${esc(copy.h1)}\n              ${c}`, 'h1');
  html = region(html, /(<!-- BODY-START[\s\S]*?-->)([\s\S]*?)(<!-- BODY-END -->)/,
    (_m, a, _b, c) => `${a}\n${bodyHtml}\n              ${c}`, 'body');
  html = region(html, /(<!-- EDIT: \{\{CHAT_BLURB\}\} -->)([\s\S]*?)(<\/td>)/,
    (_m, a, _b, c) => `${a}\n              ${esc(blurb.text)}\n            ${c}`, 'chat-blurb');
  html = region(html, /(font-style:italic; font-size:14px; line-height:20px; color:#3A4255;">)([\s\S]*?)(<\/span>)/,
    (_m, a, _b, c) => `${a}\n                ${blurb.friction}\n              ${c}`, 'friction');
  html = region(html, /(<strong style="color:#1C2230;">P\.S\.<\/strong>)([\s\S]*?)(<\/p>)/,
    (_m, a, _b, c) => `${a} ${esc(copy.ps)}${c}`, 'ps');

  if (!html.includes('READ MY CHART LIVE')) throw new Error('[assembler] CTA label anchor not found');
  if (!html.includes('utm_content=LV-XX')) throw new Error('[assembler] CTA utm anchor not found');
  html = html.split('READ MY CHART LIVE').join(esc(blurb.ctaLabel));
  html = html.split('utm_content=LV-XX').join(`utm_content=${blurb.id}`);

  // ── Template C extras: wheel image + caption; drop the now-wrong hardcoded strip ──
  if (template === 'C') {
    const w = opts.wheel ?? defaultWheel(plan);
    html = region(html, /(class="lv-wheel" src=")[^"]*(")/, (_m, a, c) => `${a}${w.src}${c}`, 'wheel-src');
    html = region(html, /(width="340" height="340" alt=")[^"]*(")/, (_m, a, c) => `${a}${esc(w.alt)}${c}`, 'wheel-alt');
    html = region(html, /(text-transform:uppercase; color:#8A6326;">)([\s\S]*?)(<\/div>)/,
      (_m, a, _b, c) => `${a}\n                ${w.caption}\n              ${c}`, 'caption');
    html = region(html, /<!-- =+ OPTIONAL "READING THE WHEEL" 3-COL STRIP[\s\S]*?<\/table>\s*<\/td>\s*<\/tr>/,
      () => '<!-- (daily build: 3-col strip omitted; the wheel + caption carry it) -->', 'strip-remove');
  }

  if (opts.address) html = html.split(PLACEHOLDER_ADDRESS).join(esc(opts.address));

  // Rehost the static masthead/footer assets (avatar, stamp, watermark) on the
  // same S3 CDN as the sky map. The templates hardcode theseerwithin.com, which
  // does not actually serve these files (returns the SPA fallback). Scoped to
  // /assets/luna/ so the CTA link (theseerwithin.com/luna) is left untouched.
  // Upload the static assets once via scripts/upload-luna-static-assets.ts.
  const assetBase = process.env.ASSET_BASE_URL?.replace(/\/+$/, '');
  if (assetBase) {
    html = html.split('https://theseerwithin.com/assets/luna/').join(`${assetBase}/luna/`);
  }

  return {
    date: plan.date,
    template,
    subject: copy.subject,
    preheader: copy.preheader,
    pillar: plan.pillar,
    blurbId: blurb.id,
    source: copy.source,
    html,
  };
}
