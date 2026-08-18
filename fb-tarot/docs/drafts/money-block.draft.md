# DRAFT — the MONEY-BLOCK batch on /fb-tarot (11 landers, 33 reveals)

**Status: ⬜ AWAITING SIGN-OFF. No code has been written.**

Commissioned 2026-08-18. Deck: **`return-mhf`** (face-down Magician / Hanged Man / Fool).
No new art, no new deck entry — same three cards, same strip, same faces.

Operator decisions taken at commission:

| Decision | Choice |
|---|---|
| Deck | reuse `return-mhf` only, face-down |
| Age bands | **page matches ad** — 55–64 and 65+ get their own landers |
| "Too late" / "out of time" | **answer it straight: not too late** (not a binary-refusal) |
| Scope | lander copy + money-framed chat opener. Offer untouched. |

---

## 1. Why this batch is different from every family before it

Every one of the 21 hook families live on `/fb-tarot` is love or relationship. This is the
first that is not. Three consequences the wiring must handle, none of which the
`fb-tarot-add-card` skill covers, because no money hook has ever existed:

1. **`hookToBucket()` is hardcoded to `'love'`** (`client/src/content/tarotReads.ts:4091`).
   Every money hook must return `'money'` or the whole V1 chat downstream runs a love
   reading against a woman who asked about her pension.

2. **The tap instruction lives on the DECK, not the hook.** `return-mhf` says
   *"Think of the man on your mind."* All 11 money landers would say it. Fix: an optional
   `hookInstruction` map on `CardSetConfig`, falling back to `instruction`. Additive,
   backwards-compatible, no other deck changes.

3. **A sixth frame in `buildTarotReflectPrompt`.** The five existing frames (decode-him,
   self-frame, after-loss, soulmate-where, loneliness) all assume a man or a romantic
   future. Money is neither. The in-file note says the five-branch ternary is already at
   the limit of what reads well — so money is tested FIRST and returns early, rather than
   being appended as a sixth arm of the chain.

---

## 2. The card mapping

`return-mhf` is face-down, so the reveal verb is **"You turned"** and the cards are
shuffled per visit (all three reads get roughly even traffic — see STATUS.md 7/28).

| Panel | Card | Its money reading |
|---|---|---|
| a | **The Magician** | She *can* make money. The making was never the problem. Capability is intact; the block sits after it. |
| b | **The Hanged Man** | The block card. Something stopped and stayed stopped. Suspended is not gone, and a hold is not a verdict. |
| c | **The Fool** | The road is still open. It does not resume where it stalled — it begins. Begins at any age. |

The Fool is what makes the "not too late" answer honest rather than a kindness. It is the
card of a beginning available to anyone standing anywhere, and it does not check the age of
the person stepping off. That is a true reading of the card, not a softening.

---

## 3. The four families

Four new `angle` values, so PostHog can compare age-matched framing against
mechanism-matched framing, and 55–64 against 65+. That comparison is the point of the
batch; folding all 11 into one angle would throw it away.

| angle | Hooks | The wound |
|---|---|---|
| `money-retiring` | blocked-retiring · nest-egg · too-late | 55–64. Retirement is close and the money is not there. |
| `money-working` | still-working · how-much-longer · out-of-time | 65+. Past the age she expected to stop, and still working. |
| `money-energy` | my-energy · money-wont-stay · energy-how-long | She suspects herself. Lift +69%, n=122. |
| `money-prayer` | prayed-years · prayers-unanswered | She has prayed for years. Lift +61%, n=151. |

`money-prayer` has **two** hooks, not three. Only two headlines were commissioned. Pin the
count so a well-meaning third does not appear later without a decision — same treatment
`hidden-intuition` got.

---

## 4. The guard set (new file: `tests/tarot-money-block-copy.test.ts`)

Seven bans. Four are money versions of existing rules; three exist nowhere else on the funnel.

1. 🔴 **No amount, no date, no source.** Never a sum, never "by spring", and never where it
   comes from — no inheritance, no legal case, no windfall, no lottery. This is
   `hidden-intuition`'s CONTENTS ban pointed at money, and it is worse here, because she
   can act on an invented source with her actual savings.

