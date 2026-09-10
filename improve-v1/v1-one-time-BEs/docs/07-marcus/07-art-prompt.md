# 07 — the art prompt

Derived from the operator's reference photograph (2026-09-03), studied shot by shot.
⭐ **The register is an ordinary phone snapshot of somebody's real practice**, not a styled
photograph of a product. Six things carry that, and all six are load-bearing:

1. The cloth is a **single-colour black screen print on undyed cream cotton** — not woven,
   not multicolour.
2. Cards sit **face up and radially**, pointing at the centre, so the top ones are upside
   down and the side ones lie sideways.
3. **The frame is tilted.** The cloth is not parallel to the picture edge. This one thing
   does most of the work.
4. **Clutter runs off all four edges** — a crystal point half out of frame, a jar at the
   corner, bare boards down one side.
5. Crystals are **dropped, not placed**. Uneven, mixed sizes, some touching.
6. **Flat natural daylight, phone camera, everything in focus.** No shallow depth of field,
   no grade, no styling.

⛔ **Keep the prompt declarative and roughly this length.** A longer, shoutier version with
⛔ blocks and "never do X" made every worker deliberate past a 900-second timeout and return
nothing. Describe the photograph; do not lecture.

---

## The faithful prompt

```
A real phone photograph, taken from above at a slight angle, of a tarot reading
laid out on a printed cloth on a wooden table.

THE CLOTH: a large square of undyed natural cotton, warm cream, with visible woven
texture and a stitched hem. It is printed in black ink only, one colour, like a
screen print. In the middle is a large raven standing in profile facing right,
drawn as a detailed woodcut with heavy black lines and strong feather texture.
Straight black rays radiate outward behind it like a sunburst. Around that sit
concentric black rings filled with Elder Futhark runes, and an outer border ring
of small alchemical and astrological symbols, stars, crescents, triangles and
dotted lines.

THE CARDS: fifteen tarot cards laid face up in a wide circle around the raven,
following the ring. Each card points inward toward the centre, so the cards at the
top of the picture are upside down and the ones at the sides lie sideways. They
overlap slightly. It is a raven tarot deck: every card is an illustrated painting
featuring a crow or raven, muted and slightly aged, with soft cream borders, a
Roman numeral in a small scrollwork banner at the top, and the card name printed
in serif capitals along the bottom.

AROUND THE EDGES: polished tumbled crystals and small carved stones scattered
unevenly across the cloth and the table — rose quartz, green aventurine, black
obsidian, speckled jasper, a purple amethyst point lying diagonally, a pink quartz
egg on a small clear stand. They are not arranged; they sit where they were put.
Some are half out of frame.

THE PHOTOGRAPH: an ordinary snapshot taken on a phone. The cloth is tilted in the
frame, not square to it. Soft natural daylight from the upper left, no flash,
gentle shadows. Everything roughly in focus, the way a phone camera renders.
Objects run off all four edges. Warm bare wooden boards visible at the top left
and left edge. Natural colour, slightly desaturated, no filter and no colour
grading. Cluttered and lived-in, not styled or arranged for the camera. No hands,
no people.
```

## ⭐ THE SHIPPING PROMPTS (Rider-Waite)

⛔ **Only Rider-Waite cards** *(operator, 2026-09-03)*. We ship 104 real RWS scans from
`assets/tarot-rws/` at the REPO ROOT, and `build-07-daily.py` pulls card art from
`evelyn/tarot-rws/` on S3. A photograph showing an invented deck contradicts the scans the
copy is written against — which destroys the one thing the art rule protects.

Every day is HEAD + its own CARDS paragraph + TAIL. Only the middle changes.

### HEAD — the cloth and the deck (identical every day)

```
A real phone photograph, taken from above at an angle, of a tarot reading laid out on a printed cloth on a wooden table.

THE CLOTH: a large square of undyed natural cotton, warm cream, with visible woven texture and a stitched hem. It is printed in black ink only, one colour, like a screen print. In the middle is a large raven standing in profile facing right, drawn as a detailed woodcut with heavy black lines. Straight black rays radiate outward behind it like a sunburst. Around that sit concentric black rings filled with Elder Futhark runes, and an outer border ring of small alchemical and astrological symbols, stars, crescents and dotted lines.

THE DECK IS THE CLASSIC RIDER-WAITE-SMITH TAROT, the famous 1909 deck drawn by Pamela Colman Smith. The face-up cards must look exactly like that deck and no other: flat simple colour fills in primary yellow, red, blue and green, bold black outlines, slightly naive medieval drawing, pale cream borders, the card name printed in a plain black-on-white band across the bottom and a Roman numeral at the top. The card stock looks slightly aged and yellowed.
```

