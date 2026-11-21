// A locale that is not live yet (gate G3) shows on the Railway development site
// and the local dev server only: never on Production or any other host.
import { describe, expect, it } from "vitest";
import { LOCALES, localeServable, PREVIEW_HOSTS, type LocaleCode } from "../../shared/locales";

const DEV_SITE = "the-seer-within-v2-development.up.railway.app";
const notLive = (Object.keys(LOCALES) as LocaleCode[]).filter((c) => !LOCALES[c].live);

describe("preview hosts", () => {
  it("the development site is the only preview host", () => expect(PREVIEW_HOSTS).toEqual([DEV_SITE]));
  it("there are locales waiting for go-live", () => expect(notLive.length).toBeGreaterThan(0));
  for (const code of notLive) {
    it(`${code}: served on the development site`, () => expect(localeServable(code, { dev: false, hostname: DEV_SITE })).toBe(true));
    it(`${code}: served by the local dev server`, () => expect(localeServable(code, { dev: true })).toBe(true));
    for (const host of ["theseerwithin.com", "www.theseerwithin.com", "the-seer-within-v2-production.up.railway.app", "localhost", "development.up.railway.app.evil.com"]) {
      it(`${code}: NOT served on ${host}`, () => expect(localeServable(code, { dev: false, hostname: host })).toBe(false));
    }
    it(`${code}: NOT served with no hostname (server, scripts)`, () => expect(localeServable(code, { dev: false })).toBe(false));
  }
  it("English is served everywhere", () => expect(localeServable("en", { dev: false, hostname: "theseerwithin.com" })).toBe(true));
});