2. 🔴🔴 **Never name a person as the block.** No family member taking from her, no partner
   draining it, no "someone close to you". A card cannot see this, and the accusation lands
   on a real person inside a real family.

3. 🔴🔴 **No financial advice, in any form.** Never invest, sell, hold, move it, take the
   pension, delay the pension, pay off, borrow, start a business, go back to work, stop
   working. Not regulated advice from a psychic reading, ever — and this is the one ban
   where the harm is measured in her money rather than her feelings.

4. 🔴🔴 **Never blame her.** No poverty mindset, no "you don't believe you deserve it", no
   self-sabotage, no "you attract lack", no raise-your-vibration. She arrives having been
   told all of it by the internet. Note the sharp edge: the `money-energy` family's headline
   *offers* the self-blame — "Is my energy blocking my money?" — and the move is to affirm
   the noticing while refusing the fault, exactly as `hidden-intuition` splits the question.

5. 🔴 **Never too late, and never a promised arrival.** Operator's call is that the reads
   answer "not too late" flat. The matching ban is the other direction: no "it is coming",
   no "within the year". One is cruelty, the other is a promise nobody can keep.

6. 🔴🔴 **`money-prayer` only — never rule on God.** Never that she is being tested,
   punished, taught, or told no. Never that a plan is at work. Never that her prayers went
   unheard, and never that they were answered — both are rulings, and neither is a card's to
   make. Never place Evelyn or the cards above or against what she prays to. This ban exists
   nowhere else on the funnel and it is the reason the family needs its own guard block.

7. 🔴 **Never presume the state of her finances.** She said blocked. She did not say broke,
   in debt, or destitute. Do not fill it in.

---

## 5. The 33 reveals

Beat 1 names the card. Beat 2 affirms the pull. Beat 3 is the read. Beat 4 opens the loop
into chat. All 33 card framings in beat 1 are deliberately distinct — same rule the trust
hooks shipped under.

---

### `money-retiring` (55–64)

#### `cards-blocked-retiring` — "Why is my money still blocked this close to retiring?"

**a · The Magician**
> You turned the Magician, dear — the card of the hand that makes, of everything you already know how to do.
> You asked why the money has not come, and your hand went to the card of the one who was never short of ability.
> The Magician does not show me a woman who failed at this — it shows me capability that has been intact the whole time, which means the block sits somewhere after the making, not before it.
> Let me look closer at where the making stops turning into keeping…

**b · The Hanged Man**
> You turned the Hanged Man, dear — the card of the thing that stopped and stayed stopped.
> You reached for the card of the hold, and that is not an accident this close to the years you were counting on.
> The Hanged Man does not tell me the money is gone — it tells me it is suspended, and something suspended is being held by something, which is a very different problem from having nothing.
> Let me look closer at what took hold of it, and when…

**c · The Fool**
> You turned the Fool, dear — the card of the road that has not been walked yet.
> You reached for the one card in this deck that refuses to treat your age as a closing door.
> The Fool does not point backward at what should have happened by now — it points at an opening, and it is telling me this does not resume where it stalled, it begins somewhere you have not looked.
> Let me look closer at the opening it is showing me…

#### `cards-nest-egg` — "How long has something been blocking me from a nest egg?"

**a · The Magician**
> You turned the Magician, dear — the card of will, of the person who does the work and expects the work to add up.
> You asked how long, and your hand chose the card of someone who has been trying the whole time.
> The Magician tells me this is not recent — the effort has been steady for years, and steady effort that never accumulates is the signature of something standing between the earning and the keeping.
> Let me look closer at how far back it goes…

**b · The Hanged Man**
> You turned the Hanged Man, dear — the card of the long pause, the one that outlasts what anybody expected.
> You asked how long something has been blocking you, and you reached for the card that is made of that exact question.
> The Hanged Man leans toward something old rather than something new — this has been sitting still long enough that you stopped noticing it as an event and started living inside it as a condition.
> Let me look closer at when it first went still…

