/* Generate Evelyn daily sketches via fal nano-banana, anchored on the approved Day-1 hands sketch.
   Pipeline per day: fal edit (style-locked) -> download -> sips optimize (<200KB, vertical) -> S3 upload -> verify GET.
   Usage: node gen-evelyn-sketches.cjs [only-filename-stem]   e.g. node ... day-02-oak-reed   (omit = all 13) */
const fs = require('fs');
const { execSync } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const PROJECT = "/Users/joel/Library/CloudStorage/OneDrive-altius/Fun Projects/The-Seer-Within-V2-Production-joel-chue/The-Seer-Within-V2-Production";
require('dotenv').config({ path: PROJECT + '/.env' });

// FAL key lives under env name "FAL.API_KEY" with stray quotes -> extract the quoted value
const rawFal = process.env['FAL.API_KEY'] || process.env.FAL_KEY || '';
const fm = rawFal.match(/"([^"]+)"/);
const FAL_KEY = (fm ? fm[1] : rawFal).trim();

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const BUCKET = process.env.S3_BUCKET || 'luna-assets-tsw';
const BASE = (process.env.ASSET_BASE_URL || `https://${BUCKET}.s3.${REGION}.amazonaws.com`).replace(/\/$/, '');
const REF = `${BASE}/evelyn/sketches/day-01-hands.jpg`;
const OUT = PROJECT + '/docs/aweber/evelyn-cross-emails/assets/sketches';

const s3 = new S3Client({ region: REGION, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });

const STYLE = "Keep the exact drawing style of the reference image — the same untrained pencil hand, the same plain off-white notebook paper, the same naive slightly wobbly linework, light graphite shading, visible paper texture and a faint eraser mark. It must look like the same amateur person sketched it quickly from memory.";

// [stem, subject, keepHands(reference hands are fine), isText]
const DAYS = [
  ['day-02-oak-reed',     'a large leafy oak tree and, beside it at the water’s edge, a single slender reed bending in the wind', false, false],
  ['day-03-flowers',      'a small bunch of flowers set back on a wooden market shelf, with a cheaper little bunch beside it', false, false],
  ['day-04-enough',       'the single word “ENOUGH” hand-printed in large pencil capitals, alone and centered on the page', false, true],
  ['day-05-open-hand',    'a single open hand lying flat and relaxed, palm facing upward and fingers gently spread, cupped a little as if waiting to receive something, seen from above', true, false],
  ['day-06-teacups',      'two teacups on saucers on a table, one slightly closer to the viewer than the other', false, false],
  ['day-07-bird-doorway', 'a small bird in an open doorway, wings spread mid-flight, just about to leave', false, false],
  ['day-08-two-chairs',   'two simple wooden chairs standing a little apart with an empty gap between them, each chair turned slightly away from the other so they face gently outward, not toward each other', false, false],
  ['day-09-empty-boat',   'a small empty wooden rowboat drifting alone on still water, no one in it', false, false],
  ['day-10-window',       'a younger woman seen from behind, standing at a window and looking out', false, false],
  ['day-11-handbag',      'a man’s hand holding a woman’s handbag by its strap while he waits', true, false],
  ['day-12-fork',         'a country road forking into two separate paths under an open sky', false, false],
  ['day-13-pressed-leaf', 'a single pressed autumn leaf taped flat to the notebook page, with a short hand-written date in pencil beside it', false, true],
  ['day-14-key-lock',     'a single key resting in the keyhole of a closed wooden door, not yet turned', false, false],
  // day 15+ (evelyn-daily batches). Richer compositions allowed — a small scene with several elements, not always one floating object.
  ['day-15-money-table',  'a fuller little still-life scene with several elements, more going on than a single object: a kitchen table seen slightly from above, with a worn brown pay-envelope, a small loose stack of banknotes and a few coins half-counted, a pair of older woman’s hands resting on the table near them, and a faint short sum pencilled in the margin of the page', true, true],
  // night-letter variants — night scenes; a little more graphite shading than usual is fine to read as "night"
  ['day-16-lit-window',   'a quiet night scene: a single window glowing with soft pale light, high in a dark building, seen across the shadowed rooftops of a sleeping town at night, all the other windows dark, the night sky softly shaded in graphite', false, false],
  ['day-17-night-chair',  'a still, dim night scene: an empty armchair beside a plain rectangular sash window with simple square panes (flat-topped, ordinary house window — NOT arched, no church-like shape), a soft knitted shawl draped over the chair back, the round moon visible through the glass, the quiet room lightly shaded in graphite', false, false],
];

async function one([stem, subject, keepHands, isText]) {
  const prompt = `${STYLE} Now draw a completely new subject on the same kind of page: ${subject}. ${keepHands ? '' : 'Do NOT include the two cupped hands from the reference image — replace the entire subject with the new one.'} Graphite pencil only, no colour, vertical orientation, the drawing roughly centered with a plain margin. ${isText ? 'Any lettering must look hand-printed in pencil by the same hand.' : 'No printed text, no signature, no border.'}`;
  const r = await fetch('https://fal.run/fal-ai/nano-banana/edit', {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_urls: [REF], num_images: 1, output_format: 'jpeg' }),
  });
  if (!r.ok) throw new Error(`fal ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const url = j.images && j.images[0] && j.images[0].url;
  if (!url) throw new Error(`no image url: ${JSON.stringify(j).slice(0, 200)}`);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const raw = `${OUT}/${stem}-raw.jpg`, fin = `${OUT}/${stem}.jpg`;
  fs.writeFileSync(raw, buf);
  let q = 82;
  execSync(`sips -s format jpeg -s formatOptions ${q} -Z 1024 "${raw}" --out "${fin}"`, { stdio: 'ignore' });
  while (fs.statSync(fin).size > 200000 && q > 45) { q -= 9; execSync(`sips -s format jpeg -s formatOptions ${q} -Z 1024 "${raw}" --out "${fin}"`, { stdio: 'ignore' }); }
  const body = fs.readFileSync(fin);
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: `evelyn/sketches/${stem}.jpg`, Body: body, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  const head = await fetch(`${BASE}/evelyn/sketches/${stem}.jpg`, { method: 'GET' });
  return `${stem}.jpg  ${(body.length / 1024) | 0}KB  q${q}  S3-GET:${head.status}`;
}

(async () => {
  if (!FAL_KEY || FAL_KEY.length < 20) { console.error('FAL key missing/short'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const list = only.length ? DAYS.filter(d => only.includes(d[0])) : DAYS;
  if (!list.length) { console.error('no matching day for', only.join(',')); process.exit(1); }
  const results = [];
  const conc = 4;
  for (let i = 0; i < list.length; i += conc) {
    const batch = list.slice(i, i + conc).map(d => one(d).then(s => ({ ok: 1, stem: d[0], s })).catch(e => ({ ok: 0, stem: d[0], s: e.message })));
    const rs = await Promise.all(batch);
    rs.forEach(x => console.log((x.ok ? 'OK   ' : 'FAIL ') + x.stem + '  ' + x.s));
  }
  console.log('\nDONE');
})();
