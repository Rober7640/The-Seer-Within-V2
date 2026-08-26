// Wiring guards for the INHERITED SHADOW roster — the 70% arm of v1_tarot_shadow_2026.
//
// ⭐ WHAT THIS FILE IS *NOT* FOR. It does not check the copy against the method spec. Two
// things already do that and they do it better: `node scripts/check-draft.mjs --dir shadow`
// and `python3 scripts/check-shadow-readback.py` read the DRAFTS, and
// `npx tsx scripts/shadow-drafts-to-registry.mts` proves the roster is those drafts
// character-for-character. The copy is approved and frozen (operator, 2026-08-25) and is
// never rewritten to satisfy a checker.
//
// ⭐ WHAT IT IS FOR: the SERVING side, which none of those three can see. The roster is only
// worth anything if `openerB` reaches it when the arm says shadow, reaches the natural read
// otherwise, and folds six beats into the four slots every other guard in this repo pins.
//
// 🔴 THE ONE INVARIANT ABOVE ALL OTHERS — arming deletes nothing. DECKS[deck].reads is the
// 30% arm and is never edited, so a draft / paused / broken experiment leaves 100% of visitors
// on exactly today's funnel. Half of this file exists to keep that true by construction:
// the default argument is natural, and the natural output must not move by one character.
//
// 🔴 THE FOLD — six beats, four slots, six bubbles on her screen:
//     natural   [picture]        [bridge] [cuts 3-6 joined by \n] [loop]
//     shadow    [claim \n proof] [her]    [but \n so]             [loop]
// Slot [1] is still the bridge and slot [3] is still the loop, which is the whole reason the
// 19 files pinning four slots keep their meaning. If that stops being true, they start passing
// for the wrong reason, which is worse than failing.
import { describe, expect, it } from 'vitest';

const { DECKS, openerB, TAROT_HOOKS } = await import('@/content/tarotReads');
const { SHADOW_READS, hasShadowRead } = await import('@/content/tarotReadsShadow');

const CARDS = ['a', 'b', 'c'] as const;
const NAME_CAPTURE = /what's your first name, dear\?$/;

// Never rewritten, never armed (invariant 4). cards-return alone carries most of the tarot
// traffic — arming it would leave nothing unchanged to compare any of this against.
const PROTECTED = ['cards-feels', 'cards-return'] as const;

/** Every (deck, hook) pair with a shadow read wired. */
const armed = Object.entries(SHADOW_READS).flatMap(([deck, hooks]) =>
  Object.keys(hooks ?? {}).map((hook) => [deck, hook] as const),
);

describe('the shadow roster is wired and complete', () => {
  it('81 landers are armed, on one deck, with all three cards', () => {
    expect(armed.length, 'the approved set is 37 August landers + 44 money/alone/commit landers — see the split-test checklist').toBe(81);
    for (const [deck, hook] of armed) {
      const read = (SHADOW_READS as any)[deck][hook];
      for (const c of CARDS) {
        expect(read[c], `${deck}/${hook} card ${c} has no shadow read`).toBeTruthy();
        expect(read[c].length, `${deck}/${hook}/${c} is not four slots`).toBe(4);
      }
    }
  });

  it('every armed lander still has its NATURAL read — the 30% arm must exist too', () => {
    for (const [deck, hook] of armed) {
      expect(
        (DECKS as any)[deck].reads[hook],
        `${deck}/${hook} is armed but has no natural read — the control arm would fall through to DEFAULT_HOOK`,
      ).toBeTruthy();
    }
  });

  it('🔴 a PROTECTED control is never armed (invariant 4)', () => {
    for (const [deck] of Object.entries(DECKS)) {
      for (const h of PROTECTED) {
        expect(hasShadowRead(deck as any, h as any), `${deck}/${h} is a protected control`).toBe(false);
      }
    }
  });

  it('every armed hook is a real hook in the registry', () => {
    const known = new Set(TAROT_HOOKS as readonly string[]);
    for (const [, hook] of armed) {
      expect(known.has(hook), `${hook} is not in TAROT_HOOKS — an ad URL for it would not parse`).toBe(true);
    }
  });
});

