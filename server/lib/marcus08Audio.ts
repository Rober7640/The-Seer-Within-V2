// Marcus 08 reading -> narrated audio (server-side).
//
// Joel's plan puts audio on the backend: the server generates every segment,
// assembles them, and uploads the finished MP3 to Supabase Storage — n8n only
// kicks it off and reads back the URL. (His draft had n8n drive a per-segment
// loop; that was the fragile part on n8n Cloud, so it lives here instead.)
//
// Spec = marcus-audio-v1 (improve-v1/.../08-marcus/n8n/config/marcus-audio-v1.json
// and assets/marcus-voice/narration-sample.json):
//   - narration is built from the STRUCTURED report (opening / numerology /
//     personal card / each card / synthesis / closing), headings spoken as
//     lead-ins, flattened for speech, split into <=480-char pieces (Chatterbox
//     garbles long text);
//   - pauses: 300ms between pieces in a section, 600ms between sections,
//     900ms before the closing;
//   - TTS: fal.ai Chatterbox via the QUEUE API (reliable under fal's 503s);
//   - assembly: per-segment atempo=0.90 (pitch-preserving) + an anullsrc silence
//     of pauseBeforeMs before each segment, concat, then MP3 (Joel's recipe).

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import logger from './logger';

// ── spec constants (marcus-audio-v1) ────────────────────────────────────────
const PAUSE = { paragraph: 300, section: 600, closing: 900 } as const;
const TEMPO = '0.90';
const RATE = 44100;
const MAX_CHARS = 480;
const CONCURRENCY = 16;
const DEFAULT_VOICE =
  'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/08/audio/voices/marcus-voice-v2-10s-7475c804.wav';

const FAL_SUBMIT = 'https://queue.fal.run/fal-ai/chatterbox/text-to-speech';
const STORAGE_BUCKET = 'BE_Reading';
const STORAGE_PREFIX = '08-marcus/audio-reading';

// ── report shape (subset we narrate) ────────────────────────────────────────
export interface MarcusReportSection {
  positionNumber: number;
  cardName: string;
  positionLabel: string;
  body: string;
}
export interface MarcusReport {
  title?: string;
  theme?: string;
  opening: string;
  lifePathApplication?: string;
  personalCardHeading?: string;
  personalCardReading?: string;
  synthesis?: string;
  conclusion: string;
  sections?: MarcusReportSection[];
}

export interface AudioSegment {
  index: number;
  role: string;
  pauseBeforeMs: number;
  text: string;
}

const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── narration builder ───────────────────────────────────────────────────────
function flatten(s: string | undefined): string {
  return String(s || '')
    .replace(/^\s*Image:\s*/i, '')
    .replace(/[*_#`>]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitPieces(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const sentences = (text.match(/[^.!?]+[.!?]*/g) || [text]).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if (buf && (buf + ' ' + s).length > max) { out.push(buf.trim()); buf = s; }
    else buf = buf ? buf + ' ' + s : s;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export function buildNarration(report: MarcusReport): AudioSegment[] {
  const parts: Array<{ role: string; sectionPause: number; text: string }> = [];
  parts.push({ role: 'opening', sectionPause: 0, text: flatten(`${report.title ?? ''}. ${report.theme ?? ''}. ${report.opening}`) });
  if (report.lifePathApplication)
    parts.push({ role: 'numerology', sectionPause: PAUSE.section, text: flatten(`Your numerology foundation. ${report.lifePathApplication}`) });
  if (report.personalCardReading)
    parts.push({ role: 'personal-card', sectionPause: PAUSE.section, text: flatten(`${report.personalCardHeading ?? 'Your personal card.'} ${report.personalCardReading}`) });
  for (const s of report.sections ?? []) {
    const n = NUM[s.positionNumber] ?? String(s.positionNumber);
    // flatten the body first so a leading "Image:" is dropped even though the
    // spoken heading is prepended in front of it.
    parts.push({ role: `card-${s.positionNumber}`, sectionPause: PAUSE.section, text: flatten(`Position ${n}. ${s.cardName}: ${s.positionLabel}. ${flatten(s.body)}`) });
  }
  if (report.synthesis)
    parts.push({ role: 'synthesis', sectionPause: PAUSE.section, text: flatten(`How the reading comes together. ${report.synthesis}`) });
  parts.push({ role: 'closing', sectionPause: PAUSE.closing, text: flatten(`${report.conclusion} Marcus.`) });

  const segments: AudioSegment[] = [];
  for (const part of parts) {
    const pieces = splitPieces(part.text, MAX_CHARS);
    for (let i = 0; i < pieces.length; i++) {
      segments.push({
        index: segments.length + 1,
        role: part.role,
        pauseBeforeMs: i === 0 ? part.sectionPause : PAUSE.paragraph,
        text: pieces[i],
      });
    }
  }
  if (segments.length) segments[0].pauseBeforeMs = 0;
  return segments;
}

// ── fal.ai queue TTS ────────────────────────────────────────────────────────
function falKey(): string {
  const k = process.env.FAL_AI_API_KEY || process.env.FAL_KEY;
  if (!k) throw new Error('FAL_AI_API_KEY is not configured');
  return k;
}
async function falJson(url: string, init: RequestInit, tries = 6): Promise<any> {
  let last: unknown;
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(url, init);
      if (res.status >= 500 || res.status === 429) throw new Error(`fal ${res.status}`);
      if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return await res.json();
    } catch (e) { last = e; await sleep(3000 * (t + 1)); }
  }
  throw last;
}
async function synthSegment(seg: AudioSegment, voiceUrl: string): Promise<Buffer> {
  const headers = { Authorization: `Key ${falKey()}`, 'Content-Type': 'application/json' };
  const body = JSON.stringify({ text: seg.text, audio_url: voiceUrl, exaggeration: 0.25, temperature: 0.7, cfg: 0.5, seed: seg.index });
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const sub = await falJson(FAL_SUBMIT, { method: 'POST', headers, body });
      for (let p = 0; p < 120; p++) {
        const st = await falJson(sub.status_url, { headers });
        if (st.status === 'COMPLETED') {
          const out = await falJson(sub.response_url, { headers });
          const audioUrl: string | undefined = out?.audio?.url;
          if (!audioUrl) throw new Error('fal result had no audio url');
          const wav = await fetch(audioUrl);
          if (!wav.ok) throw new Error(`download ${wav.status}`);
          return Buffer.from(await wav.arrayBuffer());
        }
        await sleep(3000);
      }
      throw new Error('poll timeout');
    } catch (e) { if (attempt === 7) throw e; await sleep(4000 * (attempt + 1)); }
  }
  throw new Error('unreachable');
}
async function pool<T, R>(items: T[], conc: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, worker));
  return results;
}

