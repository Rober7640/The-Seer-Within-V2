/**
 * ⛔ The page a buyer gets carries ONLY the engine's numbers.
 *
 *   node scripts/check-12-html.mjs
 *
 * For Testina (hand-written acts, bump bought, arm B) and Faketta (filler acts, no bump, arm A):
 *   - every data-* number on the page equals a FRESH engine run on the fixture input, worked out
 *     here and not read back from the flow;
 *   - every numeral in the visible text is on an allow-list built from that engine output;
 *   - no jackpot, guarantee or "winning numbers", and arm B never says miracle;
 *   - the bump page is there only when bought, and is last; the keep page has no PIN.
 */
import { engine, fixture, loadWf, FAKETTA, START, execute, fakeOpenAI, handRun, report } from './lib-12.mjs';

const runOf = (which) => {
  if (which === 'testina') return handRun().last('10 ·');
  const fake = fakeOpenAI();
  return execute(loadWf(FAKETTA), { start: START, http: fake.http }).last('10 ·');
};

const attr = (h, a) => [...h.matchAll(new RegExp(`${a}="([^"]*)"`, 'g'))].map((m) => m[1]);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const visible = (h) => h.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/g, (svg) => ` ${svg.replace(/<[^>]+>/g, ' ')} `).replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z#0-9]+;/gi, ' ');

/** Every number the engine handed over, in every form the page writes it. */
function allowFrom(ref) {
  const ok = new Set();
  const add = (n) => { if (Number.isFinite(n)) ok.add(n); };
  const walk = (v) => {
    if (typeof v === 'number') add(v);
    else if (typeof v === 'string') (v.match(/\d+/g) || []).forEach((x) => add(Number(x)));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(ref);
  ref.luckyHours.slots.forEach((s) => { const h = Number(s.time.slice(0, 2)); add(h > 12 ? h - 12 : h); });
  return ok;
}

const rows = (which) => {
  const f = fixture(which), ref = engine(f.input), t = runOf(which), h = t.html, text = visible(h);
  const allow = allowFrom(ref);
  const strays = [...new Set((text.match(/\d[\d,]*/g) || []).map((x) => Number(x.replace(/,/g, ''))).filter((n) => !allow.has(n)))];
  const fy = ref.fullYear.months.flatMap((m) => m.days);
  const k0 = h.indexOf('<div class="keep">'), k1 = [h.indexOf('class="colophon"', k0), h.indexOf('<div class="bump', k0)].filter((i) => i > k0);
  const keep = k0 < 0 ? '' : h.slice(k0, k1.length ? Math.min(...k1) : undefined);
  const lastBlock = h.lastIndexOf('class="bump');
  return [`${which.toUpperCase()} · arm ${t.arm} · bump ${t.bump ? 'yes' : 'no'}`, [
    ['the flow ran the same engine: its numbers equal a fresh run on the fixture', () => same(t.lucky, ref)],
    ['the fresh run still equals the saved fixture', () => same(ref, f.output)],
    ['three number panels carry n1, n2, n3', () => ({ ok: same(attr(h, 'data-value'), [ref.numbers.n1.value, ref.numbers.n2.value, ref.numbers.n3.value].map(String)), note: attr(h, 'data-value').join(' ') })],
    ['families printed are the engine\'s', () => { const got = [...h.matchAll(/<span data-family="(\d+)">(\d+)<\/span>/g)].map((m) => [Number(m[1]), Number(m[2])]);
      const want = [...new Set([ref.numbers.n1.value, ref.numbers.n2.value, ref.numbers.n3.value])].flatMap((n) => ref.tickets.families[n].map((x) => [n, x]));
      return { ok: same(got, want), note: `${got.length} chips` }; }],
    ['six balls = engine tickets', () => ({ ok: same(attr(h, 'data-ticket').map(Number), ref.tickets.list), note: attr(h, 'data-ticket').join(' ') })],
    ['PIN tiles = engine PIN', () => ({ ok: attr(h, 'data-pin-digit').join('') === ref.pin.value, note: attr(h, 'data-pin-digit').join('') })],
    ['stop number = engine stop number', () => same(attr(h, 'data-stop').map(Number), [ref.stopNumber.value])],
    ['twelve month badges = engine open days, in order', () => same(attr(h, 'data-open-date'), ref.openDays.map((o) => o.date))],
    ['each badge\'s day number = engine pd', () => same(attr(h, 'data-pd').map(Number), ref.openDays.map((o) => o.pd))],
    ['calendar cover rings exactly her twelve days', () => { const ring = [...h.matchAll(/<circle class="open" data-date="([^"]+)"/g)].map((m) => m[1]);
      return { ok: same(ring.slice(0, 12), ref.openDays.map((o) => o.date)), note: `${ring.length} rings` }; }],
    ['hour chips = engine slots', () => same(attr(h, 'data-hour'), ref.luckyHours.slots.map((s) => s.time))],
    ['interview weekday stand-ins are engine match days, Monday to Friday', () => { const fyMap = new Map(fy.map((d) => [d.date, d]));
      const w = attr(h, 'data-weekday-date');
      return { ok: w.every((d) => fyMap.get(d)?.match && !/Saturday|Sunday/.test(fyMap.get(d).weekday)), note: `${w.length} stand-ins` }; }],
    ['every numeral on the page is one the engine handed over', () => ({ ok: !strays.length, note: strays.length ? `strays ${strays.join(', ')}` : `${allow.size} allowed` })],
    ['name and birth date are on the first page', () => { const cover = h.slice(0, h.indexOf('id="n1"'));
      return cover.includes(f.input.birthName) && /1968|1975/.test(cover) && cover.includes(String(Number(f.input.birthDate.slice(8, 10)))); }],
    ['no jackpot, guarantee or winning numbers anywhere', () => !/jackpot|guarantee|winning numbers|sure to win/i.test(text)],
    ['arm B never says miracle', () => t.arm !== 'B' || !/miracle/i.test(text)],
    ['the colophon says no win is promised', () => /Nothing here promises a win/.test(text)],
    ['the keep page has no PIN', () => ({ ok: keep.length > 0 && !keep.includes(ref.pin.value), note: `${keep.length} chars` })],
    [t.bump ? 'the Full Year page is there, last, and lists the engine\'s days' : 'no Full Year page when the bump was not bought', () => {
      if (!t.bump) return !/The Full Year/.test(h);
      const days = attr(h, 'data-full-date');
      return { ok: lastBlock > h.indexOf('class="keep"') && same(days, fy.map((d) => d.date)) && days.length === ref.fullYear.count, note: `${days.length} days` }; }],
  ]];
};

const bad = report('12 · the page carries only the engine\'s numbers', [rows('testina'), rows('faketta')]);
process.exit(bad ? 1 : 0);
