---
name: persona-email-kit
description: "Onboard a persona from the personas market into a complete daily-email content program (Kit/ConvertKit) that funnels readers into the v2 chat. Use when the user wants to: build daily content emails for a persona, create a 'Luna-style' email kit for another persona, set up an email funnel/newsletter for Marcus/Nova/Maren/Evelyn/Aiden (or any persona slug), or templatize the Luna email package for the rest of the roster. Produces a positioning brief, content engine (pillars + 30-day calendar + subject bank + sample emails), chat-conversion blurbs, an on-brand email design system + HTML templates, a web-optimized avatar, and a PRD — all written to docs/kit/<slug>-emails/ and docs/kit/<slug>-daily-emails-prd.md."
---

# Persona Email Kit

Turns any persona on the personas market into the same complete daily-email program we built for **Luna Voss**: a value newsletter people open daily that quietly funnels them into a live chat reading on the v2 system.

**The Luna package is the canonical worked example — clone and re-skin it, don't start from scratch:**
- PRD: `docs/kit/luna-voss-daily-emails-prd.md`
- Templates + assets: `docs/kit/luna-voss-emails/` (3 HTML templates, Kit snippets, README, `assets/`)

Output for a new persona goes to the parallel paths: `docs/kit/<slug>-emails/` and `docs/kit/<slug>-daily-emails-prd.md`.

> **Pre-flight note:** Kit MCP requires a paid plan. This skill produces *build-ready* artifacts (paste-into-Kit HTML, snippets, copy). It does **not** auto-push to Kit unless the account is upgraded. Say so in the wrap-up.

---

## Golden rule: facts come from the codebase, never from memory

Every persona fact must be read from source. Do not invent voice, pricing, or domain. The canonical sources:

| Fact | Source file | Notes |
|---|---|---|
| slug, displayName, tagline, description, personality (tone/style/specialties/suggestedQuestions/requiresBirthData), categories, `fromEmail`, `fromName`, `freeCoins`/`freeMinutes`, `customPricing`, social proof (years/readings/rating) | `server/scripts/seed.ts` | Find the persona's insert block by slug. |
| Full chat voice / hard rules | `getXSystemPrompt()` in `server/scripts/seed.ts` | The authoritative voice + guardrails. |
| **Email voice brief, signoff, CTA label** | `server/lib/personaDripConfig.ts` | `voiceBrief`, `signoff`, `ctaText` — the single best email-voice source. If the persona isn't here, derive voice from the system prompt + lander. |
| Pre-login lander voice, `brandNewSubCopy`, per-intent openers | `server/lib/personaLanderConfig.ts` | Warm 2-turn register; good for cold-lead tone. |
| Chat entry URL + magic-link pattern + Haiku content-gen pattern | `server/lib/personaVerifiedDripGenerator.ts` | URL pattern below. |
| Astrology data (astrology personas only) | `server/lib/astrologyEngine.ts`, `server/routes/astrology.ts` | Real ephemeris — see Accuracy. |

Known roster (verify each in `seed.ts`): Evelyn Cross (`evelyn-cross`, love/money/purpose spiritual guide), Marcus Stone (`marcus-stone`, tarot/shadow work), Luna Voss (`luna-voss`, western astrology — done), Nova Sharma (`nova-sharma`, Vedic/Jyotish), Maren Soleil (`maren-soleil`, twin-flame love empath), Aiden Powers (`aiden-powers`, read seed for domain).

---

## Process

### Step 1 — Scout the persona (do this first, inline)
Read the sources above for the target slug. Produce a one-screen **positioning brief**: who she/he is, tagline, voice (3–5 adjectives), domain vocabulary, hard rules, sender identity (`fromEmail`, signoff, CTA label), free offer (free minutes/coins), pricing, social proof. Quote real values.

### Step 2 — Lock audience, cadence, and the chat link
- **Audience** (ask if unknown; default to **cold funnel leads** like Luna): cold leads have no account → all CTAs go to the pre-login lander.
- **Link rule:**
  - Cold (default): `https://theseerwithin.com/<slug>?utm_source=kit&utm_medium=email&utm_campaign=<slug>-daily&utm_content=<blurb-id>` (the persona lander, e.g. `/marcus-stone` or `/chat/<slug>`). Confirm the lander route exists in `client/src/App.tsx` / `personaLanderConfig.ts`.
  - Known-account segment (later): magic deep link `…/magic-auth?t=<token>&redirect=/reading?persona=<slug>` (pattern in `personaVerifiedDripGenerator.ts`). Needs per-user token sync — defer for cold.