### TAIL — back, crystals, framing, camera (identical every day)

```
THE FACE-DOWN CARDS all show the classic Rider-Waite back: an allover pale blue-grey pattern of small roses on a fine trellis, edge to edge, with a thin white border. Every card is tall and narrow, true tarot proportion.

AROUND THE EDGES: polished tumbled crystals and small carved stones on the cloth and the bare table - rose quartz, green aventurine, black obsidian, speckled jasper, a purple amethyst point lying diagonally, a pink quartz egg on a small clear stand. They lie in loose uneven clusters where they were put down, two or three touching, a bare gap with nothing on one side. Some are half out of frame.

THE FRAMING: the camera is pulled back far enough that EVERY CARD IS COMPLETELY INSIDE THE PICTURE with clear empty cloth around it. No card is cut off by the edge of the frame. The cloth and crystals may run off the edges.

THE PHOTOGRAPH: an ordinary snapshot taken on a phone. The cloth is clearly TILTED in the frame, rotated about twenty degrees, its corners running out of the picture at different distances. Soft natural daylight from the upper left, no flash. Everything roughly in focus, the way a phone camera renders. Warm bare wooden boards visible along the top left and left edge. Natural colour, slightly desaturated, no filter. Cluttered and lived-in, not styled. No hands, no people.
```

### am-i-asking-for-too-much · Am I Asking For Too Much? — 1 face up, 6 face down → `assets/07-am-i-asking-for-too-much-rws.png`

```
THE CARDS: seven tarot cards on the cloth in front of the raven, in one group. The TWO OF CUPS lies FACE UP alone at the top - the Rider-Waite Two of Cups: a young woman in a white gown and a young man in a yellow tunic standing face to face, each holding a golden cup out toward the other, his free hand reaching for hers, a winged lion's head above a tall staff with two snakes twined round it in the air between them, a small house on a green hill in the distance, TWO OF CUPS printed in the band at the bottom. Beneath it SIX cards lie FACE DOWN in one long row running left to right, each one set a little lower than the one before it so the row slopes gently away, the last card at the right sitting level again. All seven are whole and clearly separate. Laid by hand and it shows: uneven spacing, several cards at slightly wrong angles, one or two just touching.
```

### is-he-who-he-says-he-is · Is He Who He Says He Is? — 1 face up, 6 face down → `assets/07-is-he-who-he-says-he-is-rws.png`

```
THE CARDS: seven tarot cards on the cloth in front of the raven. One card lies FACE UP in the middle of the group: the Rider-Waite EIGHT OF WANDS - eight long leafy staves flying through open sky at a slant, all eight pointing the same way, none of them touching the ground, a green field with a river and a low hill with a small house far below them, and not one person anywhere in the picture, EIGHT OF WANDS printed in the band at the bottom. The other SIX cards lie FACE DOWN around it in a loose ring, set at uneven distances so the ring is wider on one side than on the other, each one whole and clearly separate. Laid by hand and it shows: uneven spacing, several cards at slightly wrong angles, one or two just touching.
```

### just-tell-me-what-i-need-to-know · Just Tell Me What I Need to Know — 1 face up, 5 face down → `assets/07-just-tell-me-what-i-need-to-know-rws.png`

```
THE CARDS: six tarot cards on the cloth in front of the raven. One card lies FACE UP by itself on the left with a wide stretch of empty cloth beside it: THE HIEROPHANT - a figure in red and white robes seated on a grey stone throne between two plain stone pillars, wearing a tall three-tiered crown, one hand raised with two fingers up, a long staff topped with a triple cross in the other, two crossed keys lying on the floor at his feet and two men in patterned robes kneeling in front of him with their backs turned, numbered V with THE HIEROPHANT in the band at the bottom. The other FIVE cards lie FACE DOWN well over to the right of it, close together in a shallow fan, all five turned at a slight angle away from the face-up card, each one whole and clearly separate. Laid by hand and it shows: uneven spacing, the fan not even, one or two just touching.
```