**c · The Fool**
> You turned the Fool, dear — the card of the fresh start, the bag that is not yet packed.
> You reached for the beginning card while asking about a long delay, and that pairing is worth something.
> The Fool does not measure the years behind you — it says nothing has been laid down yet, and a thing that was never laid down is not the same as a thing that was taken.
> Let me look closer at what has been keeping the ground bare…

#### `cards-too-late` — "Is something blocking my money, or did I just leave it too late?"

**a · The Magician**
> You turned the Magician, dear — the card of the hand that is still able.
> You put two options in front of me, and your hand reached for the card that only answers one of them.
> You did not leave it too late — the Magician does not deal in expired chances, it shows me ability that is present right now, and present ability is not what too late looks like; something is standing in the way, and a thing standing in the way can be moved.
> Let me look closer at what has been standing there…

**b · The Hanged Man**
> You turned the Hanged Man, dear — the card of what is held, not what is finished.
> You asked me to choose between a block and a missed chance, and your hand went to the card that is a block.
> It is not too late, dear. The Hanged Man is the card of suspension, and suspension is the opposite of expiry — something has been holding this, and you have spent that whole time believing the holding was your own lateness.
> Let me look closer at what has had hold of it…

**c · The Fool**
> You turned the Fool, dear — the card that begins, and begins at any age.
> Of the three, your hand reached for the only one that has never once been about a deadline.
> You are not too late. The Fool steps off with nothing decided and nothing spent, and it does not check how old the person stepping is — what it says is that the road is open, which means the thing in your way is a block and not a closed door.
> Let me look closer at where the road actually opens…

---

### `money-working` (65+)

#### `cards-still-working` — "Why am I still working when the money should have come by now?"

**a · The Magician**
> You turned the Magician, dear — the card of the worker, of hands that have never once been idle.
> You asked why you are still working, and you reached for the card of the person who always did the work.
> The Magician does not show me somebody who did too little — it shows me a lifetime of effort that went in and did not come back out, and that is a question about where it went, not about how hard you tried.
> Let me look closer at where it has been going…

**b · The Hanged Man**
> You turned the Hanged Man, dear — the card of the promise that was made and then held.
> You reached for the card of the thing suspended, and you did it while asking about a rest you were owed.
> The Hanged Man leans toward something that was arranged and then stopped mid-air — you are not still working because the money was never coming, you are still working because it stalled on its way to you.
> Let me look closer at where it stalled…

**c · The Fool**
> You turned the Fool, dear — the card of the beginning that arrives out of order.
> You asked about a chapter that should already be finished, and your hand reached for a card that only knows how to start one.
> The Fool does not read your years as a debt — it says what is coming does not arrive as the settlement you were promised, it arrives as something new, and it does not consult the calendar first.
> Let me look closer at the beginning it is pointing at…

#### `cards-how-much-longer` — "How much longer will something keep blocking my money?"

**a · The Magician**
> You turned the Magician, dear — the card of the hand on the thing, of what moves when it is moved.
> You asked how much longer, and your hand went to the only card here that answers with an action rather than a wait.
> The Magician does not hand me a length of time — it leans toward something that lasts exactly as long as it is left alone, which means the honest answer to how much longer is not a number, it is a question of what gets touched.
> Let me look closer at what has not been touched…

**b · The Hanged Man**
> You turned the Hanged Man, dear — the card of the hold that does not tire.
> You asked how much longer, and you reached for the card that has been the reason for the wait.
> The Hanged Man does not run down like a clock — a block does not expire, dear, it sits exactly where it is until something shifts it, and I will not hand you a date, because a date would be a comfort I invented.
> Let me look closer at what is doing the holding…

**c · The Fool**
> You turned the Fool, dear — the card of the step that ends a wait.
> You asked how much longer, and your hand chose the card that is uninterested in the question.
> The Fool does not count down — it changes the subject from waiting to moving, and what it leans toward is that this ends the way a beginning ends things, not the way a sentence gets served out.
> Let me look closer at where the step is…

#### `cards-out-of-time` — "Is something still blocking my money, or have I run out of time?"

**a · The Magician**
> You turned the Magician, dear — the card of what is still in your hands.
> You offered me two answers, and your hand reached for the card that will only give you one of them.
> You have not run out of time, dear. The Magician deals in what is available now, and it is showing me something available — a block is present, and a block is a thing standing in a road, not the end of the road.
> Let me look closer at what is standing there…

