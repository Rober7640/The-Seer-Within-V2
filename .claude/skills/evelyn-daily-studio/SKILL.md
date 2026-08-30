---
name: evelyn-daily-studio
description: "Plan, write, revise, QA, and prepare Evelyn Cross daily emails across the notebook-letter, fable, observation, question, confession, folk-sign, fragment, dialogue, evening-letter, long-form, and short card-led mini-reading formats. Use when the user asks for an Evelyn daily email or batch in the revised conversational voice, wants to test the improved multi-format program, or wants a short tarot-card email inside the daily rotation. Preserve the existing AWeber HTML, asset, state, UTM, and human-approval workflow. For the legacy generator use evelyn-daily; for a 900–1,200-word tarot reading use evelyn-tarot."
---

# Evelyn Daily Studio

Use this as the testable successor to `evelyn-daily`. Keep the legacy skill untouched until the operator approves this version.

## Load the writing authority

Before planning or drafting copy, read `references/VOICE-AND-FORMATS.md` completely. It governs Evelyn's shared voice, evidence rules, subject lines, format shapes, faith boundary, and final read-back.

Use these repo assets for operating context:

- `docs/aweber/evelyn-cross-emails/STATE.md` — sequence, recent themes, formats, asks, subjects, and assets.
- `docs/aweber/evelyn-cross-emails/situation-library.md` — possible problem families. Treat its psychological explanations as prompts to investigate, not facts to assert.
- `docs/aweber/evelyn-daily-email-handover.md` — historical strategy, rotation, delivery, and assembly context. It does not override this skill's voice or evidence rules.
- `docs/aweber/evelyn-cross-emails/14-day-emails-v3.md` — historical format examples. Learn containers and HTML needs from it, not unsupported reader claims or old voice habits.
- `docs/aweber/evelyn-cross-emails/scripts/gen-evelyn-sketches.cjs` — notebook-sketch pipeline.
- `docs/aweber/tarot-images/` and `docs/aweber/evelyn-tarot-emails/host-card.cjs` — tarot-card art and hosting pipeline.

Follow this precedence when sources disagree:

1. The operator's current instruction and approved wording.
2. `references/VOICE-AND-FORMATS.md`.
3. The actual source material: reader language, card art, established lore, or approved Evelyn canon.
4. This workflow.
5. Historical emails and the handover.

## Inputs

Determine these before drafting:

- Count and intended day or sequence position.
- Requested format, if the operator supplied one.
- Problem family or source question.
- Day type: pure gift, reply, soft invitation, or door.
- Desired length register.
- Whether the task ends at copy, review Markdown, rendered HTML, or prepared send files.

Read the next day from `STATE.md`; never guess it. If the user requests only a draft or test, do not update state or production files unless explicitly asked.

## Plan the slate

For each email, record a short plan before drafting:

`day · format · source/evidence · problem family · length · day type · asset · CTA destination`

Preserve the original variety system:

- Rotate the nine notebook formats: overheard letter, fable, observation, single-word morning, question, confession/memory, omen/folk-sign, pressed fragment, and overheard exchange.
- Treat evening letter as an opening/timing device and long-form sit-down as a length variant.
- Add short card-led mini reading as a tenth format. During the first test, use it about once or twice per seven emails and count it as a door day when it invites chat.
- Avoid repeating a format within three days unless the operator is running a deliberate test.
- Balance love, money, purpose, grief, reinvention, connection, and self-worth. Do not let one problem family cluster.
- Keep pure-gift, reply, soft-invitation, and door days in rotation. Never turn every daily email into a pitch.

When the operator requests a deliberate commercial-layer test, draft the requested door variants together for comparison. Treat that as an evaluation slate, not as the recommended production rhythm.

Do not force a long-form email on a calendar. Use it only when the material genuinely needs the space.

## Establish the evidence

Write an internal evidence ledger before prose:

- What did the reader, operator, or source actually state?
- What was literally observed or supplied?
- What belongs to a public fable or named folk tradition?
- What is established Evelyn biography or notebook-world canon?
- For tarot, what is visible in the exact art and what belongs to the card's established meaning?
- What remains unknown?

For every claim labelled `canon`, record the source file and section or line. The evidence ledger indexes evidence; it cannot create evidence. A statement such as `this is Evelyn's habitual question` remains invented unless an external source establishes it.

Do not convert a situation-library hypothesis into a fact about the reader. Do not imply a real correspondence, encounter, memory, or omen unless it is sourced or established. Use an honest composite frame when appropriate.

