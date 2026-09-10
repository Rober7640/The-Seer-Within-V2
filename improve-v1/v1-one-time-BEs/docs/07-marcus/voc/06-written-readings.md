# 07 VOC — the written reading: what she types into the box

Field pull, 2026-09-05. **Source: asynchronous, written, paid readings.** She types a question,
pays, and a document comes back hours or days later. **No back-and-forth.** That is 07's product,
and it is a different product from the one `04-marketplace.md` collected.

⛔ **All reader, seller and shop names stripped** → `[the reader]` / `[the seller]`. No listing or
review reproduced whole. Fragments only.

---

## ⚠ Read this before you trust a line

**Why this file exists.** `04-marketplace.md` §on limits says it plainly: every buyer quote in it
came from a **per-minute live chat or phone** marketplace, because Etsy and Fiverr 403 a
server-side fetch. The operator caught it:

> *"what u surfaced is psychic per min call questions. what questions do people put into written
> readings? those on etsy kinda?"*

He is right and the difference is structural. On a call she can be drawn out. In a box she gets
one shot, so she front-loads. This file collects that shape.

**Sample.**
- **13 full-length submitted questions**, verbatim — 9 from one complete published archive, 4 from
  three other Q&A columns
- **~45 distinct sellers** of written readings yielding usable copy, from ~170 product pages
  fetched: Gumroad, Buy Me a Coffee, Substack, and 11 independent reader websites, plus Etsy
  listing copy via search
- ⭐ **~270 distinct on-territory buyers** — people who paid, waited, and received a document or
  recording — across ~30 domains and ~85 fetched pages: Trustpilot (its `?search=` full-text filter
  was the most productive technique found), an open psychic-review forum, smartcustomer.com,
  pissedconsumer.com, App Store reviews, independent tester blogs and reader testimonial pages.
  **Live per-minute phone and chat material was read and discarded throughout, never substituted**
- **6 professional readers** writing at length about how their email-reading process actually runs
- **1 seller publishing the email-vs-phone trade-off in buyer voice** (§4.1) — the single most
  useful artefact here

**Small, and qualitative.** Nothing here supports a percentage.

### ⛔ What I could not reach — named, not substituted

| Source | What happened |
|---|---|
| **reddit.com** | **Hard-blocked three ways.** WebSearch refuses the domain outright (*"not accessible to our user agent"*), the fetch layer refuses `reddit.com` and `old.reddit.com`, and `curl` gets 403 on both HTML and `.json`. I also tried four public Reddit mirrors (redlib/libreddit instances) — 403 or 410 on all four. **This is the single biggest hole.** The candid *"has anyone bought an email reading"* threads the brief asked for are behind it |
| **etsy.com** | 403 to fetch and curl, as before. Listing text below came through **WebSearch result summaries only**, so it is high-confidence but **not fetch-verified**. Adjacent file `07-etsy-browser.md` covers Etsy listing *titles* read in a real browser — I have not re-verified its contents and have not duplicated them here |
| **fiverr.com, quora.com, mumsnet.com** | 403 |
| **ko-fi.com** | 403 to **both** curl and fetch — confirmed dead, not worked around. Buy Me a Coffee's *shop index* pages are JS-only, but individual product pages did work |
| **thetarotforum.com** | Public discussion threads opened fine (~6 pulled). But the **reading-request section** (`forums/forum/29-divination-readings/`) returns a members-only 403 on every attempt — that is where querents post their questions publicly, so it is a real loss. Would need a logged-in session |
| ⭐ **lipstickalley.com** | 403. Its ~15,000-reply *"Experiences with Etsy & Fiverr Psychics"* thread is **the single richest untapped source identified** — not login-walled, just fetch-blocked. A browser-driven pass would very likely crack it |
| **spiritualforums.com, skyscript.co.uk, astrologyweekly.com** | login-walled or 403 |
| **mumsnet.com, quora.com, complaintsboard.com, tarotforum.net** | 403 — three relevant Mumsnet threads unreachable |
| **daily-tarot-girl.com** ("My client hated her Tarot reading") | connection refused — almost certainly quotes a client's complaint email verbatim |
| **Published sample readings** | ⭐ Reachable, but **the client's question is redacted**. One reader publishes a client-donated reading that opens *"For XXXX, Month Day, year"*. This is itself the finding: written readings are private documents, so submitted questions are almost never public. That is why nobody has this data |

**Fidelity.** Everything in §1 is character-exact — pulled from post bodies via the publisher's own
API, not through a summariser. §2's Etsy lines are flagged where confidence drops.

---

# 1 · ⭐ The question, as she actually typed it

**The prize.** Full length, untrimmed, verbatim. Every one of these was **written, submitted once,
and answered later with no conversation in between** — 07's exact interaction shape.

⚠ **These came from free advice columns, not paid readings.** The paid equivalents are private
(see above). What transfers is the *shape* of a one-shot written question; what does not transfer
is any claim about what a paying buyer asks. Read them for structure.

## 1.1 · The nine — a complete published archive

Source: a fortnightly tarot-grounded advice column, questions submitted through a form and
answered in a written column. Reproduced in full because **length is the point.**

> *"I have a decent job that I don't particularly enjoy any more. I also have a couple of
> not-quite-offers to stay in the same data/math-heavy field. But I would rather be an author. How
> do I decide what path to take? Safely stay at current job and just fit writing in wherever? Take
> a chance on a new position being more fulfilling? Thanks for listening."*

> *"Will I ever minimise or reduce friction with my future sister-in-law?"*

> *"How could I approach my desire to create a home with my (currently geographically scattered)
> chosen family?"*

> *"Will I ever stop feeling so creatively dry and empty? I keep trying to fill the well again but
> nothing helps."*

> ⭐ *"I'm hopelessly in love with someone I've been friends with for over 2 years now, but I
> haven't done anything about it as she had just left a difficult relationship and only wanted a
> friend. Do I tell her and risk what we have, or keep it to myself and try and move on?"*

> *"I texted a new friend a month ago to try to make plans, but I never heard back. I'm not sure if
> I should let it go or text to see if she wants to make plans one more time!"*

> ⭐ *"My husband and I live in a semi-rural area, where he has a contractual job. My job has become
> a bit emotionally draining, and my attempts to forge meaningful friendships have been
> unsuccessful. I'm ready to bail on this place, but he's not ready to. Furthermore, his contract
> looks like it's going to be renewed for another two years. How do I cope and tolerate it here
> when moving isn't possible right now?"*

> ⭐ *"I feel so unsure of myself these days about decisions - where I should live, who I should
> live with, to stay with my partner or not - I think I really miss this idea of having control
> over my life and my destiny. I feel really unempowered and I don't know how I can transition to
> this post-covid world feeling focussed and positive again."*

> *"After a decade and change of mostly traumatically awful relationships, I started finding it
> hard to let my guard down around romantic partners (or potential new ones). How can I open
> myself up to new relationships?"*

## 1.2 · ⭐ How little she actually submits — buyers describing their own intake

From a psychic-review forum and reader testimonial pages. ⚠ These are buyers *describing* what they
sent, not the submission itself — but they are the closest thing to paid-context evidence found.

> ⭐ *"specific questions from their page like, 'what's ahead for your love life?' and 'will an ex
> come back?' from there I just gave first names and got at least a paragraph or two back."*

⭐ **She picked the question off a menu and supplied two first names.** That is the *paid* reality,
and it is far thinner than the free-column letters in §1.1. Both shapes are real; the difference is
that a menu was offered.

More, and note that **minimal input is something she brags about**:

- *"WOW! And, all from an email with no information other than the questions I sent!"*
- *"I sent one question, and was surprised by the detailed answer I got back!"*
- ⚠ *"I told her absolutely NOTHING except my name and my person's name...She was very specific."*
- *"I asked about a guy I was interested in during the pandemic and I also asked about my job which
  was a new job at that time"* — two questions, one order
- *"I get an email reading done whenever I have a question that's nagging me and I just need [the
  reader] to let me know if my intuition is right"* — ⭐ **the job she is hiring it for, stated
  plainly: confirmation of an instinct she already has**

⚠ **This is the tension 07 has to resolve, and it is not the one I expected.** She *can* write the
long §1.1 letter. But when a seller hands her a menu, she takes the menu and gives two names — and
then **praises the reading for working on almost nothing.** The less she gave, the more impressed
she is. See §7.1.

## 1.3 · Four more, from three other columns