### what-hed-have-to-admit · What He'd Have to Admit — 2 face up, 6 face down → `assets/07-what-hed-have-to-admit-rws.png`

```
THE CARDS: eight tarot cards on the cloth in front of the raven. TWO lie FACE UP side by side at the top with a clear hand's width of empty cloth between them. The left one is the Rider-Waite SIX OF CUPS - a small boy in a green hood holding out a golden cup filled with white flowers to a smaller girl in a courtyard, five more flower-filled cups standing on the ground around them, a yellow house behind and a man walking away in the distance, SIX OF CUPS printed in the band at the bottom. The right one is the FOUR OF SWORDS - a knight carved in pale stone lying flat on his back on a tomb inside a chapel, his hands pressed together on his chest, three swords hanging point down on the wall above him and a fourth carved along the tomb beneath him, FOUR OF SWORDS in the band at the bottom. SIX cards lie FACE DOWN in one long row beneath the pair, running the whole width of both, each one whole and clearly separate. Laid by hand and it shows: uneven spacing, several cards at slightly wrong angles, one or two just touching.
```

### what-is-blocking-my-money · What Is Blocking My Money — 1 face up, 5 face down → `assets/07-what-is-blocking-my-money-rws.png`

```
THE CARDS: six tarot cards on the cloth in front of the raven. One lies FACE UP by itself at the far side of the group: the Rider-Waite SIX OF PENTACLES - a merchant in a long red robe standing with a pair of gold scales held up in one hand and dropping coins from the other into the cupped hands of a ragged man kneeling at his feet, a second ragged man kneeling on his other side with his hands out, six gold pentacles set in the air on either side of him, SIX OF PENTACLES printed in the band at the bottom. The other FIVE cards lie FACE DOWN in one tight row straight across the cloth between that card and the camera, side by side and almost edge to edge, like a bar laid down in front of it. All six are whole and clearly separate. Laid by hand and it shows: the row not quite straight, two or three cards at slightly wrong angles, one or two just touching.
```

### the-marriage-ended-years-ago-and-im-still-in-it · The Marriage Ended Years Ago and I'm Still In It — 1 face up, 6 face down → `assets/07-the-marriage-ended-years-ago-and-im-still-in-it-rws.png`

```
THE CARDS: seven tarot cards on the cloth in front of the raven. One lies FACE UP at the top: the Rider-Waite TEN OF PENTACLES - an old man in a long cloak patterned all over with grapes sitting to one side of a stone archway with two white dogs at his knees, a man and a woman standing in the archway talking, a small child holding on to the woman's skirt, none of the three turned toward the old man, a walled town beyond the arch, ten gold pentacles spread across the front of the picture over the whole scene, TEN OF PENTACLES printed in the band at the bottom. Beneath it SIX cards lie FACE DOWN in two rows of three, one row above the other, with a clear empty band of cloth left between the two rows. All seven are whole and clearly separate. Laid by hand and it shows: uneven spacing, the two rows not quite level with one another, several cards at slightly wrong angles.
```

⭐ **Face up = the free positions, face down = the paid ones.** The count IS the pitch, so
every card must be whole and countable in frame.

⭐ **Each shape is the spread's own.** Batch 1 has three 1+6 spreads and two 1+5, so the layout is
the only thing telling them apart: *Asking For Too Much* is a row that slopes away and comes back
level, *Is He Who He Says He Is* is a ring worked outward from one card, *The Marriage* is two rows
with a gap between them; *Just Tell Me* puts the free card alone with a wide gap and fans the five
away from it, *Blocking My Money* lays the five in a bar across in front of it.

⭐ **The card back is the one thing to check on every re-roll.** A deck has ONE back. The
first Wed and Sat came back with a pale diamond lattice and a tile grid — off-spec against
the TAIL and, side by side with the other five, two decks that do not exist. Re-rolled with
the identical prompt and both landed in family. It is generation noise, not a prompt fault,
so ⛔ do not "fix" the TAIL for it — that would put Tue and Sun out of date for nothing.

