# 02-P1 — The delivered reading *(the Zodiac Spread, twelve cards)*

| | |
|---|---|
| **Offer** | 02 Twin Flame Tarot — the paid product |
| **Subject** | The **delivery email** carries `%FIRSTNAME% — your twelve are laid` and must match `02-T1`/`02-T3` exactly. ⚠ The PDF's own title is *"Your twelve are laid"* — see D7 below |
| **Source** | `02:501-829`, recast. Architecture [00e §6](../../docs/00e-FRAMEWORK-BEs.md), units §6a, rules §6b |
| **Delivery** | **D7 = one PDF for everyone** *(operator, 2026-08-13)*. The document carries no merge tokens; the personal address lives in the covering email (`02-T4`), which does merge. `reading_url` is therefore a constant, not a per-buyer field |
| **⛔ Cost of D7** | The three **echo slots** (`S28`, houses 1/7/12) are **out**. They were per-buyer merges from V1 Supabase and one document for everyone cannot carry them. Recorded, not re-opened |
| **Cards** | Magician · High Priestess · Hierophant · Chariot · Strength · Wheel of Fortune · Justice · Hanged Man · Death · Temperance · Devil · Judgment — **zero overlap with the six free cards** (§6b.1) |
| **Free gift** | `02-P3` renders inside this email as a second act, never as a separate send |

## ⚠ The structural fix: twelve cards, twelve HOUSES

The source calls this "The Zodiac Spread" and then lists twelve cards **without assigning a single
one to a house**. That breaks the mechanism it charges for, and worse, it makes the letters'
withholds unanswerable — `02-E2` promised *"the **house** the Lovers falls into is what separates
them"* and `02-C1` statement 7 has the buyer ask for all three by name.

Each card is therefore laid to a numbered house, and **every loop both letters open closes in a
specific house**.

⚠ **There are SIX units, not three** — corrected 2026-08-13. `02-E3` is a follow-up to the same
woman, not an alternative letter ([`00e` §1c](../../docs/00e-FRAMEWORK-BEs.md): World→Star,
Lovers→**Emperor**, Tower→Moon). An earlier draft of this table covered `02-E2` only, which left
the Emperor fork unanswered and the timing promise contradicted. Both are closed below.

| Loop opened in the letter | Closed by |
|---|---|
| **v1** The World: *which door do the windfalls come through?* | **House 2** (Wheel of Fortune) and **House 8** (Death) — the second arrives through someone else's ending |
| **v1** The Lovers: *renewal of what I have, or arrival of something new?* | **House 5** (Chariot, in motion) against **House 7** (Hanged Man, suspended). The verdict is *arrival* |
| **v1** The Tower: *someone returning, or someone still here who has already begun leaving?* | **House 12** (High Priestess) — the second one. What is hidden is a decision already taken and not spoken |
| **v1 + v2** *"Twelve tells you the day"* · *"which week, and what he looks like when he uses it"* | **House 5** — a dated window (weeks four and five) and a description of him. ⛔ Not hedged; see the timing note below |
| **v2** The Emperor: *a floor under me, or a room with the door shut?* | **House 4** (Temperance) — it fell in the house of her home, not the house of what owns her. It is a floor. The shut room is the **seventh**, and is named as such |
| **v2** The Moon: *the man I am reading in the dark* | **House 12** — the same room as the Tower, and the same instruction: ⛔ do not investigate |

⛔ **Do not reorder the houses or reassign the cards without re-reading BOTH letters.** Six
withholds, six answers, and the buyer has two pages in her inbox where she asked for each one.

### ⚠ Why no free card is re-laid, and how the mechanism still works

The letters make two promises that pull against each other, and both are load-bearing:

| | |
|---|---|
| **Novelty** | *"twelve **new** cards, dear. Not these three again."* (`02-E2`) |
| **Mechanism** | *"the **house** the Lovers falls into is what separates them"* · *"the **house** the Emperor falls into is precisely what separates the two"* |

Taken literally they cannot both hold — the second needs the Lovers dealt, the first forbids it.
**Novelty wins**, because paying to be shown the same cards again is the fastest way a buyer
concludes she was robbed, and because it is the promise stated most plainly.

