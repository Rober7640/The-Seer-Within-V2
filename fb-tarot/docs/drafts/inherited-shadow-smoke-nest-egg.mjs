export const HOOK='cards-nest-egg'
export const AD='How long has something been blocking me from a nest egg?'
// PRE-FLIGHT STEP 3 — the three affirmations, written FIRST, before any block copy.
// The ad both ASSERTS a block and asks a DURATION, so every card must decline the count
// AND clear her. That is exactly the shape that collides.
export const AFFIRM = {
 h:"So I won't count the years, dear. But I'll show you the thing.",
 m:"So there's no number in this, dear. There's something better.",
 g:"So the saving was never the trouble, dear. You've done that part.",
}
export const S = {
 h:{card:'V · The Hierophant', vocab:'tradition, conformity', kind:'RECEIVED',
    b:["You turned the Hierophant, dear. Look — his robe has three small crosses down the front.",
       "You asked how long it's been blocked. This card's about what gets handed on."],
    c:[AFFIRM.h,
       "But look at the two kneeling. They take what's passed down without looking.",
       "And a money rule came to you that way, dear. You've not read it.",
       "That's why the saving never turned into keeping."],
    l:"Let me look closer at what that rule says…"},
 m:{card:'XVIII · The Moon', vocab:'illusion, fear, the subconscious', kind:'UNSEEN',
    b:["You turned the Moon, dear. Look — the moon's face is turned side-on, not out at you.",
       "You asked how long it's been blocked. This card's about what nobody turned to."],
    c:[AFFIRM.m,
       "But look down at the pool. Whatever's rising there, nobody's watching.",
       "And that's where your money stops, dear. Right at the start.",
       "That's why it never got past the first bit."],
    l:"Let me look closer at the bottom of that pool…"},
 g:{card:'XII · The Hanged Man', vocab:'surrender, suspension', kind:'HELD',
    b:["You turned the Hanged Man, dear. Look — his shoes are gold, and both feet are off the ground.",
       "You asked how long it's been blocked. This card's about being held."],
    c:[AFFIRM.g,
       "But look at the rope. It's one tie, holding all of him.",
       "And yours goes into old wood, dear. It's older than the saving.",
       "That's why the years passed and it stayed where it was."],
    l:"Let me look closer at the beam that rope runs over…"},
}
