# Arm A tea readings — archived 2026-08-31

The nine `tea` readings written for **arm A**: three cups, one hidden mark in each,
built on **road / bird / heart**. They were reviewed, tested, and passing 18/18 on
the live eval when they were replaced.

They were archived rather than deleted because the operator chose to **overwrite
`tea`** for arm B rather than add a new device. That was a deliberate call with a
known cost — these nine — and nothing here is committed to git, so without this
copy the work would simply have been gone.

## What replaced them

Arm B: one cup, three symbols she names herself, built on **bird / tree / anchor**
and on a real photograph (`../../images/armb/cup.png`). The old marks describe
formations that do not exist in the new cup — a road running to the rim, a heart
low on the handle side — so every one of these bubbles contradicts the picture now.

## To restore

Copy the four `tea-*.json` files back over `improve-v1/fb-read/drafts/`, restore
`TEA` in `shared/readDevices.ts` from git or from the arm-A block, put back the
three-panel strip at `client/public/read/tea-strip.jpg`, and re-run
`node scripts/build-read-copy.mjs`.