**The mechanism survives intact, because it was never really about the card.** Each fork names two
candidate ROOMS, and the spread's job is to say which of the two is lit:

- the **Lovers** — renewal would show in the 7th (what she already holds), arrival in the 5th. The
  5th has the Chariot, in motion; the 7th has the Hanged Man, suspended. House 5 now says this out
  loud rather than leaving the reader to assemble it.
- the **Emperor** — v2 names the two rooms itself: *"the house of your home, or the house of what
  owns you"*. The 4th came up Temperance, so it is the house of her home, and Temperance keeps
  nobody anywhere. It is a floor.

⛔ **So never write that a free card "fell" in a house.** It did not; it is not in the spread. The
NEW card in that room is what carries the answer. A first pass of this file said *"It fell here"*
of the Emperor and had to be corrected 2026-08-13 — it reads as a thirteenth card and quietly makes
the novelty promise a lie.

⚠ **Deck arithmetic, for 03/04/05.** Twenty-two majors, six spent free, twelve laid — leaving only
**four spare** (Fool, Empress, Hermit, Sun). That is fine for 02, but if a later offer's letters
spend the same six free cards *and* it wants twelve new majors, it is drawing from the same
sixteen. Decide per offer which six the letters spend, before writing its product.

---

# Your twelve are laid

Dear friend,

<!-- 1 · PREAMBLE. Evelyn's register: no "cosmic forces have aligned in your favor" -->

I sat with your twelve last night and I have them for you.

I want to say before anything else that this was a good draw. Not an easy one — there is a card in
here I'll ask you to read twice, the same as I did with the Tower — but a good one. I have laid
worse for women who deserved better.

<!-- 2 · THE PROMISE BLOCK — a WINDOW × a DOMAIN -->

Here is the shape of it. **The next two months are yours**, and they are yours in the two places
that matter most to you: money and love. Both. At once. That is not the ordinary run of things and
I don't want you to treat it as though it were.

<!-- 3 · THE CONDITION -->

But a spread is not a delivery, dear. It is a map of what is already moving, and a map only helps a
woman who is walking. Everything below is written as *this will happen, provided you do that* — and
I mean the provided. The cards have done their part. The next part is yours.

<!-- 4 · SPREAD FRAMING — the count's reason-why -->

Twelve cards, one to each house.

A house is a room of a life — the first is you yourself, the second what you own, the seventh who
you are bound to, the twelfth what is being kept from you. Twelve rooms, twelve cards, and every
one of them out of the twenty-two. No minors. Nothing in this reading is small daily weather.

That is why the twelve tell you what three could not. Three cards told you the weather. These tell
you which room it is raining in.

<!-- 5 · INOCULATION #1 · before the reading -->

One thing before you begin. Some of what follows will look as though it contradicts itself — a card
promising ease in one room and asking for work in the next. Don't let that stop you. A life isn't
consistent either. Read all twelve before you decide what the reading says, because the meaning is
in the arrangement and not in any single card.

---

## House 1 — yourself

### The cosmos has guided your choice to the Magician, a card of beginnings and of nerve

`[IMG-MAGICIAN]`

The Magician in your first house says the new chapter is not coming toward you. **It starts with
you**, and it starts the moment you decide it has.

That is the whole of this card's good news and the whole of its condition at once.

It asks you to break the routine you have been keeping, dear — not the big one, the small
one. The order of your evenings. The thing you always say when someone asks how you are. The
Magician says the ruts you are in are not circumstances; they are habits wearing the costume of
circumstances.

Look at the ideas you have been carrying about what you are capable of. Most of them were handed to
you and you have never once tested them. Test them this month.

**A warning that belongs to this card.** As your fortunes turn, people notice. Some of them will be
warm to you in a way they have not been in years, and not all of that warmth is about you. Flatterers
come out for a woman whose luck is changing. You will be able to tell them apart, because you have
always been able to; the difficulty has only ever been that you talk yourself out of what you noticed.

Say your ideas out loud this month. In rooms where they might be argued with.

The Magician rewards nerve and it does nothing at all for the woman who waits to be asked.

---

## House 2 — what you own

### The celestial wisdom has guided your selection to the Wheel of Fortune, and here is the first of your two windfalls

`[IMG-WHEEL]`

