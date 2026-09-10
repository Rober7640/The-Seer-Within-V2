---
name: cold-read
description: "Audit written copy against one question — do I understand what this is even saying? — using readers who have NOT been told what it means. Catches sentences that are grammatical but meaningless, pronouns pointing at nothing, a word doing two jobs, and lines that read two different ways. Use when the user says: cold read this, does this make sense, audit this copy for clarity, I don't understand this line, check this letter before it sends, run a comprehension pass. Works on any copy — a Marcus daily, an fb-tarot read, an email, a lander. ⛔ It reports; it never rewrites. It does not check facts, brand, compliance or voice — those have their own gates."
---

# Cold read — do I understand what this is even saying?

One question, asked by people who do not know the answer.

A checker script asks whether a line breaks a rule. It cannot ask whether a line **means anything**,
because a meaningless sentence can pass every countable bar — right length, right register, no banned
word — and still stop a reader dead. This skill is the other half.

**The line that caused this skill**, live in a finished letter that had already passed a voice pass:

> Read through the wrong lens, what settles it settles it for a stranger.

Correct length. Right vocabulary. No banned word. Nobody could read it. It survived because the
person checking it had written it, and therefore knew what it was supposed to say.

---

## The one rule everything else hangs off

⛔ **The reader must not know what the copy is supposed to mean.**

No spec. No brief. No persona docs. No sibling drafts. No summary of what the piece is for. A reader
who knows the intent fills the gap silently and reports nothing — which is exactly how the line
above shipped.

⛔ **The author is never a reader.** You cannot cold-read your own sentence. You already know.

---

## Inputs

- **The copy**, exactly as she will get it. Not the source.
- **Who she is** — one line. Age, device, and whether she is reading once or studying it.
  Default for this house: *a woman over 55, on a phone, one pass, first thing in the morning.*

## Steps

### 1. Freeze the text as she gets it
Fill every merge tag with a real name. Strip the markdown. If it was built to HTML, take the
rendered text out of the page.

⛔ **Never hand a reader the source file.** `%FIRSTNAME%` and `**bold**` are not what she sees, and a
reader who is decoding syntax is not reading. A letter built to HTML gets read from the HTML.

### 2. Three cold readers, in parallel, independently
Not one. One reader's confusion is an opinion; **two readers disagreeing about what a sentence means
is evidence.** Spawn three, each with only the frozen text, the audience line, and this brief:

> You are reading this for the first time and nobody has told you what it is about. Read it once,
> the way the reader described above would. Then go sentence by sentence.
>
> For EVERY sentence, write:
> 1. **Say it back** in your own plain words. If you can't, write `I can't` — that is the most
>    useful thing you can say and it is never wrong.
> 2. **Every *it / that / this / them / one / the other*** — name the thing it points at, in full.
>    If you cannot name it, flag the sentence.
> 3. **Did your eye go back?** If you re-read any part, say which part and why.
> 4. **Anyone you can't identify?** A *he*, a *stranger*, a *someone* you cannot place.
> 5. **Any word doing two jobs** in the same sentence.
> 6. **Could it mean something else?** Write the other meaning out.
>
> ⛔ Do not judge the writing. Do not suggest fixes. Do not say whether it is good. You are a
> comprehension instrument, not an editor. Report only what you understood and where you stopped.

### 3. Diff the say-backs — this is the actual finding
Line the three say-backs up per sentence.

| What you see | What it means |
|---|---|
| All three say the same thing | Clear. Move on |
| Two say different things | ⛔ **Ambiguous.** This is proof, not opinion — the sentence is broken |
| Any reader wrote `I can't` | ⛔ **Broken.** No further argument needed |
| All three re-read the same clause | ⚠ Costs her a second pass. Fix unless the doubling is deliberate |

⭐ **Two readers who disagree have found something no rule could.** That is what this skill is for.

### 4. The author answers, last
Only now does the person who wrote it say, for each flagged sentence, what it was meant to say.

⛔ **If the intent does not appear in any reader's say-back, the sentence fails.** It does not matter
how obvious it is to the author — the author is the one person who cannot be wrong about it, which
is why they go last.

### 5. Report, and stop
One table. Nothing else.

```
SENTENCE          the exact words
READ AS           A: … · B: … · C: …
MEANT             what the author says it was for
VERDICT           CLEAR · AMBIGUOUS · BROKEN
```

⛔ **The audit does not rewrite.** A fix written by the auditor is a fix no reader has cold-read. Hand
the failures back to whoever owns the copy, and if they want it re-checked, run the skill again on
the new text.

---

## Rules

- ⛔ **A reader who has seen the spec is spent.** Do not reuse a subagent that read the brief, the
  style guide, or a sibling draft. Spawn fresh ones.
- ⛔ **The author never audits their own edit.** The line that caused this skill was written during a
  voice pass by the person doing the voice pass.
- ⛔ **No score.** A number hides which sentence broke, and the sentence is the whole point.
- ⚠ **Read as her, not as an editor.** An editor reads twice by habit and forgives on the second
  pass. She does not get a second pass.
- ⚠ **Deliberate repetition is not confusion.** *"One foot in the water for years is still one foot in
  the water"* repeats on purpose and readers understand it fine. Trust the say-back: if all three
  paraphrase it the same way, it works, whatever it looks like.
- **This is not a voice, brand, fact or compliance check.** Those are separate gates and this skill
  has no opinion on them.

## Where it fits

Run it **after** the copy is finished and **before** anyone senior reads it — it is the last gate
that costs nothing to fail. For a Marcus daily it sits between the voice pass and the review packet
in `marcus-daily`. For an fb-tarot read it goes after the guard file and before wiring.

⚠ **The most exposed copy is the copy that was edited late.** A sentence rewritten in a final pass
has never been read by anyone but the person who rewrote it. Cold-read the edits even when the draft
was already clean.

## Worked example — the line that caused this

Three cold readers, given only the closing paragraph of a letter:

> **SENTENCE** — *Read through the wrong lens, what settles it settles it for a stranger.*
> **READ AS** — A: *"I can't."* · B: *"If she uses the wrong card, the answer belongs to someone she
> doesn't know."* · C: *"Something gets decided by a stranger."*
> **MEANT** — Without her own card, the reading would answer some other woman's question, not hers.
> **VERDICT** — ⛔ BROKEN. One reader could not say it back at all, and the two who could disagreed
> about who the stranger was. Neither reached the intent.

The replacement — *"Without your lens, what you're really weighing is somebody else's decision"* —
is the same claim with the pronoun named, the doubled verb gone, and one clause instead of two.
