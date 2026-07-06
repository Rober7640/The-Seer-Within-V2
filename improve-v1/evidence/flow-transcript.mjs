// Full end-to-end transcript capture: ROOT (standard) vs FB-PALM (Version C).
// Scripted bot lines are verbatim from useConversation.ts / palmReads.ts.
// LLM beats hit the LIVE /api/chat. Same user answers in the shared deepening
// chain so the two are apples-to-apples. Emits two markdown transcripts + compare.
//
// Run: node flow-transcript.mjs   (dev server on :5000)

const BASE = 'http://localhost:5000';
const NAME = 'Sarah';
const EMAIL = 'sarah.flowtest@example.com';

// ── identical user answers used by BOTH flows in the shared deepening chain ──
const A = {
  concern: "I'm 34 and all my friends are married with kids. I feel like I already missed my one chance at real love.",
  deeper: "Yes... I've been on so many dates but nothing ever becomes something real.",
  future: "A partner who truly sees me. Building a home and a family together.",
  feel: "It would feel like I could finally breathe. Like I'm not broken after all.",
  source: "I don't know... maybe when my last relationship ended three years ago.",
  cost: "I'm not sure, it's so hard to put a price on it.", // non-positive → urgency beat fires
};

async function chat(payload) {
  const r = await fetch(`${BASE}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`${payload.action} → HTTP ${r.status}`);
  return r.json();
}

// transcript builder ---------------------------------------------------------
function makeLog() {
  const lines = [];
  let userTurns = 0, botMsgs = 0, llmCalls = 0;
  const questions = []; // the bot line that immediately precedes each user turn
  let lastBot = '';
  return {
    bot(msgs, { llm = false } = {}) {
      if (llm) llmCalls++;
      for (const m of msgs) { lines.push(`**Evelyn:** ${m}`); botMsgs++; lastBot = m; }
    },
    user(text, state) {
      userTurns++;
      questions.push({ n: userTurns, state, q: lastBot });
      lines.push(`\n> **👤 USER [turn ${userTurns} · ${state}]:** ${text}\n`);
    },
    tap(label, state) {
      userTurns++;
      questions.push({ n: userTurns, state, q: lastBot });
      lines.push(`\n> **👆 USER taps [turn ${userTurns} · ${state}]:** ${label}\n`);
    },
    done() { return { md: lines.join('\n'), userTurns, botMsgs, llmCalls, questions }; },
  };
}

// ── ROOT / standard love flow ───────────────────────────────────────────────
async function runRoot() {
  const L = makeLog();
  const ud = {};

  // GREETING (scripted)
  L.bot(['*Evelyn has joined the chat*']);
  L.bot(['Greetings, dear friend, and welcome.', 'My name is Evelyn Cross.', "I've been expecting you...",
    'Good evening. The veil is thin tonight...',
    "To open the connection between us, I need to know who I'm speaking with...", "What's your first name, dear?"]);
  L.user(NAME, 'NAME_CAPTURE'); ud.firstName = NAME;

  // NAME ACK (scripted) → bucket buttons
  L.bot([`It's lovely to meet you, ${NAME}.`, 'Everything we discuss stays between us... our secret.',
    "Now, what's weighing on your heart today, dear?"]);
  L.tap('💕 Love & Relationships', 'BUCKET_SELECTION'); ud.bucket = 'love';

  // BUCKET cold read (scripted) → email anchor
  L.bot([`I can feel warmth radiating from your heart, ${NAME}...`, "But there's a flicker of shadow there too..."]);
  L.bot(['Before I look deeper, I need to anchor our connection...', 'Sometimes the visions continue after we speak...',
    'Where should I send them if more is revealed?']);
  L.user(EMAIL, 'EMAIL_CAPTURE'); ud.email = EMAIL;

  // EMAIL ACK (scripted) → DEEPENING_1
  L.bot([`Thank you, ${NAME}. The link is complete.`, "Now, tell me more about what's on your mind...",
    "Your thoughts, your feelings... I'm listening."]);
  L.user(A.concern, 'DEEPENING_1'); ud.concern = A.concern;

  // reading1 (LLM) → DEEPENING_2
  let r = await chat({ action: 'reading1', userData: ud, input: A.concern });
  if (r.subBucket) ud.subBucket = r.subBucket;
  L.bot(r.messages, { llm: true });
  L.user(A.deeper, 'DEEPENING_2'); ud.deeperResponse = A.deeper;

  // reading2 (LLM) → FUTURE_PACING
  r = await chat({ action: 'reading2', userData: ud, input: A.deeper });
  L.bot(r.messages, { llm: true });
  L.user(A.future, 'FUTURE_PACING'); ud.desires = A.future;

  // futureValidation (LLM) → FUTURE_VALIDATION
  r = await chat({ action: 'futureValidation', userData: ud, input: A.future });
  L.bot(r.messages, { llm: true });
  L.user(A.feel, 'FUTURE_VALIDATION'); ud.emotionalResponse = A.feel;

  // crisisReveal (LLM) → CRISIS_REVEAL
  r = await chat({ action: 'crisisReveal', userData: ud, input: A.feel });
  L.bot(r.messages, { llm: true });
  L.user(A.source, 'CRISIS_REVEAL'); ud.blockSource = A.source;

  // crisisCost (LLM) → CRISIS_COST
  r = await chat({ action: 'crisisCost', userData: ud, input: A.source });
  L.bot(r.messages, { llm: true });
  L.user(A.cost, 'CRISIS_COST'); ud.commitmentResponse = A.cost;

  // crisisUrgency (LLM, non-positive) → PERMISSION
  r = await chat({ action: 'crisisUrgency', userData: ud, input: A.cost });
  L.bot(r.messages, { llm: true });
  L.tap('✨ Yes, please help me Evelyn!', 'PERMISSION_ASK');
  L.bot(['*(→ PITCH: $35 Energy Clearing Ritual)*']);
  return L.done();
}