> ⭐ *"what should I expect through the end of the year? Will I close any business or find any love
> interest?"* — **two unrelated questions jammed into one submission.** Sellers complain about
> exactly this (§2.4)

> *"Will I ever feel fulfilled by my professional career again?"*

> *"How do you read challenging cards without falling to either 'they are good/bad'? Some cards can
> be seen as so challenging (from knowledge or past experience), yet you seem to be able to read
> each time with curiosity and openness, without your intuition being cluttered by challenging
> experiences with the cards. Would you say that comes with practice with the cards/self-care
> routines/personality trait? What would be your advice(s)? (I ask because I can sometimes feel
> 'overwhelmed' by certain cards when I read to myself, and it can take away my initial enthusiasm
> and intuition.)"* — a craft question, but ⭐ **look at the parenthetical.** She explains *why she
> is asking* before she stops typing. That is the written form's signature

> *"what is the difference between a personal card of the year vs. the collective card of the year?
> … I'm specifically, and personally, wondering what your thoughts are on the experience of living
> with a tarot archetype 2 years in a row (but maybe in a different way)."*

## 1.4 · ⭐ The anatomy of a written question — six things it does that a spoken one doesn't

Read the nine again and the pattern is mechanical.

| # | What she does | Evidence |
|---|---|---|
| **1** | **States the constraint before the ask.** The situation is set up as a locked box, then the question is asked *inside* it | *"his contract looks like it's going to be renewed for another two years. How do I cope and tolerate it here when moving isn't possible right now?"* |
| **2** | **Pre-empts the obvious advice.** She kills the answer she expects, so she doesn't waste her one shot | *"I keep trying to fill the well again but nothing helps"* · *"my attempts to forge meaningful friendships have been unsuccessful"* |
| **3** | **Supplies the timeline unprompted.** Duration is load-bearing and she knows it | *"for over 2 years now"* · *"a decade and change"* · *"a month ago"* · *"another two years"* |
| **4** | **Offers the two doors herself.** She has already narrowed it and wants a verdict, not options | ⭐ *"Do I tell her and risk what we have, or keep it to myself and try and move on?"* · *"Safely stay at current job… Take a chance on a new position…?"* |
| **5** | **Defends the other person.** She explains why the person who hurt her had a reason | *"as she had just left a difficult relationship and only wanted a friend"* |
| **6** | **Names the feeling, not just the facts.** She hands over the diagnosis and asks to be told what to do with it | *"I feel really unempowered"* · *"creatively dry and empty"* · *"I really miss this idea of having control over my life"* |

⭐ **The length is not padding — it is her doing the reader's cold-reading work for them.** On a
call the reader extracts this over ten minutes. In a box she volunteers all of it, unasked,
because she gets one shot. **That is a gift and a trap:** it is also precisely the setup for the
worst failure in `04-marketplace.md` §2.3 — *"had to tell her stuff and then she started giving me
a reading from what I told her."* A written reading is handed the woman's own words in advance and
must not sound like it is reading them back.

⚠ **Contrast — when it's free and casual, the question collapses to one line.** From a
Valentine's-day column where people replied in comments: *"UHHH I THINK I WANT THE PAST PRESENT
FUTUREE!! my question is 'What do I most need to know about myself right now?'"* and *"AHHHH I
will go for past, present, future and my question would be 'what does our future together look
like?' tysm !!!"*. **Effort in the question tracks stakes and price.** 07 charges, so it should
expect and design for the long version — but the booking box must not *punish* the short one.

---

# 2 · What sellers tell her to submit

**Directly actionable — 07's booking page asks for exactly this.**

## 2.1 · ⭐ The most complete intake in the pull

One professional's request form, described by her in her own words:

> *"On the request form, I ask for their name, email, birth date …, gender and a recent photo. I
> also ask for the question along with some details about the situation. … I now also ask about the
> client's desired outcome (essential in creating an empowering, choice-based reading), current
> challenges in achieving that outcome, and what they want to get out of the reading itself."*

⭐ **Three fields beyond the question: desired outcome, current challenge, what she wants from the
reading.** That last one is the interesting one — it asks her to state the job she is hiring the
document to do.

The same reader, on the very first objection she meets:

> ⭐ *"Do you actually do the reading, or do you just do it automatically in a template on your
> computer?"*

**That is the written product's version of "are you a bot."** `04-marketplace.md` §2.1(g) found
buyers accusing live readers of being AI. Here the suspicion is older and more specific: not *is a
machine writing this*, but *is this a template with my name pasted in.*

## 2.2 · The standard field list, across the market

Etsy (⚠ via search summaries — high confidence, not fetch-verified):

- *"share your full name, date of birth (DD/MM/YYYY), gender and ask up to 5 clear questions"*
- *"All I will need is your full name, full date of birth, and your question( as specific as
  possible)."* — the stray space in `question( as` survived, which is a good sign it is literal
- *"Full Name"* · *"Date of Birth (MM/DD/YYYY)"* · *"A semi-detailed description of your question
  or the topic you'd like the reading to focus on"*
- *"full name and date of birth, three specific questions (or write 'life path'), and marital
  status"*
- *"How it works: Place your order Send names + your situation I pull tarot cards and read
  communication energy You receive your reading via Etsy"*
- *"How it works: After your payment I will get started as soon as possible. You're question (that
  I will answer in the tarot reading), will be asked in either the personalization or in Etsy
  messages."* — `You're` preserved

A reader who works only by email, on what actually arrives:

> *"Background information is usually pretty brief and usually a topic for the question is
> suggested, but I prefer to work with a question so I work with the client to create a question
> that will work well with a Tarot reading."*

⭐ **She sends a topic, not a question.** The reader has to convert it. 07's booking box will
receive topics unless it is built to prevent that.

## 2.3 · ⭐ "The more candid you are" — context as a priced input

The richest single Etsy intake fragment found (⚠ high confidence, unverified):

> ⭐ *"your first name and birth date; the first name of the person on your mind; and a few honest
> lines about the situation — what happened, how long it's been, whether you're in no-contact, and
> what you most want to understand"*
>
> *"the more candid you are, the more precise and useful my reading becomes."*

That is a four-part spec for the long question — **what happened / how long / current state /
what you want to understand** — and it maps almost exactly onto the anatomy in §1.4. Others in the
same register:

- *"the more context you provide, the easier it is to focus the reading on your specific
  situation."*
- *"please include your name, nickname, or a description of yourself and any other parties
  involved, indicating roles."*

## 2.4 · ⭐ The question-format rules — how the market has trained her to ask

The strongest set, all from one listing (⚠ high confidence, unverified):

- *"If your question begins with the words 'Who,' 'Where,' or 'Does,' you will have to reframe your
  question, as the cards give no definitive time frame, tell no names (only show archetypes)."*
- *"Tarot does not work in a 'yes' or 'no' system."*
- Banned shapes, given as examples: *"Does x person like me?"* · *"Should I take x job?"*
- Approved rewrites, given as examples: *"What should I do to get x's attention?"* · *"What would
  being in a relationship with x be like?"* · *"What would it look like if I reconcile with x
  person?"*
- Fill-in templates offered: *"What will happen if I choose ____ job over ____ job?"* · *"How will
  I be affected by ____ situation?"* · *"What will happen if I pursue ____ (person) romantically?"*

From an email-only reader's public tips page:

- ⭐ *"Make your question as clear and direct as possible. Avoid long, convoluted backstories."*
- *"A vague question will get a vague answer. Make your question as specific as possible. For
  example rather than asking 'What about love?', a better question would be: 'What is the potential
  of a healthy relationship with [name]?'."*
- ⭐ *"Don't jam two separate questions into one. Sometimes people will play sneaky and try to find
  a way to get two questions for the price of one – hence, they'll ask two unrelated questions and
  try to pass it off as one. Don't do this. It muddies up the works and is really rude. If you have
  two situations you want advice on, then purchase two questions."*
- *"Include a picture of yourself or the people you are asking about along with birth dates."*

### The one-question cap, and how it is enforced

Near-universal on non-Etsy sellers, and stated bluntly:

- *"You can only ask 1 question. I will only pull 3 tarot cards."*
- *"PLEASE keep it to one question."*
- ⭐ *"If you pay $18.75 and ask more than one question you will receive the answer to the first
  question you ask."* — the cap with teeth
- *"Ask any one (1) question that does not pertain to life path or purpose"*
- *"Feel free to purchase multiple £10 readings for one question each on separate topics."*
- ⭐ the pricing ladder stated as questions, not words: *"A £10 reading will answer one question…
  A £15 reading will answer 2 questions on the same topic in more depth."*

