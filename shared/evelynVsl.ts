export const EVELYN_VSL_ASSET_BASE =
  'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/vsl/v1';
export const DELIVERY_PROMISE = 'by email within 24 hours';

export const STONES = [
  { key: 'rose-quartz', label: 'Rose Quartz' },
  { key: 'jade', label: 'Jade' },
  { key: 'garnet', label: 'Garnet' },
] as const;
export type StoneKey = (typeof STONES)[number]['key'];

export function isStone(x: unknown): x is StoneKey {
  return typeof x === 'string' && STONES.some(s => s.key === x);
}
export function stoneLabel(key: unknown): string {
  const s = STONES.find(s => s.key === key);
  return s ? s.label : 'your stone';
}

export const WELCOME_STONES_LIVE_AT = 48.6; // seconds — "these three stones have been waiting for you"
export const PITCH_CTA_AT = 368.2;          // seconds — she says "$19"; CTA slides in

// Fractions of the 9:16 video box, measured from scene_03-tap-zones-source.jpg (spec §3).
export const TAP_ZONES: Record<StoneKey, { x0: number; x1: number; y0: number; y1: number }> = {
  'rose-quartz': { x0: 0.043, x1: 0.333, y0: 0.76, y1: 0.925 },
  jade:          { x0: 0.374, x1: 0.637, y0: 0.76, y1: 0.925 },
  garnet:        { x0: 0.689, x1: 0.972, y0: 0.76, y1: 0.925 },
};

export const VIDEO = {
  welcome: {
    src: `${EVELYN_VSL_ASSET_BASE}/evelyn-welcome-v2-720p.mp4`,
    poster: `${EVELYN_VSL_ASSET_BASE}/evelyn-welcome-v2-720p-poster.jpg`,
  },
  pitch: {
    src: `${EVELYN_VSL_ASSET_BASE}/evelyn-pitch-v2-720p.mp4`,
    poster: `${EVELYN_VSL_ASSET_BASE}/evelyn-pitch-v2-720p-poster.jpg`,
  },
} as const;