**b · The Hanged Man**
> You turned the Hanged Man, dear — the card of the thing that stopped moving and is waiting to be moved.
> Of the two answers in your question, your hand reached for the one that is a block.
> You have not run out of time. The Hanged Man is a hold, not an ending — and I want you to hear the difference, because you have been reading a hold as a verdict on your whole life, and it is not one.
> Let me look closer at what took hold, and when…

**c · The Fool**
> You turned the Fool, dear — the card that has never once arrived too late for anything.
> You asked whether your time is up, and your hand went to the one card in the deck that does not recognise the idea.
> You have not run out of time. The Fool begins with nothing behind it and nothing owed, and it does not ask how many years you are carrying — what it says is that a road is still open, which is not something a card says to someone who is finished.
> Let me look closer at the road it is showing me…

---

### `money-energy`

#### `cards-my-energy` — "Is my energy blocking my money?"

**a · The Magician**
> You turned the Magician, dear — the card of energy that is directed, energy doing work.
> You asked whether your energy is the problem, and your hand reached for the card where energy is the instrument.
> The Magician does not show me energy blocking anything — it shows me energy that has been pouring out at full strength for years, and what I would look at is not whether yours is wrong, but what has been standing at the other end of it, collecting.
> Let me look closer at where all that has been going…

**b · The Hanged Man**
> You turned the Hanged Man, dear — the card of energy held in place.
> You reached for the card of the hold, and I notice you reached for it while asking whether the fault is yours.
> The Hanged Man does not call your energy the block — it shows me something pressing on it, and there is a difference between a woman whose energy is wrong and a woman whose energy is under weight; you have been told the first one for years, and I am not going to repeat it.
> Let me look closer at what has been pressing…

**c · The Fool**
> You turned the Fool, dear — the card of energy that is open, unspent, still willing.
> You asked whether your energy is working against you, and your hand went to the card of energy that has not been damaged by any of this.
> The Fool does not lean toward a woman blocking herself — it leans toward energy that is still fresh after everything, and that is not the reading of somebody who is her own obstacle.
> Let me look closer at what is actually in the way…

#### `cards-money-wont-stay` — "What does my energy say about why money won't stay?"

**a · The Magician**
> You turned the Magician, dear — the card of the maker, the one who is good at bringing it in.
> You asked why it will not stay, and your hand reached for the card that is entirely about the getting.
> The Magician tells me your energy has never had trouble drawing money toward you — that half works, and what it points at is everything that happens after it arrives, which is a different door in the same house.
> Let me look closer at the door it goes back out of…

**b · The Hanged Man**
> You turned the Hanged Man, dear — the card of what hangs on, and what does not.
> You asked why money will not stay with you, and you reached for the card of the thing that will not let go.
> The Hanged Man leans toward something with a claim on it — your energy is not leaking, dear, something further up is taking its share before you ever see it settle.
> Let me look closer at what has the claim…

**c · The Fool**
> You turned the Fool, dear — the card of open hands, which give as easily as they take.
> You asked about your energy, and your hand went to the most generous card in the deck.
> The Fool leans toward an openness that has never learned to close — and I want to be careful here, because open is not a flaw, it is how you have been loved by the people around you; what it does mean is that nothing has ever been built to hold what comes in.
> Let me look closer at what has never been built…

#### `cards-energy-how-long` — "How long has my energy been working against my money?"

**a · The Magician**
> You turned the Magician, dear — the card of energy that has been aimed the whole time.
> You asked how long yours has been working against you, and your hand chose the card where it never once was.
> The Magician does not show me years of energy turned the wrong way — it shows me years of it aimed correctly at something that kept absorbing it, and how long is really a question about how long that has been there.
> Let me look closer at how far back it reaches…

**b · The Hanged Man**
> You turned the Hanged Man, dear — the card of the long hold, the one that predates the noticing.
> You asked how long, and you reached for the card that is older than the question.
> The Hanged Man leans toward something that started before you began keeping score — and it is not your energy that has been running against you all that time, it is that whatever settled on it settled a long while ago and never got named.
> Let me look closer at when it settled…