### ⭐ The best worked general-vs-specific example found

> *"Remember that this is a specific question, as opposed to a general reading. **'I would like to
> know about my career' is a general reading. 'Should I leave my current role?' is a specific
> question.**"*

The same seller, on the act of writing it:

- ⭐ *"Centre yourself before typing, so you can really hone in on what it is you want to know."*
- ⭐ *"Be aware that the answers you receive are usually what you need but not always what you
  want."* — a second consent-to-bad-news line, cheaper than the horary one (§2.5)
- *"In the 'Your question here' box, write out your question to me and **if possible do offer some
  context**. This will ensure that the email I send back with your tarot reading, is as specific as
  possible."*

And a third seller's reframing rule, in the same shape as the horary *"Should I…?"* ban:

> *"Instead of asking, 'Will I get that promotion I asked for?' ask this instead: 'What can I do to
> get promoted?' or even 'What's stopping me from getting promoted?'"*

⚠ **Note the direct contradiction, and it matters for 07.** One half of the market says *"a few
honest lines… the more candid you are"*; the other says *"Avoid long, convoluted backstories."*
Both are selling the same product. **The market has not settled this**, which means 07 gets to
choose — and §1 says she will write long whether or not she is invited to.

Another reader on why she nonetheless does not fight it:

> *"most clients do a great job of crafting appropriate queries"*, though she sometimes has to
> *"break down a compound request into separate questions."*

And a reader summarising her own inbox: she takes **lengthy emails sharing problems, confusions and
heartaches** and turns them into a clear question. *(paraphrase — not verbatim; the post is
paywalled and only its summary was reachable.)*

## 2.5 · ⭐ The one-shot rules — from horary, the closest structural analogue

Horary astrology is 07's shape exactly: **one written question, submitted once, answered in a
written judgement.** One practitioner's public conditions page is the best-written intake in the
whole pull:

- ⭐ *"Horary questions can only be asked once. If you have already asked an astrologer this
  question, please follow up with them, or ask a different question here."*
- ⭐ *"Only ask one question. While most situations are complex with varying options and moving
  parts, take some time to sit with the situation and allow what you really want to know to
  arise."*
- *"Avoid asking 'Should I…?' questions."* — with the rewrite shown: *"Should I move out next
  month?"* becomes *"Will I be financially secure if I move out next month?"*
- *"You cannot inquire about an issue that does not personally impact you."*
- *"Questions can only be asked about an existing situation."*
- *"If you don't have a clear question, detailing the events can help solidify one."*
- ⭐⭐ *"'Do you really want an answer?' is a great question to ask yourself before casting a
  Horary. … By asking a Horary you are consenting to receiving, both, an answer you are happy with,
  and one you may not like."*

⭐ **That last line is a pre-emptive consent-to-bad-news clause, collected at intake.** It is the
cheapest available defence against the runner-up failure in `04-marketplace.md` — *"they just tell
you what you want to hear"* — and it costs one sentence on the booking page. It is the written
market's equivalent of the *"Time Frame predictions (Because of free will)"* refusal already noted
in `04-marketplace.md` §3.1.

## 2.6 · ⚠ The anti-intake: the blind reading

A real and growing counter-product — she is sold the *absence* of an intake box (⚠ high
confidence, unverified):

- *"You don't need to tell me your life story. My connection to Spirit allows me to tap into your
  energy field without any prior information."*
- *"NO QUESTIONS. NO HINTS. JUST THE RAW TRUTH."*
- ⭐ *"Sometimes we ask the wrong questions. A blind reading allows Spirit to bring forward the
  messages you need to hear, rather than just the answers you want to hear. This is often the most
  brutally honest form of divination because it is completely unbiased."*

⭐ **This is the market selling the cure for failure (b) — "she fed it the answer" — as a feature.**
If she never tells you anything, nothing you say can be her own words returned. 07 cannot use this
(the question *is* the product) but it is the objection 07's intake box must answer.

**And a whole middle tier that lowers the bar rather than raising it** — worth reading against
§1.4, because these sellers have concluded she often *cannot* produce a clean question:

- *"Your question or topic doesn't need to be perfectly specific. I tune into what's most important
  for you to know… If you are unsure what to ask, you can request a general reading."*
- *"You can give me a nickname if you want. I don't need to know your birth information… any notes
  or background information you think is necessary are welcome. **It's not required.**"*
- ⭐ *"When you ask me for a reading, I won't ask you anything other than your choice of numbers and
  the question you would like answered. **I don't need to know your name, date of birth, job title
  or shoe size. I don't need a photo and I won't be searching you out on Facebook.** Some people
  feel more comfortable sharing these personal details and that's great as it strengthens the
  connection, but it's not essential."*
- *"If you prefer not to tell me what's on your mind that's ok too. It's completely up to you
  whether you choose to tell me or not – **your reading will be just as accurate either way.**"*
- *"If you are unsure on how to phrase your question **I can also help with this.**"*

⚠ **That third quote is the sharpest thing in this section.** It names 07's intake fields one by
one — name, date of birth, photo — and sells **not asking for them** as the trustworthy position.
Cross-reference §4.1 advantage 3 and `market-research.md`'s note that 07 sits at maximum intake.

## 2.7 · Refusals, and one that is new

Consistent with `04-marketplace.md` §3.1 — health, pregnancy, legal, gambling. Two worth noting:

- *"I am unable to give medical or health advice—I am not a doctor"* / *"I am unable to help you
  with legal issues and give advice on what to do for those matters—I am not a lawyer."*
- *"No health, legal, political, gambling or financial questions"*
- ⚠ one listing refuses **love readings in the title itself** — *"…Source Guide NO LOVE READINGS"*
- the fullest non-Etsy list: *"I cannot provide readings for the deceased, missing persons/objects,
  exact date or time, pregnancy, health, legal, sex, pregnancy, or affairs. **I have the right to
  refuse an order.**"*
- *"I will not answer any questions pertaining to health, pregnancy, or infidelity(cheating
  partners)."* — ⚠ **infidelity refused by name**, which matches `04-marketplace.md` §5's finding
  that an unprompted betrayal claim is where written readings do real harm

⭐ **Two clauses from one seller's published ethics page are directly usable by 07:**

> ⭐ *"**No Third-Party Readings**: I do not perform readings about third parties. Questions like
> 'Will my child get the job/apartment they applied for?' or 'Will they leave their partner?' are
> not appropriate, as they do not directly involve you."*

⚠ **07 collects his name and his DOB** (`market-research.md`). This seller — and several others
(*"questions should be about yourself and not other people"*, *"I won't answer questions about
other people"*) — treat that as the line they will not cross. It is not a majority position, but
it is a coherent one and it is the one that pairs with the anonymity advantage in §4.1.

> ⭐ *"**Honesty in Readings**: I do not provide answers based on what you want to hear. I convey
> what I see in the cards, which tell you what you need to know at that moment. **Sometimes, the
> reading may address a different area of your life than you expected, and this is beyond my
> control.**"*

⭐ **That second sentence is a pre-authorisation to miss the question** — collected before payment,
it converts written failure #2 (*"reader rephrased it to something else entirely"*) from a refund
into an expectation that was set. A blunter version of the same move: *"Sometimes the cards don't
tell you what you want to hear. They tell you what you need to hear."*

---

# 3 · The wait, and getting a document instead of a conversation

## 3.1 · Sellers treat the wait as a defect to be minimised

Nobody in this pull sells the delay. They apologise for it or race it.

- *"Clients like them because they are affordable – and I'm fast to respond (you'll get your answer
  within 48 hours – no waiting here)."* — ⭐ *"no waiting here"* on a 48-hour product
- Turnaround sold in the title: *"1 Question Tarot Within 24 Hours or LESS"* · *"SAME HOUR 1
  Question Tarot Reading"* · *"Emergency Tarot Reading 2 Hour Turnaround Fast and Accurate"*
- Queue language, shown to explain the wait *(⚠ via search summaries)*: *"Readings are currently
  taking 2-3 business days due to the queue"* · *"Delivery time is based off the amount of orders
  ahead of yours"* · emergency listings *"push orders to the top of the queue to be completed
  next"*
- The slow end, stated plainly by one seller: *"Your personal written tarot reading will be
  delivered to you via email 5-7 business days after you've completed your form. That's why it's
  essential to complete the form as soon as possible."*

