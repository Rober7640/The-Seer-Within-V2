// Belief lanes (/fb?lane=<id>) carry English-only copy (shared/beliefLanes.ts: the
// card, the chat openers, the lane question). A visitor in another language must get
// the plain /fb in her language, never an English lane card inside a French page.
import { afterEach, describe, expect, it } from "vitest";
import { resolveLane } from "../../client/src/lib/laneAttribution";
import { settleLocale } from "../../client/src/lib/locale";

describe("belief lanes are English-only", () => {
  afterEach(() => settleLocale("en"));

  it("an English visitor gets the lane, as today", () => {
    settleLocale("en");
    expect(resolveLane("/fb", "?lane=manifest")?.id).toBe("manifest");
  });

  it("a French visitor gets no lane on the lander or in the chat", () => {
    settleLocale("fr-FR");
    expect(resolveLane("/fb", "?lane=manifest&lang=fr")).toBeUndefined();
    expect(resolveLane("/fb/chat", "?lane=manifest")).toBeUndefined();
  });
});