### State — batch 1, the first six of the thirty *(2026-09-06)*

Nothing shot yet. Phase 3 shoots the art, Phase 4 writes the letter to it — so on batch 1 the
card **is** the choice, and the moment a photograph exists it is locked: the letter has to
describe the card in the picture.

| Day | Spread | File | Face up |
|---|---|---|---|
| 1 · mon | Am I Asking For Too Much? | `assets/07-am-i-asking-for-too-much-rws.png` | Two of Cups |
| 2 · tue | Is He Who He Says He Is? | `assets/07-is-he-who-he-says-he-is-rws.png` | Eight of Wands |
| 3 · wed | Just Tell Me What I Need to Know | `assets/07-just-tell-me-what-i-need-to-know-rws.png` | The Hierophant |
| 4 · thu | What He'd Have to Admit | `assets/07-what-hed-have-to-admit-rws.png` | Six of Cups · Four of Swords |
| 5 · fri | What Is Blocking My Money | `assets/07-what-is-blocking-my-money-rws.png` | Six of Pentacles |
| 6 · sat | The Marriage Ended Years Ago and I'm Still In It | `assets/07-the-marriage-ended-years-ago-and-im-still-in-it-rws.png` | Ten of Pentacles |

⛔ **No card twice in a batch.** Seven face-up cards go to the same 76k list inside one week, and
a repeat reads as a deck nobody is cutting. None of these seven collides with the retired weekday
seven either.

Build and run them from the doc, never by hand — that is what keeps HEAD and TAIL identical.
The argument is the spread key, never the weekday:

```
python3 scripts/make-07-day-art.py                                    # every spread with no PNG yet
python3 scripts/make-07-day-art.py what-is-blocking-my-money          # just that one
python3 scripts/make-07-day-art.py --print what-is-blocking-my-money  # show the composed prompt, generate nothing
```

---

## The seven weekday spreads *(superseded — kept for the reasoning)*

The first seven, one per weekday, shot 2026-09-03. ⛔ Their headings are weekday-named and the
parser no longer matches them — deliberately: the thirty run several spreads on every weekday, so
a block is keyed on the spread, not the day. Kept because the shapes, the card choices and the
notes underneath them are the worked examples the six above are written against.

### Tuesday · The Two Doors — 2 face up, 6 face down → `assets/07-tue-rws.png`

```
THE CARDS: eight tarot cards on the cloth in front of the raven, in two groups side by side. In the LEFT group, THE DEVIL lies FACE UP at the top - the Rider-Waite Devil: a horned goat-headed figure with bat wings squatting on a black half-cube, a torch in one hand, a naked man and a naked woman with small horns and tails chained by the neck to the cube below him, the chains hanging loose over their heads, numbered XV with THE DEVIL in the band at the bottom - and THREE cards lie FACE DOWN in a horizontal row beneath it. In the RIGHT group, the EIGHT OF CUPS lies FACE UP at the top - the Rider-Waite Eight of Cups: a figure in a red cloak with a staff walking away uphill into rocky ground with his back turned, eight golden cups stacked in two rows on the shore behind him, a moon in a clouded night sky above, EIGHT OF CUPS in the band at the bottom - and THREE more cards lie FACE DOWN in a horizontal row beneath it. A clear gap separates the two groups. Laid by hand and it shows: uneven spacing, several cards at slightly wrong angles, one or two overlapping.
```

### Sunday · The Zodiac Spread — 3 face up, 9 face down → `assets/07-sun-rws.png`

```
THE CARDS: twelve tarot cards laid in a wide ring around the raven, following the printed circle. Each card points inward toward the centre, so cards at the top of the picture are upside down and those at the sides lie sideways. NINE are FACE DOWN. THREE are FACE UP, spaced far apart around the ring roughly opposite one another, at the nine o'clock, one o'clock and five o'clock positions. At nine o'clock is the QUEEN OF SWORDS - a crowned woman in a pale robe seated on a carved stone throne, holding one sword upright in her right hand and her left hand raised open, a bank of cloud below her, QUEEN OF SWORDS in the band at the bottom. At one o'clock is the KING OF PENTACLES - a bearded king on a throne carved with bulls' heads, one gold pentacle resting on his knee, his robe covered all over with grapevines and fruit, a castle wall behind him, KING OF PENTACLES in the band at the bottom. At five o'clock is THE HIGH PRIESTESS - a seated woman between one black pillar and one white pillar, a crescent moon at her feet, a partly hidden scroll in her lap, numbered II with THE HIGH PRIESTESS in the band at the bottom. Laid by hand and it shows: uneven spacing, several at slightly wrong angles, two or three overlapping a neighbour.
```

