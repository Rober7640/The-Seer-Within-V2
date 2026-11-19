// The operator's voice rules for belief-lane copy (fb-belief-lanes SKILL.md), as a
// pure checker for the lane tests. Ported from the lane renderer's checks
// (.claude/skills/fb-belief-lanes/scripts/render_lanes.py) so a lane that passed
// review cannot fail here, and the reverse. Test-only: nothing in the app imports it.

// ── The voice rules ─────────────────────────────────────────────────────────
// Never: psychic, tarot, reading, fortune, spell, magic, AI, chatbot, price, $.
// Nothing religious: God, church, soul, bless, prayer, holiday. No "!".
const BANNED = /\b(psychic|tarot|readings?|fortunes?|spells?|magic\w*|chatbot|prices?|god|church|soul\w*|bless\w*|prayers?|pray\w*|holiday)\b/i
const AI = /\bAI\b/ // case-sensitive on purpose: "said", "again" are fine
const SOULMATE = /soul ?mate/i
// No health, income, guarantee or prediction claims (same list as the renderer).
const CLAIMS = /\b(predict\w*|forecast\w*|will happen|guarantee\w*|heal\w*|trauma|money|abundance|career|wealth)\b/i

/** Every rule a string breaks; [] when clean. */
export function copyRuleFails(text: string, opts: { freeRule?: boolean } = {}): string[] {
  const fails: string[] = []
  const banned = text.match(new RegExp(BANNED.source, 'gi'))
  if (banned) fails.push(`banned word: ${banned.join(', ')}`)
  if (AI.test(text)) fails.push('banned word: AI')
  if (SOULMATE.test(text)) fails.push('soulmate')
  const claims = text.match(new RegExp(CLAIMS.source, 'gi'))
  if (claims) fails.push(`claim word: ${claims.join(', ')}`)
  if (text.includes('$')) fails.push('$')
  if (text.includes('!')) fails.push('!')
  if (opts.freeRule !== false) {
    // "free" only beside message or chat. The one exception is the honest letter
    // line, "That part isn't free." — the renderer's rule, sentence by sentence.
    for (const s of text.split(/(?<=[.?])\s+/)) {
      if (/\bfree\b/i.test(s) && !/messag|chat|isn't free/i.test(s)) fails.push(`"free" not beside message/chat: ${s}`)
    }
  }
  return fails
}
