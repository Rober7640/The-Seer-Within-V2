/**
 * Stripe vs Payments.AI — the extra blocks on /admin/experiments for the
 * `v1_gateway_split_2026` test (conversion type `gateway_split`).
 *
 * The generic table above it already shows checkouts → buyers → revenue per arm.
 * These two answer what that table cannot:
 *   1. Where the money came from, stage by stage, and which processor each arm's
 *      buyers actually paid on (a Payments.AI-arm buyer whose browser could not load
 *      the card form is sent to Stripe and still counted in her arm).
 *   2. Approval rate per processor and step — the question the split exists for.
 */

export interface GatewayArmDetail {
  variant: string;
  checkouts: number;
  buyers: number;
  paidOnStripe: number;
  paidOnPaymentsai: number;
  mainRevenueUsd: number;
  bumpRevenueUsd: number;
  upsell1Buyers: number;
  upsell1RevenueUsd: number;
  upsell2Buyers: number;
  upsell2RevenueUsd: number;
  totalRevenueUsd: number;
  revPerCheckoutUsd: number;
}

export interface GatewayAttemptRow {
  variant: string;
  gateway: string;
  step: string;
  initiator: string;
  attempts: number;
  approved: number;
  declined: number;
  needsAction: number;
  errors: number;
  approvalPct: number;
}

const money = (n: number) => `$${n.toFixed(2)}`;

const STEP_LABEL: Record<string, string> = {
  main: 'Main offer (+ bump)',
  upsell1: 'Upsell 1',
  upsell2: 'Upsell 2',
};

const INITIATOR_LABEL: Record<string, string> = {
  mit: '1-click (saved card)',
  cit: 'card entered',
};

export function GatewaySplitPanel({
  detail,
  attempts,
}: {
  detail?: GatewayArmDetail[];
  attempts?: GatewayAttemptRow[];
}) {
  if (!detail?.length && !attempts?.length) return null;
  return (
    <div className="space-y-4 border-t border-gray-800 pt-3" data-testid="gateway-split-panel">
      {detail && detail.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-gray-200">Revenue by stage</span>
            <span className="text-xs text-gray-500">
              everything each arm earned, per checkout started
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-gray-400">
                <th className="py-2 pr-4">Arm</th>
                <th className="py-2 pr-4">Checkouts</th>
                <th className="py-2 pr-4">Buyers</th>
                <th className="py-2 pr-4">Main</th>
                <th className="py-2 pr-4">Bump</th>
                <th className="py-2 pr-4">Upsell 1</th>
                <th className="py-2 pr-4">Upsell 2</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">$ / checkout</th>
                <th className="py-2 pr-4">Paid on</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((d) => (
                <tr key={`gw-${d.variant}`} className="border-b border-gray-800/50">
                  <td className="py-2 pr-4 font-semibold">{d.variant}</td>
                  <td className="py-2 pr-4">{d.checkouts}</td>
                  <td className="py-2 pr-4">{d.buyers}</td>
                  <td className="py-2 pr-4">{money(d.mainRevenueUsd)}</td>
                  <td className="py-2 pr-4">{money(d.bumpRevenueUsd)}</td>
                  <td className="py-2 pr-4">
                    {money(d.upsell1RevenueUsd)}
                    <span className="ml-1 text-xs text-gray-500">({d.upsell1Buyers})</span>
                  </td>
                  <td className="py-2 pr-4">
                    {money(d.upsell2RevenueUsd)}
                    <span className="ml-1 text-xs text-gray-500">({d.upsell2Buyers})</span>
                  </td>
                  <td className="py-2 pr-4 font-semibold">{money(d.totalRevenueUsd)}</td>
                  <td className="py-2 pr-4 font-semibold text-emerald-300">{money(d.revPerCheckoutUsd)}</td>
                  <td className="py-2 pr-4 text-xs text-gray-400">
                    Stripe {d.paidOnStripe} · Payments.AI {d.paidOnPaymentsai}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {attempts && attempts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-gray-200">Approval rate</span>
            <span className="text-xs text-gray-500">
              every charge attempt on this test's orders, approved or not
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-gray-400">
                <th className="py-2 pr-4">Step</th>
                <th className="py-2 pr-4">Processor</th>
                <th className="py-2 pr-4">How</th>
                <th className="py-2 pr-4">Arm</th>
                <th className="py-2 pr-4">Attempts</th>
                <th className="py-2 pr-4">Approved</th>
                <th className="py-2 pr-4">Declined</th>
                <th className="py-2 pr-4">Needed 3DS</th>
                <th className="py-2 pr-4" title="Refused before any bank decided — not counted in Approval %">Errors</th>
                <th className="py-2 pr-4">Approval %</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr
                  key={`att-${a.variant}-${a.gateway}-${a.step}-${a.initiator}`}
                  className="border-b border-gray-800/50"
                >
                  <td className="py-2 pr-4">{STEP_LABEL[a.step] ?? a.step}</td>
                  <td className="py-2 pr-4 font-semibold">
                    {a.gateway === 'paymentsai' ? 'Payments.AI' : 'Stripe'}
                  </td>
                  <td className="py-2 pr-4 text-gray-400">{INITIATOR_LABEL[a.initiator] ?? a.initiator}</td>
                  <td className="py-2 pr-4 text-gray-400">{a.variant}</td>
                  <td className="py-2 pr-4">{a.attempts}</td>
                  <td className="py-2 pr-4">{a.approved}</td>
                  <td className="py-2 pr-4">{a.declined}</td>
                  <td className="py-2 pr-4">{a.needsAction}</td>
                  <td className="py-2 pr-4 text-gray-500">{a.errors}</td>
                  <td className="py-2 pr-4 font-semibold text-emerald-300">{a.approvalPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500">
            Approval % = approved ÷ everything a bank decided; "Errors" (refused before any bank
            saw it) are shown but not counted. Stripe's main checkout is a hosted page, so its declines happen on Stripe's side and are
            not visible here — compare main-offer conversion in the table above instead. The upsell
            rows compare like with like: both processors charge the saved card in one click.
          </p>
        </div>
      )}
    </div>
  );
}