### Monday · The Weight — 1 face up, 5 face down → `assets/07-mon-rws.png`

```
THE CARDS: six tarot cards on the cloth in front of the raven, in one group. The TEN OF WANDS lies FACE UP at the top - the Rider-Waite Ten of Wands: a man bent forward under a bundle of ten wooden staves gathered in both arms, his face hidden behind them, a small town with two towers on the horizon ahead of him, TEN OF WANDS printed in the band at the bottom - and FIVE cards lie FACE DOWN in a horizontal row beneath it, all five whole and clearly separate. Laid by hand and it shows: uneven spacing, several cards at slightly wrong angles, one or two just touching.
```

### Wednesday · The Small Instruction — 1 face up, 5 face down → `assets/07-wed-rws.png`

```
THE CARDS: six tarot cards on the cloth in front of the raven, laid in one long line that runs from the lower left up to the upper right, like stepping stones. The card at the near end of the line, lowest and leftmost, lies FACE UP: the Rider-Waite FOUR OF CUPS - a young man sitting on the grass under a tree with his arms folded and his legs crossed, three golden cups standing on the ground in front of him and a fourth cup held out to him from a small grey cloud, FOUR OF CUPS printed in the band at the bottom. The other FIVE cards lie FACE DOWN along the line above it, one after another, each one whole and clearly separate. Laid by hand and it shows: uneven spacing, several cards at slightly wrong angles, the line not quite straight.
```

### Thursday · The Undertow — 2 face up, 5 face down → `assets/07-thu-rws.png`

```
THE CARDS: seven tarot cards on the cloth in front of the raven. TWO lie FACE UP on the left, one directly above the other. The upper one is the Rider-Waite FIVE OF CUPS - a figure in a long black cloak standing with his head bowed over three golden cups tipped over and spilled on the ground, two more cups still standing upright behind him, a river with a small bridge and a house in the distance, FIVE OF CUPS printed in the band at the bottom. The lower one is THE MOON - a path running away between two grey towers, a dog and a wolf howling up at a face in the moon, a crayfish crawling out of a pool in the foreground, numbered XVIII with THE MOON in the band at the bottom. To the right of that pair, FIVE cards lie FACE DOWN in a long shallow curve that bends away like a current, each one whole and clearly separate. Laid by hand and it shows: uneven spacing, several cards at slightly wrong angles, one or two just touching.
```

### Friday · The Ledger — 3 face up, 6 face down → `assets/07-fri-rws.png`

```
THE CARDS: nine tarot cards on the cloth in front of the raven, laid out like a ledger - one card alone at the top, two columns of three beneath it, and two more side by side at the bottom. The single card at the top lies FACE UP: the Rider-Waite FOUR OF PENTACLES - a seated man in a red robe and a gold crown clutching one gold pentacle against his chest with both arms, another balanced on top of his crown and one under each foot, a grey town behind him, FOUR OF PENTACLES printed in the band at the bottom. The LEFT column begins with a FACE UP card, the FIVE OF PENTACLES - two ragged beggars, one on wooden crutches, trudging through falling snow past a lit stained-glass church window, FIVE OF PENTACLES in the band at the bottom - and TWO cards lie FACE DOWN below it. The RIGHT column begins with a FACE UP card, the NINE OF PENTACLES - a woman in an embroidered yellow gown standing alone in a walled garden of grape vines, a hooded falcon perched on her gloved hand, NINE OF PENTACLES in the band at the bottom - and TWO cards lie FACE DOWN below it. TWO more cards lie FACE DOWN side by side at the bottom of the whole layout. All nine are whole and clearly separate. Laid by hand and it shows: uneven spacing, several cards at slightly wrong angles, the two columns not quite level with one another.
```

