// DEV-ONLY data for the long-copy paywall preview (/paywall-preview?surface=longcopy).
//
// Real samples are generated from production chats into
// `preview-samples.local.json` (git-excluded — it holds real chat excerpts, so it
// must never be committed). When that file is missing the preview falls back to
// the clearly-labelled PLACEHOLDER below, so the page always renders.
//
// The paywall shows no customer review quotes (operator decision). Older local
// files may still carry a `quotes` key; it is ignored.

export interface PreviewSample {
  id: string;
  /** What she did at the real wall: "bought" | "left". */
  outcome: string;
  herLastMessage: string;
  /** The guide's real last message before the wall (live wind-down). */
  actualEnding: string;
  /** The same turn regenerated with TODAY's instruction (control). */
  controlEnding: string;
  /** The same turn regenerated with the free-trial ending under test. */
  newEnding: string;
  /** The three "What I still see for you" lines. */
  stillSee: string[];
}

export interface PreviewSamplesFile {
  persona: { name: string; slug: string; avatarUrl: string; rating: number; ratingCount: number };
  samples: PreviewSample[];
}

const PLACEHOLDER: PreviewSamplesFile = {
  persona: {
    name: "Evelyn Cross",
    slug: "evelyn-cross",
    avatarUrl: "/uploads/avatars/evelyn-cross.png",
    rating: 4.7,
    ratingCount: 290,
  },
  samples: [
    {
      id: "s01",
      outcome: "placeholder",
      herLastMessage: "PLACEHOLDER — her last message.",
      actualEnding: "PLACEHOLDER — the guide's real last message before the wall.",
      controlEnding: "PLACEHOLDER — regenerated with today's wind-down.",
      newEnding:
        "PLACEHOLDER — There's one thing in how he left that I haven't told you yet, and it changes what you should do next.",
      stillSee: [
        "PLACEHOLDER — Why he pulls back every time you get close",
        "PLACEHOLDER — Whether the distance is the real problem",
        "PLACEHOLDER — What to do the next time he calls",
      ],
    },
  ],
};

// Eager glob of a single literal path: resolves to {} when the file doesn't exist,
// so a missing file is not a build error. Vite re-runs the glob when it appears.
const found = import.meta.glob<PreviewSamplesFile>("./preview-samples.local.json", {
  eager: true,
  import: "default",
});

const loaded = Object.values(found)[0];

export const previewSamplesAreReal = !!(loaded && Array.isArray(loaded.samples) && loaded.samples.length);

export const previewSamples: PreviewSamplesFile = previewSamplesAreReal
  ? {
      persona: { ...PLACEHOLDER.persona, ...(loaded!.persona ?? {}) },
      samples: loaded!.samples,
    }
  : PLACEHOLDER;
