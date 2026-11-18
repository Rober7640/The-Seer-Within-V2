import { connectReadOnly, beginReads, PAID } from '/Users/joel/Library/CloudStorage/OneDrive-altius/Fun Projects/The-Seer-Within-V2-Production-joel-chue/The-Seer-Within-V2-Production/.claude/skills/v1-funnel-live-audit/scripts/lib/live-db.mjs';
const TERMS = {
  'astrology/astrologer': /astrolog/i, horoscope: /horoscope/i, zodiac: /zodiac/i,
  'birth/natal chart': /birth ?chart|natal|\b(my|his|her|our) chart/i, retrograde: /retrograde/i, mercury: /\bmercury\b/i,
  venus: /\bvenus\b/i, saturn: /\bsaturn\b/i, 'saturn return': /saturn return/i,
  'sign (star/sun/moon/his/my)': /\b(star|sun|moon|zodiac|his|my|her|our) signs?\b/i, 'sign names': /\b(aries|taurus|gemini|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\b/i,
  compatible: /compatib/i, synastry: /synastry/i, 'karma/karmic': /karm/i, 'the stars': /\bthe stars\b|stars align|written in the stars/i,
  'north node': /north node/i, 'full/new moon': /full moon|new moon/i, 'the universe': /the universe/i,
  'twin flame': /twin flame/i, soulmate: /soul ?mate/i, 'fate/destiny/meant to be': /\bfate|destin|meant to be/i, 'timing': /\btiming\b|right time/i,
};
const ASTRO = ['astrology/astrologer','horoscope','zodiac','birth/natal chart','retrograde','mercury','venus','saturn','saturn return','sign (star/sun/moon/his/my)','sign names','compatible','synastry','the stars','north node','full/new moon'];
const { client } = await connectReadOnly({ live: true });
await beginReads(client, 120000);
const r = await client.query(`SELECT concern, deeper_response, block_source, emotional_response, ${PAID} AS paid
  FROM conversations WHERE created_at > now() - interval '365 days' AND bucket IN ('love','someone')
  AND concat_ws(' ', concern, deeper_response, block_source, emotional_response) ~* '(astrolog|horoscope|zodiac|chart|natal|retrograde|mercury|venus|saturn|sign|compatib|synastry|karm|the stars|stars align|north node|full moon|new moon|universe|twin flame|soul ?mate|fate|destin|meant to be|timing|right time|aries|taurus|gemini|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)'`);
const tot = await client.query(`SELECT count(*)::int n, count(*) FILTER (WHERE ${PAID})::int p FROM conversations WHERE created_at > now() - interval '365 days' AND bucket IN ('love','someone')`);
await client.query('ROLLBACK'); await client.end();
console.log(`base: ${tot.rows[0].n} love/someone convos, ${tot.rows[0].p} paid (${(100*tot.rows[0].p/tot.rows[0].n).toFixed(1)}%)`);
const txt = row => [row.concern, row.deeper_response, row.block_source, row.emotional_response].filter(Boolean).join(' | ');
console.log('\nterm | convos | paid | paid%');
for (const [k, re] of Object.entries(TERMS)) {
  const hit = r.rows.filter(row => re.test(txt(row))); const p = hit.filter(x => x.paid).length;
  console.log(`${k} | ${hit.length} | ${p} | ${hit.length ? (100*p/hit.length).toFixed(1) : '-'}%`);
}
const anyAstro = r.rows.filter(row => ASTRO.some(k => TERMS[k].test(txt(row))));
console.log(`\nany astrology-specific term: ${anyAstro.length} convos, ${anyAstro.filter(x=>x.paid).length} paid`);
const seen = new Set(); const qs = [];
for (const row of anyAstro) for (const t of [row.concern, row.deeper_response, row.block_source, row.emotional_response]) {
  if (!t) continue; const s = t.replace(/\s+/g,' ').trim();
  if (s.length < 20 || s.length > 200 || seen.has(s) || !ASTRO.some(k => TERMS[k].test(s))) continue;
  if (/\bsigns? (of|from|that)\b/i.test(s) && !/(star|sun|moon|zodiac) sign/i.test(s)) continue;
  seen.add(s); qs.push({ paid: row.paid, s });
}
const pick = [...qs.filter(q=>q.paid).sort(()=>Math.random()-.5), ...qs.filter(q=>!q.paid).sort(()=>Math.random()-.5)].slice(0, 60);
console.log(`\n${qs.length} astrology lines; showing ${pick.length} ($ = paid)`);
for (const q of pick) console.log(`${q.paid ? '$' : '-'} ${q.s}`);