⭐ **Turnaround is a priced upsell.** One shop ladders *standard (5-10 business days) / fast (within
48 hours) / fastest (within 24 hours)*. **The wait is the thing she pays to remove**, which is
strong evidence it hurts rather than helps.

**The real spread across 45 sellers is enormous** — *"within 1 - 24 hours"* · *"the same day"* ·
*"within 24 hours"* · *"2-3 business days"* · *"3 - 5 business days"* · *"After 4-5 business
days"* · *"5-7 business days"* · *"within a week"* · *"7-10 days"* · *"up to 10 days"* ·
*"typically take 1-2 weeks"* · *"sent between 1-3 weeks and is not an instant reading"*. ⭐ **07's
24 hours is fast for this market, not slow** — `market-research.md` called it *"slow at 24
hours"* against the same-hour Etsy tier, but against the wider written market it is at the quick
end.

⭐ **And here is the "please be patient" text the market does write** — one seller, in full flow:

> *"Reading Are Usually Answered Sameday But May Take A Full 24 Hours Depending on Your Time of
> Purchase & When The Correct Information Is Provided On Your End Or How Many Readings Come In
> (Example Time Differences or if I Maybe Asleep Also If I Don't Get To Your Reading by One Day
> Just Keep Messaging Me I get Hundreds Of Messages Per Day So Some Pass Me By So If I Don't
> Respond Right Away, **Do Not Rush to Give Me A Bad Review Or Freak Out If Your Reading Is Not
> Ready Right Away**…"*

⚠ **Read that as evidence, not as copy to imitate.** A seller does not write *"do not freak out"*
unless buyers freak out. It corroborates §3.4 exactly: **the silent wait is where the fraud
suspicion forms.** The professional version of the same instinct is the opposite — proactive
contact:

- *"I aim to get all readings to those who have purchased within 48 hours. Email will be kept open
  throughout the process so I will be reachable."*
- *"I will email you directly within 24 hours after you have submitted your questions. The email
  will contain the date by when you will receive your reading (3 - 5 business days)."*
- *"Please allow up to 10 days for your reading to be delivered. … But if it takes longer than
  that for whatever reason, I'll refund you."*

⭐ **The second one is the pattern worth copying**: an interim email that does nothing but **name
the delivery date**. It costs nothing and it removes the only window in which she can decide she
has been robbed.

## 3.2 · The one pro-wait argument, and who makes it

Only the sellers make it, never the buyers:

> *"The email format allows the reader to take their time with the cards and carefully craft a
> response that is detailed and reflective."*

And one buyer testimonial that gets closest to praising it — praising the *evidence* of time, not
the time itself:

> ⭐ *"The amount of time and thought that went into this reading was evident."*

⭐ **That is the axis.** She does not value waiting. She values **visible effort in the artefact**.
A live reading cannot show its working; a document can. 07's wait is only justified if the
document proves the wait happened.

## 3.3 · ⭐ It is a keepsake, and that changes everything

The written product's real structural advantage, in sellers' own words:

- ⭐ *"This written format provides a lasting record, allowing the client to return to the insights
  later as their situation evolves."*
- ⭐ *"craft email readings that your clients will savor, save, print and return to time and time
  again"*
- ⭐ *"Email readings are great because you get a documented multi-page reading that you can keep
  forever and refer back to, re-read, and contemplate whenever needed."* — the clearest statement
  of the value proposition found anywhere
- *"Your reading arrives as a beautifully formatted PDF or email within 24 hours, ready to revisit
  whenever you need it."*
- *"It's in writing: I can't forget."* — the buyer-voice version (§4.1)
- ⚠ and the counter-practice, which throws the artefact away: *"Please note - purchased readings
  will remain on Google Drive for 7 days"* · *"Please download your video (if you wish) as it will
  be deleted after 14 days."* **A seller who expires the artefact has not understood what they
  sold.**
- and the packaging logic that follows: *"an email reading needs to be something that comes in a
  nice, neat little package that the client can take with them"* · numbered pages *"if they choose
  to print that baby out"* · a cover page carrying *"their name, date of birth, type of reading,
  date the reading was performed"* so that *"if your client is a returning one"* she can tell one
  reading from another

⚠ **A live reading is heard once. A written reading is re-read.** Every generic sentence gets a
second and third look, cold, days later, without the reader's warmth in the room. That single fact
generates most of §4.

## 3.4 · ⭐ The wait, from the buyer

All buyers below paid for a **document or a recording**, not a call. The first group comes from one
service that sells email readings only, delivered *"via email in 1-2 days"*; the rest from review
sites, complaint sites and tester blogs.

⚠ **These fragments came through a summarising fetch step, so treat them as directionally verbatim,
not character-exact.** I have dropped everything that was the platform's own AI-written review
summary rather than a reviewer's words.

**The wait, when it goes wrong — and note what breaks first:**

- ⭐ *"I then received another email asking for a review. I explained I am still waiting in my last
  reading...I should receive my reading in 2-5 days. Which also did not show up."*
- ⭐ *"I now believe this is a total scam...I never got my 2nd reading"*
- *"the timings of both of my follow up readings have been severely delayed several days due to
  'system errors'"*
- *"the system has been failed lately because i got my reading very late"*
- *"sometimes have to wait to long"*
- *"I never asked 3 questions and just asked for them to build on our existing work...oddly enough,
  I never received that reading"*

⭐ **The wait does not merely annoy her — it converts into a fraud accusation.** *"I now believe
this is a total scam"* follows directly from a reading that did not arrive. On a per-minute call
the equivalent complaint is being overcharged; here, **silence past the promised date reads as
theft.** This is the failure mode 07 owns entirely, because 07 promises a delivery window and then
goes quiet by design.

**And when it goes right, the wait is invisible — the document is what gets praised:**

- *"when the readings finally arrived they were as detailed as expected"*
- *"detailed and descriptive"* · *"thorough and accurate readings"*

⭐ *"when the readings finally arrived"* — **"finally" is doing the work.** Even the satisfied
reviewer experienced the wait as endured, not enjoyed. Nothing in this pull describes anticipation
as a pleasure. **The wait is a cost she tolerates for the artefact.**

**And the one clear statement that a long wait is forgivable:**

> ⭐ *"While the waiting time can be a little long, the quality of the reading more than makes up
> for it."* — against a stated turnaround of *"usually between 48 hours to a week"*

Neutral, promise-kept deliveries read exactly as you'd hope — unremarkable:

- *"She had advertised the reading would arrive on the same day, and it did."*
- *"ordered on a Sunday evening and had my reply on Monday afternoon"*
- *"Thank you so so much for such a quick turnaround, and a really insightful reading."*

## 3.5 · ⭐⭐ The rule the whole corpus supports

**The wait has no correct length. It has a kept promise.**

Every wait complaint in this file is about **the gap between the stated window and the delivery**,
never about duration in the abstract — *"promised me a full reading within 3-4 days… I'm still
waiting after 9 days"* · *"They said I would get my reading within 3-4 days tops. It has been 5
days and nothing still."* A week is forgiven when it was promised. Nine hours past a stated
same-day is not.

⭐ **And the floor matters as much as the ceiling: too fast reads as machine-made.** Buyers describe
sub-hour deliveries as *"a little suspect"* and *"impossible unless auto generated"*. ⚠ **07's 24
hours is not a weakness to apologise for — it is inside the credible band**, and instant delivery
would hand her the §4.2(a) accusation for free.

⛔ **And the thing that converts waiting into rage is a marketing email during the window.** §3.4's
*"I then received another email asking for a review. I explained I am still waiting"* is the
pattern; so is *"every time I delete one email that says it's their last email to me, they send
another."* ⚠ **07 is a daily email programme.** She will keep receiving the daily send while her
paid reading is outstanding. **That is a real and specific risk this file did not expect to find,
and it is cheap to fix** — suppress or acknowledge for buyers with an open order.

⛔ **Still not found:** what she actually *does* while waiting, in her own words. One behaviour did
surface — **she orders several at once and tracks them as a queue**: *"Tarot Blessing (still
waiting), [the reader], [the reader] (Still waiting)"*. The rest lives in the Reddit and
LipstickAlley threads I could not reach. **Do not let anyone fill this gap with live-chat quotes —
that is the error this file exists to correct.**

---

# 4 · ⭐ How written failure differs from live-chat failure

