import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadLocale } from "../../client/src/lib/i18n";

describe("a locale with no bundle is off", () => {
  it("loadLocale reports whether the French bundle exists", async () => {
    expect(await loadLocale("en")).toBe(true);
    expect(await loadLocale("fr-FR")).toBe(existsSync("client/src/l10n/fr-FR/index.ts"));
  });
  it("a locale not yet live is served by the dev server only", async () => {
    const { localeDef } = await import("../../shared/locales");
    expect(localeDef("en").live).toBe(true);
    expect(localeDef("fr-FR").live).toBe(false); // flips at gate G3
    expect(import.meta.env.DEV).toBe(true); // so this suite still loads French
  });
});
