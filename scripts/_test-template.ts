// Build ONE Luna email for a given template (A = text-light, B = visual-feature hero,
// C = chart-wheel) and push it to Kit as a draft. Template A needs no image; for B/C,
// pass a date whose image build-luna-batch.ts already uploaded (hero for B, sky map
// for C).
//   npx tsx scripts/_test-template.ts B 2026-06-18
import 'dotenv/config';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDailySky } from '../server/lib/astrologyEngine.ts';
import { buildCalendar } from '../server/lib/dailySkyEditor.ts';
import { generateLunaDailyEmail } from '../server/lib/lunaContentGenerator.ts';
import { pickBlurb } from '../server/lib/lunaBlurbs.ts';
import { heroAlt } from '../server/lib/lunaHeroMap.ts';
import { assembleEmail, type AssembleOpts } from '../server/lib/lunaEmailAssembler.ts';

const tpl = (process.argv[2] ?? 'A').toUpperCase() as 'A' | 'B' | 'C';
const date = process.argv[3] ?? '2026-06-18';
const key = process.env.KIT_API_KEY;
if (!key) { console.error('❌ KIT_API_KEY not set'); process.exit(1); }
if (tpl !== 'A' && tpl !== 'B' && tpl !== 'C') { console.error('❌ template must be A, B or C'); process.exit(1); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.ASSET_BASE_URL?.replace(/\/+$/, '');

const [plan] = buildCalendar(date, 1);
const copy = await generateLunaDailyEmail(plan);
const blurb = pickBlurb(plan.pillar, 0);

// B/C need an image; point at the already-uploaded S3 asset for that date.
const imgOpts: AssembleOpts = { template: tpl };
if (tpl === 'C') {
  imgOpts.wheel = { src: `${base}/luna/daily/${date}.png`, alt: `The sky on ${date}.`, caption: "TODAY'S SKY" };
} else if (tpl === 'B') {
  imgOpts.hero = { src: `${base}/luna/hero/${date}.png`, alt: heroAlt(getDailySky(date), { headlineAspect: plan.headlineAspect }) };
}

const email = assembleEmail(copy, blurb, plan, imgOpts);

const outFile = path.resolve(__dirname, `../docs/kit/luna-voss-emails/outbox/_${tpl}-test-${date}.html`);
writeFileSync(outFile, email.html);

const subject = email.subject.replace('{firstName}', '{{ subscriber.first_name | default: "friend" }}');

console.log(`Template ${tpl} · ${date} · pillar "${plan.pillar}" · blurb ${blurb.id} · source ${email.source}`);
console.log(`  subject: ${subject}`);
console.log(`  wrote:   ${path.relative(process.cwd(), outFile)}  (${email.html.length} bytes)\n`);

const res = await fetch('https://api.kit.com/v4/broadcasts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
  body: JSON.stringify({
    subject,
    content: email.html,
    description: `Luna TEMPLATE ${tpl} TEST — ${date}`,
    public: false,
    send_at: null,
    preview_text: email.preheader,
  }),
});
const data: any = await res.json().catch(() => null);
console.log('HTTP', res.status);
if (res.ok && data?.broadcast?.id) {
  console.log('✅ Draft created:', data.broadcast.id);
  console.log('   https://app.kit.com/campaigns/' + data.broadcast.id + '/draft');
} else {
  console.error('❌ Failed:', JSON.stringify(data, null, 2));
  process.exit(1);
}