**The brief asked for this explicitly.** `04-marketplace.md` §2.3 ranks the live-chat failures. The
written ones are not the same list, and the difference is mechanical: **a written reading cannot
see her face, cannot be interrupted, and gets re-read.**

## 4.1 · ⭐⭐ The comparison, already written — in her voice

One seller who sells **both** email and phone readings publishes three lists on the same page.
They are written as sales copy, but every line is phrased as **the buyer's first-person thought**,
and it is the single most useful artefact in this file. Reproduced in full because the whole value
is the shape of the trade-off.

> **"Advantages of Email Reading**
> *'No, she didn't just repeat what I said.'*
> *'I only pay $18.75, that's it.'*
> *I can't get carried away.*
> *It's in writing: I can't forget.*
> *Forward it to a friend, or parts of it.*
> *I get the picture, I can Google the meanings.*
> *PayPal has my credit card, not a psychic –*
> *She doesn't even know my phone number.*
> *Maybe I won't give my own name out.*
> *Can ask about someone without naming them.*
> *It's impersonal: No voice for her to go by.*
> *No spirits involved, no energy reading here."*

> **"Disadvantages of Email Reading**
> *It's not a live conversation.*
> *I have to give one specific question.*
> *What if I don't know how to apply this information?*
> *I might have to wait for the answer.*
> *I want more!"*

> **"Advantages of a Phone Reading**
> *I get to vent, to explain.*
> *I get to know the type of person I'm talking to.*
> *I can build one question upon another.*
> *I call; she answers; we're on.*
> *I don't have to set up another payment; I'm a customer.*
> *I get useful information that isn't in my question."*

⭐ **Four things this settles.**

1. **The written product's #1 advantage is that it cannot cold-read her.** *"No, she didn't just
   repeat what I said."* is the *first* line — the exact failure `04-marketplace.md` §2.3 ranks as
   the worst, and here it is sold as the reason to choose writing. ⛔ **But that only holds if she
   has not written a long backstory.** §1.4 says she has. **07 collects the context and therefore
   forfeits this advantage unless it explicitly says so** (see §7.1).
2. **Spend control is a stated benefit.** *"I only pay $18.75, that's it"* and *"I can't get
   carried away"* — she is buying a **capped** interaction. Confirms `04-marketplace.md` §2.1(f)
   from the other side.
3. ⭐ **Anonymity is a feature.** *"Maybe I won't give my own name out"* · *"Can ask about someone
   without naming them"* · *"She doesn't even know my phone number."* ⚠ **This cuts directly
   against 07's maximum-intake position** (her name, her DOB, his name, his DOB — per
   `market-research.md`). Every field 07 adds removes a reason to prefer written over live.
4. ⭐ **The named disadvantages are 07's actual risk list**, and they are not the live-chat list:
   *not a conversation* · *one question only* · *how do I apply this* · *the wait* · ***"I want
   more!"***

| # | The written failure | Why it is written-only | Her words / the evidence |
|---|---|---|---|
| **1** | ⭐ **"Is this just a template?"** | A live reader is obviously improvising. A document looks mass-produced by default, and she has no way to test it | *"Do you actually do the reading, or do you just do it automatically in a template on your computer?"* — the first question this reader gets asked. And from a reader: *"I have actually heard of tarot readers who sell copy-pasted written readings"* |
| **2** | ⭐ **It answered a question she didn't ask** | Live, she interrupts and redirects in one sentence. In writing, the wrong reading is the whole purchase | ⭐ *"I paid for the reading(s) and did not get any clarity. whatsoever because reader rephrased it to something else entirely"* — and a reader agreeing it is bad practice: *"it's better to refuse a reading than to rework it in a way that doesn't align with the querent's expectations… It's basically bad business because it sets you up for having dissatisfied clients"* |
| **3** | ⭐ **No follow-up, so no repair** | Live, a bad beat is recoverable inside the same session. In writing, the document lands and that is the transaction | ⭐⭐ *"Buy a cheap reading, you'll get what you paid for. Very little solid action points, some vague back-slapping, and **not one offer to clarify**."* — a tester who bought four. And when she does push back: *"When I told them this, they went dead silent."* · *"I wrote to her several times about my situation but never received any replies."* Meanwhile *"Most people who didn't like something they received simply shrug and never go back"* — **written failure is usually silent** |
| **4** | **Ambiguity cannot be resolved mid-read** | The reader must either guess or break the asynchrony | One reader describes stopping to email a client because the cards implied a separation the question didn't: *"The question implied that they lived together, but the client confirmed that it was a long-distance relationship."* Another *"share[s] the spread with the client before the reading and check[s] in to make sure it answers the client's question"* |
| **5** | ⭐ **Length reads as padding** | Live, talking longer feels generous. In a document, she can see the whole thing at once and weigh it | ⭐ A 30-year professional, on buying email readings *herself*: *"Long readings seem to have a lot more fluff and I don't like weeding through that to get to the meat of the reading."* And from a reader: *"they're paying for information, not writing, so you don't have to write a dissertation"* |
| **6** | **It survives scrutiny it was never built for** | Re-read cold, days later. See §3.3 | The keepsake framing — *"savor, save, print and return to time and time again"* — cuts both ways |

## 4.2 · ⭐⭐ She forensically tests a written reading — three ways she cannot test a call

**The most important new material in this file.** `04-marketplace.md` §1.5 found her testing live
readers with code words. In writing she has far better tools, because **she holds the evidence.**

### (a) ⭐ She runs it through AI detectors

> ⭐ *"I paid 9 bucks for a reading and then ran it thru 5 AI detectors that I use regularly. She
> totally uses AI to generate readings and about 15-20% is her which is basically the greeting and
> the closing."*
>
> *"This reader did respond that she uses AI to correct text and spelling errors. Yah, no you
> don't. Plus, the answers were super generic."*
>
> *"With etsy they need to send you a video recording. Everything else is AI on there at this
> point"*

⛔ **This is the single most consequential finding for 07's disclosure decision.** She does not
suspect AI — **she measures it, with tooling she uses "regularly", and she publishes the
percentage.** Note also that she rejects the mitigation (*"uses AI to correct text and spelling"* →
*"Yah, no you don't"*), and that her proposed proof-of-human is **a video recording**. §5.1 shows
the two viable positions: refuse AI outright, or disclose it and price the human hours around it.
**Undisclosed-and-detected is the one position with no recovery.**

### (b) ⭐ She compares her reading against another person's

> ⭐ *"My husband and I both received [the reader]'s free reading. The whole thing was a 100% copy
> and paste. Word for word reading. The only things that were different were our names, birthdays,
> and zodiac signs."*
>
> *"2 of us did the free reading... We both got the exact same reading, even the same words were
> mispelled."*

⚠ Plus reports (search-summary, wording unverified) of buyers signing up *"with a different name and
email address and date of birth"* and getting *"the exact same page with names changed"*, and Etsy
buyers finding readings *"nearly identical to other customers' readings, with only a few paragraphs
altered."*

⛔ **This is the template accusation, proven.** A daily email programme sends one document to a
whole list. **Two subscribers who compare notes is the failure condition**, and §3.3 says she saves
the document forever. `04-marketplace.md` rated "it fit anyone" as severe for 07; this makes it
worse, because in writing it is *falsifiable* and she falsifies it.

### (c) She plants a fake situation

> ⭐ *"So I made up a fake scenario about a conflict that was not real involving someone I
> completely made up."* → *"She gave me an entire reading about it!"*

⭐ **The extension of the live "code word" test into the written product** — and it is the direct
trap for the failure below.

### (d) And she names the mechanism when it happens

> ⭐ *"Most of them just give you life advice based on what you write to them anyway"*

⭐ **That is `04-marketplace.md`'s worst failure — "she fed it the answer" — stated in one line by a
buyer of written readings.** Combined with §1.4, it is the central risk: she writes a long,
self-aware letter, and any document that merely expands it has confirmed her suspicion.

## 4.3 · ⚠ What 07 is exposed to that live chat is not

Cross-referencing `04-marketplace.md` §2.3:

| Live-chat failure | Does it carry to written? |
|---|---|
| **She fed it the answer** | ⛔ **Worse.** Live, the reader extracts detail and it feels like conversation. In writing she volunteers all six elements of §1.4 in one block, unprompted — and then reads a document built out of them, alone, twice |
| **It fit anyone** | ⛔ **Worse.** A live generic line passes in the flow of talk. The same line in a saved PDF is re-read and compared |
| **The date moved** | ⚠ **Same, but now provable.** She has the document. `04-marketplace.md` rated this moderate for 07; in writing she holds the receipt |
| **Charged for the reader's silence** | ✅ **Gone.** Confirms `04-marketplace.md` §2.1(f) — 07 charges for a finished thing, and this whole complaint family evaporates |

