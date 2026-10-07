# Evelyn V2 emails — the workflow

Daily emails from Evelyn Cross to the V2 list that drive readers into a one-to-one chat with her at `/evelyn`. Every email gives something real first, then makes a **bold, honest pitch**.

Every email uses one **format** from [`formats/`](formats/). Each file says what the format is, where it comes from, its shape, its rules and its status. Devices that work inside any format: [`formats/devices.md`](formats/devices.md).

| | Format | In one line | Status |
|---|---|---|---|
| A | [Story](formats/A-story.md) | One true story in order → moral → "3 things she taught me" → pitch | ✅ Proven — 01 Grandma Moses |
| B | [Watermelon](formats/B-watermelon.md) | An ordinary thing with an old meaning: the WHAT free, the HOW in the chat | ✅ Built — 02 apple peel |
| C | [The Riddle](formats/C-riddle.md) | An old trick riddle → the answer is the lesson → onto love → chat | 🧪 **Next** |
| D | [The Old Book](formats/D-old-book.md) | One verbatim line from a real old fortune/love book → "a book can't read you, I can" | 🧪 To test |
| E | [Today's News](formats/E-todays-news.md) | A real, light love story from the news → Evelyn's take → chat | 🧪 To test |
| F | [The Fable](formats/F-fable.md) | An old fable → "Moral of the story" → onto love (variant of A) | 🧪 To test |
| G | [The List](formats/G-list.md) | "3 signs…" — the WHAT as a list; which one is hers is the chat (variant of B) | 🧪 To test |
| K | [What's Inside](formats/K-whats-inside.md) | Curiosity bullets about what she gets in the chat + two ways in (real scarcity only) | 🧪 To test |
| L | [The Dare](formats/L-dare.md) | "I dare you to…" — maybe a closer, not a full format | 🧪 To test |
| M | [Guest Voice](formats/M-guest-voice.md) | Evelyn hands the email to another persona for a day | 🧪 To test |
| H | [Personal Story](formats/H-personal-story.md) | Furey's main format — "something that happened to me" | ⛔ Needs a decision on Evelyn's own life (canon) |
| I | [The Session](formats/I-the-session.md) | One reading told as a scene, with a result | ⛔ Needs a real client + permission |
| J | [Reader Letters](formats/J-reader-letters.md) | Real reader messages with Evelyn's replies | ⛔ Needs real letters + permission |

C–M come from Matt Furey, *Tao of Email Copywriting* (2006 newsletters; PDF page cited in each file).

## Stress-testing a format

A format isn't "ours" until one real email has gone through the whole workflow. For each 🧪 format, in the order above (C first):

1. Build ONE real email to preview (steps 1–6 below), plus its chat notes and a chat test.
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
| 7 | **Chat notes** — the 4 notes Evelyn gets when the reader arrives. Show them to the operator. | Operator OK |
| 8 | **Save the notes → short link** (`scripts/mint-short-links.mts`, writes to the LIVE database). | `**Short Link:**` in the header; `curl -I` → 302 to `/evelyn?campaign=…` |
| 9 | **Chat test** for any unusual mechanic (a ritual, a sign, an object): send 3–4 likely first messages and read Evelyn's replies. | She plays along, no promises, asks about her life |
| 10 | **Upload the picture** to S3 `evelyn/story/NN-slug.jpg`. | GET 200 |
| 11 | **Build the send files** (`build-email.py --send --image-url …`). | All links are `/e/<code>`; no preview strip; words + split printed |
| 12 | **Schedule** — only after an explicit "go" from the operator. | AWeber ids in the sends log |
| 13 | **Commit** on a fresh branch (not someone else's working branch). | Pushed |

---

## The formats

The full shape for each format lives in its own file in [`formats/`](formats/) — read the format file before writing. Everything below (subjects, CTAs, rules, chat notes, build) applies to **every** format.

---

## Subject + preheader (all formats) — write them LAST

1. **Draft 3 direct-response options, each a different technique:** curiosity + pain · pure curiosity · specific proof (numbers) · direct question about her · (B) the ritual's name · (C) the riddle itself.
2. **Check each against the rules:**
   - Emoji + `{{ subscriber.first_name | capitalize }}, ` **first** (name-first opens ~30–40%; name-last tanked to 22%).
   - ≤120 bytes total — the tag alone is ~40. **Measure it.**
   - The first lines of the email must pay it off.
   - ⛔ **Never imply Evelyn knows her personally** ("the 2 words I wish **you'd** stop saying" was rejected → talk about *people*, or ask her).
   - Prefer curiosity **with pain** over pure curiosity. Don't spoil the ending. No fake urgency, no bracket bait. Don't call an invented name traditional ("the One-Strip Ritual women did…" ✗).
3. **Pick one + a challenger** (AWeber can split 50/50 on subject). Record rejected lines in `_Subject history_`.
4. **Preheader** clarifies or extends — never a second puzzle, never the same words as the subject.

---

## CTA rules (all formats)

- **Two CTAs, not two buttons:** a bold underlined **text link** mid-pitch + **one solid button** at the end (purple `#5b2a6e`, the stronger label — *"Start my 1:1 conversation with Evelyn →"*). Plus a P.S. text link. Two buttons = "too eye sore".
- **Every hyperlink `#0000EE`.**
- **First person** — the reader saying yes in her own words (*"I'm ready to explore my life purpose and open my mind to new possibilities →"*).
- ⛔ **No precondition.** *"I peeled my apple and I'm ready…"* was "terrible — if she doesn't do it, she won't click." The link must work for the reader who did nothing; put it after every path.
- **Free minutes, true wording only:** *"if you've never talked to me before, your first 3 minutes are on me"* (new users get 3 — `server/lib/personaLanderConfig.ts`). Never "your first question is free".
- **Reason not to wait** = a callback to the story or the ritual's date. Never fake urgency.
- **Words she'll type back matter.** "broke" trips the chat's price-objection rule ("I'm broke") → ask "whether it snapped" / "stayed in one piece".

---

## Rules (all formats)

**Truth** — true public stories and documented folklore only; every fact/quote in `## Sources`. Never invent dialogue for real people, clients, testimonials or results. Where sources disagree, use the safe wording ("most of the old accounts say the left one"). No promises: no predicted outcome, no "it's not too late for you", no "you'll marry S" — it's what the ritual *says*.

**Voice** — Evelyn in first person; warm, plain, spoken, a touch playful. Short sentences, everyday words (grade ~3–5). "dear" 0–1×. Contractions on.

**Formatting** — bold ~6 lines (story turns / key claims, lesson leads, 2 pitch lines); 2–3 underlines; short paragraphs, many one-liners.

**Pictures**
- *Real person (A):* the real person, small (220px shown, 440px file), thin grey border, 2-line caption with credit. Public domain or CC0 only (e.g. National Portrait Gallery CC0 via Wikimedia Commons). Never their copyrighted artworks or press photos.
- *Ritual / scene (B, C, F):* a pencil sketch of the thing in action, made free with `codex exec` from `scripts/sketch-prompt-template.txt` (Evelyn's notebook style: graphite on off-white paper, slightly wobbly, older woman's hands). Crop the empty paper, 560px file shown at 280px, no border, no caption. Keep the original PNG in `assets/`.

**Audience** — ~95% love questions, mostly women 40+. Name love first, even when the story is about purpose.

---

## Chat notes + short link (REQUIRED before sending)

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
- [ ] Love named first
- [ ] 1 text link (`#0000EE`, first person, **no precondition**) + 1 button + P.S. link
- [ ] Free-minutes line says "if you've never talked to me before"
- [ ] No reader-echo words that trip the chat ("broke")
- [ ] Picture right for the format; on S3; credited if not ours
- [ ] Subject: 3 options, pick + challenger, measured ≤120 bytes, paid off early, doesn't imply Evelyn knows her
- [ ] Chat notes approved + saved; `**Short Link:**` set; send build has only `/e/<code>` links
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
| Plain `utm_campaign` links | Chat disowned the email | Chat notes + `/e/` short link on every send |

---

## Sends log

| # | Format | Idea | Moral / mechanism | Subject (pick · challenger) | Status |
|---|---|---|---|---|---|
| 01 | A · Story | Grandma Moses | "Too late" is an opinion, not a fact | 🤐 {name}, the 2 words that keep people stuck · *2 words I'd ban if I could* | Built · photo on S3 · `/e/9q_mA2w` live · not scheduled |
| 02 | B · Watermelon | The One-Strip Ritual (apple peel) | The ritual gives a letter, not what it means | 🍎 {name}, the One-Strip Ritual: who is he? · *an old Halloween love ritual, step by step* | Built · sketch on S3 · `/e/5aDhlv8` live · not scheduled |