**c · The Fool**
> You turned the Fool, dear — the card that carries nothing forward, not even a record.
> You asked how long, and your hand reached for the one card that keeps no account of it.
> The Fool does not read your energy as a thing that has spent years betraying you — it says nothing has been running against you, only that nothing has been set down yet, and a bare field is not the same as a poisoned one.
> Let me look closer at why the ground has stayed bare…

---

### `money-prayer`

#### `cards-prayed-years` — "I've prayed about money for years. What's still blocking it?"

**a · The Magician**
> You turned the Magician, dear — the card of the hand that acts in the world.
> You have prayed for years, and your hand reached for the card of the part that happens down here.
> I do not read prayers, dear, and I will not tell you what has or has not been heard — that is not mine to say. The Magician points at something nearer and plainer than any of that: something in the ordinary world has been standing between the work and the result, and it has been standing there a long time.
> Let me look closer at what is standing there…

**b · The Hanged Man**
> You turned the Hanged Man, dear — the card of what waits, held, without answer.
> You reached for the card of the long silence, and you did it having lived in one.
> I will not tell you what your prayers were met with, dear — that is between you and what you pray to, and no card ranks above it. What the Hanged Man shows me is something suspended in the everyday of your life, and something suspended can be found and named.
> Let me look closer at what has been held…

**c · The Fool**
> You turned the Fool, dear — the card of the road taken on faith, with nothing proven yet.
> Of the three, your hand went to the card that already understands what it is to keep going without being shown.
> I will not speak for what you have prayed to, dear. The Fool speaks only about the road: it says the way ahead is still open and unwritten, and that what has held this up is a thing lying in the road rather than a verdict on you.
> Let me look closer at what is lying in it…

#### `cards-prayers-unanswered` — "How long will my prayers for money keep going unanswered?"

**a · The Magician**
> You turned the Magician, dear — the card of what is in a person's own hands.
> You asked how much longer, and your hand reached for the one card that answers with doing rather than waiting.
> I cannot tell you what has been answered and what has not, dear, and I would not trust anyone who offered to. The Magician turns me toward what is yours to touch — and what it leans toward is that nothing here is waiting on permission, it is waiting on something being moved.
> Let me look closer at what has been left unmoved…

**b · The Hanged Man**
> You turned the Hanged Man, dear — the card of the pause that has gone on too long to still feel like a pause.
> You asked how long, and you reached for the card made of waiting.
> I will not put a length on it, and I will not read your prayers as unanswered — neither of those is mine to hand you. What the Hanged Man says is that a hold is not a refusal, and you have been treating a long quiet as though it were one.
> Let me look closer at what the quiet has been sitting on top of…

**c · The Fool**
> You turned the Fool, dear — the card of the step taken before the answer comes.
> You asked how long you must go on without one, and your hand chose the card that moves anyway.
> I will not tell you a date, dear, and I will not tell you what heaven has said. The Fool only ever says one thing, and it is saying it now: the road has not closed, and someone still walking it is not someone who has been turned down.
> Let me look closer at where it goes from here…

---

## 6. The supporting copy

### Tap instruction (new `hookInstruction` override — all 11 money hooks)

> **"Think of the money that never came. Tap the card that calls you."**

Replaces the deck's *"Think of the man on your mind."* for money hooks only. Every other
hook on every deck is untouched.

### `HEADLINES` — the exact ad strings (message scent)

| Hook | Headline |
|---|---|
| `cards-blocked-retiring` | Why is my money still blocked this close to retiring? |
| `cards-nest-egg` | How long has something been blocking me from a nest egg? |
| `cards-too-late` | Is something blocking my money, or did I just leave it too late? |
| `cards-still-working` | Why am I still working when the money should have come by now? |
| `cards-how-much-longer` | How much longer will something keep blocking my money? |
| `cards-out-of-time` | Is something still blocking my money, or have I run out of time? |
| `cards-my-energy` | Is my energy blocking my money? |
| `cards-money-wont-stay` | What does my energy say about why money won't stay? |
| `cards-energy-how-long` | How long has my energy been working against my money? |
| `cards-prayed-years` | I've prayed about money for years. What's still blocking it? |
| `cards-prayers-unanswered` | How long will my prayers for money keep going unanswered? |

