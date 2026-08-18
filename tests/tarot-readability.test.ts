// Readability guards for the /fb-tarot read registry.
//
// WHY THIS EXISTS. Every other guard in tests/tarot-*.test.ts polices WHAT Evelyn may
// say — never a date, never a verdict, never a tactic. Nothing policed how hard the
// words are to read, and the gap showed: a line reading "the card that takes a question
// by the ankles and shows you its underside" shipped to a 55+ audience on phones, and
// the operator who commissioned the funnel had to ask what it meant.
//
// 🔴 WHAT A READABILITY SCORE WILL NOT CATCH. That line is 14 words of common English
// at roughly grade 6 — it passes every check in this file. It was hard because it was a
// metaphor with nothing to hang it on. The fix for that class is STRUCTURAL, not
// statistical: `cardPicture` in tarotReads.ts puts the picture in front of the metaphor
// by construction. Do not read a green run here as "the copy is clear".
//
// What these rules DO catch is bulk — the 88-word single-bubble wall, the 52-word
// sentence — which is the other half of the same problem, and the half that also breaks
// the typing pacing (client/src/lib/typing.ts caps the pause at 5s ≈ 83 characters, so
// every bubble past that gets the same wait however long it is).
//
// GRANDFATHERED. 333 of 1,320 strings already fail, almost all of them beat 3, which
// grew from a ~34-word median in the seeded hooks to ~167 in the newest families with
// nobody deciding that. Freezing them is deliberate: a guard that cannot be merged
// without a 100-line rewrite first gets switched off instead. New and edited copy must
// pass; the frozen list may only shrink.
import { describe, expect, it } from 'vitest';

const { DECKS, openerB } = await import('@/content/tarotReads');

// Thresholds picked from the corpus, not from convention: beats 1, 2 and 4 already sit
// at grade 4–8 (medians 6.3 / 7.6 / 3.9), so grade 9 is a bar Evelyn's voice already
// clears everywhere except the beat that ran away.
const MAX_WORDS_PER_BUBBLE = 45;
const MAX_WORDS_PER_SENTENCE = 25;
const MAX_GRADE = 9;

