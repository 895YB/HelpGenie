import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import {
  MessageSquare, ThumbsUp, Zap, DollarSign, Clock,
  Download, FileText,
} from 'lucide-react';
import {
  useOverview, useDailyChats, useHourlyDistribution,
  useSatisfactionTrend, useTokenUsage, useDocumentUsage,
  useExportCsv,
} from '@/hooks/useDashboard';
import ChartCard from '@/components/analytics/ChartCard';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────

const PERIODS = [
  { key: '7d',  label: '7d',  days: 7  },
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
];

function getDateParams(days) {
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  };
}

function fmtDate(str) {
  return new Date(str + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

function fmtHour(h) {
  if (h === 0)  return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function fmtTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const CHART_STYLE = {
  fontSize: 11,
  fill: '#94a3b8',
};

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
};

// ── Page ─────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');

  const params = useMemo(
    () => getDateParams(PERIODS.find((p) => p.key === period).days),
    [period]
  );

  const overview      = useOverview(params);
  const dailyChats    = useDailyChats(params);
  const hourly        = useHourlyDistribution(params);
  const satisfaction  = useSatisfactionTrend(params);
  const tokenUsage    = useTokenUsage(params);
  const docUsage      = useDocumentUsage(params);
  const exportCsv     = useExportCsv();

  const s = overview.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Performance metrics for your widget.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  period === key
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Export */}
          <Button
            variant="secondary"
            size="md"
            isLoading={exportCsv.isPending}
            onClick={() => exportCsv.mutate(params)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Chats"
          value={s?.totalChats?.toLocaleString()}
          icon={MessageSquare}
          trend={s?.trends?.chats}
          loading={overview.isLoading}
        />
        <StatCard
          label="Satisfaction"
          value={s?.satisfactionRate != null ? String(s.satisfactionRate) : '—'}
          unit="%"
          icon={ThumbsUp}
          trend={s?.trends?.satisfaction}
          loading={overview.isLoading}
        />
        <StatCard
          label="Context Rate"
          value={s?.answeredFromContextRate != null ? String(s.answeredFromContextRate) : '—'}
          unit="%"
          icon={Zap}
          trend={s?.trends?.contextRate}
          loading={overview.isLoading}
        />
        <StatCard
          label="Avg Response"
          value={s?.avgResponseTimeMs != null ? (s.avgResponseTimeMs / 1000).toFixed(1) : '—'}
          unit="s"
          icon={Clock}
          loading={overview.isLoading}
        />
        <StatCard
          label="Est. Cost"
          value={s?.estimatedCostUsd != null ? `$${s.estimatedCostUsd.toFixed(2)}` : '—'}
          icon={DollarSign}
          loading={overview.isLoading}
        />
      </div>

      {/* ── Daily chats chart ─────────────────────────────── */}
      <ChartCard
        title="Daily chat volume"
        subtitle="Answered from context vs. fallback responses"
        loading={dailyChats.isLoading}
        empty={!dailyChats.data?.length}
        height="h-56"
      >
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dailyChats.data}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradContext" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gradFallback" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={CHART_STYLE}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={CHART_STYLE}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={fmtDate}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Area
                type="monotone"
                dataKey="answeredFromContext"
                name="From context"
                stackId="1"
                stroke="#0ea5e9"
                strokeWidth={1.5}
                fill="url(#gradContext)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="fallbackResponses"
                name="Fallback"
                stackId="1"
                stroke="#f59e0b"
                strokeWidth={1.5}
                fill="url(#gradFallback)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Hourly + Satisfaction row ─────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hourly distribution */}
        <ChartCard
          title="Hourly distribution"
          subtitle="When your customers chat most"
          loading={hourly.isLoading}
          empty={!hourly.data?.length}
          height="h-52"
        >
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourly.data}
                margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                barSize={10}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickFormatter={fmtHour}
                  tick={CHART_STYLE}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  allowDecimals={false}
                  tick={CHART_STYLE}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(h) => `Hour: ${fmtHour(h)}`}
                  formatter={(v) => [v, 'Chats']}
                />
                <Bar
                  dataKey="count"
                  name="Chats"
                  fill="#0ea5e9"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Satisfaction trend */}
        <ChartCard
          title="Satisfaction trend"
          subtitle={
            satisfaction.data?.overall
              ? `Overall ${satisfaction.data.overall.satisfactionRate ?? '—'}% positive`
              : 'Thumbs up vs. thumbs down over time'
          }
          loading={satisfaction.isLoading}
          empty={!satisfaction.data?.daily?.length}
          height="h-52"
        >
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={satisfaction.data?.daily ?? []}
                margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gradDown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={CHART_STYLE}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={CHART_STYLE}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={fmtDate}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area
                  type="monotone"
                  dataKey="thumbsUp"
                  name="👍 Helpful"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  fill="url(#gradUp)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="thumbsDown"
                  name="👎 Not helpful"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  fill="url(#gradDown)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── Token usage ───────────────────────────────────── */}
      <ChartCard
        title="Token usage"
        subtitle={
          tokenUsage.data
            ? `${fmtTokens(tokenUsage.data.totalTokensUsed)} tokens total · estimated $${tokenUsage.data.estimatedCostUsd?.toFixed(4) ?? '—'} USD`
            : 'Prompt and completion tokens per day'
        }
        loading={tokenUsage.isLoading}
        empty={!tokenUsage.data?.daily?.length}
        height="h-52"
      >
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={tokenUsage.data?.daily ?? []}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
              barSize={10}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={CHART_STYLE}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="tokens"
                tickFormatter={fmtTokens}
                tick={CHART_STYLE}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="cost"
                orientation="right"
                tickFormatter={(v) => `$${v.toFixed(3)}`}
                tick={CHART_STYLE}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={fmtDate}
                formatter={(v, name) =>
                  name === 'Cost ($)'
                    ? [`$${v.toFixed(4)}`, name]
                    : [fmtTokens(v), name]
                }
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar
                yAxisId="tokens"
                dataKey="promptTokens"
                name="Prompt tokens"
                stackId="tokens"
                fill="#0ea5e9"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                yAxisId="tokens"
                dataKey="completionTokens"
                name="Completion tokens"
                stackId="tokens"
                fill="#6366f1"
                radius={[3, 3, 0, 0]}
              />
              <Line
                yAxisId="cost"
                type="monotone"
                dataKey="cost"
                name="Cost ($)"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Top documents by usage ────────────────────────── */}
      <ChartCard
        title="Top documents by usage"
        subtitle="Which files your widget references most"
        loading={docUsage.isLoading}
        empty={!docUsage.data?.length}
        height="h-48"
      >
        <div className="space-y-2.5">
          {(docUsage.data ?? []).slice(0, 8).map((doc, i) => {
            const max   = docUsage.data[0]?.usageCount ?? 1;
            const pct   = Math.max(4, Math.round((doc.usageCount / max) * 100));
            return (
              <div key={doc._id ?? i} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-right text-xs font-medium text-gray-400">
                  {i + 1}
                </span>
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <p className="min-w-0 flex-1 truncate text-sm text-gray-700" title={doc.title ?? doc.filename}>
                  {doc.title ?? doc.filename}
                </p>
                <div className="w-32 shrink-0">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="w-10 shrink-0 text-right text-xs font-medium text-gray-500">
                  {doc.usageCount}
                </span>
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}
