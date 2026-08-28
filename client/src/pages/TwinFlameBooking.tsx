import { lazy, Suspense, useEffect, useState } from 'react';
import { getBackendVisitorId } from '@/lib/backendVisitor';

// The LIVE booking entry for offer 02 — the URL the letter's {{BOOKING_URL}} points
// at. It asks the server which treatment this visitor is in (page vs chat, the
// be_02_booking_treatment_2026 A/B) and renders that one. The two /preview-* routes
// stay as-is for QA; this is the only place the split is decided.
//
// The assignment call never blocks the sale: any error, or the test simply being
// off, resolves to the page. We wait for the answer before rendering so she never
// sees one treatment flash and swap to the other.

const TwinFlameBookingPage = lazy(() => import('@/pages/TwinFlameBookingPage'));
const TwinFlameBookingChat = lazy(() => import('@/pages/TwinFlameBookingChat'));

type Treatment = 'page' | 'chat';

export default function TwinFlameBooking() {
  const [treatment, setTreatment] = useState<Treatment | null>(null);

  useEffect(() => {
    let live = true;
    const subject = getBackendVisitorId();
    fetch(`/api/backend/booking-treatment?subject=${encodeURIComponent(subject)}`)
      .then((r) => r.json())
      .then((d) => {
        if (live) setTreatment(d?.treatment === 'chat' ? 'chat' : 'page');
      })
      .catch(() => {
        if (live) setTreatment('page'); // never block the booking on the assignment
      });
    return () => {
      live = false;
    };
  }, []);

  if (treatment === null) return null; // brief: one API round-trip, then the real screen

  const Screen = treatment === 'chat' ? TwinFlameBookingChat : TwinFlameBookingPage;
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}
