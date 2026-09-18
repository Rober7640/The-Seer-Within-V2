/**
 * LOCAL STAND-IN FOR REPLICATE — NOT A PROVIDER CLIENT.
 *
 * Loopback-only mock of the two Replicate endpoints the 08 Marcus fulfillment workflow calls, so the
 * audio branch (create prediction → poll → store segment → assemble) can be exercised end to end on
 * this machine without any Replicate account, token or network call. It never generates speech: every
 * "prediction" succeeds immediately and its `output` URL serves the same already-approved Chatterbox
 * Turbo sample (docs/08-marcus/n8n/assets/marcus-voice/tests/…s9g4pxdgh5rmy0d0kbyrd42rew.wav,
 * SHA-256 70986b34…). Used only by the local dry run; never deploy, never point production at it.
 *
 *   POST /v1/models/resemble-ai/chatterbox-turbo/predictions  -> 201 {id, status:'starting', …}
 *   GET  /v1/predictions/:id                                   -> 200 {id, status:'succeeded', output:<mock URL>}
 *   GET  /files/:id.wav                                        -> the approved sample (the "generated" segment)
 *   GET  /voice/marcus-voice-v2-10s.wav                        -> the 10-s reference clip (stands in for the signed URL)
 *
 * Any `Authorization: Bearer …` header is required (and logged, token redacted) purely to prove the
 * workflow's credential slot was replaced by a header; the value is never checked.
 * Binds 127.0.0.1:5090 by default (MOCK_REPLICATE_BIND / MOCK_REPLICATE_PORT to override for Docker).
 */
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BIND = process.env.MOCK_REPLICATE_BIND || '127.0.0.1';
const PORT = Number(process.env.MOCK_REPLICATE_PORT || 5090);
/** URL the fixture backend (on the host) will download `output` from. */
const PUBLIC_BASE = process.env.MOCK_REPLICATE_PUBLIC_BASE || `http://127.0.0.1:${PORT}`;
const ASSETS = new URL('../../docs/08-marcus/n8n/assets/marcus-voice/', import.meta.url);
const SAMPLE = readFileSync(fileURLToPath(new URL('tests/marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew.wav', ASSETS)));
const REFERENCE = readFileSync(fileURLToPath(new URL('reference/marcus-voice-v2-10s.wav', ASSETS)));
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const predictions = new Map<string, { id: string; input: unknown; created_at: string; polls: number }>();
const log = (line: Record<string, unknown>) => process.stdout.write(JSON.stringify({ t: new Date().toISOString(), ...line }) + '\n');

const server = createServer((req, res) => {
  const json = (status: number, data: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'mock'}`);
  const auth = String(req.headers.authorization ?? '');
  const chunks: Buffer[] = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    if (url.pathname.startsWith('/v1/') && !auth.startsWith('Bearer ')) { log({ path: url.pathname, status: 401 }); json(401, { detail: 'mock: Authorization: Bearer <token> header required' }); return; }
    if (req.method === 'POST' && url.pathname === '/v1/models/resemble-ai/chatterbox-turbo/predictions') {
      let parsed: any; try { parsed = JSON.parse(body); } catch { json(400, { detail: 'mock: invalid JSON' }); return; }
      const input = parsed?.input;
      if (!input || typeof input.text !== 'string' || !input.text || typeof input.reference_audio !== 'string') { log({ path: url.pathname, status: 422 }); json(422, { detail: 'mock: input.text and input.reference_audio required' }); return; }
      const id = 'mock' + randomBytes(11).toString('hex').slice(0, 22);
      const created_at = new Date().toISOString();
      predictions.set(id, { id, input, created_at, polls: 0 });
      log({ path: url.pathname, status: 201, id, textChars: input.text.length, seed: input.seed, reference_audio: input.reference_audio, auth: auth.slice(0, 7) + '…' });
      json(201, { id, model: 'resemble-ai/chatterbox-turbo', version: 'mock', input, status: 'starting', output: null, error: null, created_at, urls: { get: `${PUBLIC_BASE}/v1/predictions/${id}`, cancel: `${PUBLIC_BASE}/v1/predictions/${id}/cancel` } });
      return;
    }
    const get = url.pathname.match(/^\/v1\/predictions\/([A-Za-z0-9]+)$/);
    if (req.method === 'GET' && get) {
      const p = predictions.get(get[1]);
      if (!p) { log({ path: url.pathname, status: 404 }); json(404, { detail: 'mock: unknown prediction' }); return; }
      p.polls++;
      log({ path: url.pathname, status: 200, id: p.id, poll: p.polls, result: 'succeeded' });
      json(200, { id: p.id, model: 'resemble-ai/chatterbox-turbo', version: 'mock', input: p.input, status: 'succeeded', output: `${PUBLIC_BASE}/files/${p.id}.wav`, error: null, created_at: p.created_at, completed_at: new Date().toISOString(), metrics: { predict_time: 0 } });
      return;
    }
    const file = url.pathname.match(/^\/files\/([A-Za-z0-9]+)\.wav$/);
    if (req.method === 'GET' && file && predictions.has(file[1])) {
      log({ path: url.pathname, status: 200, bytes: SAMPLE.length, sha256: sha(SAMPLE) });
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': String(SAMPLE.length) }); res.end(SAMPLE); return;
    }
    if (req.method === 'GET' && url.pathname === '/voice/marcus-voice-v2-10s.wav') {
      log({ path: url.pathname, status: 200, bytes: REFERENCE.length, sha256: sha(REFERENCE) });
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': String(REFERENCE.length) }); res.end(REFERENCE); return;
    }
    log({ path: url.pathname, method: req.method, status: 404 });
    json(404, { detail: 'mock-replicate: no such route' });
  });
});
server.listen(PORT, BIND, () => process.stderr.write(`mock-replicate (LOCAL STAND-IN, no real provider) ${BIND}:${PORT}; sample sha256 ${sha(SAMPLE)}; reference sha256 ${sha(REFERENCE)}\n`));