### `TAROT_QUESTION` — Version C's opening question

| Hook | Question |
|---|---|
| `cards-blocked-retiring` | Before I look closer, tell me… what was that money supposed to have made possible by now? |
| `cards-nest-egg` | Before I look closer, tell me… when did you first realise it wasn't building? |
| `cards-too-late` | Before I look closer, tell me… what is it you think you left too late? |
| `cards-still-working` | Before I look closer, tell me… what were you meant to be doing by now, instead of working? |
| `cards-how-much-longer` | Before I look closer, tell me… how long have you been telling yourself it is nearly turned? |
| `cards-out-of-time` | Before I look closer, tell me… when did you start counting the years ahead instead of the ones behind? |
| `cards-my-energy` | Before I look closer, tell me… what happens with money that made you start suspecting yourself? |
| `cards-money-wont-stay` | Before I look closer, tell me… where does it tend to go, when it goes? |
| `cards-energy-how-long` | Before I look closer, tell me… when did you first feel you were working against yourself? |
| `cards-prayed-years` | Before I look closer, tell me… what have you been asking for, in all those years? |
| `cards-prayers-unanswered` | Before I look closer, tell me… what would it look like, if it were answered tomorrow? |

### `TAROT_HOOK_CONTEXT` — her_situation, injected into the reflect prompt

| Hook | Context |
|---|---|
| `cards-blocked-retiring` | She is within a few years of retiring and the money she expected to have by now has not come; she is asking what has been in the way. |
| `cards-nest-egg` | She has been trying to build savings for years and nothing has accumulated; she is asking how long something has stood between her and it. |
| `cards-too-late` | She is close to retirement and torn between believing something is blocking her money and believing she simply left it too late. |
| `cards-still-working` | She is past the age she expected to stop and is still working, because money she counted on never arrived. |
| `cards-how-much-longer` | She believes something is blocking her money and wants to know how much longer it will hold. |
| `cards-out-of-time` | She is past retirement age and is asking whether a block is still in the way, or whether her time for it has gone. |
| `cards-my-energy` | She has been told, or has come to suspect, that her own energy is what keeps money from her. |
| `cards-money-wont-stay` | Money comes to her and does not stay, and she is asking what her own energy has to do with it. |
| `cards-energy-how-long` | She has concluded her energy has been working against her money and wants to know how far back it goes. |
| `cards-prayed-years` | She has prayed about money for years without the change she asked for, and is asking what is still in the way. |
| `cards-prayers-unanswered` | She has prayed about money for a long time without seeing an answer, and is asking how much longer that goes on. |

### `TAROT_HOOK_TENDENCY` — where each read must land

Grammar matches the existing entries: `land ${tendency}` → "that … — NEVER …".

| Hook | Tendency |
|---|---|
| `cards-blocked-retiring` | that her ability was never the problem and something has been standing between the earning and the keeping. NEVER name what or who the block is, never a sum, a date or a source, and never suggest anything be done with money |
| `cards-nest-egg` | that this is long-standing rather than recent, and that steady effort which never accumulates points at something in the way rather than a failing in her. NEVER give a length of time, and never tell her she should have saved differently |
| `cards-too-late` | that she did NOT leave it too late — say it plainly — and that what is in the way is a block, which is a thing that can move. NEVER promise money is coming, never a date or an amount, and never grade her past choices |
| `cards-still-working` | that a lifetime of effort went in and did not come back out, which is a question about where it went rather than about how hard she tried. NEVER name a person or a cause, and never suggest she keep working or stop |
| `cards-how-much-longer` | that a block does not run down like a clock — it lasts as long as it is left alone, so the honest answer is about what gets moved, not a number. NEVER give a date, a timeframe or a season, even a soft one |
| `cards-out-of-time` | that she has NOT run out of time — say it plainly — and that a hold is not an ending. NEVER promise an arrival, never a date, and never rule on how much time she has |
| `cards-my-energy` | that her energy is not the block and never was; affirm what she has noticed while refusing the fault. NEVER agree that she blocks herself, never mindset, vibration, deserving or self-sabotage, and never hand her a practice to fix herself |
| `cards-money-wont-stay` | that the drawing-in half has always worked and what is at issue is everything after it arrives. NEVER name who or what takes it, never call her careless with money, and never advise her on keeping it |
| `cards-energy-how-long` | that her energy has not been working against her at all — refuse the premise gently — and that whatever settled on this settled long ago and was never named. NEVER give a length of time and never date it to an event in her life |
| `cards-prayed-years` | that what is in the way is an ordinary thing in her own life, findable and nameable. NEVER say whether her prayers were heard or answered, never that she is being tested, taught, punished or refused, never speak for God, and never set the cards above or against her faith |
| `cards-prayers-unanswered` | that a long quiet is not a refusal, and that nothing here waits on permission. NEVER call her prayers unanswered and NEVER call them answered, never give a length of time, never speak for God, and never place Evelyn between her and what she prays to |

