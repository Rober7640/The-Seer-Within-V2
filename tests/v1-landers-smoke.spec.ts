import { test, expect, type Page } from "@playwright/test";

// Read-only smoke checks for the V1 landers. No chat, no lead capture, no
// checkout — just verify each route mounts, renders meaningful content, and
// does NOT fall into the App.tsx ErrorBoundary ("Something went wrong").
// Safe to run against the shared dev/prod DB: page loads only.

const LANDERS: Array<{ route: string; name: string; expect: RegExp }> = [
  { route: "/", name: "homepage", expect: /Blocking My Path|Evelyn/i },
  { route: "/fb", name: "fb", expect: /Blocking My Path|Evelyn/i },
  { route: "/fb2", name: "fb2", expect: /Blocking My Path|Evelyn/i },
  { route: "/gdn", name: "gdn", expect: /Blocking My Path|Evelyn/i },
  { route: "/fb-palm", name: "fb-palm", expect: /palm|hand|reading|Evelyn/i },
  { route: "/evelyn", name: "evelyn", expect: /Evelyn/i },
  { route: "/soulmate", name: "soulmate", expect: /Soulmate|interest/i },
];

async function smoke(page: Page, route: string, contentRe: RegExp) {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  const resp = await page.goto(route, { waitUntil: "domcontentloaded" });
  // SPA: the HTML shell is always 200; assert the server served it.
  expect(resp?.status(), `HTTP status for ${route}`).toBeLessThan(400);

  // App mounted: #root has rendered children.
  const root = page.locator("#root");
  await expect(root, `#root mounted for ${route}`).not.toBeEmpty({ timeout: 15000 });

  // Did NOT hit the ErrorBoundary.
  await expect(
    page.getByText("Something went wrong", { exact: false }),
    `${route} should not show ErrorBoundary`,
  ).toHaveCount(0);

  // Rendered meaningful content (not a blank/white page).
  const text = (await root.innerText()).trim();
  expect(text.length, `${route} rendered non-trivial content`).toBeGreaterThan(40);

  // Lander-specific content present.
  await expect(root, `${route} shows expected lander content`).toContainText(contentRe, {
    timeout: 15000,
  });

  // No uncaught JS exceptions during load.
  expect(pageErrors, `${route} uncaught page errors`).toEqual([]);
}

for (const l of LANDERS) {
  test(`V1 lander renders: ${l.name} (${l.route})`, async ({ page }) => {
    await smoke(page, l.route, l.expect);
  });
}
