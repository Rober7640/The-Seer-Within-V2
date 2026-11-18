// Every pick("key", …) in the client must be registered in localize/twins.json,
// or the extractor would never translate it and the page would stay English.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "localize/twins.json"), "utf8"));

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "l10n" && e.name !== "node_modules") walk(p, out); }
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

describe("data twin manifest", () => {
  const used = new Map<string, string>();
  for (const f of walk(path.join(root, "client/src"))) {
    for (const m of fs.readFileSync(f, "utf8").matchAll(/\b(?:pick|localizedPage)\(\s*['"]([^'"]+)['"]/g)) used.set(m[1], path.relative(root, f));
  }
  it("finds the pick() sites", () => expect(used.size).toBeGreaterThan(5));
  it("every pick() key is in localize/twins.json", () => {
    const missing = [...used].filter(([k]) => !manifest[k]).map(([k, f]) => `${k} (${f})`);
    expect(missing).toEqual([]);
  });
  it("every manifest entry points at a module that declares the export", () => {
    for (const [key, e] of Object.entries<any>(manifest)) {
      if (key.startsWith("_")) continue;
      const src = fs.readFileSync(path.join(root, e.module), "utf8");
      if (e.export !== "*") expect(new RegExp(`\\b(const|let|var|function)\\s+${e.export}\\b`).test(src), `${key} → ${e.module} ${e.export}`).toBe(true);
    }
  });
});
