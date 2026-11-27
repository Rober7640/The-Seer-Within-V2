# Hook M: The magnet
Idea: The clearing takes out what's in her way and the stone looks after what comes in, but neither one draws anything to her; the bracelet works like a magnet, set tonight to what she asked for, so love comes to her without her chasing it.
Mechanism she learns: A magnet doesn't go looking for anything, things come to it; tonight Evelyn sets eight stones to what she asked for, each stone draws one plain thing (Malachite love, Citrine money, Green Aventurine luck and so on), and on her right wrist the bracelet draws love to her.
Data used: AI lines: REVEAL, PERSONALIZE (both prompts changed, see each line) | nothing new

## PATH_A_OPEN
- {firstName}... both are confirmed. Your clearing and your lava stone. Tonight's work will be powerful.
- Your lava stone goes on your left wrist. It looks after you, and lets in what's yours.
- But I want to ask you something before I begin...
- When the block is gone, and your stone is on... what then?
- The clearing takes out what's in your way. Your stone looks after what comes in. But {firstName}... neither one draws love to you.
- While we were talking, I saw something about what you asked for. I haven't told you yet.

## PATH_B_OPEN
- That's alright about the stone, {firstName}. Your clearing is still set for tonight.
- Your clearing takes out what's been in your way. I seal it, and it stays out.
- But before I begin, there's something I saw while we were talking. I haven't told you yet.
- It isn't about what's in your way. It's about what you asked for.

## MANIFEST_REVEAL
- [AI: 2 messages, 3 at most, each under 25 words. From her main-chat answer about what she wants, Evelyn says flatly what she saw past the block while they talked: the thing she asked for, real and close to her. Put it in Evelyn's own plain words and keep it about her own life (how her days look, how she's loved, what she gets to have); never quote her answer back whole, never say what a man or anyone else will do, and add no people, events or dates she didn't mention. End on it being close. Don't say why it isn't with her yet, and don't mention the bracelet, stones or magnets, because the next fixed lines do that. Prompt changes: delete all four "Say something like" sample lines (the model copies them, and they carry "field", "signal" and "can't feel you yet"); in Context, change "their desire trying to reach them" to "what she asked for, close to her"; replace the rule "Paint a vivid picture of what's trying to reach them" with "Say it plainly, with no comparisons or pictures"; add never-say rules: that it can't reach or find her, that the block could return, that the clearing could fail, and "you've felt" or "you know"; ban the words energy, field, frequency, signal, broadcast, vibration, universe, door and magnet; no em or en dashes and no capital letters for emphasis.]
  - fallback: I saw past the block, {firstName}... and what you asked for is close.

## GAP
- Clearing the way is only half of it, {firstName}. The other half is drawing love to you.
- Most women know two ways to get love. Chase it, or wait for it.
- Your friends have watched you do both, dear.
- Both wear you out. And neither one draws it to you.

## Q1
? Would you like love to come to you, without chasing it, {firstName}?
* yes | Yes, I'd love that
* maybe | I think so
* unsure | I'm not sure

## AFTER_Q1 yes
- I thought so, dear. You shouldn't have to chase.
- And you shouldn't have to sit and wait, either.

## AFTER_Q1 maybe
- That's honest. When you've chased or waited a long time, it's hard to picture anything else.
- There is another way, dear.

## AFTER_Q1 unsure
- That's alright. Most women have never been shown another way.
- Let me show you one.

## AFTER_Q1 default
- Let me show you another way, {firstName}.

## INTRODUCE
- I made something for exactly this, {firstName}.
- Not to clear anything. Not to protect you. To draw love to you.
- It's a bracelet of eight stones. I call it the Manifestation Bracelet.
- This bracelet works like a magnet. Tonight I set it to what you asked for, and it draws that to you.
- A magnet doesn't go looking for anything, dear. Things come to it.

## STONES
- Eight stones, {firstName}. Each one draws something different to you.
- Green Aventurine, the green one, is the luck stone. It draws luck, like the chance meeting you never planned.
- Citrine, the yellow one, is the merchant's stone. It draws money.
- Amethyst, the purple one, draws calm. The kind where you sleep right through the night.
- Tiger's Eye, with its gold stripes, draws courage. You say yes when it counts.
- Clear Quartz draws clear answers, so you know what's right for you.
- Hematite, the shiny grey one, draws people you can count on. Pyrite, the shiny gold one, draws success at work.
- And Malachite, deep green with darker bands, draws love. The kind that stays.
- Eight stones, {firstName}. Tonight I set all eight to what you asked for.

