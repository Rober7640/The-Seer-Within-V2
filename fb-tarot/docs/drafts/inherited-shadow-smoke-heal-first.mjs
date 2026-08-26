// Written on the CORRECTED logic: the card's meaning is the WARRANT for cut 1.
//   the card says she CAN → and yet it hasn't → so it isn't a thing in her.
// Hook chosen because it asks to be graded on herself, and the soulmate-keyword frame
// forbids ruling on her healing in EITHER direction. The warrant sidesteps that: it is a
// statement about capability, never a verdict on her state.
export const HOOK='cards-heal-first'
export const AD='Do I need to heal before my soulmate arrives?'
export const AFFIRM={
 a:"So no, dear. You're not short of anything.",
 b:"So look at him, dear. Nothing about him is damaged.",
 c:"So you're ready now, dear. The card's plain on it.",
}
export const S={
 a:{card:'I · The Magician', vocab:'the card of will and intention',
    warrant:'everything he needs is already out — she is not short of anything',
    b:["You turned the Magician, dear. Look — nothing on that table is missing.",
       "You asked if you need to heal first. This card's about already having what it takes."],
    c:[AFFIRM.a,
       "But it still hasn't happened. You've felt that.",
       "And that's what tells me, dear. It's not a thing in you.",
       "That's why the work on yourself never brought anyone nearer."],
    l:"Let me look closer at what's actually in the way…"},
 b:{card:'XII · The Hanged Man', vocab:'the card of the pause and a new angle',
    warrant:'one rope, and everything else about him is free — held, not hurt',
    b:["You turned the Hanged Man, dear. Look — one ankle is tied and the rest of him is loose.",
       "You asked if you need to heal first. This card's about being held."],
    c:[AFFIRM.b,
       "But you've been told to fix yourself. More than once.",
       "And that's the wrong job, dear. He's held, not hurt.",
       "That's why the fixing never turned into meeting anyone."],
    l:"Let me look closer at what's doing the holding…"},
 c:{card:'0 · The Fool', vocab:'the card of new beginnings',
    warrant:'he is already stepping, not preparing to — she is ready enough',
    b:["You turned the Fool, dear. Look — he's already stepping, not getting ready to.",
       "You asked if you need to heal first. This card's about being ready enough."],
    c:[AFFIRM.c,
       "But nobody's arrived. You've waited a long while.",
       "And so ready was never the missing bit, dear.",
       "That's why each round of getting better left you here."],
    l:"Let me look closer at what's kept that road empty…"},
}
