import { test, expect, type Page } from "@playwright/test";

// Render-parity for the /evelyn lander MECHANIC switch (evelyn_lander_mechanic A/B).
//
// EvelynLanderPage now resolves its mechanic from useABVariant("evelyn_lander",
// "mechanic", "quiz") instead of a hard-pin. This spec proves the two structural
// branches BOTH render correctly and independently:
//   - default → whichever arm the experiment assigns (quiz while dormant; quiz OR
//     chatbox once evelyn_lander_mechanic is running — sticky per visitor)
//   - ?mechanic=quiz    → the tap-quiz  (EvelynQuizMechanic)
//   - ?mechanic=chatbox → the open 2-turn chatbox (inline in EvelynLanderPage)
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
//   QUIZ   → intro CTA "Begin My Reading" + uppercase "EVELYN CROSS" heading.
//   CHATBOX→ the message composer placeholder + "Two messages with Evelyn" hint.
const QUIZ_CTA = /Begin My Reading/i;
const CHATBOX_PLACEHOLDER = "Tell Evelyn what's on your mind…";
const CHATBOX_HINT = "Two messages with Evelyn";

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

async function expectQuiz(page: Page) {
  await expect(page.getByRole("button", { name: QUIZ_CTA })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("heading", { name: "EVELYN CROSS" })).toBeVisible();
  // The chatbox composer must NOT be on the page.
  await expect(page.getByPlaceholder(CHATBOX_PLACEHOLDER)).toHaveCount(0);
}

async function expectChatbox(page: Page) {
  await expect(page.getByPlaceholder(CHATBOX_PLACEHOLDER)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(CHATBOX_HINT, { exact: false })).toBeVisible();
  // The quiz intro CTA must NOT be on the page.
  await expect(page.getByRole("button", { name: QUIZ_CTA })).toHaveCount(0);
}

test("default /evelyn renders its assigned mechanic (quiz or chatbox) + fires /assign", async ({ page }) => {
  // The default arm is experiment-driven: `quiz` while evelyn_lander_mechanic is
  // dormant, or quiz/chatbox (sticky per visitor) once it's running. Assert exactly
  // one mechanic renders and that the re-wired bundle actually consulted /assign.
  const pageErrors = trackPageErrors(page);
  const assignReq = page.waitForRequest(
    (r) => r.url().includes("/api/ab/assign") && r.url().includes("page=evelyn_lander"),
    { timeout: 20000 },
  );
  await page.goto("/evelyn", { waitUntil: "domcontentloaded" });
  const quiz = page.getByRole("button", { name: QUIZ_CTA });
  const chatbox = page.getByPlaceholder(CHATBOX_PLACEHOLDER);
  await expect(quiz.or(chatbox).first()).toBeVisible({ timeout: 20000 });
  const quizShown = await quiz.isVisible();
  const chatboxShown = await chatbox.isVisible();
  expect(quizShown !== chatboxShown, "exactly one mechanic renders").toBe(true);
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