### Saturday · The Other Chair — 2 face up, 5 face down → `assets/07-sat-rws.png`

```
THE CARDS: seven tarot cards on the cloth in front of the raven, dealt by somebody sitting on the FAR side of the table, so the whole group faces away and the two face-up cards read upside down from where the camera is. The TWO FACE UP cards sit side by side at the far edge of the group. The left one is the Rider-Waite KNIGHT OF CUPS - a knight in armour on a white horse walking at a slow pace, holding a single golden cup straight out in front of him, small wings on his helmet and on his heels, a river and low hills behind him, KNIGHT OF CUPS printed in the band at the bottom. The right one is the SEVEN OF CUPS - a dark faceless figure seen from behind in silhouette, looking up at seven golden cups floating in a bank of cloud, each cup holding something different: a face, a veiled figure, a snake, a castle, jewels, a wreath, a dragon, SEVEN OF CUPS in the band at the bottom. FIVE cards lie FACE DOWN in a horizontal row nearer the camera, each one whole and clearly separate. Laid by hand and it shows: uneven spacing, several cards at slightly wrong angles, one or two just touching.
```

### State — all seven shot *(2026-09-03)*

| Day | File | Cards in frame |
|---|---|---|
| Mon | `assets/07-mon-rws.png` | ✅ 1 up · 5 down |
| Tue | `assets/07-tue-rws.png` | ✅ 2 up · 6 down |
| Wed | `assets/07-wed-rws.png` | ✅ 1 up · 5 down |
| Thu | `assets/07-thu-rws.png` | ✅ 2 up · 5 down |
| Fri | `assets/07-fri-rws.png` | ✅ 3 up · 6 down |
| Sat | `assets/07-sat-rws.png` | ✅ 2 up · 5 down |
| Sun | `assets/07-sun-rws.png` | ✅ 3 up · 9 down |

⚠ **Saturday's Knight of Cups is the weakest card in the set.** Dealing the group from the
far chair is what makes Saturday legible as its own spread, and it costs that one card some
clarity upside down. Two rolls, same result. Operator call whether it is worth another.

⭐ **Each shape is the spread's own.** Mon and Wed are both 1+5 and must not look alike: the
Weight is a row carried under one card, the Small Instruction is a line of steps. Thu and Sat
are both 2+5: the Undertow curves away like a current, the Other Chair is dealt from the
opposite chair and faces away from the camera.

### The cards are not a choice — they are already in the emails

⛔ Every day's face-up cards are **locked by the shipped `.html`**, because the email inlines
that card's RWS scan and describes what is on it. The photograph must show the same cards.

🔴 **This is how the first Tue and Sun were wrong** *(caught 2026-09-03)*. They were shot with
Death · The Star and Magician · Lovers · Moon — cards nobody's email mentions. Read the cards
out of the `.html`, never out of your head:
`grep -o 'tarot-rws/[a-z-]*' copy/07-marcus/daily/07-D-<day>*.html`

| Day | Spread | Face up | Face down | The face-up cards |
|---|---|---|---|---|
| Mon | The Weight | 1 | 5 | Ten of Wands |
| Tue | The Two Doors | 2 | 6 | The Devil · Eight of Cups |
| Wed | The Small Instruction | 1 | 5 | Four of Cups |
| Thu | The Undertow | 2 | 5 | Five of Cups · The Moon |
| Fri | The Ledger | 3 | 6 | Four of Pentacles · Five of Pentacles · Nine of Pentacles |
| Sat | The Other Chair | 2 | 5 | Knight of Cups · Seven of Cups |
| Sun | The Zodiac Spread | 3 | 9 | Queen of Swords · King of Pentacles · The High Priestess |

## The old raven-deck adaptation *(superseded — kept for the reasoning)*

Same cloth, same tilt, same clutter, same camera. Two changes, both forced by the offer:

- ⛔ **The six paid cards are FACE DOWN.** The withhold is the product. A face-up spread
  gives away the thing she is being asked to buy.
- The radial circle becomes **two groups of three** — Tuesday's Two Doors. *(The circle is
  not wasted: it is literally Sunday's Zodiac Spread, twelve houses in a ring.)*

Run both from `scripts/make-07-facedown.py`.