## 4.4 · What made a written reading good — buyer testimonials, verbatim

Sparse, and all from sellers' own testimonial sections, so ⚠ **selection-biased by definition.**

- ⭐⭐ *"This reading gave me such clarity and it changed my viewpoint on many things that I am
  facing. … **My reading highlighted something that was bothering me which I did not mention in the
  brief. I've gone back to the reading for a couple of times since then, and each time, things
  become even clearer.** I was also really impressed by the personalised delivery and explanation
  of the reading based on my situation."* — **the single best written-reading testimonial in this
  file.** It does both things at once: it **beat the brief** (the answer to the template
  accusation) and it **survived re-reading** (the answer to §3.3)
- *"This is my third time having a reading done by [the reader] and her readings are always
  thoughtful and easy to understand. The reading has provided affirmation to some of my own
  thoughts, as well as brought up some questions and options for further self-reflection."*
- *"The reading was insightful and gave me a sense of direction. Mind, you'll still have to make
  your own decisions, but I felt the reading nudged me into greater clarity even after I'd already
  made a decision.. especially when I was still debating whether it was the right move to make."*
- ⭐ *"You completely gave me the information and insight needed to take action and move forward.
  And I'd like you to know that I personally had a very shallow insight into my question. This
  reading totally uprooted the deep issue I had trouble recognizing myself. The amount of time and
  thought that went into this reading was evident."*
- ⭐ *"Didn't tell me which way to go but did give advice for both, which was helpful and practical.
  Can't fault any of the reading. This has been the best and closest to me I have had."*
- *"Everything said was accurate and helpful for me to identify my flaws in order to grow as a
  person."*

**From buyers on review sites and reader testimonial pages — three themes that only a document can
earn:**

- ⭐ *"What an amazing psychic email reading! I am grateful to be able to get my answers this way
  **because of little privacy**."* — ⭐ **privacy as the reason to choose written.** Confirms §4.1
  advantage 3 from the buyer side, and it is a reason 07's intake form actively erodes
- ⭐ *"I will keep forever. You were spot on with your words"* and *"I'm still receiving/
  contemplating it."* — the keepsake (§3.3), confirmed by buyers rather than sellers
- *"With most psychics, you get back a vague answer, but with [the reader] she provided a great deal
  of information that was a great help to me. **I am sending my next questions now!**"* — ⭐ the
  repeat-purchase moment, which is what a recurring programme needs
- *"They actually write a lot of details that I don't find to be generalized at all. You will get at
  least a paragraph if you ask even 1 question."*
- *"Their insight into my relationship was very spot on...honestly felt like heart-to-heart advice
  with a trusted friend."* — matches `04-marketplace.md` §2.2(c): blunt **and** warm
- *"she was able to accurately predict what was going on with POI and even nailed facts she could
  not have known"* — and, separately, *"Really cool spreads."*

From the email-only review page (⚠ directionally verbatim, see §3.4):

- ⭐ *"she doesn't write what you want to hear she writes what you need to know"* — **the verb is
  *writes*.** This is `04-marketplace.md`'s single most-resented failure — *"they just tell you what
  you want to hear"* — inverted into praise, and in the written market it is what the buyer thinks
  she is buying
- *"she was able to clearly pick up on the nuances surrounding the events I experienced"*
- ⚠ *"whenever I didn't fully understand the meaning of a reading, she patiently helped me"* —
  a buyer praising **the follow-up**, which is exactly what an automated written product does not
  have (written failure #3)

⭐ **Read the first one again: *"I personally had a very shallow insight into my question."*** She
is praising the reading for **beating the question she submitted**. That is the written product's
best possible outcome and it is the direct answer to failure #1 in §4 — a template cannot go deeper
than the question, so going deeper than the question is the proof that it is not one.

---

# 5 · Word counts and formats — the market's shape

07 delivers ~1,000–2,600 words. That sits at the **upper-middle** of this market, not the top.

| Advertised length | Format | Note |
|---|---|---|
| **350 words** (2 pages) | PDF by email | sold as *"Written Reading That Gets Straight to the Point"* — ⭐ brevity as the *feature* |
| **500+ words** | — | referenced as the tier below the 1000+ one |
| **1000+ words** | written reading | *"Guaranteed 1000 + Words"* — a guaranteed floor, stated in the title |
| **2500 words** (~8 pages) | PDF report | *"EMAIL Reading Report - 2500 Words - in Depth Reading"* |
| **~6000 words** (7–9 pages) | PDF | the top end seen |
| **25+ pages** | PDF with chapters | astrology natal report, 48h delivery |

From the 45 non-Etsy sellers, where the unit is pages or paragraphs more often than words:

- *"a picture of your tarot cards (at least 5) and a **500-word interpretation**"*
- *"**2 to 3 insightful paragraphs**"* — sold as a *"Detailed Written Report"*
- *"a detailed PDF/Google Doc (**2–4 pages**)"*
- *"One reading takes 2-3 hours to complete and is between **5-6 pages**"*
- *"Delivered as a PDF (**5-8 pages**)"*
- *"a custom report for you that is between **30-40 pages**"*
- ⭐ and one seller who refuses the unit entirely: *"Readings are **not limited to a time frame,
  word count, etc.** I take as long as I need to get the information out"*

⭐ **And what buyers report actually receiving** — the demand side, which matters more than the
advertised side:

- ⭐ *"around 1000 words"* — a paid email reading, ordered Sunday evening, arrived Monday afternoon
- *"you will get at least a paragraph if you ask even 1 question"* · *"at least a paragraph or two
  back"*
- *"Those readings i have gotten have been several pages long"*
- and the complaint at the thin end: *"Helpful app, but I do feel readings could be more detailed
  though"* · *"I paid the $69. For this reading. All I got was Lucky Numbers"*
- ⚠ at the absurd end, an undelivered promise: *"She promised a detailed report of 60 pages"*

⭐ **07's ~1,000–2,600 words is well-calibrated against what buyers describe.** The satisfied
benchmark is *around 1,000 words* and *several pages*; the complaint threshold is *a paragraph*.
**The risk is not being too short — it is §4.2, being long and detectably generated.**

⭐ **This confirms `market-research.md`'s craft note — *"Nobody sells words — they sell countable
things"* — and sharpens it.** The countable thing is almost always **questions answered**, then
cards, then pages. Word counts appear on a minority of listings and never as the headline.

## 5.1 · ⭐ How the market discloses AI — directly relevant to 07

Two opposite positions, both stated openly on the product page.

**"No AI" as the selling point:**

> *"It takes time to write because **I actually write it and don't use AI**."*

Etsy carries a whole `tarot_reading_no_ai` search facet, and one listing sells being *"written
manually by a psychic expert … without AI or automated answers"*.

**AI disclosed, and priced anyway** — ⭐ the more useful case:

> *"I'll use my friend ChatGPT and my 15+ years of experience with evolutionary astrology to create
> a custom report for you that is between 30-40 pages. ChatGPT is all about using the correct
> prompts so **this is not just an automated report, I carefully craft the prompts with my own
> intuitive guidance and perspective.**"*
>
> *"I generally spend at least 1-2 hours studying your charts and transits and **reading through and
> editing what chatGPT offers** to make sure I'm giving you something truly special."*

⭐ **The move is identical to the one `market-research.md` documents at swornandsealed** — sandwich
the AI clause between two claims of human labour, and **name the hours**. Neither seller hides it;
both convert the disclosure into a proof of effort. That is the same axis as §3.2: **visible work
is what she is buying.**

Other format facts:

- ⭐ Etsy's own platform rule forces an artefact: a reading must include *"a tangible good, such as
  photos of the tarot spread, audio/video of a reading, or text of the reading."* (already in
  `04-marketplace.md` §3.2 — restated because it constrains this whole market)
- **The spread photograph is the proof-of-work.** From a professional: *"it's best to include a
  photo of the spread and an explanation of how you got what you did. That makes it plain that yes,
  you are actually reading the cards."* ⭐ This is the direct countermeasure to written failure #1
- **"No AI" is now a selling point with its own search facet.** One listing sells being *"written
  manually by a psychic expert and sent as a high-quality PDF or PNG — without AI or automated
  answers"*, and Etsy carries a `tarot_reading_no_ai` market page. ⚠ Directly relevant to 07's
  disclosure decision