## Draft by format

Use the selected format's shape in `references/VOICE-AND-FORMATS.md`. Do not force every email through one universal formula.

Retain the worth-opening test: without the CTA, the email must still offer something complete. The form of that value changes by format:

- A fable offers one useful meaning.
- An observation offers something worth noticing.
- A question offers an honest question to carry.
- A confession offers recognition through established experience.
- A card pull offers a small, accurate reading.
- A teaching email may offer a mechanism or practice when the evidence supports it.

Draft the body before the subject. Use a mechanism, objection, or exercise only when it serves the material; never insert all three by quota.

When an email invites a chat, let the commercial layer grow out of the email's own material:

`native hook -> useful meaning -> personal variable the source cannot settle -> why one-to-one context matters -> what the reader should bring -> what Evelyn will examine -> bounded clarity -> substantive CTA`

The personal variable must be genuinely unknown, not an invented hidden problem. Promise help identifying, separating, understanding, or deciding something within Evelyn's scope. Do not promise a prediction, guaranteed answer, divine explanation, another card, or access to someone else's mind.

On a door day, make the one-to-one nature of the chat explicit when that is the actual experience. Let the closing paragraph carry the offer: what the reader should share, how Evelyn will work with it, and what the conversation can help clarify. Keep the button short and result-led. Do not rely on a generic button such as `Talk to me`, and do not repeat the same one-to-one wording mechanically across emails.

## Write the subject and preheader

Write these after the body is accurate.

- Match the format and lead with a concrete curiosity gap: an everyday sign, unexpected return, oddly specific detail, recognizable person, direct problem, unanswered question, or visible card detail.
- Make the subject engaging enough to earn the open while remaining truthful. Do not default to the plainest line when a more specific, vivid line accurately fits the body.
- Pay off the subject in the opening lines. Never use urgency, personalization, or a spiritual claim that the body cannot support.
- Use the preheader to clarify the premise or narrow an ambiguity. It must not manufacture a second mystery.
- Draft at least three genuinely different subject mechanisms, then choose the strongest truthful one rather than three cosmetic rewrites.

## Run three editorial passes

1. **Truth pass** — remove invented motives, reader history, private facts, promises, false memories, unsupported card claims, automatic improvement timelines, and unjustified absolutes. Treat `always`, `never`, `everyone`, `nobody`, `most`, and promised future competence as inspection words, not automatic errors.
2. **Evelyn pass** — make it spoken, warm, plain, specific, and unforced. Remove clinical analysis, polished aphorisms, stretched metaphors, stock intuition, and quota-driven `dear`.
3. **Purpose pass** — confirm that the format delivered its promised value and that any invitation clearly opens a conversation with Evelyn.

Read every finished email aloud. Rewrite any sentence that sounds composed for admiration rather than spoken to one woman. Compare it with every calibration example and rewrite any sentence or multi-clause pattern that has been copied; examples teach decisions, not templates.

## Assets and assembly

- Use the notebook-sketch system for the nine notebook formats unless the operator specifies otherwise.
- Use the actual tarot card art for a card-led email; do not generate substitute symbolism.
- Inspect every asset before approving copy that refers to it.
- Preserve the current canonical HTML shell, footer, unsubscribe details, and link styling.
- Send links to `/evelyn` with the existing AWeber UTM scheme. On door days, make the action and benefit explicit: name what Evelyn will help the reader identify, understand, separate, or decide.
- Never imply that clicking reveals a second card when the continuity system has none.
- Preserve the evening send strategy unless the operator is testing another window.

## QA and state

Run the existing mechanical and persona checks when producing send files, then complete the judgment checklist in `references/VOICE-AND-FORMATS.md`. A mechanical pass cannot approve voice or truth.

Hold the draft if any blocker remains. Do not render, upload, schedule, or log an unapproved email.

After explicit approval, record at least:

`day · format · source type · problem family · length · day type · subject · CTA · asset/card · campaign id`

Track recent sentence openings, `dear` placement, subjects, and CTA language as repetition risks, not as patterns to rotate mechanically.

## Batch discipline

Plan a batch together, but keep one voice owner for final prose. Do not fan finished emails out to uncalibrated writers. Parallelize research, asset preparation, rendering, or mechanical checking only when useful; return every draft through the same Evelyn edit before operator review.

## Human gate

Write drafts and assets for review. Never schedule or send without an explicit operator instruction after copy approval.