## Q2
? Is love the thing you want most right now, {firstName}?
* yes | Yes, it is
* more | Love and more
* unsure | I'm not sure

## AFTER_Q2 yes
- Then that's what I'll set your stones for, dear.
- And here are the ones that matter most for it.

## AFTER_Q2 more
- Good. All eight work together, so it draws more than one thing.
- But for what you asked for, some stones matter more than others.

## AFTER_Q2 unsure
- That's alright. You told me earlier what you want, and I remember it.
- Here are the stones that matter most for that.

## AFTER_Q2 default
- Here are the stones that matter most for you, {firstName}.

## MANIFEST_PERSONALIZE
- [AI: 2 messages, 3 at most, each under 25 words. Evelyn names the one or two stones that matter most for what she asked for, and says flatly what each one draws to her, tied to her main-chat answer in Evelyn's own words. Each stone keeps the one job the chat just gave it: Green Aventurine luck, Citrine money, Amethyst calm, Tiger's Eye courage, Clear Quartz clear answers, Hematite people she can count on, Pyrite success at work, Malachite love. Which stones: love, Malachite then Green Aventurine; money, Citrine then Pyrite; purpose, Tiger's Eye then Clear Quartz; someone, Malachite then Amethyst. Prompt changes: replace today's four bucket lines (doors opening, "abundance magnet", "broadcasting wealth frequency", "amplifying the energetic connection", the person "reaching out, feeling the pull") with this list; tell the model the chat has just said the bracelet works like a magnet and each stone draws one thing, so it says what the stone draws and adds no other picture or comparison; delete "Paint a picture"; never call the stones magnetic; keep it about her own life, never what a man or anyone else will do or when; same never-say rules, banned words, dash and capital rules as REVEAL, except that "magnet" is allowed.]
  - fallback: For you, {firstName}, Malachite matters most. It draws love, the kind that stays.

## RITUAL_INSTRUCTION
- Here's what I'll do tonight, {firstName}.
- While I'm doing your clearing, I'll set your bracelet beside the candle that bent at your name.
- Once the block is out, I can see what you asked for plainly. That's when I set all eight stones to it, one by one.
- After that, it works on its own. You don't have to do a thing.
- You wear it on your right wrist, always the right. That's the hand you hold out to people, so it's always out in front, where it works best.

## RITUAL_PATH_A_EXTRA
- Stone on your left, bracelet on your right. Your stone looks after what comes in, and your bracelet draws love to you.

## WHAT_RECEIVE
- It ships within 48 hours, already set to what you asked for. When it arrives, put it on and say once, "What's mine comes to me."
- That's all you do. It's the same for every woman I send one to.
- Most of them start noticing shifts within the first week. Small things at first... a feeling, a coincidence, a conversation that seems too perfectly timed. Then bigger.
- And your friends will notice. One of them will ask, "Since when does love come this easy to you?"

## Q3
? Shall I set yours tonight, {firstName}, while I'm doing your clearing?
* yes | Yes, set it tonight
* maybe | I think so
* what | What exactly do I get?

## AFTER_Q3 yes
- Then I'll set it tonight, during your clearing.
- Here's the rest.

## AFTER_Q3 maybe
- That's alright, dear. It's a lot for one night.
- Let me make it simple.

## AFTER_Q3 what
- Fair question. Eight stones on one bracelet, set tonight to what you asked for, and shipped to you within 48 hours.
- All you do is wear it.

## AFTER_Q3 default
- Here's the rest, {firstName}.

## SOCIAL_PROOF
- I've sent these to hundreds of seekers now. The ones who wear them daily... their stories still give me chills.
- They don't just tell me something changed. They tell me everything changed. Like the universe finally heard them.

## PRICE
- The Manifestation Bracelet is $47, {firstName}, set tonight and shipped straight to you. It goes on the card you just used.
- Same 30-day guarantee. If you don't feel the shift... if nothing starts moving toward you... every penny back.
- I've never had anyone return one.

## URGENCY
- I can only set it while I'm doing your clearing tonight, {firstName}. Once I close the session, that chance is gone.
- Your clearing is sealed either way. I promise you that.
- But if you want something drawing love to you, this is the moment.