// ── ffmpeg assembly (Joel's recipe) ─────────────────────────────────────────
function runFfmpeg(args: string[]): Promise<void> {
  const bin = ffmpegStatic as unknown as string;
  if (!bin) throw new Error('ffmpeg-static binary not found');
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.slice(-700)}`))));
  });
}
async function assemble(wavPaths: string[], segs: AudioSegment[], outMp3: string): Promise<void> {
  const fmt = `aformat=sample_fmts=s16:sample_rates=${RATE}:channel_layouts=mono`;
  const inputs: string[] = [];
  const filters: string[] = [];
  const order: string[] = [];
  wavPaths.forEach((w, i) => {
    inputs.push('-i', w);
    const pause = segs[i].pauseBeforeMs || 0;
    if (i > 0 && pause > 0) { filters.push(`anullsrc=r=${RATE}:cl=mono:d=${pause / 1000},${fmt}[p${i}]`); order.push(`[p${i}]`); }
    filters.push(`[${i}:a]atempo=${TEMPO},${fmt}[a${i}]`); order.push(`[a${i}]`);
  });
  filters.push(`${order.join('')}concat=n=${order.length}:v=0:a=1[out]`);
  await runFfmpeg(['-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-b:a', '192k', outMp3]);
}

// ── Supabase Storage upload (same REST PUT n8n uses for the PDF) ─────────────
function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+/, '');
  const withExt = /\.mp3$/i.test(base) ? base : `${base}.mp3`;
  if (!withExt || withExt === '.mp3') throw new Error('invalid fileName');
  return withExt;
}
async function uploadToSupabase(fileName: string, mp3: Buffer): Promise<string> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('SUPABASE_URL is not configured');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured (needed to upload)');
  const objectPath = `${STORAGE_PREFIX}/${fileName}`;
  const putUrl = `${url.replace(/\/$/, '')}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`;
  // Supabase Storage needs the key as an `apikey` header. The new-format
  // `sb_secret_…` keys are NOT JWTs, so Bearer-only fails with "Invalid Compact
  // JWS"; sending `apikey` (and Bearer, harmless for a JWT service_role key too)
  // works for both key formats.
  const res = await fetch(putUrl, {
    method: 'PUT',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' },
    body: mp3 as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`Supabase upload ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return `${url.replace(/\/$/, '')}/storage/v1/object/public/${STORAGE_BUCKET}/${objectPath}`;
}

// ── orchestrator ────────────────────────────────────────────────────────────
export interface GenerateAudioInput {
  report: MarcusReport;
  fileName: string;
  voiceUrl?: string;
}
export interface GenerateAudioResult {
  audioUrl: string;
  segmentCount: number;
  bytes: number;
  elapsedMs: number;
}

export async function generateMarcus08Audio(input: GenerateAudioInput): Promise<GenerateAudioResult> {
  const t0 = Date.now();
  const fileName = sanitizeFileName(input.fileName);
  const voiceUrl = input.voiceUrl || DEFAULT_VOICE;
  const segments = buildNarration(input.report);
  if (!segments.length) throw new Error('narration produced no segments');

  const tmp = mkdtempSync(join(tmpdir(), 'marcus08-audio-'));
  try {
    const wavPaths = await pool(segments, CONCURRENCY, async (seg, i) => {
      const buf = await synthSegment(seg, voiceUrl);
      const path = join(tmp, `seg-${String(i + 1).padStart(3, '0')}.wav`);
      writeFileSync(path, buf);
      return path;
    });
    const outMp3 = join(tmp, 'out.mp3');
    await assemble(wavPaths, segments, outMp3);
    const mp3 = readFileSync(outMp3);
    const audioUrl = await uploadToSupabase(fileName, mp3);
    const result = { audioUrl, segmentCount: segments.length, bytes: mp3.length, elapsedMs: Date.now() - t0 };
    logger.info('marcus08-audio: generated', { fileName, ...result, audioUrl: undefined });
    return result;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
