import { describe, it, expect, beforeEach } from "vitest";
import { registerData, __resetI18nForTests } from "@shared/i18n";
import { localeServesPath, localeCoversPage } from "@/l10n/coverage";

beforeEach(() => __resetI18nForTests());

describe("localeServesPath", () => {
  it("French serves /fb and /fb-tarot, and the legal pages", () => {
    for (const p of ["/fb", "/fb/chat", "/fb/welcome2", "/fb-tarot", "/fb-tarot/chat", "/privacy", "/terms/", "/refund"])
      expect(localeServesPath("fr-FR", p), p).toBe(true);
  });
  it("French never serves other funnels or the V2 app", () => {
    for (const p of ["/fb-palm", "/fb-palm/chat", "/fb2", "/gdn/chat", "/fb-read", "/login", "/reading", "/", "/chat"])
      expect(localeServesPath("fr-FR", p), p).toBe(false);
  });
  it("English serves everything", () => {
    expect(localeServesPath("en", "/fb-palm")).toBe(true);
  });
});

describe("localeCoversPage (tarot batches)", () => {
  it("an untranslated tarot lander is not covered", () => {
    expect(localeCoversPage("fr-FR", "/fb-tarot", "?hook=cards-come-back")).toBe(false);
  });
  it("a translated hook on its deck is covered", () => {
    registerData("fr-FR", "tarot.headlines", { "cards-come-back": "Reviendra-t-il ?" });
    registerData("fr-FR", "tarot.decks", { "return-mhf": { reads: { "cards-come-back": { a: ["…"] } } } });
    expect(localeCoversPage("fr-FR", "/fb-tarot", "?hook=cards-come-back&deck=return-mhf")).toBe(true);
    expect(localeCoversPage("fr-FR", "/fb-tarot", "?hook=cards-come-back&deck=arcana-mfh")).toBe(false);
  });
  it("tarot checkout / upsells / success need no hook (shared copy)", () => {
    for (const p of ["/fb-tarot/checkout", "/fb-tarot/welcome1", "/fb-tarot/welcome2", "/fb-tarot/success"])
      expect(localeCoversPage("fr-FR", p, "?session_id=cs_1"), p).toBe(true);
    expect(localeCoversPage("fr-FR", "/fb-tarot/chat", "?hook=cards-come-back&card=a")).toBe(false);
  });
  it("/fb pages are covered once the locale serves the funnel", () => {
    expect(localeCoversPage("fr-FR", "/fb/chat", "")).toBe(true);
  });
});
