// Push one assembled Luna email to Kit as a DRAFT broadcast via the V4 API.
// Uses KIT_API_KEY (the production automation path). Always a draft (send_at:null)
// — scheduling/sending stays a human decision in Kit's UI.
//   npx tsx scripts/_push-to-kit.ts 2026-06-18 "Subject line here"
import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';

const date = process.argv[2] ?? '2026-06-18';
const subjectArg = process.argv[3];
const key = process.env.KIT_API_KEY;
if (!key) { console.error('❌ KIT_API_KEY not set in .env'); process.exit(1); }

const html = readFileSync(path.resolve('docs/kit/luna-voss-emails/outbox', `${date}.html`), 'utf8');

// Pull the hidden preheader out of the HTML for preview_text, if present.
const pre = html.match(/opacity:0;">\s*([\s\S]*?)\s*(?:&nbsp;|&zwnj;|<)/);
const previewText = pre ? pre[1].replace(/\s+/g, ' ').trim() : '';

const subject = subjectArg ?? `Today's sky — ${date}`;

const body = {
  subject,
  content: html,
  description: `Luna daily TEST — ${date} (end-to-end S3 + Kit verification)`,
  public: false,
  send_at: null,                 // null => saved as a draft, does NOT send
  preview_text: previewText,
};

console.log(`Pushing ${date}.html to Kit as a draft…`);
console.log(`  subject:      ${subject}`);
console.log(`  preview_text: ${previewText || '(none)'}`);
console.log(`  html:         ${html.length} bytes\n`);

const res = await fetch('https://api.kit.com/v4/broadcasts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
  body: JSON.stringify(body),
});

const text = await res.text();
let data: any; try { data = JSON.parse(text); } catch { data = text; }
console.log('HTTP', res.status);

if (res.ok && data?.broadcast?.id) {
  const b = data.broadcast;
  console.log('✅ Draft created.');
  console.log('  broadcast id:', b.id);
  console.log('  status:      ', b.status ?? '(draft)');
  console.log('  send_at:     ', b.send_at ?? 'null (draft — will not send)');
  console.log('  public_url:  ', b.public_url ?? '(not public)');
  console.log('\n  Open/preview/schedule in Kit:');
  console.log('  https://app.kit.com/campaigns/' + b.id + '/draft');
} else {
  console.error('❌ Failed:', typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  process.exit(1);
}
