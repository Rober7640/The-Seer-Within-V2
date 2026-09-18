// 08 Marcus — asset id -> URL resolver.
//
// The local dev harness (improve-v1/v1-one-time-BEs/local/08-marcus/server.ts,
// the `LOCAL_ASSETS` map) serves ids like 'portrait', 'back' and the edition
// faces ('moon', 'two-of-swords', 'three-of-pentacles', …) from plain files that
// exist ONLY inside that harness; `client/shared.js`'s `art(id)` wraps them as
// `/api/assets/:id`. Production must not serve from improve-v1/, so the same
// ids resolve to S3 here.
//
// PRODUCTION ASSET HOST:
//   https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/08/<id>.jpg
// Same bucket + prefix the booking page already used directly for the table
// photograph (`08-hero-<slug>.jpg`) and the signature (`08-signature.jpg`) —
// see local/08-marcus/client/pages/booking.js `BOOKING_S3`. Uploaded with
// improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs (`file` mode); every id
// the booking page renders is a JPEG under that prefix:
//   portrait · back · moon · two-of-swords · three-of-pentacles ·
//   08-signature · 08-hero-<edition slug>
//
// An id that already carries an extension is passed through unchanged.
export const MARCUS_ASSET_BASE = 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/08/'

export function marcusAsset(id: string): string {
  const file = /\.[a-z0-9]{2,4}$/i.test(id) ? id : `${id}.jpg`
  return `${MARCUS_ASSET_BASE}${encodeURIComponent(file)}`
}
