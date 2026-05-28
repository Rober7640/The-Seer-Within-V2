import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface VariantStats {
  variant: string;
  mainPriceDollars: number;
  downsellPriceDollars: number;
  upsell1PriceDollars: number;
  funnel: string | null;
  visitorsAssigned: number;
  mainPurchases: number;
  downsellPurchases: number;
  totalPurchases: number;
  mainConversionPct: number;
  downsellConversionPct: number;
  overallConversionPct: number;
  totalRevenueCents: number;
  revenuePerVisitorCents: number;
}

interface PairwiseRow {
  a: string;
  b: string;
  revenuePerVisitorACents: number;
  revenuePerVisitorBCents: number;
  confidencePct: number | null;
  significant: boolean;
  note?: string;
}

interface PriceTestResponse {
  summary: {
    leadingVariant: string | null;
    recommendation: string;
    minimumSampleMet: boolean;
    minimumSamplePerVariant: number;
    winnerCalled: boolean;
  };
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
  variants: VariantStats[];
  pairwise: PairwiseRow[];
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PriceTestDashboard() {
  const [data, setData] = useState<PriceTestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date filter state — empty strings mean "no filter" (all-time)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  // Funnel scope — "" = all variants, "v1-fb" = FB price test only.
  const [funnelFilter, setFunnelFilter] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (appliedRange.start) params.set("startDate", appliedRange.start);
        if (appliedRange.end) params.set("endDate", appliedRange.end);
        if (funnelFilter) params.set("funnel", funnelFilter);
        const qs = params.toString();
        const res = await adminFetch(
          `/api/admin/price-test/v1${qs ? `?${qs}` : ""}`,
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as PriceTestResponse;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appliedRange, funnelFilter]);

  const applyDates = () => {
    setError(null);
    setAppliedRange({ start: startDate, end: endDate });
  };

  const clearDates = () => {
    setStartDate("");
    setEndDate("");
    setError(null);
    setAppliedRange({ start: "", end: "" });
  };

  return (
    <AdminLayout title="V1 Price Split Test">
      <div className="space-y-6">
        {/* Date filter */}
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-4">
            <div className="flex flex-col">
              <label className="mb-1 text-xs text-gray-400">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs text-gray-400">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              onClick={applyDates}
              className="rounded bg-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-500"
            >
              Apply
            </button>
            <button
              onClick={clearDates}
              className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              All time
            </button>
            <div className="flex flex-col">
              <label className="mb-1 text-xs text-gray-400">Funnel</label>
              <select
                value={funnelFilter}
                onChange={(e) => setFunnelFilter(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              >
                <option value="">All funnels</option>
                <option value="v1-fb">FB (v1-fb)</option>
              </select>
            </div>
            <div className="ml-auto text-xs text-gray-500">
              {appliedRange.start || appliedRange.end
                ? `Showing ${appliedRange.start || "earliest"} → ${appliedRange.end || "today"}`
                : "Showing all time"}
            </div>
          </CardContent>
        </Card>

        {loading && <div className="text-gray-400">Loading…</div>}
        {error && (
          <div className="rounded border border-red-700 bg-red-950/30 p-4 text-red-200">
            Error loading data: {error}
          </div>
        )}

        {data && (
          <>
            {/* Recommendation banner */}
            <Card className={data.summary.winnerCalled ? "border-emerald-600" : ""}>
              <CardHeader className="flex flex-row items-center gap-3">
                {data.summary.winnerCalled ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : data.summary.minimumSampleMet ? (
                  <TrendingUp className="h-6 w-6 text-amber-400" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-yellow-400" />
                )}
                <CardTitle>{data.summary.recommendation}</CardTitle>
              </CardHeader>
            </Card>

            {/* Variants table */}
            <Card>
              <CardHeader>
                <CardTitle>Per-variant performance</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-gray-400">
                      <th className="py-2 pr-4">Variant</th>
                      <th className="py-2 pr-4">Funnel</th>
                      <th className="py-2 pr-4">Main</th>
                      <th className="py-2 pr-4">Downsell</th>
                      <th className="py-2 pr-4">Upsell 1</th>
                      <th className="py-2 pr-4">Visitors</th>
                      <th className="py-2 pr-4">Main buys</th>
                      <th className="py-2 pr-4">Downsell buys</th>
                      <th className="py-2 pr-4">Main CR</th>
                      <th className="py-2 pr-4">Overall CR</th>
                      <th className="py-2 pr-4">Revenue</th>
                      <th className="py-2 pr-4">$ / visitor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.variants.map((v) => {
                      const isLeader = v.variant === data.summary.leadingVariant;
                      return (
                        <tr
                          key={v.variant}
                          className={`border-b border-gray-800 ${isLeader ? "bg-emerald-950/30" : ""}`}
                        >
                          <td className="py-2 pr-4 font-semibold">
                            {v.variant}
                            {isLeader && (
                              <Badge className="ml-2 bg-emerald-600">Leader</Badge>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-gray-400">{v.funnel ?? "—"}</td>
                          <td className="py-2 pr-4">${v.mainPriceDollars}</td>
                          <td className="py-2 pr-4">${v.downsellPriceDollars}</td>
                          <td className="py-2 pr-4">${v.upsell1PriceDollars}</td>
                          <td className="py-2 pr-4">{v.visitorsAssigned}</td>
                          <td className="py-2 pr-4">{v.mainPurchases}</td>
                          <td className="py-2 pr-4">{v.downsellPurchases}</td>
                          <td className="py-2 pr-4">{v.mainConversionPct}%</td>
                          <td className="py-2 pr-4">{v.overallConversionPct}%</td>
                          <td className="py-2 pr-4">{dollars(v.totalRevenueCents)}</td>
                          <td className="py-2 pr-4 font-bold">
                            {dollars(v.revenuePerVisitorCents)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Pairwise significance */}
            <Card>
              <CardHeader>
                <CardTitle>Pairwise significance (z-test on $ / visitor)</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-gray-400">
                      <th className="py-2 pr-4">Higher</th>
                      <th className="py-2 pr-4">vs</th>
                      <th className="py-2 pr-4">$ / v (higher)</th>
                      <th className="py-2 pr-4">$ / v (lower)</th>
                      <th className="py-2 pr-4">Confidence</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pairwise.map((p, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 pr-4 font-semibold">{p.a}</td>
                        <td className="py-2 pr-4">{p.b}</td>
                        <td className="py-2 pr-4">{dollars(p.revenuePerVisitorACents)}</td>
                        <td className="py-2 pr-4">{dollars(p.revenuePerVisitorBCents)}</td>
                        <td className="py-2 pr-4">
                          {p.confidencePct === null ? "—" : `${p.confidencePct}%`}
                        </td>
                        <td className="py-2 pr-4">
                          {p.note ? (
                            <span className="text-gray-400">{p.note}</span>
                          ) : p.significant ? (
                            <Badge className="bg-emerald-600">Winner ≥95%</Badge>
                          ) : (
                            <span className="text-amber-300">Keep running</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="text-xs text-gray-500">
              To end the test: edit <code>system_config.v1_price_variants</code> — set the
              winning variant&apos;s weight to 1 and the others to 0. New visitors get the
              winning price on their next page load. No deploy needed.
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
