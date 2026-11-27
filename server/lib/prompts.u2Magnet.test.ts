// /fb Upsell 2 copy test (v1_fb_u2_copy_2026): the two AI beats.
//
//   npx vitest run server/lib/prompts.u2Magnet.test.ts
//
// What it pins:
//   · today's prompts (arm A, every other Upsell 2) are byte-identical to HEAD's
//   · the magnet prompts carry the script's bans, name her topic's stones in order, and
//     quote no sample line for the model to copy
//   · the runtime net (magnetReplyProblem) drops a reply that breaks a ban
//   · arm B's call answers NO messages on any failure, so the page plays the script's own
//     fallback line, while today's call still falls back to the generic lines it always did

import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserData } from '../../shared/types';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('./anthropicWithFailover', () => ({ anthropicFailover: { messages: { create } } }));
vi.mock('./circuitBreaker', () => ({
  anthropicBreaker: {},
  fireWithBreaker: (_b: unknown, fn: () => unknown) => fn(),
  isCircuitOpenError: () => false,
}));
vi.mock('./logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import {
  buildManifestPersonalizeMagnetPrompt,
  buildManifestPersonalizePrompt,
  buildManifestRevealMagnetPrompt,
  buildManifestRevealPrompt,
  magnetReplyProblem,
  MAGNET_BANNED_WORDS,
  MAGNET_STONE_JOBS,
  MAGNET_TOPIC_STONES,
} from './prompts';
import {
  generateManifestPersonalize,
  generateManifestPersonalizeMagnet,
  generateManifestReveal,
  generateManifestRevealMagnet,
} from './claude';

const CONCERN = 'I want him to come back and commit';

const user = (over: Partial<UserData> = {}): UserData =>
  ({
    firstName: 'Maria',
    email: null,
    bucket: 'love',
    subBucket: null,
    personName: null,
    concern: 'c',
    desires: null,
    location: null,
    timeOfDay: null,
    objectionCount: 0,
    ...over,
  }) as unknown as UserData;

// Computed from HEAD (f1fb8d4) with this same recipe, before the magnet prompts existed.
const HEAD_PROMPT_FINGERPRINT = '8b8e667d3aed25e92c495c86c68f1da17f2a107bead0260d8796ea07e099eb51';

describe("today's Upsell 2 prompts are unchanged", () => {
  it('byte-identical to HEAD for every topic, with and without a name and a price', () => {
    const fixtures: unknown[] = [];
    for (const bucket of ['love', 'money', 'purpose', 'someone', 'career', null]) {
      for (const personName of ['Tom', null]) {
        for (const priceDollars of [35, 45, undefined]) {
          fixtures.push({
            firstName: 'Maria', email: null, bucket, subBucket: null, personName, concern: 'c',
            desires: null, location: null, timeOfDay: null, objectionCount: 0, priceDollars,
          });
        }
      }
    }
    const fp = createHash('sha256')
      .update(
        JSON.stringify(
          fixtures.map((u) => [
            buildManifestRevealPrompt(u as UserData, CONCERN),
            buildManifestPersonalizePrompt(u as UserData, CONCERN),
          ]),
        ),
      )
      .digest('hex');
    expect(fp).toBe(HEAD_PROMPT_FINGERPRINT);
  });
});

const TOPICS = ['love', 'money', 'purpose', 'someone'] as const;