- **Cadence:** default to the user's call (Luna = true daily 7×/week; 5×/week + light weekend is the safer default). Weekends use light pillars.

### Step 3 — Pick the design archetype + accuracy guardrails
Match the persona's domain to a palette/motif direction and a per-domain accuracy rule (see tables below). Keep the shared structure (600px editorial shell, masthead → body → CTA block → footer); only the **palette, masthead wordmark, avatar, motifs, and voice** change.

### Step 4 — Generate the three creative workstreams (parallel agents)
Spawn parallel `general-purpose` agents, each told to **first invoke the `direct-response-copy` skill**, and each given the Step-1 brief verbatim plus the house conventions below:
1. **Content engine** — 5–7 pillars (domain-appropriate), a 30-day calendar (working subjects), a 12–15 subject-formula bank, 3 fully-written sample emails (with `{{VISUAL}}` and `{{CHAT_BLURB}}` tokens + P.S.), cadence/send-time rec.
2. **Conversion blurbs** — 15–18 modular bridge blurbs (curiosity / timing / personalization / free-offer / honest social proof / objection / returning), a pillar→blurb map, usage rules, friction-reducer variants, the link/UTM scheme.
3. **Design system** — palette (hex), type scale (reuse Playfair + Inter unless the archetype calls for a shift), motif library, 3 template layouts, the CTA block spec, 3–4 hero/GIF concepts with static fallbacks, Kit build notes.