const words = (s: string) => s.match(/[A-Za-z']+/g) ?? [];
const sentences = (s: string) => s.trim().split(/(?<=[.!?…])\s+/).filter(Boolean);

// Flesch–Kincaid grade. The syllable count is the usual vowel-group heuristic — it is
// approximate by nature, which is why the threshold is generous rather than tight.
function syllables(w: string): number {
  const t = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!t) return 0;
  let n = (t.match(/[aeiouy]+/g) ?? []).length;
  if (t.endsWith('e') && n > 1 && !/(le|ee)$/.test(t)) n -= 1;
  return Math.max(n, 1);
}
function grade(s: string): number {
  const w = words(s), sn = sentences(s);
  if (!w.length || !sn.length) return 0;
  const syl = w.reduce((a, x) => a + syllables(x), 0);
  return 0.39 * (w.length / sn.length) + 11.8 * (syl / w.length) - 15.59;
}

/**
 * Every message Version B actually SENDS, keyed deck/hook/card/messageIndex.
 *
 * 🔴 Deliberately openerB, not the raw `reads` registry. Message 1 is COMPOSED at render
 * time — `cardPicture` is spliced into it — so the registry string is not what she reads.
 * Checking the registry would have scored a 106-character line while a 181-character one
 * shipped. Index 0..3 line up with beats 1..4, so the frozen keys below stay valid; index
 * 4 is the name-capture line, which is checked too because she reads that as well.
 */
function everyBeat(): { key: string; text: string }[] {
  const out: { key: string; text: string }[] = [];
  for (const [deck, cfg] of Object.entries(DECKS)) {
    for (const [hook, byCard] of Object.entries(cfg.reads)) {
      if (!byCard) continue;
      for (const card of Object.keys(byCard)) {
        openerB(deck as never, hook as never, card as never).forEach((text, i) =>
          out.push({ key: `${deck}/${hook}/${card}/${i}`, text }),
        );
      }
    }
  }
  return out;
}

// ⚠️ FROZEN 2026-08-18. This list may SHRINK, never grow. An entry here is a known
// violation that predates the guard — not permission to write another one.
const GRANDFATHERED = new Set<string>([
  'decode-him/cards-honest/a/2', 'decode-him/cards-honest/b/2', 'decode-him/cards-honest/c/2',
  'decode-him/cards-cheating/a/2', 'decode-him/cards-cheating/b/2',
  'decode-him/cards-cheating/c/2', 'arcana-mfh/cards-love-again/a/2',
  'arcana-mfh/cards-love-again/b/2', 'arcana-mfh/cards-love-again/c/2',
  'arcana-mfh/cards-soulmate/a/2', 'arcana-mfh/cards-soulmate/b/2',
  'arcana-mfh/cards-soulmate/c/2', 'arcana-mfh/cards-honest/a/2', 'arcana-mfh/cards-honest/b/2',
  'arcana-mfh/cards-honest/c/2', 'arcana-mfh/cards-cheating/a/2', 'arcana-mfh/cards-cheating/b/2',
  'arcana-mfh/cards-cheating/c/2', 'arcana-mfh/cards-real-person/a/1',
  'arcana-mfh/cards-real-person/a/2', 'arcana-mfh/cards-real-person/b/2',
  'arcana-mfh/cards-real-person/c/2', 'arcana-mfh/cards-misled/a/2',
  'arcana-mfh/cards-misled/b/2', 'arcana-mfh/cards-misled/c/2',
  'arcana-mfh/cards-wont-commit/a/2', 'arcana-mfh/cards-wont-commit/b/2',
  'arcana-mfh/cards-wont-commit/c/2', 'arcana-mfh/cards-ready-commit/a/1',
  'arcana-mfh/cards-ready-commit/a/2', 'arcana-mfh/cards-ready-commit/b/2',
  'arcana-mfh/cards-ready-commit/c/2', 'arcana-eef/cards-honest/a/2',
  'arcana-eef/cards-honest/b/2', 'arcana-eef/cards-honest/c/2', 'arcana-eef/cards-love-again/b/2',
  'arcana-eef/cards-love-again/c/2', 'arcana-eef/cards-soulmate/a/2',
  'arcana-eef/cards-soulmate/b/2', 'arcana-eef/cards-soulmate/c/1',
  'arcana-eef/cards-soulmate/c/2', 'arcana-eef/cards-cheating/a/2',
  'arcana-eef/cards-cheating/b/2', 'arcana-eef/cards-cheating/c/2', 'return-mhf/cards-honest/a/2',
  'return-mhf/cards-honest/b/2', 'return-mhf/cards-honest/c/2', 'return-mhf/cards-cheating/a/2',
  'return-mhf/cards-cheating/b/2', 'return-mhf/cards-cheating/c/2',
  'return-mhf/cards-real-person/a/1', 'return-mhf/cards-real-person/a/2',
  'return-mhf/cards-real-person/b/2', 'return-mhf/cards-real-person/c/2',
  'return-mhf/cards-misled/a/2', 'return-mhf/cards-misled/b/2', 'return-mhf/cards-misled/c/2',
  'return-mhf/cards-lied-to/a/0', 'return-mhf/cards-lied-to/a/2', 'return-mhf/cards-lied-to/b/2',
  'return-mhf/cards-lied-to/c/1', 'return-mhf/cards-lied-to/c/2', 'return-mhf/cards-truth/a/2',
  'return-mhf/cards-truth/b/2', 'return-mhf/cards-truth/c/1', 'return-mhf/cards-truth/c/2',
  'return-mhf/cards-deceived/a/1', 'return-mhf/cards-deceived/a/2',
  'return-mhf/cards-deceived/b/0', 'return-mhf/cards-deceived/b/1',
  'return-mhf/cards-deceived/b/2', 'return-mhf/cards-deceived/c/2',
  'return-mhf/cards-wont-commit/a/2', 'return-mhf/cards-wont-commit/b/2',
  'return-mhf/cards-wont-commit/c/2', 'return-mhf/cards-ready-commit/a/1',
  'return-mhf/cards-ready-commit/a/2', 'return-mhf/cards-ready-commit/b/2',
  'return-mhf/cards-ready-commit/c/2', 'return-mhf/cards-come-back/a/0',
  'return-mhf/cards-come-back/a/2', 'return-mhf/cards-come-back/b/2',
  'return-mhf/cards-come-back/c/2', 'return-mhf/cards-ever-back/a/2',
  'return-mhf/cards-ever-back/b/2', 'return-mhf/cards-ever-back/c/2',
  'return-mhf/cards-moved-on/a/2', 'return-mhf/cards-moved-on/b/1',
  'return-mhf/cards-moved-on/b/2', 'return-mhf/cards-moved-on/c/2',
  'return-mhf/cards-cant-stop/a/2', 'return-mhf/cards-cant-stop/b/2',
  'return-mhf/cards-cant-stop/c/2', 'return-mhf/cards-on-my-mind/a/0',
  'return-mhf/cards-on-my-mind/a/2', 'return-mhf/cards-on-my-mind/b/2',
  'return-mhf/cards-on-my-mind/c/2', 'return-mhf/cards-who-hurt-me/a/1',
  'return-mhf/cards-who-hurt-me/a/2', 'return-mhf/cards-who-hurt-me/b/0',
  'return-mhf/cards-who-hurt-me/b/2', 'return-mhf/cards-who-hurt-me/c/2',
  'return-mhf/cards-pulling-away/a/2', 'return-mhf/cards-pulling-away/b/2',
  'return-mhf/cards-pulling-away/c/2', 'return-mhf/cards-gone-cold/a/2',
  'return-mhf/cards-gone-cold/b/1', 'return-mhf/cards-gone-cold/b/2',
  'return-mhf/cards-gone-cold/c/1', 'return-mhf/cards-gone-cold/c/2',
  'return-mhf/cards-losing-interest/a/0', 'return-mhf/cards-losing-interest/a/1',
  'return-mhf/cards-losing-interest/a/2', 'return-mhf/cards-losing-interest/b/2',
  'return-mhf/cards-losing-interest/c/2', 'return-mhf/cards-back-together/a/1',
  'return-mhf/cards-back-together/a/2', 'return-mhf/cards-back-together/b/1',
  'return-mhf/cards-back-together/b/2', 'return-mhf/cards-back-together/c/1',
  'return-mhf/cards-back-together/c/2', 'return-mhf/cards-still-a-chance/a/2',
  'return-mhf/cards-still-a-chance/b/2', 'return-mhf/cards-still-a-chance/c/1',
  'return-mhf/cards-still-a-chance/c/2', 'return-mhf/cards-really-over/a/1',
  'return-mhf/cards-really-over/a/2', 'return-mhf/cards-really-over/b/1',
  'return-mhf/cards-really-over/b/2', 'return-mhf/cards-really-over/c/2',
  'return-mhf/cards-new-soulmate/a/1', 'return-mhf/cards-new-soulmate/a/2',
  'return-mhf/cards-new-soulmate/b/0', 'return-mhf/cards-new-soulmate/b/1',
  'return-mhf/cards-new-soulmate/b/2', 'return-mhf/cards-new-soulmate/c/1',
  'return-mhf/cards-new-soulmate/c/2', 'return-mhf/cards-soulmate-out-there/a/1',
  'return-mhf/cards-soulmate-out-there/a/2', 'return-mhf/cards-soulmate-out-there/b/2',
  'return-mhf/cards-soulmate-out-there/c/1', 'return-mhf/cards-soulmate-out-there/c/2',
  'return-mhf/cards-ready-to-love/a/2', 'return-mhf/cards-ready-to-love/b/1',
  'return-mhf/cards-ready-to-love/b/2', 'return-mhf/cards-ready-to-love/c/1',
  'return-mhf/cards-ready-to-love/c/2', 'return-mhf/cards-where-soulmate/a/2',
  'return-mhf/cards-where-soulmate/b/2', 'return-mhf/cards-where-soulmate/c/2',
  'return-mhf/cards-soulmate-closer/a/2', 'return-mhf/cards-soulmate-closer/b/2',
  'return-mhf/cards-soulmate-closer/c/2', 'return-mhf/cards-not-found-yet/a/1',
  'return-mhf/cards-not-found-yet/a/2', 'return-mhf/cards-not-found-yet/b/2',
  'return-mhf/cards-not-found-yet/c/2', 'return-mhf/cards-alone-forever/a/2',
  'return-mhf/cards-alone-forever/b/2', 'return-mhf/cards-alone-forever/c/2',
  'return-mhf/cards-meant-alone/a/0', 'return-mhf/cards-meant-alone/a/1',
  'return-mhf/cards-meant-alone/a/2', 'return-mhf/cards-meant-alone/b/2',
  'return-mhf/cards-meant-alone/c/2', 'return-mhf/cards-someone-for-me/a/1',
  'return-mhf/cards-someone-for-me/a/2', 'return-mhf/cards-someone-for-me/b/0',
  'return-mhf/cards-someone-for-me/b/1', 'return-mhf/cards-someone-for-me/b/2',
  'return-mhf/cards-someone-for-me/c/2', 'return-mhf/cards-someone-else/a/0',
  'return-mhf/cards-someone-else/a/2', 'return-mhf/cards-someone-else/b/2',
  'return-mhf/cards-someone-else/c/2', 'return-mhf/cards-talking-someone/a/2',
  'return-mhf/cards-talking-someone/b/1', 'return-mhf/cards-talking-someone/b/2',
  'return-mhf/cards-talking-someone/c/2', 'return-mhf/cards-faithful/a/2',
  'return-mhf/cards-faithful/b/2', 'return-mhf/cards-faithful/c/1',
  'return-mhf/cards-faithful/c/2', 'return-mhf/cards-loyal/a/2', 'return-mhf/cards-loyal/b/2',
  'return-mhf/cards-loyal/c/1', 'return-mhf/cards-loyal/c/2', 'return-mhf/cards-stop-hurting/a/2',
  'return-mhf/cards-stop-hurting/b/1', 'return-mhf/cards-stop-hurting/b/2',
  'return-mhf/cards-stop-hurting/c/2', 'return-mhf/cards-stop-missing/a/2',
  'return-mhf/cards-stop-missing/b/2', 'return-mhf/cards-stop-missing/c/1',
  'return-mhf/cards-stop-missing/c/2', 'return-mhf/cards-still-miss-him/a/2',
  'return-mhf/cards-still-miss-him/b/1', 'return-mhf/cards-still-miss-him/b/2',
  'return-mhf/cards-still-miss-him/c/2', 'return-mhf/cards-left-without-word/a/1',
  'return-mhf/cards-left-without-word/a/2', 'return-mhf/cards-left-without-word/b/2',
  'return-mhf/cards-left-without-word/c/2', 'return-mhf/cards-ghosted/a/2',
  'return-mhf/cards-ghosted/b/2', 'return-mhf/cards-ghosted/c/2',
  'return-mhf/cards-not-enough/a/2', 'return-mhf/cards-not-enough/b/2',
  'return-mhf/cards-not-enough/c/2', 'return-mhf/cards-stop-searching/a/1',
  'return-mhf/cards-stop-searching/a/2', 'return-mhf/cards-stop-searching/b/1',
  'return-mhf/cards-stop-searching/b/2', 'return-mhf/cards-stop-searching/c/2',
  'return-mhf/cards-end-up-alone/a/1', 'return-mhf/cards-end-up-alone/a/2',
  'return-mhf/cards-end-up-alone/b/2', 'return-mhf/cards-end-up-alone/c/2',
  'return-mhf/cards-given-up/a/0', 'return-mhf/cards-given-up/a/2',
  'return-mhf/cards-given-up/b/0', 'return-mhf/cards-given-up/b/2',
  'return-mhf/cards-given-up/c/0', 'return-mhf/cards-given-up/c/2',
  'return-mhf/cards-twin-ready/a/1', 'return-mhf/cards-twin-ready/a/2',
  'return-mhf/cards-twin-ready/b/1', 'return-mhf/cards-twin-ready/b/2',
  'return-mhf/cards-twin-ready/c/1', 'return-mhf/cards-twin-ready/c/2',
  'return-mhf/cards-twin-feels/a/1', 'return-mhf/cards-twin-feels/a/2',
  'return-mhf/cards-twin-feels/b/2', 'return-mhf/cards-twin-feels/c/1',
  'return-mhf/cards-twin-feels/c/2', 'return-mhf/cards-twin-back/a/1',
  'return-mhf/cards-twin-back/a/2', 'return-mhf/cards-twin-back/b/2',
  'return-mhf/cards-twin-back/c/1', 'return-mhf/cards-twin-back/c/2',
  'return-mhf/cards-hiding-something/a/1', 'return-mhf/cards-hiding-something/a/2',
  'return-mhf/cards-hiding-something/b/2', 'return-mhf/cards-hiding-something/c/1',
  'return-mhf/cards-hiding-something/c/2', 'return-mhf/cards-feels-off/a/2',
  'return-mhf/cards-feels-off/b/2', 'return-mhf/cards-feels-off/c/2',
  'return-mhf/cards-really-love/a/2', 'return-mhf/cards-really-love/b/0',
  'return-mhf/cards-really-love/b/2', 'return-mhf/cards-really-love/c/2',
  'return-mhf/cards-feel-about-me/a/2', 'return-mhf/cards-feel-about-me/b/2',
  'return-mhf/cards-feel-about-me/c/2', 'return-mhf/cards-imagining-it/a/0',
  'return-mhf/cards-imagining-it/a/2', 'return-mhf/cards-imagining-it/b/2',
  'return-mhf/cards-imagining-it/c/2', 'return-mhf/cards-still-think/a/2',
  'return-mhf/cards-still-think/b/1', 'return-mhf/cards-still-think/b/2',
  'return-mhf/cards-still-think/c/1', 'return-mhf/cards-still-think/c/2',
  'return-mhf/cards-still-love/a/2', 'return-mhf/cards-still-love/b/2',
  'return-mhf/cards-still-love/c/1', 'return-mhf/cards-still-love/c/2',
  'return-mhf/cards-love-or-moved-on/a/2', 'return-mhf/cards-love-or-moved-on/b/2',
  'return-mhf/cards-love-or-moved-on/c/2', 'return-mhf/cards-forever-or-now/a/0',
  'return-mhf/cards-forever-or-now/a/2', 'return-mhf/cards-forever-or-now/b/2',
  'return-mhf/cards-forever-or-now/c/1', 'return-mhf/cards-forever-or-now/c/2',
  'return-mhf/cards-his-children/a/2', 'return-mhf/cards-his-children/b/2',
  'return-mhf/cards-his-children/c/2', 'return-mhf/cards-her-shadow/a/2',
  'return-mhf/cards-her-shadow/b/2', 'return-mhf/cards-her-shadow/c/1',
  'return-mhf/cards-her-shadow/c/2', 'return-mhf/cards-live-apart/a/1',
  'return-mhf/cards-live-apart/a/2', 'return-mhf/cards-live-apart/b/2',
  'return-mhf/cards-live-apart/c/2', 'return-mhf/cards-too-long/a/2',
  'return-mhf/cards-too-long/b/2', 'return-mhf/cards-too-long/c/2',
  'return-mhf/cards-really-soulmate/a/2', 'return-mhf/cards-really-soulmate/b/2',
  'return-mhf/cards-really-soulmate/c/1', 'return-mhf/cards-really-soulmate/c/2',
  'return-mhf/cards-twin-or-connection/a/0', 'return-mhf/cards-twin-or-connection/a/2',
  'return-mhf/cards-twin-or-connection/b/2', 'return-mhf/cards-twin-or-connection/c/2',
  'return-mhf/cards-met-already/a/1', 'return-mhf/cards-met-already/a/2',
  'return-mhf/cards-met-already/b/2', 'return-mhf/cards-met-already/c/2'
]);

describe('tarot reads — readability', () => {
  it('every NON-grandfathered beat is inside the limits', () => {
    const failures: string[] = [];
    for (const { key, text } of everyBeat()) {
      if (GRANDFATHERED.has(key)) continue;
      const w = words(text).length;
      const longest = Math.max(...sentences(text).map((s) => words(s).length), 0);
      const g = grade(text);
      if (w > MAX_WORDS_PER_BUBBLE) failures.push(`${key}: ${w} words in one bubble (max ${MAX_WORDS_PER_BUBBLE})`);
      if (longest > MAX_WORDS_PER_SENTENCE) failures.push(`${key}: ${longest}-word sentence (max ${MAX_WORDS_PER_SENTENCE})`);
      if (g > MAX_GRADE) failures.push(`${key}: reading grade ${g.toFixed(1)} (max ${MAX_GRADE})`);
    }
    expect(failures, `unreadable copy:\n${failures.join('\n')}`).toEqual([]);
  });

  // The pin. Adding an entry means editing this number, which is the point — freezing a
  // new violation should be a decision somebody makes on purpose, not a quiet append.
  //
  // RATCHET. It is tightened to the real size every time a lander is migrated, so the
  // debt can only ever fall. 333 → 320 on 2026-08-18 (cards-return) and → 302 on 2026-08-19
  // (cards-feels + cards-who-he-is); 18 more frozen bubbles came off the list.
  it('the grandfathered list has not grown', () => {
    expect(GRANDFATHERED.size).toBeLessThanOrEqual(302);
  });

  // Keeps the list honest as hooks are renamed or retired: a key that no longer matches
  // anything is dead weight hiding how much debt is really left.
  it('every grandfathered key still exists in the registry', () => {
    const live = new Set(everyBeat().map((b) => b.key));
    const stale = [...GRANDFATHERED].filter((k) => !live.has(k));
    expect(stale, `stale grandfather entries — delete them:\n${stale.join('\n')}`).toEqual([]);
  });
});
