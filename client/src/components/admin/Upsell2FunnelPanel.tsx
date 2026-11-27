/**
 * Upsell 2 — the extra block on /admin/experiments for an `upsell2_funnel` test (the /fb
 * Upsell 2 copy test, `v1_fb_u2_copy_2026`, first).
 *
 * The generic table above it already shows exposures → buyers → revenue → revenue per
 * exposure per arm, pooled over both paths. This splits the same numbers by price ($47 vs
 * the $30 downsell) and by the path she opened on (A bought Upsell 1, B declined it), per
 * arm. Read the paths as slices: the pooled table decides the test.
 */

export interface Upsell2ArmDetail {
  variant: string;
  path: 'all' | 'A' | 'B';
  exposures: number;
  buyers: number;
  fullBuyers: number;
  downsellBuyers: number;
  revenueUsd: number;
  revPerExposureUsd: number;
  conversionPct: number;
}

const money = (n: number) => `$${n.toFixed(2)}`;

const PATH_LABEL: Record<Upsell2ArmDetail['path'], string> = {
  all: 'Both paths',
  A: 'Path A (bought Upsell 1)',
  B: 'Path B (declined Upsell 1)',
};

export function Upsell2FunnelPanel({ detail }: { detail?: Upsell2ArmDetail[] }) {
  if (!detail?.length) return null;
  return (
    <div className="space-y-2 border-t border-gray-800 pt-3" data-testid="upsell2-funnel-panel">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold text-gray-200">Upsell 2 by price and path</span>
        <span className="text-xs text-gray-500">
          per arm; revenue counts a $30 downsell at $30
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-left text-gray-400">
            <th className="py-2 pr-4">Arm</th>
            <th className="py-2 pr-4">Path</th>
            <th className="py-2 pr-4">Reached U2</th>
            <th className="py-2 pr-4">Bought</th>
            <th className="py-2 pr-4">Take rate</th>
            <th className="py-2 pr-4">At $47</th>
            <th className="py-2 pr-4">At $30</th>
            <th className="py-2 pr-4">Revenue</th>
            <th className="py-2 pr-4">$ / exposure</th>
          </tr>
        </thead>
        <tbody>
          {detail.map((d) => (
            <tr
              key={`u2-${d.variant}-${d.path}`}
              className={d.path === 'all' ? 'border-b border-gray-800/50 font-semibold' : 'border-b border-gray-800/50 text-gray-300'}
            >
              <td className="py-2 pr-4">{d.path === 'all' ? d.variant : ''}</td>
              <td className="py-2 pr-4 text-xs">{PATH_LABEL[d.path]}</td>
              <td className="py-2 pr-4">{d.exposures}</td>
              <td className="py-2 pr-4">{d.buyers}</td>
              <td className="py-2 pr-4">{d.exposures ? `${d.conversionPct.toFixed(1)}%` : 'n/a'}</td>
              <td className="py-2 pr-4">{d.fullBuyers}</td>
              <td className="py-2 pr-4">{d.downsellBuyers}</td>
              <td className="py-2 pr-4">{money(d.revenueUsd)}</td>
              <td className="py-2 pr-4 text-emerald-300">{money(d.revPerExposureUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
