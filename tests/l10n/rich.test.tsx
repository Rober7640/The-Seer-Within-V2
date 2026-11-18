import { describe, it, expect, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { registerCatalog, __resetI18nForTests } from "@shared/i18n";
import { __setLocaleForTests } from "@/lib/locale";
import { tx } from "@/lib/rich";

const em = { em: (c: React.ReactNode) => <em>{c}</em> };
const html = (n: React.ReactNode) => renderToStaticMarkup(<p>{n}</p>);

beforeEach(() => { __resetI18nForTests(); __setLocaleForTests("en"); });

describe("tx (rich-text translation)", () => {
  it("English renders exactly the markup the JSX had", () => {
    expect(html(tx("Your reading showed you the <em>what</em>. It tells you the <em>why</em>.", em)))
      .toBe("<p>Your reading showed you the <em>what</em>. It tells you the <em>why</em>.</p>");
  });
  it("fills placeholders inside and outside tags", () => {
    expect(html(tx("Just {action} below, then press <b>{btn}</b>.", { b: (c) => <strong>{c}</strong> }, { action: "add your phone", btn: "Finish" })))
      .toBe("<p>Just add your phone below, then press <strong>Finish</strong>.</p>");
  });
  it("a buyer's name is never parsed as markup", () => {
    expect(html(tx("Hello {name}", {}, { name: "<em>x</em>" }))).toBe("<p>Hello &lt;em&gt;x&lt;/em&gt;</p>");
  });
  it("uses the translation, so the target language can move the tags", () => {
    registerCatalog("fr-FR", { "Press <b>Pay</b> now.": "Appuyez maintenant sur <b>Payer</b>." });
    __setLocaleForTests("fr-FR");
    expect(html(tx("Press <b>Pay</b> now.", { b: (c) => <strong>{c}</strong> })))
      .toBe("<p>Appuyez maintenant sur <strong>Payer</strong>.</p>");
  });
  it("an unknown tag renders its text plainly rather than vanishing", () => {
    expect(html(tx("a <zz>b</zz> c", {}))).toBe("<p>a b c</p>");
  });
});
