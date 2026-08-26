// APPLE-TO-APPLE SMOKE: same hook, same deck, same three cards as the LIVE 7-cut.
// Deck: return-mhf (Magician / Hanged Man / Fool) — the live deck every ad points at.
export const HOOK='cards-blocking-soulmate'
export const AD='Is something blocking me from meeting my soulmate?'
export const S = {
 a:{ card:'Magician', vocab:'the card of will and intention', kind:'THE REPEAT',
     block:'the loop above his head comes back to where it began',
     b:["You turned the Magician, dear. Look — there's a loop drawn above his head.",
        "You asked if something's blocking you. This card's about going round."],
     c:["So yes, dear — there is. And it didn't start with you.",
        "But look at that loop. It's back where it started.",
        "And that's yours too, dear. Same place, every time.",
        "That's why the good ones ended like the rest."],
     l:"Let me look closer at where that loop begins…"},
 b:{ card:'Hanged Man', vocab:'the card of the pause and a new angle', kind:'THE HELD',
     block:'one rope, into a beam still growing leaves',
     b:["You turned the Hanged Man, dear. Look — the beam he's tied to still has leaves on it.",
        "You asked if something's blocking you. This card's about being held."],
     c:["So something's here, dear. And you didn't put it there.",
        "But look how small it is. One rope, and the rest of him's loose.",
        "And that's yours, dear. One tie, into wood older than you.",
        "That's why you've looked for a bigger reason, dear."],
     l:"Let me look closer at the wood that rope goes into…"},
 c:{ card:'Fool', vocab:'the card of new beginnings', kind:'THE CARRIED',
     block:'the bundle came tied, and he never packed it',
     b:["You turned the Fool, dear. Look — the bundle on his stick is tied shut.",
        "You asked if something's blocking you. This card's about what you carry."],
     c:["So there's something, dear. And you didn't pack it.",
        "But look at that bundle. Tied shut, and he's had it the whole way.",
        "And you've carried one like it, dear. Since before you set out.",
        "That's why each new start went the old way."],
     l:"Let me look closer at what got tied in there…"},
}
// The doc's MEANING CHECK is a judgment, not a regex. Declared honestly per card:
export const MEANING = {
 a:{verdict:'FIGHT', why:"Server tells Version C the card means WILL AND INTENTION — her power. The read uses it as the warrant for futility. B says her effort loops; C is told the card is about intention."},
 b:{verdict:'AGREE', why:"Vocab says 'the pause and a new angle' / 'a suspended, turning moment'. The read says held by one tie. Same thing."},
 c:{verdict:'FIGHT', why:"Vocab says NEW BEGINNINGS. The read's cost line is 'each new start went the old way' — it denies the card's stated meaning outright."},
}
