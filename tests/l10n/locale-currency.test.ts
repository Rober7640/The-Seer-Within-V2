// The payment-side decisions a non-English locale changes: charge currency,
// Stripe Checkout `locale`, and which countries the shipping form accepts.
// English MUST be byte-identical to today — usd, no stripe locale, base shipping
// list unchanged.
import { describe, expect, it } from "vitest";
import { requestCurrency, requestStripeLocale, shippingCountries, withLocale } from "../../server/lib/locale";

describe("requestCurrency", () => {
  it("is usd for English (and outside a request)", () => {
    expect(requestCurrency("en")).toBe("usd");
    expect(requestCurrency()).toBe("usd");
  });
  it("is eur for a French order", () => {
    expect(requestCurrency("fr-FR")).toBe("eur");
    expect(withLocale("fr-FR", () => requestCurrency())).toBe("eur");
  });
});

describe("requestStripeLocale", () => {
  it("is undefined for English (leave Stripe's own default, as today)", () => {
    expect(requestStripeLocale("en")).toBeUndefined();
    expect(requestStripeLocale()).toBeUndefined();
  });
  it("is fr for a French order", () => {
    expect(requestStripeLocale("fr-FR")).toBe("fr");
    expect(withLocale("fr-FR", () => requestStripeLocale())).toBe("fr");
  });
});

describe("shippingCountries", () => {
  const BASE = ["US", "CA", "GB", "AU", "NZ", "SG"];
  it("leaves the base list unchanged for English (US market)", () => {
    expect(shippingCountries(BASE, "en")).toEqual(BASE);
  });
  it("adds the locale's market country (FR) for a French order", () => {
    expect(shippingCountries(BASE, "fr-FR")).toContain("FR");
    // everything that was there is still there, order preserved
    expect(shippingCountries(BASE, "fr-FR").slice(0, BASE.length)).toEqual(BASE);
  });
  it("does not duplicate a country already in the base list", () => {
    expect(shippingCountries([...BASE, "FR"], "fr-FR")).toEqual([...BASE, "FR"]);
  });
});
