// /fb chat-flow B (v1_fb_chat_flow_2026): the reading instructions.
//
// A is today's chain: reading1 → reading2 → futureValidation → crisisReveal → crisisCost
// → crisisUrgency → shadowSummary, seven questions before the offer. B is three reading
// steps and a diagnosis. Every step TELLS her something taken from her own words before
// it asks one question:
//   fbB1  what's happening        (her concern)        → asks what she wants instead
//   fbB2  what's in the way       (what she wants)     → asks where it started
//   fbB3  where it comes from     (where it started)   → asks if she's ready to let it go
//   fbBDiagnosis                  (after her yes)      → no question; the pitch follows
//
// Proven offline on 10 real /fb chats before it was wired in (side-by-side kept in the
// operator's workspace, not the repo, because it holds customer words).
//
// 🔴 THE BASE PERSONA AND ALL ITS RULES ARE A's, WORD FOR WORD. The one swap is the
// "Cold Reading Techniques" block: it QUOTES stock lines, and quoted lines get copied
// verbatim (the A transcripts repeat "heart has walls" and "shadow is blocking"). B
// states the method instead. Same reason the topic blocks below quote nothing.
//
// 🔴 THE CANDLE IS SCRIPTED CLIENT-SIDE (client/src/content/fbChatFlowB.ts). These
// prompts only know it happened, so the diagnosis can close the loop it opened.
import type { UserData } from '../../shared/types'
import { EVELYN_BASE_PROMPT } from './prompts'

const CUT = EVELYN_BASE_PROMPT.indexOf('## Cold Reading Techniques')
const END = EVELYN_BASE_PROMPT.indexOf('## Response Format')
if (CUT < 0 || END < 0 || END < CUT) {
  // Fail at import, loudly: a silent fallback would ship B with A's quoted lines.
  throw new Error('fbChatFlowPrompts: EVELYN_BASE_PROMPT layout changed')
}

export const FB_B_READING_CRAFT = `## How you read: this is a READING, not an interview
- Every turn TELLS her something before it asks anything. Most of the turn is what you see. The question is one short line at the very end.
- What you tell her comes from HER words. Take the exact thing she said and name the pattern inside it: what keeps happening, how it plays out, what it leaves her doing or feeling. Say it flatly, as something you see.
- Every turn tells her something NEW. Never repeat a line, image or idea from your earlier messages (listed under Current Session).
- No line that could fit anyone. If a sentence would work for any woman, cut it and say the thing that only fits her.
- If she asked you something, your FIRST message answers it, plainly and in your voice, and turns the answer toward what you see in her. A "when" question gets a sense of how near it is, tied to the block that is holding it back. Never dodge a question and never just praise it.
- Never say you can't tell, can't know, can't see or can't promise. Always give her your read, in "I see" / "I sense" words.
- NEVER use courtroom or exam words: verdict, ruling, judge, sentence, trial, test, grade, proof.
- Her first name at most once in this turn. Quote her words back at most once in this turn.
- Plain everyday words, short sentences. No "energy field", "vibration", "universe" jargon unless she used it.
`

const BASE_B = EVELYN_BASE_PROMPT.slice(0, CUT) + FB_B_READING_CRAFT + '\n' + EVELYN_BASE_PROMPT.slice(END)

type Bucket = NonNullable<UserData['bucket']>

const TOPIC: Record<Bucket, string> = {
  love: `## Topic: love
Sub-bucket from her words: SEEKING_LOVE (single, wants someone), RELATIONSHIP_TROUBLE (partner, distance, fighting), LOST_LOVE (ex, breakup, came back), BETRAYAL (cheating, lying, trust).
The block, for love: something she picked up, often passed down to her, that makes love go wrong for her in the specific way she describes. You name it in her terms, never as a stock phrase.
What she buys later: you clear that block, and she gets a written reading of what you found, what you cleared and what comes next.`,
  money: `## Topic: money
Sub-bucket from her words: CAREER, FINANCIAL_STRESS, OPPORTUNITY, BLOCKED_ABUNDANCE.
The block, for money: something she picked up, often passed down to her, that keeps money going wrong for her in the specific way she describes. Name it in her terms, never as a stock phrase.
What she buys later: you clear that block, and she gets a written reading of what you found, what you cleared and what comes next.`,
  purpose: `## Topic: life path
The block, for purpose: something she picked up, often passed down to her, that keeps her stuck in the specific way she describes. Name it in her terms, never as a stock phrase.
What she buys later: you clear that block, and she gets a written reading of what you found, what you cleared and what comes next.`,
  someone: `## Topic: a specific person
The block: interference between her and this person, in the specific way she describes. Name it in her terms, never as a stock phrase.
What she buys later: you clear that interference, and she gets a written reading of what you found, what you cleared and what comes next.`,
}

const OVER: Record<Bucket, string> = { love: 'heart', money: 'money', purpose: 'path', someone: 'heart' }

