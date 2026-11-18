import { connectReadOnly, beginReads, parseTranscript, userText, PAID } from '/Users/joel/Library/CloudStorage/OneDrive-altius/Fun Projects/The-Seer-Within-V2-Production-joel-chue/The-Seer-Within-V2-Production/.claude/skills/v1-funnel-live-audit/scripts/lib/live-db.mjs';
const LANES = {
  manifest: /manifest|vision board|law of attraction|scripting|\bvibration|\baligned\b|attract(ed|ing)? (him|the wrong|the same|men)/i,
  pattern: /same (man|men|guy|guys|type|pattern|thing over)|\bpattern|always (end up|pick|choose|attract|the one)|childhood|little girl|when i was (little|young|a kid|a child)|my (dad|father) (left|never)|never (picks|chooses|choose|pick) me|just (a )?friends?\b|friend ?zone|go(ing)? quiet/i,
  family: /generational|runs in (my|the) family|women in my family|family curse|(my|our) family.{0,40}(curse|pattern|cycle|same)|(mom|mother|mum|grandmother|grandma|nana?|aunt)s?\b.{0,60}(same|too|also|never married|alone|pattern|cycle|curse)|break (the|this) cycle/i,
};
const { client } = await connectReadOnly({ live: true });
await beginReads(client, 120000);
const r = await client.query(`SELECT id, bucket, concern, deeper_response, block_source, emotional_response, ${PAID} AS paid, created_at
  FROM conversations WHERE created_at > now() - interval '365 days' AND bucket IN ('love','someone')
  AND concat_ws(' ', concern, deeper_response, block_source, emotional_response) ~* '(manifest|vision board|attraction|pattern|same (man|guy|type)|childhood|little girl|friends|friend ?zone|generational|family|mother|mom|mum|grandm|cycle|curse|always|never)'`);
await client.query('ROLLBACK'); await client.end();
const out = {};
for (const [k] of Object.entries(LANES)) out[k] = { all: 0, paid: 0, quotes: [] };
for (const row of r.rows) {
  const texts = [row.concern, row.deeper_response, row.block_source, row.emotional_response].filter(Boolean);
  for (const [k, re] of Object.entries(LANES)) {
    const hit = texts.find((t) => re.test(t));
    if (!hit) continue;
    out[k].all++; if (row.paid) out[k].paid++;
    out[k].quotes.push({ paid: row.paid, t: hit.replace(/\s+/g, ' ').slice(0, 260) });
  }
}
console.log('rows scanned', r.rowCount);
for (const [k, v] of Object.entries(out)) {
  console.log(`\n===== ${k}: ${v.all} convos, ${v.paid} paid`);
  const paid = v.quotes.filter((q) => q.paid), rest = v.quotes.filter((q) => !q.paid);
  const pick = [...paid.sort(() => Math.random() - .5).slice(0, 30), ...rest.sort(() => Math.random() - .5).slice(0, 15)];
  for (const q of pick) console.log(`${q.paid ? '$' : '-'} ${q.t}`);
}
