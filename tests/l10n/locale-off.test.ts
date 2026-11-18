import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadLocale } from "../../client/src/lib/i18n";

describe("a locale with no bundle is off", () => {
  it("loadLocale reports whether the French bundle exists", async () => {
    expect(await loadLocale("en")).toBe(true);
    expect(await loadLocale("fr-FR")).toBe(existsSync("client/src/l10n/fr-FR/index.ts"));
  });
});
