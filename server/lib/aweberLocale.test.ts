// French (and future es) buyers go to their own AWeber lists, chosen by the
// ORDER's locale. The list id comes from a per-language env var; until Joel sets
// it, every locale falls back to the English list — so this ships dormant and
// English stays byte-identical.
import { describe, it, expect } from "vitest";
import { aweberLangSuffix, localizedAweberList } from "./aweberLocale";

describe("aweberLangSuffix", () => {
  it("is null for English / no locale (today's single-list behaviour)", () => {
    expect(aweberLangSuffix("en")).toBeNull();
    expect(aweberLangSuffix(undefined)).toBeNull();
  });
  it("is FRNCH for French (from suffix.aweber '-frnch')", () => {
    expect(aweberLangSuffix("fr-FR")).toBe("FRNCH");
  });
});

describe("localizedAweberList", () => {
  const EN = "6936955";
  it("returns the English list for English / no locale", () => {
    expect(localizedAweberList(EN, "AWEBER_PAID_LIST_ID", "en", {})).toBe(EN);
    expect(localizedAweberList(EN, "AWEBER_PAID_LIST_ID", undefined, {})).toBe(EN);
  });
  it("returns the English list for French while the env var is unset (dormant)", () => {
    expect(localizedAweberList(EN, "AWEBER_PAID_LIST_ID", "fr-FR", {})).toBe(EN);
  });
  it("returns the French list once its env var is set", () => {
    expect(
      localizedAweberList(EN, "AWEBER_PAID_LIST_ID", "fr-FR", { AWEBER_PAID_LIST_ID_FRNCH: "7001234" }),
    ).toBe("7001234");
  });
});