- Card images embedded *and* attached separately, deliberately: *"gives your clients the option to
  do what they wish with the pictures"*
- Delivery vehicles seen: PDF, Word document, email body, PNG, recorded video, voice note

⚠ **On the 1,000–2,600 range:** the only person in this pull who says what she wants as a *buyer*
of email readings says short. *"Long readings seem to have a lot more fluff."* 07 is not
necessarily wrong — it charges more than a $5 Etsy listing and the ladder sells *questions
answered*, not words — but **the word count is not itself the value, and the market does not
reward it linearly.**

---

# 6 · ⚠ Sensitive — flagged, quarantined

Not for use without a deliberate decision.

**Health, pregnancy, legal.** Universal on refusal lists, consistent with `04-marketplace.md`.
Sellers add explicit non-credential disclaimers — *"I am not a doctor"*, *"I am not a lawyer"*, and
one stating she *"cannot give mental health advice or address mental disorders since they are not a
licensed therapist or psychiatrist."* Pregnancy is refused in both directions: some *"will not
answer questions about when you will get pregnant"*, while pregnancy-specialist listings invert it.

**Distress in the submitted questions themselves.** Three of the nine in §1.1 carry real weight:
*"a decade and change of mostly traumatically awful relationships"*; *"I feel really unempowered"*;
and a woman describing isolation in a place she cannot leave. ⭐ **None of them asks for a
prediction.** All three ask *how do I cope / how do I open up / how do I feel sure again.* ⚠ If 07
answers these with a forecast it has answered a different question — which is written failure #2.

**Bereavement.** A whole product category exists — mediumship email reports at 2500 words, *"Spirit
Guide Report… Channeling Message From Beyond"*. Consistent with the bereavement cross-cut already
flagged in memory. Not sampled further here.

⛔ **Fertility and pregnancy loss — the sharpest flag in this file.** Both are paraphrase, not
verbatim, and both describe real harm done *by a written reading specifically*:

- ⚠ a buyer who paid *"nearly £100 in fertility readings that all promised a baby"* and went on to
  have *"another 7 miscarriages"*, none of the readings correct
- ⛔ ⚠ a buyer given *"a vague reading about pregnancy troubles"* whose reader *"wouldn't provide
  further detail without paying an additional £45"*

⛔ **The second is the pattern to name and never go near: a written reading that opens a fear and
paywalls the resolution.** It is structurally available to any programme that sells the next
reading — which 07 is. This is why the market's near-universal pregnancy/health refusal exists, and
07 should carry it explicitly (§2.7).

**Compulsive repurchase.** ⚠ *"After my breakup I became addicted to this site. I have had well
over 200 readings…"* — a recurring-purchase programme is exactly the structure this describes.
Flagged, not resolved.

**Money and no recourse.** *"I asked for a refund twice and still haven't received it."* And the
upsell ladder built on a cheap written reading: *"Initial readings may be free or low-cost, but
they quickly escalate into demands for more money to 'complete rituals'."*

No self-harm content was found.

---

# 7 · What this changes for 07

Eleven things the evidence above supports directly.

1. ⭐ **Build the booking box for the long answer, then do the compression yourself.** §1.4 says
   she will supply constraint, timeline, pre-empted advice, two doors, a defence of him, and a
   named feeling — whether or not you ask. Half the market tells her *"Avoid long, convoluted
   backstories"* and gets topics anyway. **Ask the four questions that already work:** what
   happened / how long it's been / where it stands now / what you most want to understand.
2. ⭐ **Add the consent-to-bad-news line at intake.** *"By asking… you are consenting to receiving,
   both, an answer you are happy with, and one you may not like."* One sentence, collected before
   payment, and it pre-empts the *"they just tell you what you want to hear"* complaint that
   `04-marketplace.md` ranks as the close runner-up failure.
3. ⛔ **The template accusation is not a suspicion — she proves it, and 07 is uniquely exposed.**
   §4.2: she runs readings through *"5 AI detectors that I use regularly"* and publishes the
   percentage; she compares her document against a partner's (*"The only things that were different
   were our names, birthdays, and zodiac signs"*); she plants fake scenarios. **A daily programme
   sends one document to a whole list, and she saves it forever — two subscribers comparing notes is
   the failure condition.** The market's two survivable positions are in §5.1: refuse AI and say so,
   or disclose it and name the human hours. **Undisclosed-and-detected has no recovery.** The
   cheapest structural defence remains the **per-buyer spread photograph** — *"That makes it plain
   that yes, you are actually reading the cards"* — and 07's spreads are stock-per-day.
4. ⭐ **Beat the question she submitted.** *"I personally had a very shallow insight into my
   question. This reading totally uprooted the deep issue I had trouble recognizing myself."* A
   template cannot go deeper than the question it was given — so going deeper is the proof it isn't
   one. This also matches `04-marketplace.md` §2.2(b): the praised lines are statements about
   *her*, not predictions.
5. ⚠ **Do not sell the wait, and do not let word count stand in for value.** Every seller races the
   delay; the only thing a buyer praised was *evidence of effort*, not elapsed time. And the one
   professional buyer of email readings in the pull says long readings read as fluff. **07's
   defence is the ladder — questions answered, priced per question — not the word count.**
6. ⭐ **Send one interim email that names the delivery date.** §3.4 shows the wait converting into
   *"I now believe this is a total scam"*, and §3.1 shows a seller reduced to begging buyers not to
   *"Freak Out"*. The professional fix is already in the market: *"The email will contain the date
   by when you will receive your reading."* 07 goes quiet by design between purchase and delivery —
   that silence is the whole risk window, and one automated email closes it.
7. ⚠ **Every intake field 07 adds removes a reason to buy written instead of live.** §4.1 lists
   anonymity as a stated advantage — *"Maybe I won't give my own name out"*, *"She doesn't even
   know my phone number"* — and a seller sells **not asking** as the trustworthy position, naming
   07's fields one by one. 07 sits at maximum intake **and** collects the third party's details,
   which several sellers refuse outright (§2.7). This is a live decision, not a settled one.
8. ⚠ **Set the expectation that the reading may not answer the question she asked.** Written
   failure #2 has no in-session repair. Two sellers pre-authorise it in one sentence at intake —
   *"the reading may address a different area of your life than you expected, and this is beyond my
   control"* — and it costs nothing.
9. ⭐ **Offer one clarification, and treat it as half the product.** *"Not one offer to clarify"* is
   the async-native indictment (§4), and when she does push back the reader *"went dead silent."*
   One free follow-up or rewrite is what converts a confusing delivery into a kept customer — and
   because written dissatisfaction is silent, it is also the only way 07 will ever hear about a bad
   reading at all.
10. ⛔ **Suppress the daily send for buyers with an open order.** §3.5: a marketing email arriving
    during the wait is the fastest route from impatience to rage — *"I then received another email
    asking for a review. I explained I am still waiting."* 07 is a daily email programme, so this
    collision is the default state, not an edge case. Cheap to fix, expensive to discover live.
11. ✅ **Claim the no-clock advantage; it is still unclaimed.** Confirms `04-marketplace.md` §6.5.
   The entire live-chat failure family about paying for a reader's silence does not apply to 07,
   and **written failure #3 gives the reason it matters**: *"Most people who didn't like something
   they received simply shrug and never go back."* Written dissatisfaction is silent, so 07 will
   never see the complaint — only the missing repeat purchase.

## 7.1 · ⚠ Where this lands against `market-research.md`

That file already settled the seller side. This one adds the buyer side, and the two meet at three
points — two agreements and one live tension.

| `market-research.md` says | This file adds | Verdict |
|---|---|---|
| *"Nobody sells words — they sell countable things… keep leading with [spread counts], not with '~1,000 words'"* | The only buyer of email readings in this pull says long readings read as fluff (§5) | ✅ **Agreed, and now buyer-confirmed.** Lead with questions answered |
| A competitor's disclosure line: *"never a template, never reused"*; and ⚠ *07 "has no spread image at all"* | The template accusation is the **first** objection a written reader meets (§2.1, §4) and the market's answer is the per-buyer spread photograph (§5) | ✅ **Agreed, and more urgent than it looked.** The missing image is the top structural exposure |
| The recommended middle path: *"no personal details, but the question must be exact"* — against 07's current maximum-intake position | ⚠ She writes long regardless (§1.4), and half the market **prices candour**: *"the more candid you are, the more precise and useful my reading becomes"* (§2.3) | ⚠ **Unresolved, and it is the real decision.** A strict-question intake fights §1.4's evidence. The reconciliation is probably: **few identity fields, one exact question, and a generous optional context box** — plus the competitor's own line *"the reading is not built from what you tell me"*, which lets you take the long context without inheriting the "you fed it the answer" failure |

