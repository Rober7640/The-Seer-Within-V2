# Evelyn V2 emails — the workflow

> **Developer:** the remaining technical steps for emails 01–07 are in [`DEV-HANDOFF.md`](DEV-HANDOFF.md).

Daily emails from Evelyn Cross to the V2 list that drive readers into a one-to-one chat with her at `/evelyn`. Every email gives something real first, then makes a **bold, honest pitch**.

Every email uses one **format** from [`formats/`](formats/). Each file says what the format is, where it comes from, its shape, its rules and its status. Devices that work inside any format: [`formats/devices.md`](formats/devices.md).

| | Format | In one line | Status |
|---|---|---|---|
| A | [Story](formats/A-story.md) | One true story in order → moral → "3 things she taught me" → pitch | ✅ Proven — 01 Grandma Moses |
| B | [Watermelon](formats/B-watermelon.md) | An ordinary thing with an old meaning: the WHAT free, the HOW in the chat | ✅ Built — 02 apple peel |
| C | [The Riddle](formats/C-riddle.md) | An old trick riddle → the answer is the lesson → onto love → chat | ✅ Locked — 03 five frogs |
| D | [The Old Book](formats/D-old-book.md) | One verbatim line from a real old fortune/love book → "a book can't read you, I can" | 🧪 To test |
| E | [Today's News](formats/E-todays-news.md) | A real, light love story from the news → Evelyn's take → chat | 🧪 To test |
| F | [The Fable](formats/F-fable.md) | An old fable → "Moral of the story" → onto love (variant of A) | 🧪 To test |
| G | [The List](formats/G-list.md) | "3 signs…" — the WHAT as a list; which one is hers is the chat (variant of B) | 🧪 To test |
| K | [What's Inside](formats/K-whats-inside.md) | Curiosity bullets about what she gets in the chat + two ways in (real scarcity only) | 🧪 To test |
| L | [The Dare](formats/L-dare.md) | "I dare you to…" — a true bet/dare story → her dare | ✅ Kept — 09 fifty words ("very well written") |
| M | [Guest Voice](formats/M-guest-voice.md) | Evelyn hands the email to another persona for a day | ❌ Dropped — "very confusing" (tested: 10 Marcus) |
| H | [Personal Story](formats/H-personal-story.md) | Furey's main format — "something that happened to me" | ⛔ Needs a decision on Evelyn's own life (canon) |
| I | [The Session](formats/I-the-session.md) | One reading told as a scene, with a result | ⛔ Needs a real client + permission |
| J | [Reader Letters](formats/J-reader-letters.md) | Real reader messages with Evelyn's replies | ⛔ Needs real letters + permission |

C–M come from Matt Furey, *Tao of Email Copywriting* (2006 newsletters; PDF page cited in each file).

## Stress-testing a format

A format isn't "ours" until one real email has gone through the whole workflow. For each 🧪 format, in the order above (C first):

1. Build ONE real email to preview (steps 1–6 below), plus its reading brief and a chat test.
2. Score it in its format file under `## Stress test result`:
   - **Read** — the operator's verdict (entertaining? clear?)
   - **Truth** — could every line be sourced without bending it?
   - **Chat** — does Evelyn's chat carry it on?
   - **Repeatable** — can we name 5 more emails in this format?
   - **Effort** — research/sourcing time per email
3. Verdict: ✅ keep · 🔧 keep with changes · ❌ drop. After sending: opens, clicks and chats per format go in the sends log.

When this file and a gold email disagree, the gold wins.

---

## The workflow — idea to send-ready

Delegate the writing to a subagent; the main thread decides, briefs, checks facts and audits. Show the operator each draft **before** running the gates.

| # | Step | Done when |
|---|---|---|
| 1 | **Pick the idea + format** (see the format table). Check the sends log: rotate formats; love first (~95% of the list came in with love questions); don't repeat a moral. | One line: idea · format · moral/mechanism · bucket |
| 2 | **Research + verify.** Every fact and quote from a real source (autobiography, museum/archive, folklore records; Wikipedia only if corroborated). Note where sources disagree. | `## Sources` table filled in the email file |
| 3 | **Write the body** to the format file's shape. | Draft shown to the operator |
| 4 | **Operator rounds.** Expect several on the hook and the CTA. Record each decision in the file's `## Notes` (what changed, the operator's words). | Operator says it's locked |
| 5 | **Picture.** Real person (A, E): a PD/CC0 photo. A ritual/scene (B, C, F): a pencil sketch (`scripts/sketch-prompt-template.txt`). | File in `assets/`, viewed, cropped |
| 6 | **Subject + preheader — LAST.** 3 options, different techniques; rules below. | Pick + challenger in the header |
| 7 | **Reading brief** — the 4 notes Evelyn gets when the reader arrives. Show them to the operator. | Operator OK |
| 8 | **Save the notes → short link** (`scripts/mint-short-links.mts`, writes to the LIVE database). | `**Short Link:**` in the header; `curl -I` → 302 to `/evelyn?campaign=…` |
| 9 | **Chat test** for any unusual mechanic (a ritual, a sign, an object): send 3–4 likely first messages and read Evelyn's replies. | She plays along, no promises, asks about her life |
| 10 | **Upload the picture** to S3 `evelyn/story/NN-slug.jpg`. | GET 200 |
| 11 | **Build the send files** (`build-email.py --send --image-url …`). | All links are `/e/<code>`; no preview strip; words + split printed |
| 12 | **Schedule** — only after an explicit "go" from the operator. | AWeber ids in the sends log |
| 13 | **Commit** on a fresh branch (not someone else's working branch). | Pushed |

---

## The formats

The full shape for each format lives in its own file in [`formats/`](formats/) — read the format file before writing. Everything below (subjects, CTAs, rules, reading brief, build) applies to **every** format.

---

## Substance devices (rotate — never the same one twice in a row)

Every email gives her something to take away. "3 things she taught me" is only ONE way — if every email uses it, the program reads like a template. Pick one device per email, record it in the sends log, vary the count (3 → 5 → 7).

| # | Device | What it looks like | Best for |
|---|---|---|---|
| 1 | **3 / 5 / 7 things [she] taught me** | Numbered, bold leads. 3 = two lines each; 5–7 = one punchy line each | Rich true stories (01 Grandma Moses) |
| 2 | **Ask yourself** | 3 yes/no questions about HER life, each tied to a fact from the story → *"If you hesitated on even one…"* | How love behaves (05 Tuesday rose) |
| 3 | **Myth vs truth** | *"You've been told… / [Her] story says…"* ×2–3 | Busting a belief ("too late", "the one finds you") |
| 4 | **Then vs now** | Short paired lines, before / after | Turnaround stories |
| 5 | **The one rule** | *"[Her] rule:"* one bold line + one example | One sharp point (03 riddle: "deciding isn't jumping") |
| 6 | **The timeline** | Stepped lines: *"7 years alone → a hallway → every Tuesday → June 20"* | Late love, comebacks |
| 7 | **Signs it's real / signs you're waiting** | Two short mirrored lists | Love-clarity emails |
| 8 | **One question to carry** | One bold question on its own line | Short formats (riddle, dare) |
| 9 | **Her own words** | The person's real quote as the lesson, then Evelyn reacts | A strong verbatim quote (04's *"more beloved than thou canst be now aware of"*) |

Rules: every item anchored to a sourced fact (no generic advice); the last item hands off to the pitch; WHAT not HOW (Furey's over-teaching warning).

---

## Subject + preheader (all formats) — write them LAST

1. **Draft 3 direct-response options, each a different technique:** curiosity + pain · pure curiosity · specific proof (numbers) · direct question about her · (B) the ritual's name · (C) the riddle itself.
2. **Check each against the rules:**
   - **Her name is optional** (operator, 2026-10-08). If you use it, put it **first** — `{{ subscriber.first_name | capitalize }}, ` (name-first opens ran ~30–40%; name-last tanked to 22%). Don't use it on every send — Furey's Mistake #1: *"a strength over-extended becomes a weakness"* (`formats/devices.md`). Mix sends with and without it, and compare opens in the sends log. Emoji optional too.
   - ≤120 bytes total — the name tag alone is ~40 bytes when used. **Measure it.**
   - The first lines of the email must pay it off.
   - ⛔ **Never imply Evelyn knows her personally** ("the 2 words I wish **you'd** stop saying" was rejected → talk about *people*, or ask her).
   - Prefer curiosity **with pain** over pure curiosity. Don't spoil the ending. No fake urgency, no bracket bait. Don't call an invented name traditional ("the One-Strip Ritual women did…" ✗).
   - ⛔ **Don't describe the object** ("the 1822 book that answered…", "the letter hiding in your fruit bowl") — the operator has called these "terrible". **Lead with HER pain or desire** — the winners so far: *"the 2 words that keep people stuck"*, *"does he love you more than he shows?"*. The story/book/ritual is how the email answers it, not what the subject is about.
   - Make the options **very different from each other** (a different technique each, not 3 rewordings) — and give the operator at least 3–4 to choose from.
3. **Pick one + a challenger** (AWeber can split 50/50 on subject). Record rejected lines in `_Subject history_`.
4. **Preheader** clarifies or extends — never a second puzzle, never the same words as the subject.

---

## Pitch shapes (rotate — never the same one twice in a row)

By email 07 every pitch said the same things ("So here's my invitation" 6/7 · "Just you and me, one to one" 7/7 · "Then I'll tell you plainly what I see" + ➤ 7/7 · "I won't promise…" 7/7 · the same button 7/7). Operator: *"every email seems to say something like here's the invitation."* Pick ONE shape per email; record it in the sends log.

| # | Shape | How it works | Used |
|---|---|---|---|
| 1 | **The invitation** | "So here's my invitation…" + one to one + ➤ outcomes | 01 |
| 2 | **Two doors** | Path A (do the thing) / path B (skip it, just talk to me) | 02 |
| 3 | **Permission** | "You don't have to decide anything today. Just tell me…" | 03 |
| 4 | **Candor** | "I'll be honest…" — what the story/book can't do, what Evelyn can | 04 |
| 5 | **What happens when you click** | "You type what's on your mind. I read it. We look at it together." — replaces the ➤ list | 05 |
| 6 | **The if-filter** | "This isn't for everyone. But if…" | 06 |
| 7 | **Straight question** | No lead-in: one question, then the link | 07 |
| 8 | **Columbo close** | The email ends fast with one line + link; the real pitch is a strong P.S. | — |

**The fixed lines rotate or rest too:** "one to one", the ➤ list, "I won't promise…", "type it like a friend" — none in every email. **The button label varies** per email (short, tied to the email, clearly a chat with Evelyn — 03: *"Tell Evelyn what's on your log"*). **Always kept:** the first-person no-precondition text link, a true free-minutes line (wording varies — *"New here? The first 3 minutes are on me."*), a true reason not to wait, and the P.S.

---

## CTA rules (all formats)

- **Two CTAs, not two buttons:** a bold underlined **text link** mid-pitch + **one solid button** at the end (purple `#5b2a6e`, the stronger label — varies per email, see Pitch shapes). Plus a P.S. text link. Two buttons = "too eye sore".
- **Every hyperlink `#0000EE`.**
- **First person** — the reader saying yes in her own words (*"I'm ready to explore my life purpose and open my mind to new possibilities →"*).
- ⛔ **No precondition.** *"I peeled my apple and I'm ready…"* was "terrible — if she doesn't do it, she won't click." The link must work for the reader who did nothing; put it after every path.
- **Free minutes, true wording only:** it must say or clearly mean *new users only* — e.g. *"if you've never talked to me before, your first 3 minutes are on me"*, *"New here? The first 3 minutes are on me."* (new users get 3 — `server/lib/personaLanderConfig.ts`). Vary the wording per email. Never "your first question is free".
- **Reason not to wait** = a callback to the story or the ritual's date. Never fake urgency.
- **Words she'll type back matter.** "broke" trips the chat's price-objection rule ("I'm broke") → ask "whether it snapped" / "stayed in one piece".

---

## Rules (all formats)

**Truth** — true public stories and documented folklore only; every fact/quote in `## Sources`. Never invent dialogue for real people, clients, testimonials or results. Where sources disagree, use the safe wording ("most of the old accounts say the left one"). No promises: no predicted outcome, no "it's not too late for you", no "you'll marry S" — it's what the ritual *says*.

**Voice** — Evelyn in first person; warm, plain, spoken, a touch playful. Short sentences, everyday words (grade ~3–5). "dear" 0–1×. Contractions on.

**Formatting** — bold ~6 lines (story turns / key claims, lesson leads, 2 pitch lines); 2–3 underlines; short paragraphs, many one-liners.

**Pictures**
- *Real person (A):* the real person, small (220px shown, 440px file), thin grey border, 2-line caption with credit. Public domain or CC0 only (e.g. National Portrait Gallery CC0 via Wikimedia Commons). Never their copyrighted artworks or press photos.
- *Real private people (E · news):* ⛔ never their faces or a likeness — a drawing of them in a paid-reading email implies they endorse it, and a likeness copies the news photos. Instead: the **moment, seen from behind / no faces** (05: the couple on the tube). People beat objects.
- *Ritual / scene (B, C, F):* a pencil sketch of the thing in action, made free with `codex exec` from `scripts/sketch-prompt-template.txt` (Evelyn's notebook style: graphite on off-white paper, slightly wobbly, older woman's hands). Crop the empty paper, 560px file shown at 280px, no border, no caption. Keep the original PNG in `assets/`.

**Audience** — ~95% love questions, mostly women 40+. Name love first, even when the story is about purpose.

---

## Reading brief + short link (REQUIRED before sending)

**Reading brief** = the code's own name (`server/lib/emailReadingBriefs.ts`) for the 4 notes; the feature is **email→chat continuity**. How it reaches the AI: the short link records which email she came from → the chat engine adds that email's reading brief to Evelyn's system prompt (`chatEngine.ts`, `arrivalReading.ts`) — **only if she arrived within 24 hours, and only for the first 4 messages**. That is why the Continue Seed (her first message) must set the topic.

Without them Evelyn's chat doesn't know which email the reader came from. In testing she answered *"I've never asked you to peel an apple, love. That wasn't me."* (6 of 6), and once called it a *banana* peel.

Each email carries 4 notes in its header:

| Field | What it is | Who sees it |
|---|---|---|
| `**Big Idea:**` | The one topic, as a short phrase Evelyn can say | Evelyn |
| `**Reading Recap:**` | What the email said — addressed to Evelyn ("You told them…") | Evelyn |
| `**Open Loop:**` | What the email asked the reader to bring | Evelyn |
| `**Continue Seed:**` | Evelyn's first message when the reader arrives — must work for a reader who skipped the email's task (e.g. no apple) | **The reader** |

Show them to the operator → save with `scripts/mint-short-links.mts` (wraps the site's own `upsertEmailLinkCodeForCampaign`; prints the target database before writing; one row per (persona `evelyn-cross`, campaign); re-running keeps the same code) → paste the printed link as `**Short Link:** \`https://www.theseerwithin.com/e/<code>?email={!email}\`` → `build-email.py` uses it for every link and warns if it's missing. `{!email}` is AWeber's tag for her address; it prefills the lander.

---

## Source file format + build

`emails/NN-slug.md` header: `**Subject:**`, `**Preheader:**`, `**Campaign:**` (slug `story-NN-slug`), `_Subject history_`, `**Bucket:**` (love / money / purpose / specific), `**Short Link:**`, `**Big Idea:**`, `**Reading Recap:**`, `**Open Loop:**`, `**Continue Seed:**`. Body: `**Content:**` … `**Pitch:**` … `**→ Button label**` · `— Evelyn` · `**P.S.**`. Then `## Sources`, `## Notes`.

Markers: `[IMAGE] path | alt | caption 1 / caption 2 | width | noborder` · `[LINK] label` · `➤ outcome` · `**1. Lead.** rest` · inline `**bold**`, `__underline__`.

```bash
cd docs/aweber/evelyn-storytelling/scripts
python3 build-email.py ../emails/NN-slug.md                       # preview  → NN-slug.html
python3 build-email.py ../emails/NN-slug.md --send \
  --image-url https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/story/NN-slug.jpg
#                                                                 # send     → NN-slug.send.html + .send.txt
# from the repo root (writes to the LIVE database — operator OK first):
npx tsx --env-file=<.env> docs/aweber/evelyn-storytelling/scripts/mint-short-links.mts docs/aweber/evelyn-storytelling/emails/NN-slug.md
```

**Images:** S3 bucket `luna-assets-tsw`, prefix `evelyn/story/`. ⛔ Never `evelyn/tarot/` (serves live broadcasts). Never overwrite an existing key — sent mail points at it.

---

## Pre-send checklist

- [ ] Format rules met (see the format file). A: one story, strictly in time order, every spine step; ≤2 connectors; lesson 2 = what the plot proved; lesson 3 leads to the pitch
- [ ] B: opens on the love question; the thing has a name; WHAT given, HOW withheld ("that part isn't in this email"); path B for readers who won't do it; outcomes fit both paths
- [ ] Every fact/quote in `## Sources`; no invented dialogue, clients or results
- [ ] One substance device AND one pitch shape, each different from the previous email's (sends log)
- [ ] Love named first
- [ ] 1 text link (`#0000EE`, first person, **no precondition**) + 1 button + P.S. link
- [ ] Free-minutes line is true (new users only) — wording varies per email
- [ ] No reader-echo words that trip the chat ("broke")
- [ ] Picture right for the format; on S3; credited if not ours
- [ ] Subject: 3–4 very different options, pick + challenger, measured ≤120 bytes, paid off early, doesn't imply Evelyn knows her, name optional (first if used; not on every send)
- [ ] Reading brief approved + saved; `**Short Link:**` set; send build has only `/e/<code>` links
- [ ] Chat tested if the mechanic is unusual

---

## What we learned (keep it from happening again)

| What we tried | Operator verdict | Lesson |
|---|---|---|
| Reframe deck (Jul–Aug) — every email turns a phrase into a clever insight | "very abstract construct" | Readers need a story, not a concept |
| `evelyn-daily-studio` Day 20 — true story, then explained | "very non-entertaining to read" | Don't stop to explain. Show |
| Ad-copy "hybrid" devices — flash-forwards, teasers, "I'll come back to that" | "terrible… no proper setup, no plot, no moral" | Tricks never replace a plot |
| 7 connector lines | "too many" | 2 inside the story, max |
| 2 solid buttons | "too eye sore" | 1 text link + 1 button |
| "the 2 words I wish **you'd** stop saying" | Evelyn doesn't know her that well | Subjects talk about *people* or ask her |
| Apple email opened on the ritual steps | Went back to "Who is he?" first ("this is better") | Shape B opens on the love question |
| "It's called an APPLE." | "give it a name" | Name the ritual ("I call it the One-Strip Ritual") |
| "I peeled my apple and I'm ready…" | "terrible — if she doesn't do it, she won't click" | No precondition; path B for non-doers |
| "custom" | → "ritual" | Ritual sounds like something she can do |
| Plain `utm_campaign` links | Chat disowned the email | Reading brief + `/e/` short link on every send |
| Every pitch: "So here's my invitation" + "one to one" + ➤ + "I won't promise" + the same button | "every email seems to say here's the invitation" | Pitch shapes menu; rotate; vary the button |
| Guest Voice (10 — Evelyn hands over to Marcus) | "very confusing" | Dropped M; one voice per email; use the Higher-authority device instead |
| Writer-picked subjects describing the object ("the 1822 book that answered 'does he love me?'") | "terrible… as usual" | Subjects lead with her pain/desire; brainstorm 3–4 very different DR options with the operator |

---

## Sends log

| # | Format | Idea | Moral / mechanism | Substance device | Subject (pick · challenger) | Status |
|---|---|---|---|---|---|---|
| 01 | A · Story | Grandma Moses | "Too late" is an opinion, not a fact | 3 things (2 lines each) | 🤐 {name}, the 2 words that keep people stuck · *2 words I'd ban if I could* | Built · photo on S3 · `/e/9q_mA2w` live · not scheduled |
| 02 | B · Watermelon | The One-Strip Ritual (apple peel) | The ritual gives a letter, not what it means | WHAT free / HOW in chat | 🍎 {name}, the One-Strip Ritual: who is he? · *an old Halloween love ritual, step by step* | Built · sketch on S3 · `/e/5aDhlv8` live · not scheduled |
| 03 | C · Riddle | Five frogs on a log | Deciding isn't jumping | The one rule | 🐸 {name}, five frogs are sitting on a log… · *5 frogs, 1 log, and what they know about love* | 🔒 Locked 2026-10-08 · sketch on S3 · `/e/BwaUehg` live · not scheduled |
| 04 | D · Old Book | *The Book of Fate* (1822), Q.26 | "More beloved than thou canst be now aware of" | Her own words (the book's) | 💔 Does he love you more than he shows? *(no name)* · *people paid 5 shillings to ask this question* | ✅ Copy approved · brief minted `/e/AVOUYBs` · S3 + send build + chat test + scheduling → **dev** (see DEV-HANDOFF.md) |
| 05 | E · Today's News | Maureen (79) & Ken (89), the Tuesday rose (People, 4 Oct 2026) | Real love is easy to read | Ask yourself (3 questions) | 📱 {name}, does he keep you waiting by the phone? · *🌹 Real love isn't hard to read* | ✅ Copy approved · **send by 18 Oct** · brief minted `/e/g4UKAUY` · S3 + send build + chat test + scheduling → **dev** (see DEV-HANDOFF.md) |
| 06 | F · Fable | Aesop's *The North Wind and the Sun* (Perry 46) | You can't force anyone to open up | Myth vs truth (2 pairs) | ☀️ {name}, why won't he open up? · *🌬️ The mistake most of us make when he goes quiet (no name)* | ✅ Copy approved · brief minted `/e/K4T6TCI` · S3 + send build + chat test + scheduling → **dev** (see DEV-HANDOFF.md) |
| 07 | G · List | The old signs that someone is thinking of you (ears burning, a sneeze, an itchy nose… 7 items, each sourced) | The signs say *someone* is — never who, or whether it's him | The list — 7 items | 💭 Is he thinking about you right now? *(no name)* · *👂 {name}, are your ears burning?* | ✅ Copy approved · brief minted `/e/e0LSkBI` · S3 + send build + chat test + scheduling → **dev** (see DEV-HANDOFF.md) |
| 08 | K · What's Inside | "Is it real, or are you just waiting?" — 4 signs each way, then 5 curiosity bullets about what the chat does (incl. a card pull — verified in the live prompt) | Know which list you're on before you wait longer | Signs it's real / signs you're waiting | 💔 {name}, is it real, or are you just waiting? · *📝 4 signs it's real, and 4 signs you're just waiting* | Draft · pitch shape: Two doors · brief not minted |
| 09 | L · Dare | Cerf bet Seuss $50 he couldn't write a book with only 50 words → *Green Eggs and Ham*. Her dare: ask your love question in 50 words or fewer | Short words force the real question out | One question to carry | 💭 Overthinking him? Try the $50 dare *(no name)* · *🎲 {name}, I dare you to say what you want in 50 words* | 🔒 Locked 2026-10-08 · pitch shape: Columbo close · brief → operator OK, then dev (DEV-HANDOFF) |
| 10 | D · Old Book (old-deck variant) | The Lovers card then (1751 Marseille-style "L'Amoureux": a man between two women) vs now (1909 Rider-Waite-Smith: he looks at her, she looks up). Her question: "Where am I looking?" | Being chosen starts with where you're looking | Then vs now | 🃏 Waiting for him to choose you? *(no name)* · *{name}, there's a better question than "will he choose me?"* | Draft (rewritten Evelyn-only after Guest Voice was dropped) · pitch shape: Candor · brief not minted |