## DOWNSELL
- {firstName}... I hear you.
- Let me do something I don't normally do.
- I have a bracelet that's already been cleansed and prepared. The same eight stones.
- It won't be set to what you asked for tonight, so it won't draw that the way a fresh one would.
- But each stone still draws its own thing. Luck, money, calm, courage, love.
- I can send it to you for $30 instead, on the same card.
- This is the lowest I can offer, dear. The stones alone cost me nearly that.

## SUCCESS
- Wonderful, {firstName}. The bracelet is yours.
- Eight stones, and each one draws something good to you.
- It ships within 48 hours.

## SUCCESS_HAS_SHIPPING
- Wonderful, {firstName}. The bracelet is yours.
- Eight stones, and each one draws something good to you.
- It ships within 48 hours, to the same address as your lava stone.

## SUCCESS_NEEDS_SHIPPING
- Wonderful, {firstName}. The bracelet is yours.
- Eight stones, and each one draws something good to you.
- It ships within 48 hours. I just need to know where to send it.

## SHIPPING_CONFIRMED
- It's all set, {firstName}.
- When your bracelet arrives, put it on your right wrist and say once, "What's mine comes to me."
- That's all you do. The stones do the rest.
- Watch your inbox. Your clearing reading arrives within 24 hours.
- Thank you for trusting me with this, dear. I'll be thinking of you tonight while I work.

## SOFT_DECLINE
- I understand, {firstName}. Your clearing is set for tonight.
- I take out what's been in your way, and I seal it so it stays out. Just as I promised.
- Your reading arrives within 24 hours. Watch your inbox.
- And if you ever want a bracelet of your own, I'll be here.
- Take care, dear. I'll be thinking of you tonight while I work.

## OTHER TOPICS
Everything not listed stays shared. The two AI lines already follow her own answer and carry their per-topic stones. Someone keeps the love lines, because nearly every someone buyer on /fb is asking about a partner or an ex.

### money
PATH_A_OPEN bubble 5:
- The clearing takes out what's in your way. Your stone looks after what comes in. But {firstName}... neither one draws money to you.

GAP bubbles 1 and 2:
- Clearing the way is only half of it, {firstName}. The other half is drawing money to you.
- Most women know two ways to get more money. Work harder for it, or wait for a lucky break.

Q1 (buttons stay):
- Would you like money to come to you, without chasing it, {firstName}?

INTRODUCE bubble 2:
- Not to clear anything. Not to protect you. To draw money to you.

Q2 (button 2 becomes "Money and more"):
- Is money the thing you want most right now, {firstName}?

PERSONALIZE fallback:
- For you, {firstName}, Citrine matters most. It draws money.

RITUAL_PATH_A_EXTRA:
- Stone on your left, bracelet on your right. Your stone looks after what comes in, and your bracelet draws money to you.

WHAT_RECEIVE bubble 4:
- And your family will notice. One of them will ask, "Since when does money come this easy to you?"

URGENCY bubble 3:
- But if you want something drawing money to you, this is the moment.

### purpose
PATH_A_OPEN bubble 5:
- The clearing takes out what's in your way. Your stone looks after what comes in. But {firstName}... neither one draws the right chances to you.

GAP bubbles 1, 2 and 4:
- Clearing the way is only half of it, {firstName}. The other half is drawing the right chances to you.
- Most women know two ways to find their path. Push for it, or wait for the right moment.
- Both wear you out. And neither one draws the right chances to you.

Q1 (buttons stay):
- Would you like the right chances to come to you, without chasing them, {firstName}?

INTRODUCE bubble 2:
- Not to clear anything. Not to protect you. To draw the right chances to you.

Q2 (button 2 becomes "That and more"):
- Is finding your path the thing you want most right now, {firstName}?

PERSONALIZE fallback:
- For you, {firstName}, Tiger's Eye matters most. It draws courage, so you say yes when the right chance comes.

RITUAL_PATH_A_EXTRA:
- Stone on your left, bracelet on your right. Your stone looks after what comes in, and your bracelet draws the right chances to you.

WHAT_RECEIVE bubble 4:
- And your friends will notice. One of them will ask, "Since when do the right chances just come to you?"

URGENCY bubble 3:
- But if you want something drawing the right chances to you, this is the moment.

