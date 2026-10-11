// Offer 04 — The Still Cup, the order bump's deliverable: the practice itself, as the page shows it.
//
// Copy source: improve-v1/v1-one-time-BEs/copy/04/04-C4-still-cup-instructional.md ("The copy"
// only — never its build notes). Word for word; teaReadingReceipt.test.ts checks every block
// against the doc. Change the doc first, then this file.
//
// Rendered at TEA_READING_STILL_CUP_PATH, linked from the receipt's P.S. (bump buyers) and from
// 04-T5. A fixed URL with no name on it, so the salutation is her name when this tab knows it,
// and is cut otherwise — never a blank, never "%FIRSTNAME%".
//
// Inline marks are the doc's own: **bold** and *italic*. The page renders them.

export type StillCupBlock =
  | { kind: 'p'; text: string }
  /** A numbered step: its bold title line, then the paragraph under it. */
  | { kind: 'step'; title: string; text: string };

export interface StillCupSection {
  heading?: string;
  blocks: StillCupBlock[];
}

export const STILL_CUP: {
  tabTitle: string;
  title: string;
  subtitle: string;
  signOff: string;
  sections: StillCupSection[];
} = {
  tabTitle: 'The Still Cup | The Seer Within',
  title: 'The Still Cup',
  subtitle: 'Four minutes, every evening',
  signOff: '— Evelyn',
  sections: [
    {
      blocks: [
        {
          kind: 'p',
          text: 'Do this tonight, before your reading has even arrived, and then every evening for the twenty-one days.',
        },
        {
          kind: 'p',
          text: 'It is a very small thing and it is aimed at the one hour that has been costing you anything.',
        },
      ],
    },
    {
      heading: 'The hour',
      blocks: [
        {
          kind: 'p',
          text:
            'You are fine in the daytime. That is what women tell me and I believe it — there is work, there are ' +
            'people, there is a version of you that functions perfectly well.',
        },
        { kind: 'p', text: 'It goes wrong between about nine and bed.' },
        {
          kind: 'p',
          text:
            "That is when you reread his last message looking for tone. When you check whether he's been online. " +
            'When the reasonable, well-argued thing you are going to send starts assembling itself, and by eleven ' +
            'it is finished and it feels overdue rather than early.',
        },
        {
          kind: 'p',
          text: 'Everything this reading is trying to prevent happens in that hour. Not in the relationship — in the hour.',
        },
        { kind: 'p', text: "So we're going to put something in it." },
      ],
    },
    {
      heading: 'What you need',
      blocks: [
        {
          kind: 'p',
          text: 'A cup, a pot or a kettle, and tea. Any tea. Loose is better, and a bag opened into the cup is absolutely fine.',
        },
        { kind: 'p', text: 'Nothing else, ever.' },
      ],
    },
    {
      heading: 'The four minutes',
      blocks: [
        {
          kind: 'step',
          title: '1. Make it properly, and take the time.',
          text:
            'Warm the pot if you have one. Wait for the water off the boil. This part is not ceremony — it is ' +
            'that the making has to be long enough to be the thing you are doing, rather than something you do ' +
            'while looking at your phone.',
        },
        {
          kind: 'p',
          text:
            '**Your phone is in another room for this.** That is not a suggestion; it is the entire mechanism. ' +
            'Everything else here is scaffolding around getting your phone out of your hand at nine o\'clock.',
        },
        {
          kind: 'step',
          title: "2. Sit down with it and don't drink it yet.",
          text:
            'Hold it. Wait until it is cool enough to drink and you have not drunk it. That will be about two ' +
            'minutes and it will feel much longer the first three nights.',
        },
        {
          kind: 'step',
          title: '3. While you wait, one question.',
          text: "Ask yourself: *what did I notice today that I haven't told anybody?*",
        },
        {
          kind: 'p',
          text:
            "Don't answer it in words and don't write it down — that is a different practice and it belongs to a " +
            'different reading. Just let it arrive and sit with it while the tea cools.',
        },
        { kind: 'step', title: '4. Drink it. Then leave the cup where it is until morning.', text: '' },
        {
          kind: 'p',
          text: "Don't rinse it, don't take it to the sink. Leave it on the table with the leaves in the bottom.",
        },
        { kind: 'p', text: "That's the four minutes." },
      ],
    },
    {
      heading: 'Why the cup stays out',
      blocks: [
        { kind: 'p', text: 'Two reasons, and the second is the real one.' },
        {
          kind: 'p',
          text:
            "**The first is craft.** Leaves settle overnight into the shape the evening put them in. You are not " +
            "reading them — I'd rather you didn't try, and a woman reading her own cup about a man she is anxious " +
            'about will find precisely what she is afraid of. But the settling is real and there is something in ' +
            'doing a thing properly even when nobody is checking.',
        },
        { kind: 'p', text: '**The second is that you have to walk past it in the morning.**' },
        {
          kind: 'p',
          text:
            'A used cup on the table at seven in the morning is a small piece of evidence that you got through ' +
            'last night. On day five that is worth a great deal. You will have wanted to send something, and you ' +
            'will not have, and there is the cup.',
        },
        { kind: 'p', text: 'Rinse it then, and start again that evening.' },
      ],
    },
    {
      heading: 'What this does',
      blocks: [
        { kind: 'p', text: 'It does not make you feel better. I want to be honest about that.' },
        {
          kind: 'p',
          text:
            'What it does is take the worst hour of your day and put four minutes of structure at the front of ' +
            'it — and four minutes is enough, because the hour is not driven by feeling. It is driven by *having ' +
            "your phone in your hand with nothing else happening.* Remove that and most of it doesn't assemble.",
        },
        {
          kind: 'p',
          text:
            'Women tell me the first three nights are difficult and the fourth is easy. That has been my ' +
            'experience of it too.',
        },
      ],
    },
    {
      heading: 'And when the twenty-one days are up',
      blocks: [
        {
          kind: 'p',
          text:
            'Stop, or don\'t. This is the one practice I give away that you may keep if you want it, because it ' +
            'is only a cup of tea and it asks nothing of you.',
        },
        {
          kind: 'p',
          text:
            "But it stops being *for* anything on day twenty-two, and if you find yourself still doing it in " +
            "March specifically because of him, that's worth noticing.",
        },
      ],
    },
  ],
};

/** `**bold**` and `*italic*` → segments the page renders. Nothing else is markup. */
export type InlineSegment = { text: string; strong?: boolean; em?: boolean };

export function inlineSegments(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  for (const part of text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) out.push({ text: part.slice(2, -2), strong: true });
    else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) out.push({ text: part.slice(1, -1), em: true });
    else out.push({ text: part });
  }
  return out;
}
