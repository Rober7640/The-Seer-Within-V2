# 02 · Evelyn's first messages, per lane

Each lane page makes a promise. Today the chat drops it at the very first message, because every visitor gets the same generic greeting. The lane opener picks up where the page left off and asks her name early.

## Today on `/fb`

From `client/src/hooks/useConversation.ts` on Production (lines 590–603, 914–916):

1. Greetings, dear friend, and welcome.
2. My name is Evelyn Cross.
3. I've been expecting you...
4. From {city}, I can feel your energy reaching me... *(only when her city is known)*
5. A time-of-day line, e.g. "As evening falls, the veil between worlds grows thin..."
6. To open the connection between us, I need to know who I'm speaking with...
7. **What's your first name, dear?** *(the 6th or 7th message)*

After her name: "It's lovely to meet you, {Name}." / "Everything we discuss stays between us... our secret." / "Now, what's weighing on your heart today, dear?" plus four topic buttons (Love & Relationships, Money & Abundance, My Life Purpose, Someone Specific).

## The lane shape

| Beat | What it does | Lane 1 · Manifestation | Lane 4 · Astrology |
|---|---|---|---|
| 1 | One line that picks up where the page left off. A statement, not a question | You've been asking for a long time, haven't you. | You've looked to the stars for this answer, haven't you. |
| 2 | Her name, asked second, in today's exact words | What's your first name, dear? | What's your first name, dear? |
| 3 | Her name, then what she's already done, in the lane's words | {Name}... you've done the lists. The boards. All of it. | {Name}... you know your sign. You know his. You've checked how well they match. |
| 4 | The turn: the lane's belief in one line | And something has been answering. Just not what you meant. | And it still goes the same way. |
| 5 | Optional bridge | So let's look at who was holding the pen. | The stars can show how you love, dear. Not where you learned it. |
| 6 | First question, open, so her answer comes back in her own words | Tell me what you asked for, dear... and what you never let yourself ask. | Tell me his sign, and yours... and what keeps happening between you. |

Lanes 2 and 3 get the same six beats when their copy is written.

Why beat 6 matters: her answer becomes the lane's own words in her voice (her list, his sign and hers). That gives the later messages something specific to work with.

## What the opener replaces (proposals, not decided)

- **Dropped:** messages 1–6 above (welcome, expecting you, city, time of day, "open the connection").
- **Open: keep "Everything we discuss stays between us... our secret."?** It builds trust and costs one message. It also matters because it's why we never publish what women type.
- **Open: skip the four topic buttons?** The lane already says the topic is love, so the buttons repeat a question she's answered by clicking. If they're skipped, the lane sets the topic. A woman who names a man may belong in the "Someone Specific" path, which asks his name.
- **Unchanged until D3 is decided:** the email ask.

## The risk to design for: Evelyn forgets the lane

`../04-fb-palm-derail-PROVEN.md` proved this on fb-palm in July. Three steps (ad, lander, chat opener) built a specific palm identity. As soon as the standard chat resumed, it vanished, because the later message steps got no palm information. Evelyn then gave a love message word-for-word interchangeable with a visitor who never saw the palm funnel.

Lanes have the same shape, so the build must pass the lane to **every** later message step, not only the opener.

In that replay the standard "crisis" step already used an inherited frame ("did your mother/grandmother carry this fear?"), which is close to the lanes' belief ("Long ago, somebody taught you..."). So the steps most at risk are the two after the opener (`reading1`, `reading2`). Code may have changed since July, so check this at build time.

**Proof after building:** use the same replay method (`../evidence/fb-palm-derail-replay.mjs`). Count the lane's words in each message step for a lane visitor and for a plain `/fb` visitor with the same answers. A lane message step that reads like the plain one means Evelyn has forgotten the lane.

## How to test it

Each lane's page and opener ship together, because the opener continues the page. The first test is lane (page + opener) against `/fb`, one unit. Testing the opener on its own can come later.
