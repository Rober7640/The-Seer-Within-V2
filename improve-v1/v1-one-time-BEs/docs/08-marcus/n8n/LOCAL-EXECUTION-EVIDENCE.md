# 08 Marcus - adaptive local n8n execution evidence

Date: 2026-09-10. Scope: isolated local fixture only.

## Result

An ephemeral Docker n8n instance imported a test copy of the 47-node inactive Marcus workflow and
completed one main-reading execution successfully. The last node was `Waiting or complete - no new
work`; n8n reported `status: success` and `finished: true`.

The saved fixture represented a future edition shape rather than one of the current six-card
emails:

- question: `What needs my attention as I decide what comes next?`;
- theme: `Moving from uncertainty toward a grounded choice`;
- spread: `The Eight Paths`;
- eight ordered positions;
- four fixed face-up cards from the edition;
- four face-down cards drawn once for this test order;
- a separate name-derived personal card.

n8n ran the order through event reconciliation, main-job claim, deadline calculation, adaptive
brief construction, structural report writing, grading, PDF rendering, written-delivery queuing,
the no-audio branch, and a clean end. The returned brief contained `freePositions.length === 4`,
`paidPositions.length === 4`, the edition theme, all eight saved position/card pairs, and the rule
that no report stage may assume six cards.

## PDF evidence

The n8n execution produced `written:n8n-eight-20260910-v2` with SHA-256:

`7a3088510728b33ee3d83a1d7ab1bc0072a11b27d1ceb5eafd164c4a6891121b`

The retained review copy is `output/pdf/marcus-n8n-adaptive-eight-card-test.pdf` at the repository
root. Automated PDF inspection confirmed three A4 pages, all eight card names, the 4/4 split, all
four paid position headings, the theme, and the local-only notice. All three rendered pages were
visually inspected for clipping, overlap, hidden table headings, and awkward page breaks.

## Isolation and limits

The canonical workflow stayed inactive with its configuration guard disabled. For the single CLI
execution, a temporary copy supplied the fixture event, local backend URL, and local fixture header;
it bypassed the webhook response node because the run began from the manual trigger. A temporary
Docker-to-host bridge forwarded only to the loopback fixture server and was stopped afterward. The
n8n container was ephemeral. No existing or cloud workflow was edited, activated, or executed.

The report sections deliberately contain labeled structural sample prose. This run proves n8n
routing, variable spread handling, theme continuity, saved-card parity, PDF rendering, and delivery
task creation. It does not prove production-quality tarot writing, Supabase/Stripe integration,
private storage, customer email, or audio generation.
