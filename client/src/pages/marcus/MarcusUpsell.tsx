// T8 replaces this file with the $17 audio one-click upsell (OffersUpsell1 pattern).
//
// 08 Marcus — PLACEHOLDER for Upsell 1 at /marcus/reading/welcome1. It exists only so the
// post-payment chain has its real shape today: bridge → welcome1 → success. It renders
// nothing and forwards straight to the receipt, carrying the session id as `?s=` (the
// deck's receipt convention). Replace, not push, so Back from the receipt does not land
// on an empty page.
import { useEffect } from 'react'
import { useLocation, useSearch } from 'wouter'
import { sessionIdFromSearch } from './marcusOrder'

const SUCCESS_PATH = '/marcus/reading/success'

export default function MarcusUpsell() {
  const search = useSearch()
  const [, navigate] = useLocation()
  const sessionId = sessionIdFromSearch(search)

  useEffect(() => {
    const target = sessionId ? `${SUCCESS_PATH}?s=${encodeURIComponent(sessionId)}` : SUCCESS_PATH
    navigate(target, { replace: true })
  }, [sessionId, navigate])

  return null
}
