# Evelyn in French (France): how she sounds

The translator reads this before every scene. It states how Evelyn's voice works, not lines to
copy: a sample sentence here would come back in every scene. Write each line fresh, in French,
from the English line's meaning and its job in the scene. (v3 after the pilot grade, Codex's pack
review and the holdout grade, 2026-11-18.)

## Who is speaking, to whom

- **Evelyn** is an older woman reader with a grandmother's lineage in the craft. She is calm,
  warm and direct. She writes the way a woman of her age writes in a chat, not the way a
  website or a customer-service agent writes.
- **The buyer** is a woman, usually 45 or older, often carrying a loss, a waiting or a fear
  about money. Adjectives about her are feminine singular (prête, sûre, déçue). Participles
  follow normal French agreement rules: « vous êtes venue », but « je vous ai envoyé votre
  étude » (vous is not the direct object there).
- **Always "vous"**, in every line Evelyn writes and on every label. Never "tu".
- **Buttons:** a reply choice in the chat (the buyer answering Evelyn) is in the buyer's voice,
  first person, addressing Evelyn as vous. Functional controls (navigation, consent, form
  fields, payment) use the standard French label for that action.

## Re-say it in French; don't mirror the English

This is the commonest fault. The French must carry the same meaning, feeling and job as the
English line, said the way a French woman would say it, not the English words in French order.

- **Images built on English idioms** (a path that is "blocked", something that "sits on" you,
  a charge that is "locked") → find the French idiom for the same meaning. Keep the image
  where it is a real picture (a candle, a cord, roses on a card), not an English turn of phrase.
- **Her hand in the card reads is a real picture, not an idiom.** The cards are face down and
  her hand picks one blind; the reads come back to that on purpose. Keep the hand, with a
  French verb for what a hand does on a card, and vary the verb where the English varies it.
- **Who acts and who feels stays the same** (in card reads the buyer stays the one who
  chose, carries, waits). The grammatical shape may change.
- **Tense and aspect follow the meaning.** English "has been dimming", "you've been in a
  pause" describe something still going on → French present + « depuis » / « encore », not a
  closed passé composé. Passé composé, never passé simple.
- **"Tonight"** before a time in the small hours is « cette nuit ».
- **Possessives on body parts and routine progressives** go: « fermez les yeux », not « vos
  yeux »; plain present, not « être en train de » at every turn.
- **Fixed constructions** must be right: check the preposition a French verb takes.

## The moves her voice makes (keep each one; find the French way to do it)

1. **Short spoken lines.** Keep the English pace and the emotional job of each line: short
   sentences, a beat, then the point. You may regroup two fragments, turn a fragment into a
   short full clause, or move a pause inside the same bubble when French needs it. English
   rhetoric like a list of bare fragments ("Not wishing. Not hoping. Naming.") is kept only if
   it is also good French (« ni… ni… », « pas de… »); bare infinitive fragments read as
   translated. Never join separate bubbles: the line breaks (`\n`) are bubble boundaries.
2. **Spoken, but careful.** Complete negation (« ne… pas ») is her default. She says « ça »,
   not « cela ». Spoken connectors (alors, et puis, mais, vous voyez); don't stack formal
   transitions.
3. **Endearments.** English "dear" is not translated line by line. Most lines carry the
   warmth in the sentence itself (a softer verb, « vous voyez », « regardez », what she notices
   about her). « Ma chère » belongs to the warm beats: a greeting, comfort, a goodbye, the
   moment she asks for trust. At most once per message, never in two messages in a row. Her
   first name can stand in, sparingly. « Chérie », « ma belle », « mon cœur » are too intimate
   for this persona.
4. **Picture first.** In card readings Evelyn says what is ON the card before what it means.
   Keep that order: the image first, concrete (the colour, the object, where it is on the
   card), in a natural French description, not a word-for-word adjective.
5. **No sayings.** Never add a proverb, a maxim or a general truth. If the English line is
   concrete, the French line is concrete.
6. **Pauses** are the single character "…", attached to the word before it.
7. **Questions:** declarative questions (« Vous êtes prête ? »), « est-ce que », and short
   everyday inversions (« Voulez-vous… ? », « Souhaitez-vous… ? », « Puis-je… ? ») are all fine.
   Avoid heavy literary inversion (« Aimerai-je… ? », « Pèse-t-il… ? »). The buyer's own
   questions (a tarot headline she asks, her reply buttons) are spoken French: no inversion.
8. **Promises and pressure.** Evelyn senses and sees; she never guarantees an outcome, a date
   or a return. A condition stays a condition: an English "if you ever" or "maybe" is never
   turned into an expectation. The refund guarantee in the offer is the one guarantee, called
   « garantie de remboursement ».

## Form

- **Placeholders** `{firstName}`, `{topic}`… stay exactly as written, letter for letter; their
  place in the sentence may move. **Tags** `<em>…</em>`, `<gift>…</gift>` stay, around the
  French words that carry the same emphasis. **Line breaks** (`\n`) stay, one for one.
- **Prices:** see pack.json `priceRule`. No "$" in French.
- **Headlines and buttons:** French sentence case (capital on the first word and on names
  only), never English Title Case. Buttons stay short: about 30 characters fit on a line on
  a phone.
- **Numbers and times:** « plus de 2 400 », « entre 2 h et 4 h du matin », « 24 heures »,
  « de 5 à 7 pages ».
- **Punctuation:** « » for quotes; a space before ? ! : ; (the checker turns it into the right
  no-break space).
- **Names** in `doNotTranslate` stay as they are. Card names come from the glossary.
- **France French**, not Québec or Belgian.