This is the door.

You asked me — and I could not tell you from the World alone — **which door the money comes
through**. It comes through the second house, and the second house is what you already own.

Not a stranger's gift. Not a windfall out of the sky. Something you already have turns out to be
worth more than you have been treating it as. That is what the Wheel does in this room: it doesn't
bring a new thing, it revalues the thing in your hand.

Look at what you own, what you are owed, and what you have been letting sit. One of those three is
where it comes from, and it comes inside the next two months.

The Wheel turns both ways, and I won't pretend otherwise. It rewards a quick answer and it punishes
a slow one. If something is offered, or something you'd written off comes back into play, you will
have a short window to say yes properly — not to think about it for a fortnight.

**Be careful who you tell.** Money that arrives quietly keeps better than money that arrives
announced, and there is at least one person who would treat your good news as an opening.

Decide in advance what you would do. A woman who has decided in advance moves at the speed the
Wheel moves at.

---

## House 3 — what you say, and who you say it to

### The cosmic alignment has guided your choice to the Hierophant, a card of listening

`[IMG-HIEROPHANT]`

The third house is talk — the daily kind. Messages, neighbours, the brother or sister you speak to
or don't.

The Hierophant here asks you for something you will not enjoy: **go back to someone you wrote off.**

Not everyone. One person. You know which, dear, and you have known since you read that
sentence. There is a connection you let go cold, and you were probably right about why, and it is
still the case that this card wants it reopened.

Here is why it matters, and it is practical rather than sentimental. Two of the good things in this
reading arrive through people, and the third house is the room they come through. A woman with a
narrow circle has a narrow number of doors.

The Hierophant also warns you off the opposite error. Do not go back to everyone. Reopen one, and
be genuinely willing to be the one who reaches first.

Some of what you hear this month will be advice you did not ask for. Take the part that is useful
and let the rest go without arguing it — arguing is what closes this house.

---

## House 4 — home, and what you came from

### Your choice has been guided to Temperance, a card of slow water

`[IMG-TEMPERANCE]`

The fourth house is roots. Where you live, who raised you, what you carry from it.

Temperance says this room is healing, and it says the healing is **slower than you want it to be.**

That is not a disappointment, dear, it is an instruction. Something in your family or your home has
been out of balance for a long time, and it is coming right — but it is coming right at the speed
that kind of thing comes right, which is by seasons and not by weeks.

Your part is to stop forcing it. You have tried the direct conversation. Temperance says the direct
conversation is not the tool for this.

What works instead is repetition. Small ordinary contact, often, with no agenda attached. That is
what mixes the water.

**Avoid the confrontation you have been rehearsing.** There is one, and you have run it in your head
enough times to have the lines ready. It would feel enormous for an hour and it would set this house
back a year.

If someone in the family misreads you this month, let them be wrong for a while. Being understood
immediately is a luxury; being at peace eventually is the thing you actually want.

**And now your answer about the Emperor.**

I asked you whether the structure you are standing inside was one you built or one you are being
kept in, and I said the two feel identical from within — that only the room would separate them. I
gave you the two rooms it could be: the house of your home, or the house of what owns you.

It is the house of your home. The card that came up in it is Temperance, and Temperance does not
keep anybody anywhere. It mixes, it settles, it takes its time.

**So it is a floor, dear. Not a locked room.**

That is a bigger difference than it sounds. A woman being kept somewhere has to get out, and
everything she does until she does is wasted. A woman standing on something she built has only to
stop apologising for how slowly it settles. Yours is the second. What has felt like confinement
this last year has been foundation work — and foundation work looks exactly like confinement from
the inside, which is the whole trap in that card.

Stop trying the handle on this door. It was never locked. It is just heavy, and it opens outward.

There *is* a room in this reading with the door shut, and I won't let you go on to it unprepared.
It is the seventh. Do not confuse the two, because the medicine for one is poison for the other.

---

## House 5 — romance, and what delights you

### The cosmic forces have guided your selection to the Chariot — and this is your answer about the Lovers

`[IMG-CHARIOT]`

I told you the Lovers gives two and does not say which. Renewal of something you already hold, or
the arrival of something you do not.

**It is the arrival.**

