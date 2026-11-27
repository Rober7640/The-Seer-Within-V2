// The currency reported on the client-side Purchase pixels (FB + GAds). It MUST
// match what the server's Conversions API reports for the same event_id, so a
// French order reads EUR on both sides and English stays USD, byte-identical.
import { describe, expect, it, afterEach } from "vitest";
import { purchaseCurrency, __setLocaleForTests } from "./locale";

describe("purchaseCurrency", () => {
  afterEach(() => __setLocaleForTests(null));

  it("is USD for English and for no locale (unchanged from today)", () => {
    __setLocaleForTests("en");
    expect(purchaseCurrency()).toBe("USD");
    __setLocaleForTests(null);
    expect(purchaseCurrency()).toBe("USD");
  });

  it("is EUR for a French visit (matches the server's EUR charge)", () => {
    __setLocaleForTests("fr-FR");
    expect(purchaseCurrency()).toBe("EUR");
  });
});
