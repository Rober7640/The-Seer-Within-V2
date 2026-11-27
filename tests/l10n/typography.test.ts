import { describe, expect, it } from "vitest";
import { applyLocaleTypography, typographyIssues } from "../../shared/typography";

const fr = (s: string) => applyLocaleTypography(s, "fr-FR");
const N = "\u202f", B = "\u00a0";

describe("French typography", () => {
  const cases: [string, string][] = [
    ["Vraiment ?", `Vraiment${N}?`],
    ["Vraiment?", `Vraiment${N}?`],
    ["Oui !", `Oui${N}!`],
    ["Quoi ?!", `Quoi${N}?!`],
    ["Écoutez : il revient.", `Écoutez${B}: il revient.`],
    ["Écoutez: il revient.", `Écoutez${B}: il revient.`],
    ['Il a dit "je reviens" hier.', `Il a dit «${B}je reviens${B}» hier.`],
    ["« bonjour »", `«${B}bonjour${B}»`],
    ["Rendez-vous à 12:30 ; merci", `Rendez-vous à 12:30${N}; merci`],
    ["Voir https://theseerwithin.com/refund?x=1 !", `Voir https://theseerwithin.com/refund?x=1${N}!`],
    ["Écrivez à hi@theseerwithin.com ?", `Écrivez à hi@theseerwithin.com${N}?`],
    ["Merci {firstName} !", `Merci {firstName}${N}!`],
    ["Super :)", "Super :)"],
    ["Bien ;)", "Bien ;)"],
  ];
  for (const [from, to] of cases) it(JSON.stringify(from), () => expect(fr(from)).toBe(to));

  it("is idempotent", () => {
    for (const [from] of cases) expect(fr(fr(from))).toBe(fr(from));
  });
  it("English is untouched", () => {
    expect(applyLocaleTypography('Really ? "Yes": no !', "en")).toBe('Really ? "Yes": no !');
  });
  it("reports issues on unfixed French", () => {
    expect(typographyIssues("Vraiment?", "fr-FR").length).toBe(1);
    expect(typographyIssues(`Vraiment${N}?`, "fr-FR")).toEqual([]);
  });
});
