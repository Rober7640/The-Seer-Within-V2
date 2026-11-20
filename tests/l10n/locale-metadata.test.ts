// The order's language on Stripe metadata. n8n's Stripe router sends `locale: "fr-FR"`
// orders to the French reading flow; an English order must carry no new key at all, so
// it keeps routing to the English flow exactly as today.
import { describe, expect, it } from "vitest";
import { localeMetadata, withLocale } from "../../server/lib/locale";

describe("localeMetadata (Stripe metadata.locale)", () => {
  it("adds nothing to an English order", () => {
    expect(withLocale("en", () => localeMetadata())).toEqual({});
    expect(localeMetadata("en")).toEqual({});
  });

  it("adds nothing outside a request (webhooks, crons): English", () => {
    expect(localeMetadata()).toEqual({});
  });

  it("marks a French order fr-FR", () => {
    expect(withLocale("fr-FR", () => localeMetadata())).toEqual({ locale: "fr-FR" });
  });
});
