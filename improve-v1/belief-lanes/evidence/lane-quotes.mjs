import { connectReadOnly, beginReads, PAID } from '/Users/joel/Library/CloudStorage/OneDrive-altius/Fun Projects/The-Seer-Within-V2-Production-joel-chue/The-Seer-Within-V2-Production/.claude/skills/v1-funnel-live-audit/scripts/lib/live-db.mjs';
const LANES = {
  manifest: [/manifest|vision board|law of attraction|scripting|\bvibration|\baligned\b|\battract/i, /\b(I|I'm|I've|my)\b/],
  pattern: [/same (man|men|guy|type|pattern|thing)|\bpattern|always (end up|pick|choose|attract|the one|giving)|never (picks|chooses|choose|pick) me|go(ing)? quiet|(childhood|little girl|when i was (little|young|small))/i, /\b(I|I'm|I've|my)\b/],
  family: [/(mother|mom|mum|grandmother|grandma|nana?)\b|women in my family|family line|generation|runs in (my|the) family|break (the|this) cycle/i, /(same|too|also|pattern|cycle|never|alone|repeat|like (her|my))/i],
};
const { client } = await connectReadOnly({ live: true });
await beginReads(client, 120000);
const r = await client.query(`SELECT concern, deeper_response, block_source, emotional_response, ${PAID} AS paid
  FROM conversations WHERE created_at > now() - interval '365 days' AND bucket IN ('love','someone')
  AND concat_ws(' ', concern, deeper_response, block_source, emotional_response) ~* '(manifest|vision board|attract|aligned|vibration|pattern|same (man|guy|type)|always|never|childhood|little|mother|mom|mum|grandm|generation|cycle)'`);
await client.query('ROLLBACK'); await client.end();
const seen = new Set();
for (const [k, [re, re2]] of Object.entries(LANES)) {
  const qs = [];
  for (const row of r.rows) for (const t of [row.concern, row.deeper_response, row.block_source, row.emotional_response]) {
    if (!t) continue; const s = t.replace(/\s+/g, ' ').trim();
    if (s.length < 25 || s.length > 170 || !re.test(s) || !re2.test(s) || seen.has(s)) continue;
    seen.add(s); qs.push({ paid: row.paid, s });
  }
  const paid = qs.filter(q => q.paid), rest = qs.filter(q => !q.paid);
  const cap = k === 'manifest' ? 70 : 45;
  const pick = [...paid.sort(() => Math.random() - .5), ...rest.sort(() => Math.random() - .5)].slice(0, cap);
  console.log(`\n===== ${k}: ${qs.length} short first-person answers (${paid.length} paid); showing ${pick.length}`);
  for (const q of pick) console.log(`${q.paid ? '$' : '-'} ${q.s}`);
}