Here is how the spread separates them, because I promised you it would. The Lovers' two meanings do
not live in the same room. Renewal would have shown in your seventh — the house of what you already
hold. Arrival shows in your fifth. So I laid the twelve and looked at which of those two rooms was
moving.

The Chariot has fallen into your fifth house — the room of new love — and the Chariot is the card of
a thing in motion coming toward you. Not a door you have to find. Something already travelling.

Your seventh, as you will see, is not moving at all.

That is the plainest answer this spread gives, and I want you to have it without hedging: the
encounter is real, it is not a stranger, and it is closer to you than the far edge of your life.

Now the two things I promised you that three cards could not give me.

**When.** The Chariot is a thing already in motion, and motion can be timed — it is the one card
in this spread that can be. Count from the day you read this. The first three weeks are approach,
and you will not recognise them as anything; looking hard in that stretch is exactly how women
miss theirs. **It is weeks four and five that carry it.** That is your window, and it is narrower
than the two months the rest of this reading runs on, because an arrival is an event and the other
eleven rooms are weather.

**What he looks like when he uses it.** Not lightning, and not a stranger. The Chariot arrives
already moving, so he comes in sideways — through something that was already happening. Work. A
room you were going to be in anyway. Someone you both already know, who will not think they have
introduced anybody.

He will be more direct than you are used to, and he will be visibly occupied with something of his
own. That second part is the tell, and it is the part women talk themselves out of. The man this
card describes is not looking for you. He is going somewhere, you are on the way, and he stops.

You will know it because you will notice you are being listened to. That is the recognition. It is
much quieter than what you have been braced for, and it happens on an ordinary day, in ordinary
clothes, exactly as I told you it would.

Now the conditions, because the Chariot has them.

It asks you not to be swept. This card promises triumph and it warns in the same breath against
anything that looks too good in its first fortnight. Use your judgment early, while you still have
some — that is what the Chariot means by holding the reins.

It also asks you to be recognisable. A twin flame arriving and a twin flame recognised are two
different events, and women miss theirs constantly because it turns up on an ordinary day in
ordinary clothes. Do not be braced for lightning. Be paying attention on a Tuesday.

**And be careful of the person who becomes discouraging about this.** Not hostile — discouraging.
There is someone who will find reasons, gently, why you should be realistic. Notice how much better
it suits them if you are.

---

## House 6 — work, health, the daily grind

### Your choice fell on Strength, a card of holding on

`[IMG-STRENGTH]`

The sixth house is the unglamorous one: the working day, the body, the routine that either carries
you or wears you down.

Strength says you have more of it than you have been spending.

This is a favourable room this season — work goes well, health holds, and the thing
you have been grinding at moves further in the next two months than it has in the last twelve.

The condition is focus, and I mean that narrowly. Strength is undone by a woman doing four things.
Pick the one that matters and let two of the others actually drop. Not paused — dropped.

And be steady rather than stubborn, because from the inside they feel identical. Steady is holding a
course you chose. Stubborn is holding a course you have outgrown because changing it would mean
admitting something.

**Someone at work or in your daily round will lean on you this month** — pressure dressed as
urgency, or a request that arrives with a little guilt attached. Strength is the card that says you
may simply decline, and that declining costs you far less than you think it does.

Your health responds quickly this season if you give it anything at all. That is worth knowing.

---

## House 7 — who you are bound to

### Your choice has fallen on the Hanged Man, and this is the card I want you to read twice

`[IMG-HANGEDMAN]`

The seventh house is partnership — what you are actually bound to, whether or not it has a name.

The Hanged Man is a man suspended, upside down, going nowhere. And that, dear, is the honest reading
of this room: **something here is not moving, and it has not been moving for longer than you have
been admitting.**

You already knew. This is the card confirming it, not breaking it to you.

Here is the part that is genuinely useful. The Hanged Man is not the card of a thing that has ended.
It is the card of a thing that is *suspended* — and suspended is a decision that has not been made,
by you or by someone else.

Your fifth house is in motion. Your seventh is hanging still. Read those two together and the
instruction is not subtle: the thing that is coming toward you cannot get into a life that is still
waiting on something that has stopped.

So the sacrifice this card asks for is not a person. It is the waiting. Set down the waiting.

