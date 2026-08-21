# Format 01 — The question behind the question

*Read [PLAYBOOK.md](../PLAYBOOK.md) and [hooks.md](../hooks.md) first. This spec only adds what's specific to this format.*

**Type:** conversion beat (one of ~2/week) · **The turn:** the surface question → the real question underneath

## 1. Purpose / when to use
The advice-column format. Someone wrote to Evelyn; she reframes the *question itself* before answering, revealing the real need under the one they typed. It's one of your two weekly **conversion beats** — because the natural CTA ("you have a question too; bring it to me") *is* the reframe, so the invitation never feels bolted on. Reach for it when you want the reader to feel **seen** (they identify with the letter-writer) and to reach out.

## 2. The reframe mechanic
Take a literal, surface question — *"will they come back?", "should I text first?", "is it too late for me?"* — and show it's a **proxy** for a deeper, scarier question the person hasn't let themselves ask. Evelyn answers the real one. The real question is almost always about the reader's own **permission, worth, or fear** — not about the other person. That relocation (from them → you) is the turn.

## 3. The hook
**Pattern:** the incoming letter ([hooks.md](../hooks.md) #1). Open on the message, verbatim, in a quote box — short, specific, a little raw. Specificity (a count, a repeated word) makes it real; the withheld "here's what they were really asking" opens the loop.

Hook bank:
- "A man wrote to me last night. Three lines." — *count + brevity promise the whole story (gold).* 
- "She sent me one line at 2am, dear. Just: *'is it pathetic that I still check?'*" — *timestamp + a self-judging quote.*
- "Someone asked me yesterday whether they should reach out first. That was never the real question." — *names a deeper one, withholds it.*
- "*'Should I wait for him?'* she wrote. I wanted to ask what she thought waiting would buy her." — *answers a question with the real question.*
- "A reader sent me three paragraphs about him. The whole answer was in one word she used twice." — *points at a tell inside the letter.*

## 4. The skeleton
1. **The letter** (quote box) — verbatim, short, specific.
2. **The flat denial** — *"He thinks he's asking X. **He isn't.**"*
3. **The evidence** — point at what's actually in the words (the count, the repeated phrase, the tell).
4. **The reframe** (pull-quote) — the real question, framed as *"am I allowed to…"*
5. **The mechanism** — why the surface question keeps them stuck (e.g. the checking keeps both doors shut).
6. **What Evelyn told them** — she answered the real question; deliver the substance / the permission.
7. **Turn to the reader** — "you have a question too," + a practice for finding the one under it.
8. **The ask** — bring me your three lines; I'll find the real question.

## 5. Subject + preheader
Formula: `<emoji> {first}, <the surface ask, attributed> — <hint it's not the real one>`
- `‼️ {first}, he asked if she'd come back. That's not what he needed to know.`
- `{first}, "should I text him?" — she asked the wrong question.`
- `{first}, someone wrote me one line at 2am. It wasn't really about him.`
- `😱 {first}, the question you keep asking me isn't the real one.`

Preheader — warm, points at the hidden question: *"The real question was hiding under the one they typed."*

## 6. The ask / CTA
Conversion beat → invite them to bring their own question. Benefit-worded, mirrors the format: **"Ask me your real question"**, "Bring me your three lines." Single plum button. Tag `campaign=reframe-01-question`.

## 7. Formatting notes
- The **letter** → quote box (`.q`) at the very top.
- The **real question** → the pull-quote (`.rf`).
- **Bold** the flat denial and the permission line.

## 8. Do / Don't
- **Do** keep the letter short and painfully specific — one repeated word or a number does the work.
- **Do** vary the writer's gender across uses. This format is where male POV lives most naturally.
- **Don't** write a letter that's too neat or articulate; real ones are messy, short, a little ashamed.
- **Don't** answer the surface question — the whole point is that you refuse to.
- **Don't** make the *reader* the letter-writer. They watch someone like them, then turn to their own.

## 9. Gold-standard worked example
[emails/01-question-behind-the-question.md](../emails/01-question-behind-the-question.md) — the man's *"will she come back?"* letter.

## 10. Fill-in template
```
Subject: <emoji> {{ subscriber.first_name | capitalize }}, <surface question, attributed>. That's not what they needed to know.
Preheader: The real question was hiding under the one they typed.

<Someone> wrote to me <when>. <How short>.

> "<the letter — verbatim, specific, with one repeated word or number>"

<They> think <they're> asking <surface question>. **<They> <aren't>.**

Look at what's actually in <those lines>. <the count>. <the repeated phrase>. That is not <a person asking about someone else>. That is a person asking permission to <the real fear>.

> **↳ THE REFRAME.** The real question under "<surface>" is almost always: *am I allowed to <deeper need>?*

<Mechanism: why the surface question keeps both doors shut. 2–3 sentences.>

So I didn't answer the question <they> asked. I answered the real one. <The permission / substance you gave them.>

Here is what I want you to try. <A practice for finding the question under your own question.>

You have <your version> too, dear. <Invite them to bring it.>

**→ <benefit CTA>**

— Evelyn
```
