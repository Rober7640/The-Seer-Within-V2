# Soulmate Initials Reading — PDF Engine (focused Job B deliverable)

**Goal:** A self-contained engine that turns one paid order (`firstName`, `dateOfBirth`, `stone`, `bump`, `sessionId`) into the finished **reading PDF** the buyer receives. Operator owns the plumbing (Stripe webhook → n8n → AWeber); this is the product the plumbing delivers.

**Scope confirmed with operator (2026-10-15):** build the PDF engine + generate real Claude-written sample PDFs. SKIP the Stripe webhook, n8n workflow, and AWeber wiring (operator does those). Engine is a clean callable so it drops into an n8n Code/HTTP node; the same HTML can feed PDFShift if the operator prefers that over local Playwright.

**Spec basis:** `docs/superpowers/specs/2026-10-12-evelyn-soulmate-initials-n8n-delivery-design.md` §1 (what the buyer gets) + §5 (reproducibility). Reuses `server/lib/numerologyEngine.ts` and the Evelyn voice from `server/lib/prompts.ts` / the 02 voice profile.

## What the buyer gets (one PDF, cover + three parts)
1. **Soulmate Initials Reading** — 7 cards, one question each (who he is · first initial · last initial · someone new or known · where · when · what he's like), plus a picture of the 7-card spread.
2. **Soulmate portrait** — 1,000+ words (personality, strengths/flaws).
3. **Bonus 1 — Heart Block Reading.** **Bonus 2 — Past Love Reading.** Plus a "your {stone} has been charged" page if `bump`.

## Build constraints
- **Deterministic + reproducible from `sessionId`:** same order → identical initials AND identical 7 cards, every run (FNV-1a → xorshift → Fisher-Yates). Pinned by unit tests.
- **Initials are facts, never invented by the model** — Pythagorean groups, seeded frequency-weighted pick, sub-1% starting letters excluded (no Q/X/Z/U/Y…), empty group falls back 9→1.
- **Card art looked up by slug from the draw, never from model text:** `…/evelyn/tarot-rws/<slug>.jpg`. If the S3 images aren't public, the spread renders an elegant styled card-name frame and we flag the upload as an operator asset — the PDF still opens.
- **Reading prose by Claude** (`@anthropic-ai/sdk`, key in `.env`), Evelyn voice; initials/cards/numbers passed in as facts. No worked-example sentences in prompts (they get copied verbatim).
- **No external PDF service needed locally:** render HTML→PDF with Playwright `page.pdf()` (already installed). HTML kept reusable so PDFShift can render the identical doc in n8n.
- Local-only; no network except the Anthropic call + (optional) fetching card art. No DB writes.

## Files
- `server/lib/soulmateReading/numbers.ts` — `{lifePath, firstNameNumber, personalYear}` from `firstName`+`dateOfBirth` (wraps numerologyEngine).
- `server/lib/soulmateReading/initials.ts` + `nameFrequency.ts` — `resolveInitials({lifePath, firstNameNumber, sessionId})`.
- `server/lib/soulmateReading/draw.ts` — `drawSeven(sessionId)` → 7 `{position, question, card, slug, imageUrl}`.
- `server/lib/soulmateReading/content.ts` — Claude calls: reading, portrait, heartBlock, pastLove, (+stonePage). Returns structured prose.
- `server/lib/soulmateReading/html.ts` — `buildReadingHtml(order, numbers, initials, draw, prose)` → full HTML (cover, spread image, 3 parts).
- `server/lib/soulmateReading/pdf.ts` — `renderPdf(html): Buffer` via Playwright.
- `server/lib/soulmateReading/index.ts` — `generateReadingPdf(order): {pdf, html, meta}` orchestrator.
- `server/scripts/soulmate-reading-sample.ts` — CLI + 3 fixtures (rose-quartz+bump, jade no-bump, garnet master-number DOB) → writes real PDFs.
- Tests: `tests/soulmate-initials-engine.test.ts` (numbers/initials/draw determinism + exclusions + fallback).

## Tasks
1. **numbers.ts** + test — reproducible numerology from firstName/dateOfBirth.
2. **initials.ts + nameFrequency.ts** + test — seeded, frequency-weighted, exclusions, 9→1 fallback, reproducible.
3. **draw.ts** + test — seeded 7-card draw, unique, reproducible, slug/imageUrl shape, 7 spec questions.
4. **content.ts** — Claude prose (reading/portrait/heartBlock/pastLove/stonePage), Evelyn voice, facts injected; one retry per call; throws on empty.
5. **html.ts + pdf.ts + index.ts** — HTML template + Playwright render + orchestrator; handle missing card art gracefully.
6. **CLI + fixtures** — generate 3 real sample PDFs; eyeball + iterate on layout.

## Out of scope
Stripe webhook, n8n workflow, AWeber email, the 20h delay, claim/undelivered endpoints, grading loop (operator can add later). Delivery timing + idempotency live in the operator's n8n.