That may mean asking a question you have been careful not to ask. Ask it plainly and
be willing to hear the answer, because the answer is the thing that unsticks this house either way.

**And note who benefits from your patience here.** Suspension is uncomfortable for you and
convenient for someone. That is worth sitting with for a minute before you decide it is nobody's
fault.

---

## House 8 — what is hidden, and what comes through others

### The cosmos has guided your choice to the Nameless One — your second windfall, and it arrives through someone else

`[IMG-DEATH]`

Women dread this card for the wrong reason. The skeleton and the scythe have very little to do with
death; the Nameless One is the card of a thing ending so completely that what follows is new rather
than repaired.

It has fallen into your eighth house, which is the room of what is hidden, what transforms, and
**what comes to you through other people.**

This is your second windfall, and now I can tell you what I could not tell you from the World: it
does not come the way the first one comes. The first is something you already own, revalued. This
one arrives **because something in someone else's life ends.**

A situation closing. A change in another person's circumstances that changes yours. Not necessarily
sad, and not your doing.

This is also the card that says the change in your love life is real, because the eighth house is
where the deep alterations happen — the ones that don't reverse.

Your part is not to grip. The Nameless One takes badly to a woman clutching at what is going. If
something ends in the next two months, let it end cleanly and quickly, and do not spend the autumn
trying to reconstruct it.

**Be careful with what you disclose in this room.** The eighth house keeps secrets and punishes
loose ones. Something you know this season is not yours to pass on, and passing it on is the single
way this card turns against you.

---

## House 9 — what you believe

### The celestial wisdom has guided your selection to Justice, a card of taking stock

`[IMG-JUSTICE]`

The ninth house is what you hold to be true — belief, principle, the rules you have been running
your life by without re-reading them.

Justice says: **re-read them.**

Some of the rules you live by are yours and some were installed, and this season is when you can
tell the difference. Not all of them go. That is the mistake this card warns against — the woman who
decides everything she believed was wrong and throws out the good with the borrowed.

Weigh them one at a time. Keep what has served you. Put down what you only ever carried because
putting it down felt like losing an argument with someone who is not even in the room.

Justice also asks you to be scrupulous this season, in the small ways — the corner you
could cut, the thing you could let someone believe. Not for moral reasons. Because this card returns
what you put out with unusual speed for the next two months, and it is not a season to be owed
anything by anybody.

**Resist the person whose influence on you has been quietly bad.** You will think of someone.
Justice is the card that gives you permission to be less available to them without a speech about it.

---

## House 10 — your standing

### Your choice has led you to Judgment, a card of being seen properly

`[IMG-JUDGMENT]`

The tenth house is your standing — work, reputation, what your name means to people who are not
close to you.

Judgment says a reckoning arrives here, and that it goes in your favour **provided you are honest
first.**

Something you have been half-doing comes up for a verdict in the next two months. A piece of work, a
position, a public version of yourself that has been running slightly ahead of the truth. This card
is not threatening you; it is telling you to close the gap before someone else measures it.

Do the assessment yourself and it is a promotion. Wait for it to be done to you and it is an
embarrassment. Same event, two entirely different months.

Set one clear objective for this house and be plain about it. Judgment rewards the woman who has
said out loud what she is trying to do, because that is what allows other people to back her.

Accept the past mistakes in this room without making a performance of them. Humility here is
strategic, not moral — it removes the only weapon anyone has.

**And be aware that one person's account of you is not accurate**, and that it has been travelling.
Not a crowd. One. You will hear an echo of it this season, and the echo will tell you
who.

---

## House 11 — your circle

### Your selection has fallen to the Devil, and here the reading narrows

`[IMG-DEVIL]`

The eleventh house is friendship, hopes, the people you are loosely surrounded by.

The Devil in this room is a card of enormous energy — genuine warmth, appetite, good company, and
things that feel wonderful in the doing. Much of that is a blessing this season and I don't want it
read as a scolding.

But the Devil is the card of the thing you cannot easily put down, and in the eleventh house it is
not a substance. **It is a person you keep going back to.**

Not an enemy. An attachment. Someone whose company you enjoy and who leaves you slightly smaller
each time — a little more tired, a little more doubtful, a little less like the woman in your first
house.

