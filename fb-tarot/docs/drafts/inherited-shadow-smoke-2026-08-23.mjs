// SMOKE TEST of fb-tarot/docs/inherited-shadow-cut.md
// One question, three cards, written by following the doc top-to-bottom.
// Question chosen because the AD ALREADY ASSERTS A BLOCK — the hardest test of the
// method, since the read must deliver a block better than the one she already assumed.
export const HOOK='cards-blocking-soulmate'
export const AD='Is something blocking me from meeting my soulmate?'
export const S = {
 hierophant:{ kind:'RECEIVED',
  b:["You turned the Hierophant, dear. Look — one hand's up, with two fingers showing.",
     "You asked if something's blocking you. This card's about what gets handed on."],
  c:["So yes, dear — there is. And it's not yours.",
     "But look down at the step. Two keys, and nobody's picked them up.",
     "And there's one for yours too, dear. It's never once been lifted.",
     "That's why nothing you've tried has moved it."],
  l:"Let me look closer at how far back that lock goes…"},
 moon:{ kind:'UNSEEN',
  b:["You turned the Moon, dear. Look — there's a small dark window near the top of each tower.",
     "You asked if something's blocking you. This card's about what's not looked at."],
  c:["So there is, dear. Something's there, and it isn't in you.",
     "But look where the road starts. It comes up out of that pool.",
     "And yours is down there too, dear. Not deep — just never seen.",
     "That's why they get close and then stop."],
  l:"Let me look closer at what's under that water…"},
 hangedman:{ kind:'HELD',
  b:["You turned the Hanged Man, dear. Look — the rope is the only thing on him that's tied.",
     "You asked if something's blocking you. This card's about being held."],
  c:["So something's there, dear. And you didn't put it on.",
     "But look how small it is. One rope, and the rest of him's loose.",
     "And that's yours, dear. One tie, and it's older than you.",
     "That's why the search kept going, dear. You wanted something bigger."],
  l:"Let me look closer at the wood that rope goes into…"},
}