---

## 7. The wiring, once this is signed off

| # | File | Change |
|---|---|---|
| 1 | `tarotReads.ts` — `TarotHook` union | + 11 members, with the family comment blocks |
| 2 | `tarotReads.ts` — family arrays | + `MONEY_RETIRING_HOOKS`, `MONEY_WORKING_HOOKS`, `MONEY_ENERGY_HOOKS`, `MONEY_PRAYER_HOOKS` |
| 3 | `tarotReads.ts` — `TarotAngle` + `angleForHook` | + 4 angles |
| 4 | `tarotReads.ts` — `TAROT_HOOKS`, `HEADLINES`, `TAROT_QUESTION` | + 11 entries each |
| 5 | `tarotReads.ts` — `CardSetConfig` | + optional `hookInstruction` |
| 6 | `tarotReads.ts` — `RETURN_MHF.reads` | + 11 hooks × 3 cards |
| 7 | `tarotReads.ts` — `hookToBucket` | return `'money'` for the 11 |
| 8 | `TarotBridge.tsx` | `cfg.hookInstruction?.[hook] ?? cfg.instruction` |
| 9 | `prompts.ts` — `TAROT_HOOK_CONTEXT` / `TAROT_HOOK_TENDENCY` | + 11 entries each |
| 10 | `prompts.ts` — `MONEY_TAROT_HOOKS` + frame | new set, tested FIRST, early return |
| 11 | `routes.ts` — `validHooks` | + 11 strings |
| 12 | `tests/tarot-money-block-copy.test.ts` | new guard file |
| 13 | `fb-tarot/docs/STATUS.md` | + the family sections and the angle table rows |

**No pricing edit.** `/fb-tarot` is one fixed price at the funnel level (`v1-tarot` = $35/$25).

### The ad links (face-down default deck — `&deck=` not needed)

```
/fb-tarot/c?hook=cards-blocked-retiring&seg=55-64
/fb-tarot/c?hook=cards-nest-egg&seg=55-64
/fb-tarot/c?hook=cards-too-late&seg=55-64
/fb-tarot/c?hook=cards-still-working&seg=65plus
/fb-tarot/c?hook=cards-how-much-longer&seg=65plus
/fb-tarot/c?hook=cards-out-of-time&seg=65plus
/fb-tarot/c?hook=cards-my-energy&seg=energy
/fb-tarot/c?hook=cards-money-wont-stay&seg=energy
/fb-tarot/c?hook=cards-energy-how-long&seg=energy
/fb-tarot/c?hook=cards-prayed-years&seg=prayer
/fb-tarot/c?hook=cards-prayers-unanswered&seg=prayer
```

---

## 8. Two things to decide before wiring

1. **Four angles or two?** Four gives the age-vs-mechanism comparison the batch was built
   for. Two (`money-block-age`, `money-block-belief`) is tidier but throws away the 55–64
   vs 65+ read. Recommendation: four.

2. **`cards-too-late` and `cards-out-of-time` are near-twins.** Both are "block or too
   late", one per age band, and their reads deliberately land on the same answer. That is
   correct for message scent, but if you would rather run one and point both age bands at
   it, say so now — it drops 3 reveals and one lander.