You have already thought of them. That is how this card works.

I am not telling you to cut anyone off. I am telling you to notice the accounting: what you have
each time, and what you have an hour afterwards. Do that honestly for a month and the decision makes
itself.

The Devil also warns against excess this season generally — spending, drinking, staying up to argue
with people who will not be moved. Your energy is high and it is finite, and this is the room where
it leaks.

---

## House 12 — what is being kept from you

### And your twelfth card is the High Priestess. This is your Tower.

`[IMG-PRIESTESS]`

I said in my last letter that the Tower does not arrive as an event — it arrives as a person, and
that it is one of two: someone from before, returning at exactly the wrong moment, or someone still
very much here who has already begun leaving and has not said so.

**It is the second.**

The High Priestess has fallen into your twelfth house, and the twelfth is the room of what is hidden
— not what is absent. Something is here, in your life, present and unspoken. That is a different
thing from an old face coming back, and it is the one I told you was worse, because there is nothing
to point at.

Now understand what this card is and is not saying.

The High Priestess is not the card of a liar. She is the card of a woman who *knows and does not
say*. What is being kept from you is not a betrayal; it is **a decision somebody has already taken
and has not brought to you.** They may not have brought it to themselves yet either.

You have felt it. That is the whole reason this reading found you in the first place — the sense of
something blocked that you could not name. The block is not in you. You have been reading a room
with one door closed and blaming your eyesight.

And this is your answer about the Moon, too — the man you have been reading in the dark. I told
you moonlight is the one light you must never trust. Here is why that mattered: the thing you have
been straining to make out is in the twelfth house, and **the twelfth house cannot be read by
looking harder.** You were not failing to see it. You were using the wrong light.

Here is what to do, and it is the least dramatic instruction in this reading.

**Do not go looking for it.** Do not search, do not test them, do not set a trap to see what they
do. The twelfth house does not give up its contents to investigation — it gives them up on its own
schedule, and a woman who forces it gets a version of the truth shaped by having been forced.

What you do instead is stop arranging your life around a decision that has not been made. Your fifth
house is in motion. Your second house is about to pay. You do not need this room resolved in order
to walk into either of those.

When it comes out — and it comes out inside these two months — you will already have seen the shape
of it, and you will meet it standing. That is the whole difference, dear. Not that nothing happens
to you. That nothing happens to you from behind.

---

`[02-P3 — the twenty-eight-night attention ledger renders here, as the second act]`

---

## What I want you to take from all twelve

Read them together, dear, because that is where the reading actually is.

Two houses are paying you: the second, from something you already own, and the eighth, through
someone else's ending. One house is bringing someone toward you: the fifth, already in motion. One
house is stuck and needs a question asked: the seventh. And one house is holding something unsaid:
the twelfth, which is the card you came to me about without knowing it.

That is a full answer to what you asked me. You wanted to know what was blocking you and what was
coming. The block is in the twelfth house and it is not yours. What is coming is in the second, the
fifth and the eighth, and it is nearer than you think.

<!-- INOCULATION #2 · timing -->

Two last things, and then I'll let you go.

I have dated one room and only one. The fifth, because the Chariot is a card of motion and motion
can be dated — weeks four and five, and I meant it.

The rest I have not dated, and I won't pretend I can. The two months are the window in which the
movement begins, not a promise that every room is finished by the end. Some will have opened by
the second week. The fourth will take the whole season, because seasons are the speed Temperance
works at, and a woman who reads that as failure will stop three weeks before it comes right.

<!-- INOCULATION #3 · compliance -->

And how fast it moves depends on you more than it depends on the cards. Everything above is written
as a condition — *provided you ask, provided you decline, provided you stop waiting.* The women this
works quickest for are not the ones with the best draws. They are the ones who read it twice and
then actually did the small unglamorous thing it asked for in the first week.

You have a good spread here. Go and be the woman who used it.

I'm on your side in this, dear.

— Evelyn

---

## Build notes

- **Houses are the fix, and they are load-bearing.** The source sells "The Zodiac Spread — one per
  house" and then assigns no houses at all, which makes the letters' three withholds structurally
  unanswerable. Every house assignment above was chosen to close a specific loop; the table at the
  top is the contract between this product and `02-E2`/`02-E3`/`02-C1`.
