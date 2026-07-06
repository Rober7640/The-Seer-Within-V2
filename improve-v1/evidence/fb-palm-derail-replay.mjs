// fb-palm derailment replay — drives a real Version-C /fb-palm conversation
// through the LIVE /api/chat and captures where the palm identity survives vs dies.
//
// Scenario: sign=thumb, option=a (trident → "the gathering heart"), hook=soulmate-timing.
// This is the archetype the visitor bonds with on the lander + opener.
//
// Run: node fb-palm-derail-replay.mjs   (dev server must be on :5000)

const BASE = 'http://localhost:5000';
const firstName = 'Sarah';

// What the visitor JUST experienced on the lander + Version-C opener (from palmReads.ts):
const REFERENCE = {
  mark: 'a trident, three lines rising to one',
  reading: 'the gathering heart',
  headline: 'When is my soulmate coming?',
  openerQuestion:
    "Before I look closer, tell me… what's making the waiting feel so heavy right now?",
};

// Her typed answer to the Version-C opener question:
const concern =
  "I'm 34 and every friend I have is married with kids. I keep feeling like I already " +
  "missed my one chance and I'm just going to end up alone.";

// Palm signal tokens — if the palm identity carried through, later messages would echo these.
const PALM_TOKENS = [
  'thumb', 'trident', 'gathering', 'palm', 'sign', 'mark', 'three lines', 'converging',
];

function scan(messages) {
  const text = messages.join(' ').toLowerCase();
  const hits = PALM_TOKENS.filter((t) => text.includes(t));
  return hits;
}

async function chat(payload) {
  const r = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`${payload.action} → HTTP ${r.status}`);
  return r.json();
}

function print(label, messages, extra = '') {
  const hits = scan(messages);
  console.log(`\n${'─'.repeat(78)}`);
  console.log(`▶ ${label}${extra}`);
  console.log(`  palm-signal tokens present: ${hits.length ? hits.join(', ') : '— NONE —'}`);
  console.log('─'.repeat(78));
  messages.forEach((m) => console.log(`   Evelyn: ${m}`));
}

async function main() {
  console.log('═'.repeat(78));
  console.log('FB-PALM DERAILMENT REPLAY — Version C, thumb/a "gathering heart", soulmate-timing');
  console.log('═'.repeat(78));
  console.log(`\nWHAT THE VISITOR JUST BONDED WITH (lander + opener):`);
  console.log(`   Ad question : "${REFERENCE.headline}"`);
  console.log(`   Their mark  : ${REFERENCE.mark}`);
  console.log(`   Their id    : "${REFERENCE.reading}"`);
  console.log(`   Opener Q    : "${REFERENCE.openerQuestion}"`);
  console.log(`   Her answer  : "${concern}"`);

  // userData as it exists AFTER palm name-capture: bucket forced to 'love', concern = her answer.
  // NOTE: no palmSign / palmHook / palmThumb — the reading actions never receive them.
  const userData = { firstName, bucket: 'love', concern };

  // ── Beat 1: palmReflect — the ONE place palm context is injected (LLM) ──
  const reflect = await chat({
    action: 'palmReflect',
    palmSign: 'thumb', palmHook: 'soulmate-timing', palmThumb: 'a',
    input: concern,
    userData,
  });
  print('palmReflect  [palm params ARE passed]', reflect.messages);

  // ── Beat 2+: the standard V1 deepening — palm params NOT passed ──
  const reading1 = await chat({ action: 'reading1', userData, input: concern });
  if (reading1.subBucket) userData.subBucket = reading1.subBucket;
  print('reading1     [no palm params]', reading1.messages,
    reading1.subBucket ? `  (subBucket=${reading1.subBucket})` : '');

  const reading2 = await chat({ action: 'reading2', userData, input: 'yes, that resonates' });
  print('reading2     [no palm params]', reading2.messages);

  const crisis = await chat({ action: 'crisisReveal', userData, input: 'a deep partnership, to feel truly seen' });
  print('crisisReveal [no palm params]', crisis.messages);

  // ── CONTROL: a plain /love-bucket user with the SAME concern, NO palm at all ──
  console.log(`\n\n${'#'.repeat(78)}`);
  console.log('# CONTROL — identical concern, plain love bucket, NEVER touched fb-palm');
  console.log('# If palm added lasting personalization, these should look DIFFERENT.');
  console.log('#'.repeat(78));
  const ctrlUser = { firstName, bucket: 'love', concern };
  const cReading1 = await chat({ action: 'reading1', userData: ctrlUser, input: concern });
  if (cReading1.subBucket) ctrlUser.subBucket = cReading1.subBucket;
  print('CONTROL reading1', cReading1.messages,
    cReading1.subBucket ? `  (subBucket=${cReading1.subBucket})` : '');
  const cCrisis = await chat({ action: 'crisisReveal', userData: ctrlUser, input: 'a deep partnership, to feel truly seen' });
  print('CONTROL crisisReveal', cCrisis.messages);

  console.log(`\n${'═'.repeat(78)}`);
  console.log('VERDICT: compare palm-signal tokens — present at palmReflect, gone after.');
  console.log('Compare the palm reading1/crisis vs CONTROL reading1/crisis: ~indistinguishable');
  console.log('= the "gathering heart / thumb" identity evaporates → generic love reading.');
  console.log('═'.repeat(78));
}

main().catch((e) => { console.error('REPLAY ERROR:', e.message); process.exit(1); });