### someone
Q2 (button 2 becomes "That and more"):
- Is love with {personName} the thing you want most right now, {firstName}?

(Reads right when {personName} falls back to "them": "Is love with them the thing you want most right now". Everything else uses the love lines.)

## NOTES FOR BUILD
- No new data. Both AI prompts change as written in their lines, and both fallbacks replace today's.
- The magnet is the only picture. No stone is called magnetic anywhere; "works like a magnet" is Evelyn's picture. Hematite and Pyrite are described by colour only, not as iron, so nobody reads the magnet literally.
- Bracelet photo shows after INTRODUCE bubble 5 ("A magnet doesn't go looking for anything, dear. Things come to it.").
- The candle appears once, RITUAL_INSTRUCTION bubble 2. For a buyer who never saw it (chat A of the /fb chat-flow test, or any other entry), swap in: "While I'm doing your clearing, I'll set your bracelet on my altar."
- Her one sentence on arrival is "What's mine comes to me." (WHAT_RECEIVE bubble 1 and SHIPPING_CONFIRMED bubble 2). If a card goes in the box, it should say the same. It sits well beside both Upsell 1 phrases ("Only what's mine gets through." and "I am protected. I am transforming."). The daily 3-minute ritual and the manifestation guide are gone. A printed guide isn't mentioned; if one does ship, it can only be named as an optional extra, never her job.
- Downsell buyers see the same SUCCESS, SUCCESS_HAS_SHIPPING, SUCCESS_NEEDS_SHIPPING and SHIPPING_CONFIRMED as full-price buyers, so none of those lines says the bracelet was set to her wish tonight. If the build can tell them apart, full-price buyers can get one extra SUCCESS bubble after bubble 1: "I'll set it tonight, during your clearing."
- Path A goes from SUCCESS_HAS_SHIPPING straight to SHIPPING_CONFIRMED with no form, so SHIPPING_CONFIRMED opens with "It's all set", which reads right with or without the address form.
- acceptLabel: "Yes, set my bracelet tonight". The downsell decline label stays "No thanks, just the clearing".
- Malachite's job changes from today's "transformation and growth" to love, so the love buyer has her own stone and the showcase ends on it. Love PERSONALIZE moves from today's Green Aventurine and Amethyst to Malachite and Green Aventurine. If the operator would rather keep Malachite as today, give it "Malachite draws a fresh start" and put love back on Green Aventurine.
- Right wrist: "the hand you hold out to people". Handshakes use the right hand by custom, left-handed women included, so it holds for every buyer. No broadcasting or sending-out words. On Path A it's simply stone on the left, bracelet on the right (RITUAL_PATH_A_EXTRA).
- Path A lines only say the lava stone "looks after you, and lets in what's yours" and "looks after what comes in", so they read right after today's Upsell 1 (the stone protects) and after hook 6 (the stone is a filter).
- Stone facts used, all true: Green Aventurine is green, Citrine yellow, Amethyst purple, Tiger's Eye has gold stripes, Hematite is shiny grey, Pyrite shiny gold, Malachite deep green with darker bands. "The merchant's stone" is Citrine's common name.
- Typed replies. New keys: Q1 is yes / maybe / unsure (unsure replaces what); Q2 is yes / more / unsure (more and unsure replace all and more); Q3 keeps today's yes / maybe / what. Today's detectors send "I'm not sure" to default on Q1 and Q2, so suggested matching:
  - Q1: unsure first, `not sure|don't know|dont know|no idea|unsure`; then maybe, `think so|maybe|probably|i guess|sort of|kind of`; then yes, `yes|yeah|love that|i'd love|i would|please|of course|definitely|absolutely`. No match (including "no") goes to default.
  - Q2: unsure first, `not sure|don't know|dont know|no idea|unsure`; then more, `and more|more than|other things|everything|all of it|both|as well`; then yes, `yes|yeah|it is|definitely|of course|love|money|path`. More goes before yes, because "Love and more" and "Money and more" contain "love" and "money". No match goes to default.
  - Q3: yes first, `yes|yeah|set it|please|do it|ready|let's`; then maybe, `think so|maybe|probably|i guess`; then what, `what|get|include|cost|price|how much`. No match goes to default. Today's detector already matches all three new buttons; it only needs "set it" added.
- Q2's second button label changes by topic (Love and more, Money and more, That and more). All three contain "and more", so the one Q2 pattern covers them.