- **The manufactured-agency device is kept exactly** (§6a): *your* choice, *your* selection, guided
  by a cosmic agent — though she chose nothing. Eight header openers rotate and **the rotation does
  not decay at the end**, which is the source's documented failure (three consecutive *"Here's what
  it signifies"*). Houses 10, 11 and 12 get the most distinctive headers in the set.
- ⚠ **Move (d), the third-party threat, appears in ELEVEN of twelve** — the source has it in six and
  drops it from the final three, exactly where recall is strongest. It also **narrows** as specified:
  houses 1–6 warn about *people* and *someone*; house 10 is *one person's account of you*; house 11
  is *a person you keep going back to*; house 12 is *somebody who has already decided*. Plural
  strangers at the top, one named shape at the bottom.
- **That narrowing is how 03 is pre-sold.** By the time Judgement Day arrives asking who wronged
  her, this reading has told her eleven times that someone has, and the last three entries have
  walked her from "people" to "them". Nothing here mentions a second offer.
- **Every unit is conditionally positive** (§6b.3) — *favourable, provided you*. Good outcome proves
  the reading; poor outcome proves non-compliance. That is what inoculation #3 collects on.
- **Zero overlap with the free six** (§6b.1). World, Lovers, Tower, Star, Emperor and Moon appear
  nowhere in the twelve, which is what earns *"twelve **new** cards"* in `02-E2`. Fool, Empress,
  Hermit and Sun are spare and unused. ✅ **Re-verified against both letters 2026-08-13** — the two
  letters name exactly those six between them and none of the twelve.
- **All six withheld units are now closed, and three of them are new** *(2026-08-13)*. The B2 check
  caught that this product answered `02-E2` only: `02-E3` is a follow-up to the same woman, so the
  Emperor fork and the Moon were live questions with no closer. House 4 now answers the Emperor
  (*it is a floor, not a locked room*) and hands the shut door to the seventh; house 12 names the
  Moon and explains why looking harder never worked. See the contract table at the top.
- **The twelfth house deliberately refuses to be investigated.** *Don't go looking for it* is the
  single most important instruction in the product: it is honest, it protects her, and it is also
  the only version of this card that doesn't send a woman to search her partner's phone. A product
  that told her to investigate would be a different and much worse product.
- ⚠ **No merge tokens at all, and that is D7** *(operator, 2026-08-13: one PDF for everyone)*. An
  earlier draft ran `%FIRSTNAME%` × 12 mid-sentence, which was the right density for a per-buyer
  document and is impossible in a shared one. They are gone: eight sentences read better without
  the address and three took *"dear"*, which Evelyn says anyway. **The warmth now has to come from
  the covering email** (`02-T4`), which does merge — so that email is doing more work than it was
  designed for, and is worth re-reading with that in mind.
  ⛔ **The three echo slots (`S28`) died with the same decision.** Houses 1, 7 and 12 were the sites
  — the three that claim to know something about her — and one document for everyone cannot carry
  a line pulled from her own V1 transcript. Recorded as a cost, not a defect.
- **The timing is stated flat, and only where it can be** *(2026-08-13)*. Both letters promise
  *"the day"*, and v1 promises *"which week, and what he looks like when he uses it"* — an earlier
  draft answered all three with *"a reading is not a timetable"*, which argued against the thing
  the letter sold. House 5 now gives a window (weeks four and five, counted from reading) and a
  description of him. ⚠ **Weeks, not a date**, because one document serves every buyer and a
  printed date would be wrong for all but one of them. The closing inoculation now dates the fifth
  house deliberately and declines to date the other eleven, which is honest and no longer a
  contradiction.
- **Register.** No *"the cosmic forces have aligned in your favor"*, no *"behold"*, no *"embrace this
  journey"*. The source's product is written by a different persona than the source's letters, and
  neither is ours. Everything above is the woman who wrote `02-E2`.
- ⚠ **Two rooms are deliberately uncomfortable** — the seventh (something is not moving) and the
  twelfth (someone has not told you). A reading that is uniformly good does not get believed, and
  the Tower already promised her one card she would have to read twice. The comfort is that both
  come with an action, and neither asks her to confront anyone.
