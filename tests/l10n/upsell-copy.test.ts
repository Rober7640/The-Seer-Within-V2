// Every field of the V1 upsell copy objects that comes from the upsell message
// modules must be French in the fr-FR bundle. Found on a French end-to-end walk:
// single-string fields (upsell 2 RITUAL_PATH_A_EXTRA) stayed English.
import { describe, expect, it } from "vitest";
import bundle from "@/l10n/fr-FR/index";
import { overlay } from "@shared/i18n";
import { V1_UPSELL1, V1_UPSELL2 } from "@/lib/upsellCopy/v1";

const SKIP = new Set(["chain", "pauses", "placeholderNames", "bucketMessages", "REVEAL", "PERSONALIZE"]);

describe("fr-FR V1 upsell copy objects", () => {
  for (const [key, english] of [["upsell1.v1", V1_UPSELL1], ["upsell2.v1", V1_UPSELL2]] as const) {
    it(`${key}: no field is left identical to the English`, () => {
      // what a French page renders: the English object with the French twin laid over it
      const fr = overlay(english, bundle.data[key]) as Record<string, unknown>;
      const same = Object.entries(english)
        .filter(([k, v]) => !SKIP.has(k) && v !== null && typeof v !== "function")
        .filter(([k, v]) => JSON.stringify(fr[k]) === JSON.stringify(v))
        .map(([k]) => k);
      expect(same).toEqual([]);
    });
  }
});
