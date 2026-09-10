# Marcus delivery policy — confirmed

- Standard written reading: **24 hours from confirmed main payment**.
- +$12.77 speed bump: **12 hours from confirmed main payment**.
- Audio shares the same order deadline: 24 hours standard, 12 hours with the bump.
- These are elapsed-hour durations. No calendar-day cutoff or timezone rule is needed.

Calculate and store `due_at = paid_at + (bump_purchased ? 12 : 24) hours` once. Use UTC timestamps internally. Customer copy should say “within 24 hours” or “within 12 hours”; replace the ambiguous “same-day” label with “12-hour delivery” wherever practical.

Generate and check artifacts promptly. Deliver as soon as each is ready, by its deadline. The deadline is not an instruction to deliberately hold completed work for the whole 12/24 hours. Written delivery never waits for audio.

The normal upsell occurs immediately after main purchase, so audio inherits this deadline. **Late audio purchase edge case:** if the inherited deadline has already passed or cannot be met, do not silently reset it or promise impossible delivery. The live upsell eligibility check must require an explicit reviewed late-purchase rule. Until that is defined, block a new late sale and retain previously paid overdue work for urgent recovery. This does not change existing paid entitlements.

A retry never moves the deadline. Missing `paid_at` or missing trusted bump status is an order-data failure, not permission to guess. Overdue or failed audio must not suppress the written delivery.
