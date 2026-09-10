/**
 * Compare the PDF the LOCAL harness renders against the one n8n + PDFShift produced.
 *
 *   node improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/compare-02-pdfs.mjs <executionId>
 *
 * ⭐ WHAT IS AND IS NOT COMPARABLE. Each run makes its own draw, so the two documents contain
 *    different cards and different prose — a text diff between them is noise. What IS
 *    comparable is everything the RENDERER owns: page count, whether all thirteen images
 *    loaded, the twelve house headings, the intake block, the free gift, the colophon. That is
 *    the actual question: does PDFShift produce the same document local Chromium does?
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO = path.resolve(ROOT, "../../../../..");
const env = (k) => (fs.readFileSync(path.join(REPO, '.env'), 'utf8')
  .match(new RegExp(`^\\s*${k}\\s*=\\s*(.+)$`, 'm')) || [])[1]?.trim().replace(/^['"]|['"]$/g, '');

const execId = process.argv[2];
if (!execId) throw new Error('usage: compare-02-pdfs.mjs <n8n executionId>');

// ── pull the n8n run and find what it produced ───────────────────────────────
const r = await fetch(`${env('N8N_BASE_URL').replace(/\/$/, '')}/api/v1/executions/${execId}?includeData=true`,
  { headers: { 'X-N8N-API-KEY': env('N8N_API_KEY') } });
const ex = await r.json();
const rd = ex.data?.resultData?.runData || {};
const nodeOut = (n) => rd[n]?.[0]?.data?.main?.[0]?.[0]?.json;

const signed = nodeOut('13a · Get signed URL');
const built  = nodeOut('10 · Build the HTML');
if (!signed?.signedURL) {
  console.log(`\n  🔴 execution ${execId} never reached the signed URL.`);
  console.log(`     nodes that ran: ${Object.keys(rd).length}`);
  const err = ex.data?.resultData?.error;
  if (err) console.log(`     failed at ${err.node?.name}: ${String(err.message).slice(0, 160)}`);
  process.exit(1);
}
// ⛔ Supabase returns signedURL RELATIVE. Unprefixed it is a link to nowhere.
const url = signed.signedURL.startsWith('http')
  ? signed.signedURL
  : `${new URL(env('N8N_BASE_URL')).protocol}//` + 'pqolqzddzxubquukxnhk.supabase.co/storage/v1' + signed.signedURL;

const out = path.join(ROOT, 'docs/02/n8n-02-reading.pdf');
const pdf = Buffer.from(await (await fetch(url)).arrayBuffer());
fs.writeFileSync(out, pdf);

const stats = (file) => {
  const buf = fs.readFileSync(file);
  const raw = buf.toString('latin1');
  let text = '';
  try { text = execFileSync('/usr/bin/mdimport', ['-d2', file], { encoding: 'utf8' }); } catch {}
  return {
    kb: Math.round(buf.length / 1024),
    pages: (raw.match(/\/Type\s*\/Page[^s]/g) || []).length,
    images: (raw.match(/\/Subtype\s*\/Image/g) || []).length,
  };
};
const localPdf = path.join(ROOT, 'docs/02/dryrun-02-reading.pdf');
const A = stats(localPdf), B = stats(out);

// structure comes from the HTML the node built, which is the same node in both runs
const html = built?.html || '';
const has = (re) => (html.match(re) || []).length;
console.log(`\n  ═══ LOCAL harness (Chromium)        vs   n8n + PDFShift`);
console.log(`  file      ${path.relative(REPO, localPdf)}`);
console.log(`            ${path.relative(REPO, out)}`);
console.log(`  pages     ${String(A.pages).padEnd(28)} ${B.pages}`);
console.log(`  size KB   ${String(A.kb).padEnd(28)} ${B.kb}`);
console.log(`  images    ${String(A.images).padEnd(28)} ${B.images}`);
console.log(`\n  ── what n8n's own node 10 emitted ──`);
console.log(`  house sections     ${has(/<section>/g)}`);
console.log(`  agency headings    ${has(/<h3>/g)}`);
console.log(`  card <img>         ${has(/<img src="https:\/\/luna-assets/g)}`);
console.log(`  intake lines       ${has(/class="line"/g)}`);
console.log(`  free gift block    ${has(/class="gift"/g)}`);
console.log(`  colophon           ${has(/class="colophon"/g)}`);
console.log(`\n  signed URL: ${url.slice(0, 110)}…`);
