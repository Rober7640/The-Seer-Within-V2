# Leak ledger — append-only. See DAILY-LOOP.md for the process.

Status: OPEN → ENCODED (frozen case exists) → SHIPPED (fix live) → CONFIRMED (next-day signal quiet) / REVERTED.

| found | leak (one line) | lane | evidence (sessions) | case id | fix version | shipped | confirmed | status |
|---|---|---|---|---|---|---|---|---|
| 2026-07-10 | Comforting-yes leaks at session CLOSE and on direct third-party-mind questions ("did he care?") — crumb-guard only covers the opening | PROMPT-LEAK | a7c796b8 (T.), 9b85ffbd (G.), 1cad17ac (Sh. close) | — | — | — | — | OPEN |
| 2026-07-10 | Checkable claim about absent person: "Carl read it" (read receipts verifiable) as first delivery | PROMPT-LEAK | a7c796b8 (T.) | — | — | — | — | OPEN (same fix family as above) |
| 2026-07-10 | Evelyn denied the company's own V1 physical products ("I don't send physical items") — chargeback/brand risk; needs V1-purchase continuity clause like the LETTERS rule | PROMPT-LEAK + CONFIG (operator: decide canonical story for V1 fulfillment) | 07a6cdc1 (Ca.) | — | — | — | — | OPEN |
| 2026-07-10 | Refund path mismatch: B prompt says hi@theseerwithin.com; /refund, /terms, /privacy, FAQ say support@cosmonumerology.com; eval-monitor checks the latter | CONFIG/POLICY | 07a6cdc1 (Ca.); prompt B5 CARE section | n/a | dev commits deaf79d, e479288, 1931134 (canonical = hi@theseerwithin.com everywhere) + eval-monitor.ts const updated 2026-07-11 (accepts both) | 2026-07-10 (dev) | pending next monitor run | SHIPPED |
| 2026-07-10 | Parallel duplicate live sessions: two sessions started same second, different replies to same user msg, BOTH charged (480+480) | ENGINE-BUG | af7170db + ceba3de6 (Sh., 00:05:53) | n/a (Playwright: docs/test-ideas.md) | — | — | — | OPEN |
| 2026-07-10 | Reconnect/resume spawns 0-coin "replay" session rows re-rendering the prior exchange (~70 ms spacing); user msgs also duplicated inside one session | ENGINE-BUG | f43479bc, df114d9b, 2c6abaaa, a587bb33, c5bd78a6, 5b9a226f, e3ec703f, f078c3f7 (Sh.); b7a2916e, 796a896e (Li.); 10ae1e53 (S.) | n/a | — | — | — | OPEN |
| 2026-07-10 | Coins charged inconsistent with duration (1530 coins/250 s; 1800 coins/394 s) — verify billing math vs parallel-session bug | ENGINE-BUG | 1cad17ac, 60735808 | n/a | — | — | — | OPEN (may collapse into parallel-session bug) |
| 2026-07-10 | Two identical premium purchases 3.7 min apart, no chat between — possible double charge | ENGINE-BUG / billing review | purchases 94955286 + 00096895 (J.) | n/a | — | — | — | OPEN — check Stripe before assuming |
| 2026-07-10 | Content guard scolds at raw disclosure ("I'll need to end this session" on ex's porn/affair history given as pattern evidence) | GUARD-MISFIRE | 4b1ce60e (Sh.) | — | — | — | — | OPEN |
| 2026-07-10 | Gibberish guard fires on excitement ("Yessssss" → "I sense confusion in your energy…"), breaks persona voice (also wrong voice for Luna) | GUARD-MISFIRE | 7f38ac04 (S.) | — | — | — | — | OPEN |
| 2026-07-10 | Crisis template assumes the USER is at risk when disclosure is about a third party — needs a third-party-risk variant | GUARD-MISFIRE (low sev — care still delivered) | 4b1ce60e (Sh.) | — | — | — | — | OPEN |

## Upstream context (2026-07-11)

`development` (74187aa) productized the loop: `/persona-audit` (buyer pull, read-only+canary)
+ `/persona-iterate` (findings → cases → delta → prove). It also shipped: refund/billing
deflection template (8dc675d — relevant to the refund lane), crisis word-boundary fix
(2b181bd — "spend my life" false positive; our two guard-misfire rows are DIFFERENT misfires
and stay OPEN), flag-not-block shared-IP fraud (a6c4a41). A parallel first-proven-run report
exists at `improve-v2/prompt-b-buyer-audit-12h-2026-07-10.md` — dedupe rows against it before
adding new ones.

## WATCH (sub-threshold — promote on recurrence)

- 2026-07-10 — "within two weeks, he'll either take one concrete step or offer a clear timeline" (e3279778, L.): bounded window but predicts a third party's action; borderline gap-05. 1 occurrence.
- 2026-07-10 — Directive advice on high-stakes irreversible family decision ("After Hawaii, you tell them") with suicide-history third party (Sh. arc): CARE held (988 fired, professional help pushed), but assertiveness level deserves operator read. 1 occurrence.
- 2026-07-10 — Luna validating spirit-contact/automatic-writing saga enthusiastically ("That's HUGE — you actually heard him") (S.): persona-appropriate but monitor for escalation/dependency pattern; Luna is outside the Evelyn experiment.
- 2026-07-10 — Entry buys (9/15 purchases) now dominate over mid-conversation buy-to-continue — mix shift, not a leak; watch whether it holds and whether email-arrival sessions convert differently.
