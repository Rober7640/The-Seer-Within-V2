import { test, expect, type Page } from "@playwright/test";
import { parsePalmParams } from "../client/src/content/palmReads";

// Browser smoke for the NEW `thumb-angle` fb-palm sign — "does your life line's arc
// run true with the line of your thumb".
//
//   A = ALIGNED, the two agree        → "the true heart"
//   B = NOT aligned, each its own way → "the seeking heart"
//
// That mapping is a SETTLED business ruling (Lewis, per Rio, 2026-07-21). It
// supersedes an earlier "open-handed / close-held" reading AND a GPT analysis that
// had A and B reversed. It has been re-litigated twice, so it is asserted here
// explicitly — if someone recomposites the strip or swaps the copy, these fail.
//
// Covers the three ad versions:
//   A (/fb-palm)    → result card, then CTA into chat
//   B (/fb-palm/b)  → straight to chat, static 4-beat opener
//   C (/fb-palm/c)  → straight to chat, mark line + question, then the LLM reads
//                     her answer via /api/chat `palmReflect` — the ONE call that
//                     can 400 if the server sign rosters weren't kept in sync.
//   C fallback      → /api/chat forced to fail; the funnel must NOT stall.
//
// ── RUN IT (isolated local sandbox — NEVER production) ────────────────────────
//   node scripts/make-sandbox-env.mjs
//   DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts
//   npx playwright test --config=playwright.fb-palm-thumb-angle.config.ts

const SIGN = "thumb-angle";
const CONTROL = "35_palm_u47";

const SLIDING = "55-35_palm";

// The client pixel id is hardcoded in index.html, so .env.sandbox cannot mute it.
// Every local page load would otherwise fire a REAL PageView at the live pixel.
const META = /facebook\.com|facebook\.net|fbcdn|connect\.facebook/i;

interface Guards {
  metaBlocked: string[];
  chat: { action: string; status: number }[];
  art: number[];
}

/** Block Meta at the network layer and record every /api/chat handoff. */
async function armGuards(page: Page): Promise<Guards> {
  const g: Guards = { metaBlocked: [], chat: [], art: [] };

  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (META.test(url)) {
      g.metaBlocked.push(url);
      return route.abort();
    }
    return route.continue();
  });

  page.on("response", async (res) => {
    if (res.url().includes(`${SIGN}-strip.png`)) g.art.push(res.status());
    if (!res.url().includes("/api/chat")) return;
    let action = "?";
    try {
      action = JSON.parse(res.request().postData() || "{}").action ?? "?";
    } catch {
      /* noop */
    }
    g.chat.push({ action, status: res.status() });
  });

  return g;
}

/** No /api/chat call may ever come back 400 — that is the roster-drift symptom. */
function assertNo400(g: Guards) {
  const bad = g.chat.filter((c) => c.status === 400);
  expect(
    bad,
    `🔴 chat handoff 400'd — a server sign roster is missing "${SIGN}" ` +
      `(routes.ts validSigns ×2). Got: ${JSON.stringify(g.chat)}`,
  ).toEqual([]);
}

test.describe.configure({ mode: "serial" });