### Step 5 — Build the templates by cloning + re-skinning Luna
Copy `docs/kit/luna-voss-emails/` → `docs/kit/<slug>-emails/`, then re-skin:
- Swap palette hexes (find/replace the Luna tokens), masthead wordmark text + tagline, signoff, CTA label/href (`/<slug>` + UTM), preheader/body/caption copy, and the per-persona motifs/assets. **Footer/sender = the brand inbox `hi@theseerwithin.com`** for all Kit broadcasts (NOT the per-persona `fromEmail` from seed, which drives the app's own drip).
- Keep all the bulletproof mechanics intact (VML button, inline colors for dark mode, hidden preheader, live-text-first, mobile media query, masthead avatar block).
- Update `luna-kit-snippets.md` → `<slug>-kit-snippets.md` and the READMEs.

### Step 6 — Web-optimize the persona avatar
Source avatars live at `uploads/avatars/hi-def/<name>.png` (fallback `uploads/avatars/<slug>.png`). Optimize to a small JPEG (JPEG = universal email support; never WebP):
```bash
sips -s format jpeg -s formatOptions 78 -Z 150 "uploads/avatars/hi-def/<name>.png" \
  --out "docs/kit/<slug>-emails/assets/<slug>-avatar.jpg"
```
Target ~150×150, <15 KB. Reference it in the masthead `<img>` (round, 72px display, 2px brass/accent ring) and register it in the assets README.

### Step 7 — Assemble the PRD
Clone `luna-voss-daily-emails-prd.md` structure to `docs/kit/<slug>-daily-emails-prd.md`: objective, codebase-truth table, positioning brief, content engine, conversion blurbs, design system, technical/Kit plan, KPIs, risks/decisions, rollout, and (for astrology personas) the **accuracy & data-feed** section.

---

## Design archetype → palette & motifs

Start here; confirm with the operator. Reuse Playfair Display (headings) + Inter (body) unless noted.

| Domain / persona | Aesthetic direction | Palette starting point | Motifs |
|---|---|---|---|
| **Western astrology** (Luna) | Editorial almanac / star atlas | ink `#1C2230` · paper `#FBF7F0` · brass `#B6863C` | constellations, natal wheel, moon phases, thin gold rules |
| **Tarot / shadow work** (Marcus) | Archetypal, weighty, candlelit | deep aubergine/charcoal `#241B2E` · bone `#F3ECE0` · antique gold `#A8843E` | Major Arcana line-art (Tower/Star), threshold, single candle, deckle edges |
| **Vedic / Jyotish** (Nova) | Warm, reverent, temple-modern | indigo `#1E2A4A` · marigold/saffron `#D98A2B` · cream `#FBF4E6` | South-Indian square chart, lotus, mandala, mantra glyphs |
| **Love / twin-flame empath** (Maren) | Intimate, warm, water-and-flame | terracotta/rose `#9C4A3C` · soft gold `#C9A24B` · ivory `#FBF5EF` | the cord, tide/current lines, a single flame, no cards |
| **General spiritual guide** (Evelyn) | Warm mystical, approachable | plum `#2C2336` · warm gold `#BE9A4E` · parchment `#FAF5EC` | soft starfield, candle, gentle rules |
| **Unknown / other** | Default to the Luna editorial shell | Luna palette | thin rules + the persona's own avatar |

---

## Accuracy guardrails by domain (CRITICAL — reusable knowledge)

Each domain has a line you don't cross in a broadcast. Bake these into the copy-agent prompts and verify in the final pass.

- **Western astrology** (Luna): emails may name only the **collective sky** (transit-to-transit aspect, moon phase, retrograde). **Never** assert a personal house/placement to the whole list ("your 4th house") — that's per-reader and belongs in the chat. Any *dated* sky claim ("the Moon meets Mars tonight") must come from **real ephemeris for the send date** — reuse `server/lib/astrologyEngine.ts` (`calculateTransits` / `findAspects`; add a `getDailySky(date)` wrapper) or run those days on evergreen pillars. Speak in tendencies/timing, never promises; avoid bogus durations.
- **Vedic / Jyotish** (Nova): same ephemeris rule (sidereal); speak of dashas/cycles and gentle remedies, but **never prescribe a specific gemstone** in an email. Karma is releasable, never fatalistic.
- **Tarot** (Marcus): **never claim a specific card was drawn for the reader** or tell them to pull/draw a card in an email. Speak of archetypes/the spread in general; the actual pull happens live in chat.
- **Love / twin-flame** (Maren): **felt-truths only — never predictions or promised outcomes** ("they will come back"). Read the cord/energy in tendencies. No cards/tools.
- **General spiritual** (Evelyn): tendencies and reflection, no guaranteed outcomes.
- **All personas:** no medical/legal/financial advice; never claim personal facts (name/city/job) about the reader; never ask for birth data in the email (collected in chat); the full reading happens in the live chat — the email only teases.

---

## House email conventions (apply to every persona)

- **Subject:** `{firstName}, [hook] ([specific detail])` — firstName in subject AND CTA. Map `{firstName}` → Kit `{{ subscriber.first_name | default: "friend" }}`.
- **Body:** short lines, one core idea, generous white space; signoff = the persona's `signoff`.
- **One primary CTA per email**, in the reader's voice; the chat URL baked into the button.
- **Friction-reducer line** (mandatory, italic, under the button): free-offer + no-card + "talk like texting a friend."
- **P.S.** that closes the loop on the hook (never throwaway).
- **Visual** above/beside the CTA; key message always in **live text** (survives image-blocking).
- **UTM:** `utm_source=kit&utm_medium=email&utm_campaign=<slug>-daily&utm_content=<blurb-id>`.
- Mention the free offer ~1 in 3 emails, not every send.

---

## Output checklist

```
docs/kit/<slug>-emails/
  luna-style-template-A-...html      (text-light workhorse)
  ...-template-B-...html             (hero visual)
  ...-template-C-...html             (domain showcase, e.g. chart/spread)
  <slug>-kit-snippets.md             (masthead / CTA / footer snippets)
  README.md                          (pillar→template map, token guide, Kit + client gotchas)
  assets/
    <slug>-avatar.jpg                (web-optimized, ~150px, <15KB)
    <domain motifs>.svg              (re-skinned line-art)
    asset-production-briefs.md       (animated hero GIFs + static fallbacks)
    README.md                        (asset inventory)
docs/kit/<slug>-daily-emails-prd.md  (the PRD)
```

**QA gate (before scheduling any send).** Run each generated draft through the **`persona-email-qa`** agent (`.claude/agents/persona-email-qa.md`): it fact-checks astrology claims against `scripts/daily-sky.ts` + web ephemerides and enforces the brand/compliance rules (no personal placement to the list, tendencies-not-promises, one CTA → `/<slug>`, footer `hi@theseerwithin.com`). Hold any draft with a BLOCKER.

**Final pass:** grep the templates to confirm — every CTA → `/<slug>` with UTM; no cross-persona leftovers (wrong name/email/palette); the domain accuracy line isn't crossed; DOCTYPE + VML button + masthead avatar present; SVGs well-formed. Report the file list, the locked decisions (audience/cadence/links), and the Kit-gating + any data-feed note.