describe('the magnet prompts', () => {
  for (const topic of TOPICS) {
    const reveal = buildManifestRevealMagnetPrompt(user({ bucket: topic as never }), CONCERN);
    const personalize = buildManifestPersonalizeMagnetPrompt(user({ bucket: topic as never }), CONCERN);

    it(`${topic}: both carry the bans and the format`, () => {
      for (const p of [reveal, personalize]) {
        expect(p).toContain("Never say that it can't reach her or can't find her.");
        expect(p).toContain('Never say the block could come back, or that the clearing could fail.');
        expect(p).toContain('Never say "you\'ve felt" or "you know".');
        expect(p).toContain('No em dashes or en dashes.');
        expect(p).toContain('2 messages, 3 at most, each under 25 words.');
        expect(p).toContain("Never say what a man, or anyone else, will do");
        expect(p).toContain('{"messages": ["...", "..."]}');
        expect(p).toContain(`- Topic: ${topic}`);
        expect(p).toContain(`What she asked for, in her own words: ${CONCERN}`);
        // The prompts themselves model the rule.
        expect(p).not.toMatch(/[–—]/);
      }
    });

    it(`${topic}: reveal bans every listed word, says nothing of stones or why`, () => {
      expect(reveal).toContain(`Never use these words: ${MAGNET_BANNED_WORDS.join(', ')}.`);
      expect(reveal).toContain('magnet');
      expect(reveal).toContain("Don't say why it isn't with her yet.");
      expect(reveal).toContain("Don't mention the bracelet, the stones or magnets.");
      for (const [stone] of MAGNET_STONE_JOBS) expect(reveal).not.toContain(stone);
    });

    it(`${topic}: personalize may say magnet, never magnetic, and names her stones in order`, () => {
      expect(personalize).toContain(
        `Never use these words: ${MAGNET_BANNED_WORDS.filter((w) => w !== 'magnet').join(', ')}.`,
      );
      expect(personalize).toContain('Never call a stone magnetic.');
      const [first, second] = MAGNET_TOPIC_STONES[topic];
      expect(personalize).toContain(`so her stones are ${first}, then ${second}.`);
      for (const [stone, job] of MAGNET_STONE_JOBS) expect(personalize).toContain(`- ${stone} draws ${job}`);
    });

    it(`${topic}: no quoted sample line for the model to copy`, () => {
      for (const p of [reveal, personalize]) {
        const quoted = (p.replace('{"messages": ["...", "..."]}', '').match(/"[^"\n]*"/g) ?? []).sort();
        expect(quoted).toEqual(['"you know"', '"you\'ve felt"']);
        expect(p).not.toMatch(/[“”]/);
        // Not today's prompt with bits added: none of its stock lines or examples.
        expect(p).not.toContain('Example');
        expect(p).not.toContain('example');
      }
    });
  }

  it('the stones per topic, and each stone keeps the job the STONES bubbles give it', () => {
    expect(MAGNET_TOPIC_STONES).toEqual({
      love: ['Malachite', 'Green Aventurine'],
      money: ['Citrine', 'Pyrite'],
      purpose: ["Tiger's Eye", 'Clear Quartz'],
      someone: ['Malachite', 'Amethyst'],
    });
    const jobs = new Map(MAGNET_STONE_JOBS);
    expect(jobs.size).toBe(8);
    for (const pair of Object.values(MAGNET_TOPIC_STONES)) for (const s of pair) expect(jobs.has(s)).toBe(true);
  });

  it('someone: the person she asked about is in, and only when there is one', () => {
    const named = buildManifestPersonalizeMagnetPrompt(user({ bucket: 'someone' as never, personName: 'Tom' }), CONCERN);
    expect(named).toContain('- The person she asked about: Tom');
    const unnamed = buildManifestPersonalizeMagnetPrompt(user({ bucket: 'someone' as never }), CONCERN);
    expect(unnamed).not.toContain('The person she asked about');
  });

  it('an unknown topic reads as love (the server never sends arm B one)', () => {
    const p = buildManifestPersonalizeMagnetPrompt(user({ bucket: 'career' as never }), CONCERN);
    expect(p).toContain('- Topic: love');
    expect(p).toContain('so her stones are Malachite, then Green Aventurine.');
  });
});

describe('magnetReplyProblem: the runtime net', () => {
  it('a clean reply passes', () => {
    expect(magnetReplyProblem(['I saw him at your table, dear.', 'It is close now.'], 'reveal')).toBeNull();
    expect(magnetReplyProblem(['Malachite draws love to you.', 'Like a magnet, it pulls him near.'], 'personalize')).toBeNull();
  });
  it('nothing usable is empty', () => {
    for (const m of [null, undefined, [], [''], ['   '], 'a string', [42]]) {
      expect(magnetReplyProblem(m, 'reveal')).toBe('empty');
    }
  });
  it('an em or en dash', () => {
    expect(magnetReplyProblem(['It is close — very close.'], 'reveal')).toBe('dash');
    expect(magnetReplyProblem(['Close – dear.'], 'personalize')).toBe('dash');
  });
  it('a banned word, stems included', () => {
    for (const s of ['Your energy is clear.', 'Their energies meet.', 'A signal reached me.', 'The doorway opens.',
      'The universe agrees.', 'A new frequency.', 'I feel the vibrations.', 'It broadcasts.', 'Your field is wide.']) {
      expect(magnetReplyProblem([s], 'reveal')).toBe('banned_word');
      expect(magnetReplyProblem([s], 'personalize')).toBe('banned_word');
    }
    expect(magnetReplyProblem(['It works like a magnet.'], 'reveal')).toBe('banned_word');
    expect(magnetReplyProblem(['Magnets pull.'], 'reveal')).toBe('banned_word');
  });
  it('personalize: magnetic is its own break, magnet is fine', () => {
    expect(magnetReplyProblem(['Malachite is magnetic for love.'], 'personalize')).toBe('magnetic');
    expect(magnetReplyProblem(['Its magnetism is strong.'], 'personalize')).toBe('magnetic');
    expect(magnetReplyProblem(['The magnet draws love.'], 'personalize')).toBeNull();
  });
  it('"you know" and "you\'ve felt", straight or curly apostrophe', () => {
    expect(magnetReplyProblem(['You know this already.'], 'reveal')).toBe('never_say');
    expect(magnetReplyProblem(['You’ve felt it close.'], 'reveal')).toBe('never_say');
    expect(magnetReplyProblem(["You've felt it."], 'personalize')).toBe('never_say');
  });
});

const reply = (text: string) => ({ content: [{ type: 'text', text }] });

describe('the calls: arm B never plays the generic lines', () => {
  beforeEach(() => create.mockReset());

  it('a clean magnet reply reaches her, three bubbles at most', async () => {
    create.mockResolvedValue(reply('{"messages": ["One.", "Two.", "Three.", "Four."]}'));
    expect((await generateManifestRevealMagnet(user(), CONCERN)).messages).toEqual(['One.', 'Two.', 'Three.']);
    expect(create.mock.calls[0][0].messages[0].content).toBe(buildManifestRevealMagnetPrompt(user(), CONCERN));
  });
  it('a reply that breaks a ban is dropped: no messages, so the page plays the script fallback', async () => {
    create.mockResolvedValue(reply('{"messages": ["Your energy is close."]}'));
    expect((await generateManifestRevealMagnet(user(), CONCERN)).messages).toEqual([]);
    create.mockResolvedValue(reply('{"messages": ["Malachite is magnetic."]}'));
    expect((await generateManifestPersonalizeMagnet(user(), CONCERN)).messages).toEqual([]);
  });
  it('an API error or an unreadable reply: no messages', async () => {
    create.mockRejectedValue(new Error('overloaded'));
    expect((await generateManifestRevealMagnet(user(), CONCERN)).messages).toEqual([]);
    create.mockResolvedValue(reply('I cannot do that.'));
    expect((await generateManifestPersonalizeMagnet(user(), CONCERN)).messages).toEqual([]);
  });
  it("today's calls still fall back to the generic lines, exactly as before", async () => {
    create.mockRejectedValue(new Error('overloaded'));
    const generic = [
      'I sense something shifting in your energy...',
      'Let me focus more deeply...',
      "There's more here than meets the eye...",
    ];
    expect((await generateManifestReveal(user(), CONCERN)).messages).toEqual(generic);
    expect((await generateManifestPersonalize(user(), CONCERN)).messages).toEqual(generic);
    create.mockResolvedValue(reply('{"messages": ["Your energy is close."]}'));
    expect((await generateManifestReveal(user(), CONCERN)).messages).toEqual(['Your energy is close.']);
  });
});