test.describe(`fb-palm · ${SIGN}`, () => {
  test.beforeAll(({}, testInfo) => {
    const base = String(testInfo.project.use.baseURL ?? "http://127.0.0.1:5000");
    // Hard stop. This spec writes conversation rows and drives /api/lead's
    // AWeber/Resend/Kit side-effects. Dev and production SHARE one database, so
    // "dev" is not safe either — localhost against the 5433 sandbox only.
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)) {
      throw new Error(
        `REFUSING TO RUN against "${base}". This spec writes real conversation rows. ` +
          `Dev and production SHARE one database — run it only against a local server ` +
          `pointed at the isolated local Postgres sandbox (127.0.0.1:5433).`,
      );
    }
  });

  // ── Version A — the result card ────────────────────────────────────────────
  test("version A · renders the 2-up card, tap A reads 'the true heart', hands off", async ({ page }) => {
    const g = await armGuards(page);

    await page.goto(`/fb-palm?hook=soulmate-timing&sign=${SIGN}`, { waitUntil: "domcontentloaded" });

    // Screen 1 — the pick.
    await expect(page.getByText("According to Your Life Line's Arc")).toBeVisible();
    await expect(page.getByText(/look at the curve around your thumb/i)).toBeVisible();
    expect(g.art, "thumb-angle strip art served").toContain(200);

    // Exactly TWO options. thumb-angle is a 2-option sign; a stray C tile would
    // mean the `options` array and the `mark`/`reading` maps disagree.
    const a = await page.getByTestId("palm-thumb-a").boundingBox();
    const b = await page.getByTestId("palm-thumb-b").boundingBox();
    expect(a, "option A rendered").toBeTruthy();
    expect(b, "option B rendered").toBeTruthy();
    await expect(page.getByTestId("palm-thumb-c"), "there is no third option").toHaveCount(0);

    // Side-by-side (2 columns), equal size. thumb-angle does NOT set columns:1.
    expect(Math.round(b!.y), "tiles share a row").toBe(Math.round(a!.y));
    expect(Math.round(b!.x), "option B sits to the RIGHT of A").toBeGreaterThan(Math.round(a!.x));
    expect(Math.round(b!.width), "both tiles same width").toBe(Math.round(a!.width));

    // Panel aspect guards the strip dims in palmReads.ts: 1357x1027 / 2 panels
    // => each panel 678.5x1027 => h/w ~1.51. Wrong dims silently distort the art.
    const ratio = a!.height / a!.width;
    console.log(`\n  [A] tile ${Math.round(a!.width)}x${Math.round(a!.height)} (h/w ${ratio.toFixed(2)})`);
    expect(ratio, "panel is portrait (h/w ~1.51)").toBeGreaterThan(1.42);
    expect(ratio, "panel is portrait (h/w ~1.51)").toBeLessThan(1.61);

    // Screen 2 — the reading beat, using this sign's beatNoun.
    await page.getByTestId("palm-thumb-a").click();
    await expect(page.getByText(/Evelyn is reading your life line/i)).toBeVisible();

    // Screen 3 — the card. THE SETTLED RULING: A = aligned = the true heart.
    await expect(page.getByTestId("palm-continue")).toBeVisible({ timeout: 15_000 });
    const card = await page.locator("p", { hasText: /life line/i }).first().innerText();
    console.log(`  [A] card: ${card.slice(0, 90)}…`);
    expect(card, "A must be the ALIGNED read").toMatch(/runs true with the line of your thumb/i);
    expect(card, "A must be 'the true heart'").toMatch(/the true heart/i);
    expect(card, "A must NOT carry B's read").not.toMatch(/pulls away from your thumb|seeking heart/i);

    await expect(page.getByTestId("palm-continue")).toContainText(/There's more your life line is telling me/i);

    // Handoff — version A carries no &v=.
    await page.getByTestId("palm-continue").click();
    await page.waitForURL(/\/fb-palm\/chat\?/, { timeout: 20_000 });
    const q = new URL(page.url()).searchParams;
    expect(q.get("hook")).toBe("soulmate-timing");
    expect(q.get("thumb")).toBe("a");
    expect(q.get("sign")).toBe(SIGN);
    expect(q.get("v"), "version A sends no &v=").toBeNull();

    // The chat greeting must echo THIS sign's archetype, not a fallback sign's.
    await expect(page.getByText(/the true heart/i).first()).toBeVisible({ timeout: 30_000 });
    assertNo400(g);
    console.log(`  [A] Meta requests blocked: ${g.metaBlocked.length}`);
  });

  // ── The B option carries the OTHER meaning ─────────────────────────────────
  test("version A · tap B reads 'the seeking heart' (the panels are not swapped)", async ({ page }) => {
    const g = await armGuards(page);
    await page.goto(`/fb-palm?hook=soulmate-timing&sign=${SIGN}`, { waitUntil: "domcontentloaded" });

    await page.getByTestId("palm-thumb-b").click();
    await expect(page.getByTestId("palm-continue")).toBeVisible({ timeout: 15_000 });

    const card = await page.locator("p", { hasText: /life line/i }).first().innerText();
    console.log(`  [B] card: ${card.slice(0, 90)}…`);
    expect(card, "B must be the NOT-aligned read").toMatch(/pulls away from your thumb/i);
    expect(card, "B must be 'the seeking heart'").toMatch(/the seeking heart/i);
    expect(card, "B must NOT carry A's read").not.toMatch(/runs true with the line of your thumb|true heart/i);
    assertNo400(g);
  });

  // ── Version B — straight into chat, static opener ──────────────────────────
  test("version B · taps straight into chat and delivers the 4-beat opener", async ({ page }) => {
    const g = await armGuards(page);
    await page.goto(`/fb-palm/b?hook=already-met&sign=${SIGN}`, { waitUntil: "domcontentloaded" });

    await page.getByTestId("palm-thumb-a").click();
    await page.waitForURL(/\/fb-palm\/chat\?/, { timeout: 20_000 });
    expect(new URL(page.url()).searchParams.get("v")).toBe("b");

    // Version B has no result card — the read is delivered as chat bubbles.
    await expect(page.getByText(/runs true with the line of your thumb/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/already come into your life/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/what's your first name, dear/i).first()).toBeVisible({ timeout: 40_000 });
    await expect(page.getByTestId("input-chat-message")).toBeEnabled();

    assertNo400(g);
    console.log(`  [B] Meta requests blocked: ${g.metaBlocked.length}`);
  });

  // ── Version C — the live LLM reflect. THE 400 RISK. ────────────────────────
  test("version C · palmReflect returns 200 (not 400) and continues to name capture", async ({ page }) => {
    const g = await armGuards(page);
    await page.goto(`/fb-palm/c?hook=love-again&sign=${SIGN}`, { waitUntil: "domcontentloaded" });

    await page.getByTestId("palm-thumb-b").click();
    await page.waitForURL(/\/fb-palm\/chat\?/, { timeout: 20_000 });
    expect(new URL(page.url()).searchParams.get("v")).toBe("c");

    // C opens with the mark line + one open question, then waits for her answer.
    await expect(page.getByText(/pulls away from your thumb/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/what's been weighing on your heart since it happened/i).first())
      .toBeVisible({ timeout: 30_000 });

    const input = page.getByTestId("input-chat-message");
    await expect(input).toBeEnabled({ timeout: 20_000 });
    await input.fill("He left in March and I still reach for my phone every night.");

    const reflect = page.waitForResponse(
      (r) => r.url().includes("/api/chat") && r.request().postData()?.includes("palmReflect") === true,
      { timeout: 90_000 },
    );
    await page.getByTestId("button-send-message").click();
    const res = await reflect;

    console.log(`  [C] palmReflect → ${res.status()}`);
    expect(
      res.status(),
      `🔴 palmReflect rejected sign="${SIGN}" — routes.ts validSigns is missing it`,
    ).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.messages) && body.messages.length, "LLM returned messages").toBeTruthy();
    console.log(`  [C] reflect: ${String(body.messages[0]).slice(0, 90)}…`);

    // …and the funnel moves on to name capture.
    await expect(page.getByText(/what should I call you, dear/i).first()).toBeVisible({ timeout: 60_000 });
    assertNo400(g);
    console.log(`  [C] Meta requests blocked: ${g.metaBlocked.length}`);
  });

  // ── Version C — failure injection. The funnel must never stall. ────────────
  test("version C · reflect FALLBACK renders the static read when /api/chat dies", async ({ page }) => {
    const g = await armGuards(page);
    // Kill the reflect call specifically (the opener is static, so C still starts).
    await page.route("**/api/chat", (route) => route.abort("failed"));

    await page.goto(`/fb-palm/c?hook=love-again&sign=${SIGN}`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("palm-thumb-b").click();
    await page.waitForURL(/\/fb-palm\/chat\?/, { timeout: 20_000 });

    const input = page.getByTestId("input-chat-message");
    await expect(input).toBeEnabled({ timeout: 30_000 });
    await input.fill("I don't know how to explain it.");
    await page.getByTestId("button-send-message").click();

    // palmReflectFallback = the static build minus the mark line already shown:
    // the mirror beat, the yes beat, then the open loop.
    await expect(page.getByText(/asking if love comes again/i).first()).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText(/still looking for the one worth stopping for/i).first())
      .toBeVisible({ timeout: 40_000 });
    // …and it STILL reaches name capture. A stall here is the funnel-freeze bug.
    await expect(page.getByText(/what should I call you, dear/i).first()).toBeVisible({ timeout: 40_000 });
    console.log(`  [C-fallback] survived a dead /api/chat · Meta blocked: ${g.metaBlocked.length}`);
  });

  // ── Server contract + pricing safety (API level) ───────────────────────────
  test("server accepts thumb-angle on both palm chat actions", async ({ request }) => {
    // palmOpener is not currently called by the client, but it shares the sign
    // roster — checking it proves BOTH validSigns arrays in routes.ts are in sync.
    for (const action of ["palmOpener", "palmReflect"] as const) {
      const res = await request.post("/api/chat", {
        data: {
          action,
          palmSign: SIGN,
          palmHook: "already-met",
          palmThumb: "a",
          userData: { firstName: "", bucket: "love" },
          input: action === "palmReflect" ? "I keep thinking about him." : "",
        },
        timeout: 90_000,
      });
      console.log(`  [api] ${action} → ${res.status()}`);
      expect(res.status(), `🔴 ${action} rejected sign="${SIGN}"`).not.toBe(400);
      expect(res.ok(), `${action} failed: ${res.status()}`).toBeTruthy();
    }
  });

  test("thumb-angle draws ONLY the $35 control — never the retired $55 sliding arm", async ({ request }) => {
    // Once the sliding close is retired (parked at weight 0), the palm pool has a
    // single drawing arm and every sign — thumb-angle included — is 100% control.
    //
    // The commitment gate does NOT appear here and must not: it is the
    // `v1_palm_commitment_gate_2026` EXPERIMENT, not a price variant, so it never
    // changes `priceVariant` or the price. It rides on the same /api/lead response
    // as a separate `commitmentGate` boolean, asserted below.
    //
    // (An earlier draft of this test allowed a `35_palm_gate` pool id here. That
    // design was dropped because a pool arm can only be drawn for an email with no
    // stored variant, which would have excluded every returning visitor from the
    // treatment while leaving them all in the control.)
    //
    // This is the integration counterpart to server/lib/priceVariantPool.test.ts.
    const seen: Record<string, number> = {};
    const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    for (let i = 0; i < 12; i++) {
      const res = await request.post("/api/lead", {
        data: {
          email: `tatest+${run}-${i}@example.com`,
          firstName: "TaTest",
          bucket: "love",
          funnel: "v1-palm",
          sign: SIGN,
        },
      });
      expect(res.ok(), `/api/lead failed: ${res.status()}`).toBeTruthy();
      const r = await res.json();
      seen[r.priceVariant ?? "(none)"] = (seen[r.priceVariant ?? "(none)"] ?? 0) + 1;
      expect(r.priceDollars, "main stays $35").toBe(35);
      expect(r.downsellDollars, "downsell stays $25").toBe(25);
      // The gate flag is always present and always a boolean, whatever arm the
      // experiment gave: a missing field would silently mean "no gate" forever.
      expect(typeof r.commitmentGate, "/api/lead must always return commitmentGate").toBe("boolean");
    }

    console.log(`  [price] ${JSON.stringify(seen)}`);
    expect(seen[SLIDING], `🔴 CONTAMINATION: ${SIGN} drew the retired $55 sliding arm`).toBeUndefined();
    for (const id of Object.keys(seen)) {
      expect([CONTROL], `${SIGN} drew unexpected variant ${id}`).toContain(id);
    }
  });

  // ── Tracking wiring ────────────────────────────────────────────────────────
  // Nothing here lets a request reach Meta. We pre-define `window.fbq` BEFORE any
  // page script; the official snippet opens with `if(f.fbq)return;`, so ours
  // survives and fbevents.js is NEVER injected. We therefore record exactly what
  // the app asks the pixel to do, entirely offline.

  test("tracking · PageView fires to the DEFAULT palm pixel on bridge AND chat", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__fbq = [];
      const rec = (...args: unknown[]) => {
        ((window as unknown as Record<string, unknown>).__fbq as unknown[]).push(args);
      };
      (window as unknown as Record<string, unknown>).fbq = rec;
      (window as unknown as Record<string, unknown>)._fbq = rec;
    });

    const capi: { name: string; status: number }[] = [];
    const leaked: string[] = [];
    await page.route("**/*", (route) => {
      const u = route.request().url();
      if (META.test(u)) {
        leaked.push(u);
        return route.abort();
      }
      return route.continue();
    });
    page.on("response", (res) => {
      if (!res.url().includes("/api/fb-event")) return;
      let name = "?";
      try {
        name = JSON.parse(res.request().postData() || "{}").eventName ?? "?";
      } catch {
        /* noop */
      }
      capi.push({ name, status: res.status() });
    });

    await page.goto(`/fb-palm/c?hook=already-met&sign=${SIGN}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("palm-thumb-a")).toBeVisible();
    await page.waitForTimeout(2500);

    type Call = unknown[];
    const onBridge = (await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__fbq as Call[],
    )) ?? [];
    const pageViews = (calls: Call[]) =>
      calls.filter((c) => c[0] === "trackSingle" && c[2] === "PageView");

    console.log(`\n  [track] bridge fbq calls: ${JSON.stringify(onBridge)}`);
    expect(pageViews(onBridge).length, "PageView fired on the bridge").toBeGreaterThan(0);
    // Pixel is chosen from the PATH, so thumb-angle must land on the default palm
    // pixel — the same one /fb and the existing palm signs use.
    expect(pageViews(onBridge)[0][1], "on the DEFAULT palm pixel").toBe("446814716830295");
    expect(
      onBridge.some((c) => c[0] === "init" && c[1] === "446814716830295"),
      "default pixel was init'd",
    ).toBeTruthy();

    // …and again after the SPA navigation into the chat (/fb-palm/chat also
    // matches the `/fb` PageView allowlist in App.tsx).
    await page.getByTestId("palm-thumb-a").click();
    await page.waitForURL(/\/fb-palm\/chat\?/, { timeout: 20_000 });
    await page.waitForTimeout(2500);

    const afterNav = (await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__fbq as Call[],
    )) ?? [];
    console.log(`  [track] PageViews total: ${pageViews(afterNav).length}`);
    expect(
      pageViews(afterNav).length,
      "a second PageView fired on /fb-palm/chat",
    ).toBeGreaterThan(pageViews(onBridge).length);

    // Server CAPI relay: the client must POST /api/fb-event for each PageView and
    // the server must accept it. (It does NOT forward — FB_ACCESS_TOKEN is blank
    // in the sandbox — which is exactly what the log audit confirms.)
    console.log(`  [track] CAPI relay: ${JSON.stringify(capi)}`);
    expect(capi.map((c) => c.name), "PageView relayed to the server").toContain("PageView");
    expect(capi.find((c) => c.name === "PageView")?.status, "server accepted the relay").toBe(200);

    // Proof of containment: fbevents.js was never injected, so nothing was blocked.
    console.log(`  [track] requests that tried to reach Meta: ${leaked.length}`);
    expect(leaked, "pixel stub kept everything offline").toEqual([]);
  });

  test("tracking · sign attribution resolves to thumb-angle, not the 'thumb' fallback", () => {
    // PostHog tags palm checkout/lead events with
    //   parsePalmParams(window.location.search)?.sign ?? 'thumb'
    // so if parsePalmParams REJECTED this sign, thumb-angle traffic would be
    // silently attributed to `thumb` — quietly corrupting both split tests
    // rather than failing loudly. Guard every hook × option combo.
    for (const hook of ["soulmate-timing", "already-met", "love-again"] as const) {
      for (const opt of ["a", "b"] as const) {
        const p = parsePalmParams(`?hook=${hook}&thumb=${opt}&sign=${SIGN}&v=c`);
        expect(p, `parsePalmParams rejected ${hook}/${opt} — would fall back to 'thumb'`).not.toBeNull();
        expect(p!.sign, "attributed to thumb-angle").toBe(SIGN);
        expect(p!.hook).toBe(hook);
        expect(p!.thumb).toBe(opt);
      }
    }
    // The option this sign does NOT offer must still be rejected.
    expect(parsePalmParams(`?hook=already-met&thumb=c&sign=${SIGN}`), "no third option").toBeNull();
  });
});
