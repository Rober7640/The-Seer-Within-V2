import { test, expect, type Page } from "@playwright/test";

// The lander's sessionStorage cache must not outlive a change of campaign.
//
// WHY THIS EXISTS. EvelynLanderPage caches the conversation so a REFRESH
// mid-chat doesn't lose the thread. The restore path returns BEFORE /start is
// called — deliberately, since re-fetching would overwrite what the reader has
// already said. But the cache was untagged, so it was replayed for ANY later
// arrival in the same tab, including one carrying a different campaign:
//
//   reader opens Monday's email  → lander opens with Monday's line, cached
//   reader leaves without finishing
//   reader clicks Tuesday's email → cache restored → MONDAY's line again
//
// Nothing errors. Her session is tagged with Tuesday's campaign server-side, so
// the screen and the record disagree, and the single promise this lander
// makes — that it continues the email you just clicked — is what breaks. Found
// on development 2026-08-18: three different /e/ codes all opened with the same
// stale line, and the codes were fine; the cache was masking them.
//
// The fix stamps the campaign alongside the history and discards the cache when
// they differ. These cases pin both halves: a DIFFERENT campaign must start
// fresh, and the SAME campaign must still restore (or the refresh-survival the
// cache exists for is gone).
//
// 🔒 SAFETY: localhost only, hard-refused otherwise. /start and /assign are
//    stubbed, so no lander session row is written and no experiment is touched.
//
// ── RUN IT ───────────────────────────────────────────────────────────────────
//   PORT=5100 BASE_URL=http://localhost:5100 npx cross-env NODE_ENV=development \
//     npx tsx --env-file=.env.test server/index.ts
//   npx playwright test --config=playwright.live-thread.config.ts

const COMPOSER = "Type your reply...";

// Two campaigns with unmistakably different openers — the whole point is telling
// which one the lander served, so near-identical copy would defeat the test.
const MONDAY = {
  campaign: "reframe-02-fence",
  opener: "You came to tell me about your fence — good. Tell me what it is you keep painting.",
};
const TUESDAY = {
  campaign: "reframe-08-lighthouse",
  opener: "You came to tell me about your lamp — good. Tell me which one you've let go dark.",
};

/** Serve each campaign its own opener, exactly as a resolved /e/ code would. */
async function harness(page: Page, counts: { start: number } = { start: 0 }) {
  await page.route("**/api/ab/assign**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ assignments: {} }) }),
  );
  await page.route("**/api/auth/me", (r) =>
    r.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );

  await page.route("**/api/evelyn-lander/start", (r) => {
    counts.start += 1;
    // The campaign the CLIENT asked for decides the opener, mirroring the real
    // /start since Task 15 (it resolves email_link_codes.continue_seed).
    let campaign = "";
    try {
      campaign = JSON.parse(r.request().postData() || "{}").campaign ?? "";
    } catch {
      /* ignore */
    }
    const opener =
      campaign === TUESDAY.campaign ? TUESDAY.opener
      : campaign === MONDAY.campaign ? MONDAY.opener
      : "Generic opener — no campaign resolved.";
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ segment: "brand_new", firstName: null, isReturning: false, opener }),
    });
  });

  await page.route("**/api/evelyn-lander/reply", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }),
  );

  return counts;
}

const landerUrl = (campaign: string) =>
  `/evelyn?mechanic=live_thread&campaign=${campaign}&bucket=love&src=aweber`;

test.describe("lander cache is scoped to the campaign", () => {
  test.beforeAll(({}, testInfo) => {
    const base = String(testInfo.project.use.baseURL ?? "");
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)) {
      throw new Error(`🔴 REFUSING to run against "${base}" — localhost sandbox only.`);
    }
  });

  test("a second campaign in the same tab gets ITS opener, not the first one's", async ({ page }) => {
    await harness(page);

    // Monday's email.
    await page.goto(landerUrl(MONDAY.campaign), { waitUntil: "domcontentloaded" });
    await expect(page.getByText(MONDAY.opener, { exact: false })).toBeVisible({ timeout: 20_000 });

    // She types, which is what writes the cache — an arrival alone would leave
    // less behind and would not reproduce the bug.
    await page.getByPlaceholder(COMPOSER).fill("It's the green fence, every spring.");
    await page.getByPlaceholder(COMPOSER).press("Enter");
    await expect(page.getByText("It's the green fence", { exact: false })).toBeVisible();

    // Tuesday's email, SAME TAB — sessionStorage survives a same-tab navigation.
    await page.goto(landerUrl(TUESDAY.campaign), { waitUntil: "domcontentloaded" });

    await expect(page.getByText(TUESDAY.opener, { exact: false })).toBeVisible({ timeout: 20_000 });
    // The load-bearing half: Monday must be gone, not merely outranked. Before
    // the fix this is what was on screen.
    await expect(page.getByText(MONDAY.opener, { exact: false })).toHaveCount(0);
    // ...and so must her Monday reply — restoring it under Tuesday's opener
    // would read as Evelyn answering a message about a different reading.
    await expect(page.getByText("It's the green fence", { exact: false })).toHaveCount(0);
  });

  test("a refresh on the SAME campaign restores from cache instead of re-fetching", async ({ page }) => {
    // The other half. Discarding on every arrival would "fix" the case above and
    // re-run /start on every refresh, which is what the cache was added to avoid.
    //
    // Asserted on the /start COUNT, not on the reader's own message: in this arm
    // her reply lives in LiveThreadLander's React state and is never written to
    // the page's history cache (only the opener is, from postStart). A refresh
    // therefore shows the opener without her reply — pre-existing behaviour, and
    // harmless because the reply is already parked server-side, which is the
    // guarantee that actually matters. Asserting the reply survived would be
    // asserting something this arm has never done.
    const counts = await harness(page);

    await page.goto(landerUrl(MONDAY.campaign), { waitUntil: "domcontentloaded" });
    await expect(page.getByText(MONDAY.opener, { exact: false })).toBeVisible({ timeout: 20_000 });
    expect(counts.start, "first arrival must hit /start").toBe(1);

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.getByText(MONDAY.opener, { exact: false })).toBeVisible({ timeout: 20_000 });
    expect(counts.start, "a refresh on the same campaign must restore, not re-fetch").toBe(1);
  });

  test("a direct visit with no campaign does not inherit a campaign's thread", async ({ page }) => {
    // null is a value here, not "no opinion": a reader who arrives from an email
    // and later opens the bare lander is a different arrival and must not be
    // shown the email's reading.
    await harness(page);

    await page.goto(landerUrl(MONDAY.campaign), { waitUntil: "domcontentloaded" });
    await expect(page.getByText(MONDAY.opener, { exact: false })).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder(COMPOSER).fill("It's the green fence, every spring.");
    await page.getByPlaceholder(COMPOSER).press("Enter");
    await expect(page.getByText("It's the green fence", { exact: false })).toBeVisible();

    await page.goto("/evelyn?mechanic=live_thread", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Generic opener", { exact: false })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(MONDAY.opener, { exact: false })).toHaveCount(0);
    await expect(page.getByText("It's the green fence", { exact: false })).toHaveCount(0);
  });
});