// ── FB-PALM Version C flow (thumb / a "gathering heart" / soulmate-timing) ───
async function runPalm() {
  const L = makeLog();
  const ud = {}; // NOTE: firstName not set until AFTER palmReflect
  const palm = { palmSign: 'thumb', palmHook: 'soulmate-timing', palmThumb: 'a' };

  // GREETING → openerCStart (scripted: mark line + the open question)
  L.bot(['*Evelyn has joined the chat*']);
  L.bot([
    'A trident — three lines converging into one. The gathering heart.',
    "Before I look closer, tell me… what's making the waiting feel so heavy right now?",
  ]);
  L.user(A.concern, 'PALM_REFLECT'); ud.concern = A.concern;

  // palmReflect (LLM) — the ONLY palm-aware beat
  let r = await chat({ action: 'palmReflect', ...palm, userData: ud, input: A.concern });
  L.bot(r.messages, { llm: true });
  L.bot(['Before we go deeper, tell me… what should I call you, dear?']);
  L.user(NAME, 'NAME_CAPTURE'); ud.firstName = NAME; ud.bucket = 'love';

  // PALM name-ack (scripted, palm branch) → email anchor
  L.bot([`It's lovely to meet you, ${NAME}.`, 'Everything we discuss stays between us... our secret.',
    `I can feel warmth radiating from your heart, ${NAME}...`, "But there's a flicker of shadow there too..."]);
  L.bot(['Before I look deeper, I need to anchor our connection...', 'Sometimes the visions continue after we speak...',
    'Where should I send them if more is revealed?']);
  L.user(EMAIL, 'EMAIL_CAPTURE'); ud.email = EMAIL;

  // EMAIL ACK (scripted) → DEEPENING_1  (asks for the concern AGAIN)
  L.bot([`Thank you, ${NAME}. The link is complete.`, "Now, tell me more about what's on your mind...",
    "Your thoughts, your feelings... I'm listening."]);
  L.user(A.concern, 'DEEPENING_1'); ud.concern = A.concern;

  // reading1 (LLM, NO palm params) → identical chain to root
  r = await chat({ action: 'reading1', userData: ud, input: A.concern });
  if (r.subBucket) ud.subBucket = r.subBucket;
  L.bot(r.messages, { llm: true });
  L.user(A.deeper, 'DEEPENING_2'); ud.deeperResponse = A.deeper;

  r = await chat({ action: 'reading2', userData: ud, input: A.deeper });
  L.bot(r.messages, { llm: true });
  L.user(A.future, 'FUTURE_PACING'); ud.desires = A.future;

  r = await chat({ action: 'futureValidation', userData: ud, input: A.future });
  L.bot(r.messages, { llm: true });
  L.user(A.feel, 'FUTURE_VALIDATION'); ud.emotionalResponse = A.feel;

  r = await chat({ action: 'crisisReveal', userData: ud, input: A.feel });
  L.bot(r.messages, { llm: true });
  L.user(A.source, 'CRISIS_REVEAL'); ud.blockSource = A.source;

  r = await chat({ action: 'crisisCost', userData: ud, input: A.source });
  L.bot(r.messages, { llm: true });
  L.user(A.cost, 'CRISIS_COST'); ud.commitmentResponse = A.cost;

  r = await chat({ action: 'crisisUrgency', userData: ud, input: A.cost });
  L.bot(r.messages, { llm: true });
  L.tap('✨ Yes, please help me Evelyn!', 'PERMISSION_ASK');
  L.bot(['*(→ PITCH: $35 Energy Clearing Ritual)*']);
  return L.done();
}

function transcriptMd(title, note, res) {
  return `# ${title}\n\n${note}\n\n**Totals:** ${res.userTurns} user turns · ${res.botMsgs} bot messages · ${res.llmCalls} live LLM calls\n\n---\n\n${res.md}\n\n---\n\n## Questions the funnel asked the user (in order)\n\n${res.questions.map((q) => `${q.n}. **[${q.state}]** ${q.q}`).join('\n')}\n`;
}

async function main() {
  const root = await runRoot();
  const palm = await runPalm();

  const fs = await import('node:fs');
  const dir = process.argv[2] || '.';
  fs.writeFileSync(`${dir}/transcript-root.md`, transcriptMd(
    'ROOT funnel — full transcript (standard love flow)',
    'Entry: `/` → LandingPage → `/chat`. Bucket chosen by the user (tap). All bot lines verbatim from code; readings are live LLM.',
    root));
  fs.writeFileSync(`${dir}/transcript-fb-palm.md`, transcriptMd(
    'FB-PALM funnel — full transcript (Version C, thumb/a "gathering heart", soulmate-timing)',
    'Entry: `/fb-palm/c?hook=soulmate-timing&thumb=a` → PalmBridge → `/fb-palm/chat`. Bucket auto-forced to `love`. Palm context reaches ONLY `palmReflect`.',
    palm));

  // console comparison
  const line = '─'.repeat(70);
  console.log(line);
  console.log('FLOW COMPARISON — ROOT vs FB-PALM (Version C)');
  console.log(line);
  console.log(`                        ROOT      FB-PALM`);
  console.log(`user turns (to pitch)   ${String(root.userTurns).padEnd(9)} ${palm.userTurns}`);
  console.log(`bot messages            ${String(root.botMsgs).padEnd(9)} ${palm.botMsgs}`);
  console.log(`live LLM calls          ${String(root.llmCalls).padEnd(9)} ${palm.llmCalls}`);
  console.log(line);
  console.log('Wrote transcript-root.md and transcript-fb-palm.md');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
