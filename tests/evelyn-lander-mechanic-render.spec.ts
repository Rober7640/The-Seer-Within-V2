import { test, expect, type Page } from "@playwright/test";

// Render-parity for the /evelyn lander MECHANIC switch (evelyn_lander_mechanic A/B).
//
// EvelynLanderPage now resolves its mechanic from useABVariant("evelyn_lander",
// "mechanic", "quiz") instead of a hard-pin. This spec proves the two structural
// branches BOTH render correctly and independently:
//   - default → whichever arm the experiment assigns (quiz while dormant; any
//     weighted arm once evelyn_lander_mechanic is running — sticky per visitor)
//   - ?mechanic=quiz        → the tap-quiz  (EvelynQuizMechanic)
//   - ?mechanic=chatbox     → the open 2-turn chatbox (inline in EvelynLanderPage)
//   - ?mechanic=live_thread → the Live Thread arrival surface (LiveThreadLander)
//
// live_thread ships DARK (seeded at weight 0, never assigned), so today only the
// explicit override can reach it — but the default-arm assertion below is written
// as "exactly one of THREE" so it does not turn into a false alarm on the day an
// operator weights the arm up and is watching this suite.
//
// The ?mechanic= override is DEV-BUILD-ONLY (import.meta.env.DEV). The Playwright
// webServer runs `npm run dev` with NODE_ENV=test, which serves the Vite dev build
// (server/index.ts only serveStatic()s when NODE_ENV==='production'), so DEV is
// true and the override is honoured here.
//
// These are pure render assertions — no signup, no Turnstile, no DB writes. The
// lander's /start call is fire-and-forget for the render (its catch still lands
// phase='chat'), so the mechanic paints whether or not the shared DB is reachable.

// Discriminators unique to each mechanic:
//   QUIZ       → intro CTA "Begin My Reading" + uppercase "EVELYN CROSS" heading.
//   CHATBOX    → the message composer placeholder + "Two messages with Evelyn" hint.
//   LIVE THREAD→ its own composer placeholder (deliberately DIFFERENT text from the
//                chatbox's, which is what makes the two chat-shaped arms tellable
//                apart at all) + the "secure" cue from the wireframe header.
const QUIZ_CTA = /Begin My Reading/i;
const CHATBOX_PLACEHOLDER = "Tell Evelyn what's on your mind…";
const CHATBOX_HINT = "Two messages with Evelyn";
const LIVE_THREAD_PLACEHOLDER = "Type your reply...";
const LIVE_THREAD_SECURE_CUE = "secure";

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

async function expectQuiz(page: Page) {
  await expect(page.getByRole("button", { name: QUIZ_CTA })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("heading", { name: "EVELYN CROSS" })).toBeVisible();
  // Neither of the other two mechanics' composers may be on the page.
  await expect(page.getByPlaceholder(CHATBOX_PLACEHOLDER)).toHaveCount(0);
  await expect(page.getByPlaceholder(LIVE_THREAD_PLACEHOLDER)).toHaveCount(0);
}

async function expectChatbox(page: Page) {
  await expect(page.getByPlaceholder(CHATBOX_PLACEHOLDER)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(CHATBOX_HINT, { exact: false })).toBeVisible();
  // The quiz intro CTA and the Live Thread composer must NOT be on the page.
  await expect(page.getByRole("button", { name: QUIZ_CTA })).toHaveCount(0);
  await expect(page.getByPlaceholder(LIVE_THREAD_PLACEHOLDER)).toHaveCount(0);
}

async function expectLiveThread(page: Page) {
  await expect(page.getByPlaceholder(LIVE_THREAD_PLACEHOLDER)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(LIVE_THREAD_SECURE_CUE, { exact: true })).toBeVisible();
  // Neither other mechanic may render. The chatbox check matters most: this arm
  // is an EARLY RETURN precisely so the chatbox layout below it never also paints
  // (two CosmicBackgrounds, nested Cards) — this assertion is what would catch a
  // regression back to an inline render.
  await expect(page.getByRole("button", { name: QUIZ_CTA })).toHaveCount(0);
  await expect(page.getByPlaceholder(CHATBOX_PLACEHOLDER)).toHaveCount(0);
}

test("default /evelyn renders exactly one assigned mechanic + fires /assign", async ({ page }) => {
  // The default arm is experiment-driven: `quiz` while evelyn_lander_mechanic is
  // dormant, or any weighted arm (sticky per visitor) once it's running. Assert
  // exactly one mechanic renders and that the re-wired bundle actually consulted
  // /assign. Counting all THREE arms — not just quiz XOR chatbox — is what keeps
  // this green when live_thread is eventually weighted up: with the old two-way
  // check, a live_thread visitor made BOTH sides false and failed the assertion.
  const pageErrors = trackPageErrors(page);
  const assignReq = page.waitForRequest(
    (r) => r.url().includes("/api/ab/assign") && r.url().includes("page=evelyn_lander"),
    { timeout: 20000 },
  );
  await page.goto("/evelyn", { waitUntil: "domcontentloaded" });
  const quiz = page.getByRole("button", { name: QUIZ_CTA });
  const chatbox = page.getByPlaceholder(CHATBOX_PLACEHOLDER);
  const liveThread = page.getByPlaceholder(LIVE_THREAD_PLACEHOLDER);
  await expect(quiz.or(chatbox).or(liveThread).first()).toBeVisible({ timeout: 20000 });
  const shown = [await quiz.isVisible(), await chatbox.isVisible(), await liveThread.isVisible()];
  expect(shown.filter(Boolean).length, "exactly one of the three mechanics renders").toBe(1);
  await assignReq;
  expect(pageErrors, "no uncaught page errors").toEqual([]);
});

test("?mechanic=quiz renders the quiz", async ({ page }) => {
  const pageErrors = trackPageErrors(page);
  await page.goto("/evelyn?mechanic=quiz", { waitUntil: "domcontentloaded" });
  await expectQuiz(page);
  expect(pageErrors, "no uncaught page errors").toEqual([]);
});

test("?mechanic=chatbox renders the 2-turn chatbox", async ({ page }) => {
  const pageErrors = trackPageErrors(page);
  await page.goto("/evelyn?mechanic=chatbox", { waitUntil: "domcontentloaded" });
  await expectChatbox(page);
  expect(pageErrors, "no uncaught page errors").toEqual([]);
});

// The DARK arm. Nothing else in this suite can reach it (weight 0 ⇒ never
// assigned), so without this test the third arm has no render coverage at all
// until the day it is weighted up — which is the worst possible day to discover
// it doesn't paint.
test("?mechanic=live_thread renders the Live Thread arrival surface", async ({ page }) => {
  const pageErrors = trackPageErrors(page);
  await page.goto("/evelyn?mechanic=live_thread", { waitUntil: "domcontentloaded" });
  await expectLiveThread(page);
  expect(pageErrors, "no uncaught page errors").toEqual([]);
});