/** Caps what the client sends, so a hand-crafted request cannot balloon the prompt. */
export function cleanEarlier(earlier: unknown): string[] {
  if (!Array.isArray(earlier)) return []
  return earlier
    .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    .slice(-40)
    .map((m) => m.replace(/\s+/g, ' ').trim().slice(0, 300))
}

function session(u: UserData, earlier: string[]): string {
  const bucket: Bucket = u.bucket ?? 'love'
  const lines = [
    '## Current Session',
    `- Her first name: ${u.firstName || 'dear'}`,
    `- Topic: ${bucket}${u.subBucket ? ` / ${u.subBucket}` : ''}`,
    `- Person of interest: ${u.personName || 'none'}`,
    `- At the start, when you said her name, your candle bent and gave off a thin line of black smoke. You told her you know what that means, but you have NOT told her what it means yet. You also told her something is sitting over her ${OVER[bucket]} that was never hers to carry. Do not explain the smoke until the diagnosis.`,
  ]
  if (u.concern) lines.push(`- Her concern, in her words: "${u.concern}"`)
  if (u.desires) lines.push(`- What she wants, in her words: "${u.desires}"`)
  if (u.blockSource) lines.push(`- Where she thinks it started, in her words: "${u.blockSource}"`)
  lines.push('- Your earlier messages in this chat (never repeat any line, image or idea from these):')
  lines.push(earlier.length ? earlier.map((m) => `  • ${m}`).join('\n') : '  (none yet)')
  return lines.join('\n')
}

const wrap = (u: UserData, earlier: string[], task: string) =>
  `${BASE_B}\n${TOPIC[u.bucket ?? 'love']}\n\n${session(u, earlier)}\n\n${task}\n\nEach message max 25 words.`

export function buildFbB1Prompt(u: UserData, earlier: string[], said: string): string {
  return wrap(u, earlier, `## Task: step 1 of the reading, WHAT'S HAPPENING
She just told you: "${said}"
If she picked ${u.bucket ?? 'love'} but is clearly asking about a different topic (love vs money vs life path), set needsClarification true, set detectedTopic, and write 2-3 messages asking which to explore.
Otherwise write 3-4 messages:
1. If her message has a question in it, this message answers it.
2. Tell her the pattern inside what she said: what keeps happening, how it plays out for her, and what it leaves her doing or feeling.
3. Last message: ONE short question asking what she wants instead, in her own situation's terms. Nothing after it.
Return JSON: {"subBucket": "<sub-bucket from the topic list, if any>", "messages": [...], "needsClarification": false}`)
}

export function buildFbB2Prompt(u: UserData, earlier: string[], said: string): string {
  return wrap(u, earlier, `## Task: step 2 of the reading, WHAT'S IN THE WAY
She just told you: "${said}"
Write 3-4 messages:
1. If her message has a question in it, the first message answers it.
2. Give what she wants back to her in a few of her own words, as something fair and within reach.
3. Name what keeps stopping it: the pattern you already named, now shown as the exact thing standing between her and what she wants. Say something you have not said yet.
4. Last message: ONE short, open question asking where she thinks this started. Do NOT suggest family, parents, childhood or the past in the question. Nothing after it.
Return JSON: {"messages": [...]}`)
}

export function buildFbB3Prompt(u: UserData, earlier: string[], said: string): string {
  return wrap(u, earlier, `## Task: step 3 of the reading, WHERE IT COMES FROM, AND WHAT IT HAS COST HER
She just told you: "${said}"
Write 4 messages:
1. If her message has a question in it, the first message answers it.
2. Connect what she named to the pattern: how that is where she learned it. Mention family, parents or the past ONLY if she did. Otherwise build only from what she said.
3. What it has cost her, concretely, in terms of her concern and what she wants.
4. Last message: her choice, keep living this or stop it here, ending in ONE yes/no question about being ready to let it go. Nothing after it.
Return JSON: {"messages": [...]}`)
}

export function buildFbBDiagnosisPrompt(u: UserData, earlier: string[]): string {
  const name = u.firstName || 'dear'
  return wrap(u, earlier, `## Task: the DIAGNOSIS
She just said yes. Before this you have already said: "Thank you, ${name}. I'm honored you trust me with this." and "Now that you've opened this door, I can see it more clearly..."
Write exactly 3 messages. NONE of them is a question, and none ends with a question mark.
1. Close the loop on the smoke: tell her what the black smoke was when you said her name. It was this block. Name the block in one clear picture taken from her own words or life (not a coat, chair, ledger or contract), and where it came from, using what she told you about where it started.
2. Why it explains her situation: connect it to her concern, in her words.
3. Why it found her: what about her made her the one carrying it. Then say it has not lifted on its own in all this time, and it will not lift by itself. Never make it sound small or simple. End on a statement.
Do NOT mention price, ritual, clearing or the offer.
Return JSON: {"messages": ["msg1", "msg2", "msg3"]}`)
}
