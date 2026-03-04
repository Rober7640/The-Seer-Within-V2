import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface UsageDataPoint {
  month: string;
  sessions?: number;
  minutesUsed?: number;
  totalMinutes?: number;
  totalSpent?: number;
}

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

interface UsageChartProps {
  usageData: UsageDataPoint[];
  creditData: UsageDataPoint[];
}

export function UsageChart({ usageData, creditData }: UsageChartProps) {
  const formattedUsage = usageData.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  const formattedCredits = creditData.map((d) => ({
    ...d,
    label: formatMonth(d.month),
    spentDollars: (d.totalSpent ?? 0) / 100,
  }));

  const hasUsageData = formattedUsage.length > 0;
  const hasCreditData = formattedCredits.length > 0;

  if (!hasUsageData && !hasCreditData) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No usage data yet. Start a reading session to see your stats here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasUsageData && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">
            Minutes Used Per Month
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedUsage}>
                <defs>
                  <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} min`, "Used"]}
                />
                <Area
                  type="monotone"
                  dataKey="minutesUsed"
                  stroke="#9333ea"
                  strokeWidth={2}
                  fill="url(#usageGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasCreditData && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">
            Credits Purchased Per Month
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedCredits}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "totalMinutes") return [`${value} min`, "Purchased"];
                    if (name === "spentDollars") return [`$${value}`, "Spent"];
                    return [value, name];
                  }}
                />
                <Bar dataKey="totalMinutes" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