---

## Sources

**Full-length submitted questions (§1)** — pulled via publisher API, character-exact:
- [Questions from the Tower — full archive](https://questionsfromthetower.substack.com) (Q1–Q9)
- [Incandescent Tarot — "Ask a Tarot Reader" archive](https://incandescenttarot.substack.com)
- [A Valentine's advice column, reader questions in comments](https://raynejubilee.substack.com/p/the-advice-column-issue-03)

**Readers writing about their own email-reading process (§2, §3, §4)**:
- [A behind-the-scenes tour of email tarot readings — the fullest intake spec](https://www.biddytarot.com/behind-the-scenes-tour/)
- [How I do email tarot readings](https://www.thetarotlady.com/how-i-do-email-tarot-readings/) · [How to get a great reading via email — the question rules](https://www.thetarotlady.com/reading-through-the-wire-how-to-get-a-great-tarot-reading-via-email/)
- [Do email tarot readings really "work"? — process + client testimonials](https://sophrosynetarot.com/do-email-tarot-readings-really-work/)
- [Delivering a memorable email reading, pt 1](https://www.spiralseatarot.com/blog/2016/5/7/delivering-a-memorable-email-reading) · [pt 2](https://www.spiralseatarot.com/blog/damerpart2)
- [What to expect from a tarot email reading](https://themodernpsychics.com/news/what-to-expect-from-a-tarot-email-reading/)
- [How to read tarot via email](https://janetboyer.substack.com/p/how-to-read-tarot-via-email) (paywalled; summary only)

**⭐ The email-vs-phone trade-off in buyer voice (§4.1), and the most prescriptive question templating found (§2.4)**:
- [One seller's email-reading page](https://tarotverbatim.com/email-reading/)

**⭐ Buyer reviews of written / email / recorded readings (§1.2, §3.4, §3.5, §4.2, §4.2, §5, §6)** — ~270 on-territory buyers:
- ⭐ The open psychic-review forum — the only one that let us in, and the source of the AI-detector and planted-fake-question material: [thread 7285](https://www.thepsychicreviews.com/forum/index.php?topic=7285.15) · [thread 1751](https://www.thepsychicreviews.com/forum/index.php?topic=1751.450) · [thread 6425](https://www.thepsychicreviews.com/forum/index.php?topic=6425.0) · [thread 995](https://thepsychicreviews.com/forum/index.php?topic=995.0)
- ⭐ The four-reader tester buy — *"not one offer to clarify"*: [Etsy's cheap tarot readers, tested](https://sophrosynetarot.com/the-truth-revealed-etsys-cheap-tarot-readers-are-tested/)
- ⭐ Copy-paste proved by comparing two buyers: [smartcustomer](https://www.smartcustomer.com/reviews/astromary.com) · [smartcustomer](https://www.smartcustomer.com/reviews/tara-medium.com) · [smartcustomer](https://www.smartcustomer.com/reviews/christin-medium.com)
- Email-reading reviews and turnaround: [email reading reviews](https://thepsychicreview.com/reviews/type/email/) · [a ~1000-word email reading](https://thepsychicreview.com/reviews/psychic-email-reading-review-for-michele-knight/) · [the wait "more than makes up for it"](https://thepsychicreview.com/reviews/email-reading-with-chris-riley/)
- Testimonial pages: [privacy as the reason to choose written](https://bethlayne.com/psychic-email-readings/) · [email reading reviews](https://cpsychicreadings.com/product/email-reading/) · ["I will keep forever"](https://www.rubytarot.co.uk/testimonials/) · ["still receiving/contemplating it"](https://www.tarot-cafe.com/tarot-reading-testimonials/) · [quick turnaround](https://tarotbyemail.com/testimonials/)
- Undelivered readings and refunds: [pissedconsumer](https://aboutastro.pissedconsumer.com/reviews/RT-P.html)
- App-store reviews of recorded/video readings: [Purple Ocean](https://apps.apple.com/au/app/purple-ocean-psychic-reading/id926748329)
- [Trustpilot — an email-only service](https://www.trustpilot.com/review/psychicsamira.com) · [page 3](https://www.trustpilot.com/review/psychicsamira.com?page=3)

**The one-shot written question, horary (§2.5)**:
- [A horary practitioner's conditions page](https://druish.com/horary-questions/)

**Seller intake, wait, refusals and disclaimers (§2, §3, §5)** — from ~45 sellers; the most-cited:
- Question rules and consent-to-bad-news: [one-question express reading](https://www.kelechiokafor.com/shop/p/express-one-question-email-tarot-reading) · [reframing rule](https://boldthursday.gumroad.com/l/tarotreadings) · [specificity + timeframe rules](https://sylviecosmickeys.gumroad.com/l/tarotreading)
- ⭐ The published ethics page — third parties, honesty, no refunds: [ethical rules and guidelines](https://tarotwithkatlou.com/ethical-rules-and-guidelines-for-readings/)
- ⭐ Anonymity as the position — "I don't need to know your name, date of birth…": [how it works](https://tarotbyemail.com/how-it-works/) · [terms](https://tarotbyemail.com/terms-and-conditions/)
- The lower-bar / blind-reading tier: [general readings welcome](https://sashareads.gumroad.com/l/3questions) · [nickname is fine](https://emmariehodge.gumroad.com/l/detailedtarotreading_text) · [blind readings offered](https://thepsychiczac.gumroad.com/l/NMSuY)
- ⭐ AI disclosure, both directions: ["I actually write it and don't use AI"](https://emmariehodge.gumroad.com/l/detailedtarotreading_text) · ["I'll use my friend ChatGPT… I carefully craft the prompts"](https://tristawave1.gumroad.com/l/gqxnm)
- The wait, and the "don't freak out" text: [queue rant](https://tarotpsychicmasters.gumroad.com/l/Psychichreading) · [interim email naming the delivery date](https://valeriablack.gumroad.com/l/personalreadings) · [refund if late](https://emmariehodge.gumroad.com/l/detailedtarotreading_text)
- Length and keepsake framing: [5-6 pages, 2-3 hours, "keep forever and refer back to"](https://expressivetarot.com/) · [multi-page PDF report](https://www.trippywitch.com/product/tarot-reading)
- Testimonials quoted in §4.2: [seller testimonial block](https://boldthursday.gumroad.com/l/tarotreadings)

**Reader-community threads (§4)** — reached before the site began 403ing:
- [Price for on-line tarot readings](https://www.thetarotforum.com/forums/topic/7816-price-for-on-line-tarot-readings/) · [How to ask/write a good question as a querent](https://www.thetarotforum.com/forums/topic/14544-how-to-askwrite-a-good-or-correct-question-as-a-querent-if-reading-for-self-or-asking-a-reader/) · [What questions do tarot readers get asked?](https://www.thetarotforum.com/forums/topic/13959-what-questions-do-tarot-readers-get-asked/)

**Seller listings (§2, §5)** — Gumroad reached directly; Etsy ⚠ via search summaries only:
- [A written personal tarot reading, 1 question / 3 cards / 5–7 business days](https://astrojeiry.gumroad.com/l/personal-tarot-readings-written)
- Etsy listings for word counts and intake: [350 words](https://www.etsy.com/listing/1241950034/mini-tarot-reading-written-reading-that) · [1000+ words](https://www.etsy.com/listing/1564635570/super-detailed-written-tarot-card) · [2500 words](https://www.etsy.com/listing/1698058616/psychic-mediumship-email-reading-report) · [the question-format rules](https://www.etsy.com/listing/1721915879/tarot-reading-psychic-reading-same-day) · [the blind reading](https://www.etsy.com/listing/4413841295/same-hour-blind-psychic-reading-no) · [the candour clause](https://www.etsy.com/listing/4524100319/love-reconnection-reading-personalized) · [Etsy services policy](https://www.etsy.com/legal/policy/services/242665313101)

**Adjacent, not duplicated here:** [`07-etsy-browser.md`](./07-etsy-browser.md) — Etsy listing
*titles* read in a real browser. Its contents were not re-verified for this file.
