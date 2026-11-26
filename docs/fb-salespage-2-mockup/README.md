# Salespage 2 mockup (source)

The candle letter: her name, then Evelyn's letter, then the ticks and the button. These are the source files of the build boards on the shared canvas https://claude.ai/artifact/9D1ghRbagUJarSy4JmE21H (anyone with the link can open it). Old drafts (C2, D, the A and B ideas, image looks, working notes) are parked further down that canvas. Don't build them.

| File | Screen |
|---|---|
| `C1-Name.dc.html` | 1. Her name. "Send to Evelyn" opens the letter with her first name in it |
| `C2b-Reorg.dc.html` | 2. The candle letter. Tapping A, B or C shows one line answering her pick. It ends on one button, "Yes, begin my clearing" |
| `C3-Ready.dc.html` | 3. Opens in place under the letter when she taps Yes: the chat's three ticks (CommitmentGateCard.tsx), "Tick all three to continue", then, once all three are ticked, the optional "twice as deep" box (+$12.77) and "Begin my Energy Clearing · $35" ($47.77 with the box). Then Stripe, which takes her email |
| `canvas.json` | the board layout and the four developer notes (what to build, the close, the bump, open items) |

"Jules" is a sample name.

## Pictures

Made with Codex (image_gen), 1536×1024. Each comes as the full-size PNG and a web-size JPG (1170 px wide, about 100–190 KB). The mockup files point at the JPGs.

| File | Where it goes on C2b |
|---|---|
| `images/candles-door-window-low` | the three-way guess (A door, B window, C floor): one candle, three panels, charcoal look |
| `images/window-candle` | the Christmas Eve candle in the cottage window, in the rain |
| `images/afternoon-stairs` | the small afternoon: the little girl on the stairs watching the front door |
| `images/cord` | the black cord cut in two, both ends sealed. ⚠ The wax is red; whether it should be black is still open |

Evelyn's photo (C1) is already in the repo: `uploads/avatars/hi-def/evelyn.png`.

The build spec for both pages is `../dev-brief-2026-11-25-fb-entry-pages.md`.
