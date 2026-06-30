// Push any HTML file to Kit as a DRAFT broadcast (for one-off emails not in the
// date-based daily pipeline). Always a draft (send_at:null).
//   npx tsx scripts/_push-html-to-kit.ts <file.html> "<subject>" "<preview>" "<description>"
import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';

const [file, subject, preview, description] = process.argv.slice(2);
const key = process.env.KIT_API_KEY;
if (!key) { console.error('❌ KIT_API_KEY not set'); process.exit(1); }
if (!file || !subject) { console.error('usage: _push-html-to-kit.ts <file> "<subject>" ["<preview>"] ["<description>"]'); process.exit(1); }

const html = readFileSync(path.resolve(file), 'utf8');
console.log(`Pushing ${path.basename(file)} (${html.length} bytes) as a draft…`);
console.log(`  subject: ${subject}`);

const res = await fetch('https://api.kit.com/v4/broadcasts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
  body: JSON.stringify({
    subject,
    content: html,
    description: description ?? 'One-off draft',
    public: false,
    send_at: null,
    preview_text: preview ?? '',
  }),
});
const data: any = await res.json().catch(() => null);
console.log('HTTP', res.status);
if (res.ok && data?.broadcast?.id) {
  console.log('✅ Draft created:', data.broadcast.id);
  console.log('   https://app.kit.com/campaigns/' + data.broadcast.id + '/draft');
} else {
  console.error('❌ Failed:', typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  process.exit(1);
}