describe('the fold — six beats into four slots, six bubbles', () => {
  it('slot 0 is [claim \\n proof], slot 2 is [but \\n so], slots 1 and 3 are single bubbles', () => {
    for (const [deck, hook] of armed) for (const c of CARDS) {
      const [claim, her, but, loop] = (SHADOW_READS as any)[deck][hook][c] as string[];
      expect(claim.split('\n').length, `${hook}/${c} slot 0 must fold TWO beats (claim + proof)`).toBe(2);
      expect(her.includes('\n'), `${hook}/${c} slot 1 is the bridge — one bubble`).toBe(false);
      expect(but.split('\n').length, `${hook}/${c} slot 2 must fold TWO beats (but + so)`).toBe(2);
      expect(loop.includes('\n'), `${hook}/${c} slot 3 is the loop — one bubble`).toBe(false);
    }
  });

  it('openerB serves 6 bubbles then name capture, none of them empty', () => {
    for (const [deck, hook] of armed) for (const c of CARDS) {
      const msgs = openerB(deck as any, hook as any, c, 'shadow');
      expect(msgs.length, `${hook}/${c} is not six bubbles plus name capture`).toBe(7);
      expect(msgs[0], `${hook}/${c} must open on the card she turned`).toMatch(/^You turned /);
      expect(msgs[msgs.length - 1]).toMatch(NAME_CAPTURE);
      for (const m of msgs) expect(m.trim().length, `${hook}/${c} has an empty bubble`).toBeGreaterThan(0);
    }
  });

  it('the three cards inside one lander never open the same way (pre-flight step 3)', () => {
    for (const [deck, hook] of armed) {
      const opens = CARDS.map((c) => openerB(deck as any, hook as any, c, 'shadow')[0]);
      expect(new Set(opens).size, `${deck}/${hook}: two cards open on the same bubble`).toBe(3);
    }
  });
});

describe('🔴 arming deletes nothing — the natural arm is byte-identical to today', () => {
  it('openerB with no method argument is exactly openerB(..., natural)', () => {
    for (const [deck, hook] of armed) for (const c of CARDS) {
      expect(openerB(deck as any, hook as any, c)).toEqual(openerB(deck as any, hook as any, c, 'natural'));
    }
  });

  it("the natural arm serves DECKS.reads, on armed landers as much as anywhere else", () => {
    for (const [deck, hook] of armed) for (const c of CARDS) {
      const beats = (DECKS as any)[deck].reads[hook][c] as string[];
      const expected = [...beats.flatMap((b) => b.split('\n').map((s) => s.trim()).filter(Boolean))];
      const msgs = openerB(deck as any, hook as any, c, 'natural');
      expect(msgs.slice(0, -1), `${hook}/${c} natural arm no longer serves the registry read`).toEqual(expected);
    }
  });

  it('the two arms genuinely differ — an armed lander that serves the same read is not a test', () => {
    for (const [deck, hook] of armed) for (const c of CARDS) {
      expect(
        openerB(deck as any, hook as any, c, 'shadow'),
        `${hook}/${c} serves identical copy on both arms`,
      ).not.toEqual(openerB(deck as any, hook as any, c));
    }
  });

  it('both arms end on the SAME name capture — the handoff into chat is not under test', () => {
    for (const [deck, hook] of armed) for (const c of CARDS) {
      const nat = openerB(deck as any, hook as any, c);
      const sh = openerB(deck as any, hook as any, c, 'shadow');
      expect(sh[sh.length - 1], `${hook}/${c}`).toBe(nat[nat.length - 1]);
    }
  });
});

describe("an UNARMED lander in the shadow arm falls back to its OWN natural read", () => {
  // The second net behind scope.landers. If a scope edit ever enrols a lander with no
  // approved shadow read, she must get the read her ad promised — not DEFAULT_HOOK's
  // shadow read, which would answer a question she never asked.
  const unarmed = (TAROT_HOOKS as readonly string[]).filter(
    (h) => (DECKS as any)['return-mhf'].reads[h] && !hasShadowRead('return-mhf' as any, h as any),
  );

  it('there are unarmed landers to test (otherwise this suite proves nothing)', () => {
    expect(unarmed.length).toBeGreaterThan(0);
  });

  it('serves the natural read for THAT hook, byte-identical', () => {
    for (const h of unarmed) for (const c of CARDS) {
      expect(openerB('return-mhf' as any, h as any, c, 'shadow'), `${h}/${c}`).toEqual(
        openerB('return-mhf' as any, h as any, c),
      );
    }
  });
});
