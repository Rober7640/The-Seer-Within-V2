import { useCallback, useEffect, useState } from 'react'

// When may the pay-what-you-want floor speak?
//
// ⛔ NEVER MID-TYPING *(operator, 2026-08-09)*. A woman typing "17" is under the
// floor for as long as it takes her to reach the 7, and telling her so at that
// moment is both wrong and insulting — she is being corrected before she has
// finished her sentence. The same is true of every amount that starts with a 1.
//
// So it waits for her to be FINISHED, which is one of two things:
//   · she stopped typing and the field has been still for a moment; or
//   · she left the field — tapped away, tabbed on, pressed done.
//
// On a phone the keyboard often stays up and the blur never comes, which is why
// the idle timer exists as well. One of the two always fires.
//
// ⚠ It goes quiet again the instant she types, and the instant the amount is
// good — the floor is a correction, not a label. (The floor is never printed on
// arrival at all; see FLOOR_VIOLATION in lib/judgementBooking.ts.)
//
// Shared by BOTH of 03's treatments deliberately: the page and the chat say the
// same thing at the same moment, and a copy of this logic in each would drift.

const SETTLE_MS = 1400

export function useFloorSpoken(amount: string, amountValid: boolean) {
  const under = amount.trim().length > 0 && !amountValid
  const [spoken, setSpoken] = useState(false)

  useEffect(() => {
    setSpoken(false)
    if (!under) return
    const timer = setTimeout(() => setSpoken(true), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [amount, under])

  // For the blur handler: she has left the field, so she is finished by
  // definition and there is nothing to wait for.
  const speakNow = useCallback(() => {
    if (under) setSpoken(true)
  }, [under])

  return { floorSpoken: under && spoken, speakNow }
}
