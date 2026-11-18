import { describe, it, expect, beforeEach } from "vitest";
import {
  interpolate, translate, pickData, registerCatalog, registerData,
  missingTranslations, __resetI18nForTests,
} from "@shared/i18n";
import { resolveLocale, isKnownLocale, LOCALES } from "@shared/locales";

beforeEach(() => __resetI18nForTests());

describe("interpolate", () => {
  it("fills named placeholders", () => {
    expect(interpolate("It's lovely to meet you, {name}.", { name: "Marie" })).toBe("It's lovely to meet you, Marie.");
  });
  it("leaves braces with no matching var untouched", () => {
    expect(interpolate('Reply as JSON: {"messages": []} for {name}', { name: "Ana" }))
      .toBe('Reply as JSON: {"messages": []} for Ana');
    expect(interpolate("{notAVar} stays", { other: 1 })).toBe("{notAVar} stays");
  });
  it("returns the text unchanged with no vars", () => {
    expect(interpolate("{name} stays when no vars are passed")).toBe("{name} stays when no vars are passed");
  });
  it("renders null/undefined vars as empty", () => {
    expect(interpolate("a{x}b", { x: undefined })).toBe("ab");
  });
});

describe("translate", () => {
  it("English is the identity, even if an English catalog were registered", () => {
    registerCatalog("en", { "Hello": "SHOULD NOT APPEAR" });
    expect(translate("en", "Hello")).toBe("Hello");
  });
  it("uses the catalog for a registered locale and interpolates the translation", () => {
    registerCatalog("fr-FR", { "It's lovely to meet you, {name}.": "Ravie de vous rencontrer, {name}." });
    expect(translate("fr-FR", "It's lovely to meet you, {name}.", { name: "Marie" })).toBe("Ravie de vous rencontrer, Marie.");
  });
  it("falls back to English and records the miss", () => {
    expect(translate("fr-FR", "Untranslated line")).toBe("Untranslated line");
    expect(missingTranslations("fr-FR")).toContain("Untranslated line");
  });
});

describe("pickData", () => {
  const EN = { lines: ["one", "two"] };
  it("returns the English object itself for English", () => {
    registerData("fr-FR", "k", { lines: ["un", "deux"] });
    expect(pickData("en", "k", EN)).toBe(EN);
  });
  it("returns the registered twin for its locale", () => {
    registerData("fr-FR", "k", { lines: ["un", "deux"] });
    expect(pickData("fr-FR", "k", EN)).toEqual({ lines: ["un", "deux"] });
  });
  it("falls back to English when no twin is registered", () => {
    expect(pickData("fr-FR", "missing", EN)).toBe(EN);
  });
});

describe("resolveLocale", () => {
  it("maps the ?lang param and the code", () => {
    expect(resolveLocale("fr")).toBe("fr-FR");
    expect(resolveLocale("FR")).toBe("fr-FR");
    expect(resolveLocale("fr-FR")).toBe("fr-FR");
    expect(resolveLocale("en")).toBe("en");
  });
  it("defaults to English for anything unknown", () => {
    for (const v of [undefined, null, "", "xx", 42, "fr-CA"]) expect(resolveLocale(v)).toBe("en");
  });
  it("isKnownLocale", () => {
    expect(isKnownLocale("fr")).toBe(true);
    expect(isKnownLocale("de")).toBe(false);
  });
  it("English carries no suffixes, so attribution strings stay byte-identical", () => {
    expect(LOCALES.en.suffix).toEqual({ product: "", aweber: "" });
    expect(LOCALES.en.market.stripeLocale).toBeUndefined();
  });
});
