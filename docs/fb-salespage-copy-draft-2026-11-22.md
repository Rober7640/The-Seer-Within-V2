# Salespage 1: copy draft 1

> **Superseded for wording, 25 Nov.** The product is the **Energy Clearing Ritual**, never "a letter": Evelyn finds where it started, cuts the black cord and seals both ends with wax (2–3 hours), and by morning her **reading** (5–7 pages) is in the email. The final words are in the mockup files (`fb-salespage-mockup/`): the offer, its button "Begin my Energy Clearing · $35", the first screen's check lines, How it works step 3, the comparison table, the questions and the closing box. Only the headline's "By morning, there's a letter." stays, because it is the ads' own line. Bump: "Yes, go twice as deep tonight" ($12.77, six hours instead of three), not a second letter. The "Messaging Evelyn is free" bar is on the first screen only. "Messaging me was free, and it still is." is cut from the offer, and the question "Is messaging really free?" is replaced by "Do I need to do anything during the ritual?" **Email (25 Nov):** her email is collected on Stripe's checkout page, on both /fb pages. The email step is gone: name, her words, then the offer. Where this document describes an email step, a lead written at the email step, or `/api/lead` before checkout, that no longer applies. **The close (25 Nov):** the offer screen has no ticks, bump or pay button. They're kept for the close at the bottom of the page: the chat's gate line and three ticks (CommitmentGateCard.tsx), then, only once all three are ticked, the optional "twice as deep" box and "Begin my Energy Clearing · $35". The close is laid out like Salespage 2's tick screen (C3). The offer screen shows no price; $35 first appears on the close's button. **Names (25 Nov):** this page (name → her words → offer → close) is **Salespage 1**. The candle letter (C1 → C2b → C3, canvas https://claude.ai/artifact/9D1ghRbagUJarSy4JmE21H) is **Salespage 2**.


22 Nov 2026. This draft is copy only; nothing is built. It replaces the "Ask Evelyn 3 questions" offer in `plan-2026-11-22-fb-salespage-test.md`.

## What the ads promise at the click

Every story ad that goes to /fb ends on the same lines. Examples include This Is My Friend, Don't Text Him Back, Are You Mad at Me?, Two Passengers, She Is My Rock and The Counselor; 100+ scripts are in `seerwithin-pipeline/BRIEFS/song-ads/0-concepts/`. The closing lines:

> "Messaging her is free. She asks your first name, and by morning there's a letter."
> "Send your first name to Evelyn."

- **End card:** Evelyn's chat, an empty box with the placeholder "Your first name", and a blinking cursor.
- **Who she is:** "a woman in Ireland". Someone close to the narrator sent her.
- **The letter:** five pages. One page is the moment it started ("Page two was my dad's second wedding. I was nine.").
- **The letter's last line** names the pattern ("You learned to stand outside the picture. You can come in now.").
- **What the letter skips:** the surface problem ("It never mentioned my face", "Work wasn't in it").

The page has to pick up at that end card. So:

- **Not "3 questions"**, because the ads sell *where it started*, not answers to questions.
- **Not the price on the first screen**, because the ads say *messaging her is free*.
- **Not today's /fb lander words** ("Something Is Holding You Back", "a free reading"), because no ad says them.

## The idea

The page is the ad's last frame, come alive. She types her first name into the box she just saw. She tells Evelyn in a sentence what keeps happening. Before she gives her email, she sees honestly what the letter is and that it costs $35. Then she pays.

The page asks Evelyn's questions, never her biography. It never runs a 9-question interview.

## Screen 1 (above the fold): the end card

Evelyn's photo, the same look as in the ads, with `Evelyn · Ireland` under it.

**Headline (operator chose A, 22 Nov):**

> **Send me your first name.**
> Messaging me is free. By morning, there's a letter.

Not chosen: B "What's your first name, dear?" and C "By morning, there's a letter."

Below the headline:

`[ Your first name ]`  `[ Send to Evelyn ]`

The box and its placeholder are the ad's end card, word for word.

## Step 2: her words (opens on the same page, no reload)

> Thank you, **{name}**.
> Now tell me what keeps happening. One sentence is enough, in your own words.

*Tap one to start, or write your own:* three tap-to-start lines that drop into the box and can be edited: "He pulls away." · "Money won't stay." · "I keep starting over." (Later: pick the three most common openings from real /fb chats.)

A text box, placeholder: *Write it the way you'd say it to a friend.*

`[ Continue ]`  Under it: *Only Evelyn reads what you write.*

## Step 3: where to write back (order chosen 22 Nov: name, her words, then email)

She has just written to Evelyn, so a reply needs an address. Risk: anyone who quits at step 2 leaves no email, which is why step 2 is kept light. A later test: email before vs after her words.

> Thank you for telling me, **{name}**.
> Where should I write back to you?

`[ Your email ]`  `[ Continue ]`

Under it: *Only I write to you here. I never share it.*

Not chosen: "Sometimes more comes to me after you've gone. Where should I write to you?" (the chat's frame; fits better when the email comes straight after the name) and a free "short note about your name" tonight (would need building).

## Step 4: the honest offer, then pay

> Here's what I'll do, **{name}**.
>
> Tonight I'll sit with your name and what you've told me, and I'll find where this started. Not with him. The first time.
>
> By morning there's a letter in your email, five to seven pages, written for you:
> - **What keeps happening**, said plainly
> - **Where it started:** the moment it took hold, and who was there
> - **What I cleared overnight**, and what pushed back
> - **Your next 30 days**, week by week, and three small things to do
> - **The answer to your question**, if you asked one
>
> Messaging me was free, and it still is. The letter is **$35**. If it doesn't feel true, write to me within 30 days and you'll get every penny back.

`Your letter goes to {email}` with a *Change* link (the email was taken at step 3).

`[ ] Add a second letter about another part of your life (money, family or work): $12.77`

`[ Send me my letter: $35 ]`, which leads to Stripe.

Under the button: *One letter, one payment. No subscription.*

## Below the fold (for women who scroll before typing)

**How it works**
1. Send your first name.
2. Tell her what keeps happening, then where to write back.
3. By morning, her letter is in your email.

**What's in the letter:** the same five points as step 3.

**Why only your first name?**
> Your first name and your own words are all I work from. I don't need your last name, your photo or your home address.

**FAQ**
- *Is messaging really free?* Yes. Your name and your words cost nothing. The letter is $35, and you'll see that before you pay anything.
- *When does the letter come?* By morning. If you don't see it, check your spam folder.
- *Is it private?* Only you and I read it.
- *What if it doesn't feel true?* Write within 30 days for a full refund.
- *Is this a subscription?* No. One clearing, one payment.

The close. It sits after the comparison table and before the questions (25 Nov: the button comes before the questions). It sits under every step, so it follows her step and never asks for something she's already given:

- **Before her name:** the name box again. "Send me your first name." / "Messaging me is free. By morning, there's a letter." `[ Send to Evelyn ]` *Free · no card needed*
- **After her name (her words, her email):** "Thank you, **{name}**." / "I'm still here, just up the page." `[ Back to Evelyn ]` scrolls up to her step.
- **Under the offer:** "{name}, before I prepare this for you, I need to know you're truly ready." Three ticks: "I understand belief is required for this to work" / "I'm ready to receive this tonight" / "I'll read it with an open heart". *Tick all three to continue.* Once all three are ticked: the optional box "Yes, go twice as deep tonight · +$12.77" and `[ Begin my Energy Clearing · $35 ]` *I'll begin tonight* ($47.77 with the box). Under it: "30-day guarantee · Secure checkout with Stripe" and "You'll add your email at checkout. That's where your reading goes."

## Not on the page

- "Free reading". The letter isn't free.
- "Something is holding you back".
- "Last slots", countdowns, review counts, struck-through prices.
- Anyone's age.
- "Written by hand".

## Open questions for the operator

1. ~~**The headline:** A, B or C.~~ Decided 22 Nov: A.
2. **"By morning".** The ads promise it, but the chat says "within 24 hours". The page must say what's true. Either confirm the real delivery time, or make delivery from the page arrive by morning.
3. **"One question answered" in step 2.** Keep it, or drop it? It's Samira's best idea, placed inside our ads' promise. But today's letter doesn't answer a question, so the letter flow would need a change.
4. **"What I cleared overnight".** The current letter includes the clearing ritual, which the ads never mention. Either keep it on the page, so the page describes what's actually delivered, or write a letter-only version without it.

5. **The email ask.** Decided 22 Nov: after her words (step 3), framed as where Evelyn writes back. Honesty point still open: the ads promise a letter by morning without a price, so a woman who gives her email and doesn't buy should get something overnight (the first list email, written as a note from Evelyn).
