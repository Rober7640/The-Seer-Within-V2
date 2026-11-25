# Salespage 2 mockup (source)

The candle letter: her name, then Evelyn's letter, then the ticks and the button. These are the source files of the build boards on the shared canvas https://claude.ai/artifact/9D1ghRbagUJarSy4JmE21H (anyone with the link can open it). Old drafts (C2, D, the A and B ideas, image looks, working notes) are parked further down that canvas. Don't build them.

| File | Screen |
|---|---|
| `C1-Name.dc.html` | 1. Her name. "Send to Evelyn" opens the letter with her first name in it |
| `C2b-Reorg.dc.html` | 2. The candle letter. Tapping A, B or C shows one line answering her pick. It ends on one button, "Yes, begin my clearing" |
| `C3-Ready.dc.html` | 3. Opens in place under the letter when she taps Yes: the chat's three ticks (CommitmentGateCard.tsx), "Tick all three to continue", then, once all three are ticked, the optional "twice as deep" box (+$12.77) and "Begin my Energy Clearing · $35" ($47.77 with the box). Then Stripe, which takes her email |
| `canvas.json` | the board layout and the four developer notes (what to build, the close, the bump, open items) |

"Jules" is a sample name. The pictures are stored in the canvas (`/_blob/...`), so take them from the shared link.

The build spec for both pages is `../dev-brief-2026-11-25-fb-entry-pages.md`.
