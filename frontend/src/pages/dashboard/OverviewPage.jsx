import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  MessageSquare,
  ThumbsUp,
  Zap,
  DollarSign,
  ThumbsDown,
} from 'lucide-react';
import { useOverview, useDailyChats, useRecentFeedback } from '@/hooks/useDashboard';
import { useAuth } from '@/hooks/useAuth';
import StatCard from '@/components/ui/StatCard';
import Alert from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

const PERIODS = [
  { key: '7d',  label: '7d',  days: 7  },
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
];

function getDateParams(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  };
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function OverviewPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('30d');

  const params = useMemo(
    () => getDateParams(PERIODS.find((p) => p.key === period).days),
    [period]
  );

  const overview  = useOverview(params);
  const dailyChats = useDailyChats(params);
  const feedback  = useRecentFeedback(5);

  const stats = overview.data;
  const chartData = dailyChats.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Here&apos;s what&apos;s happening with your widget.
          </p>
        </div>

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
      </div>

      {/* Error state */}
      {overview.isError && (
        <Alert
          type="error"
          message="Could not load analytics. Make sure your account is set up correctly."
        />
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Chats"
          value={stats?.totalChats?.toLocaleString()}
          icon={MessageSquare}
          trend={stats?.trends?.chats}
          loading={overview.isLoading}
        />
        <StatCard
          label="Satisfaction Rate"
          value={stats?.satisfactionRate != null ? `${stats.satisfactionRate}` : '—'}
          unit="%"
          icon={ThumbsUp}
          trend={stats?.trends?.satisfaction}
          loading={overview.isLoading}
        />
        <StatCard
          label="Answered from Context"
          value={
            stats?.answeredFromContextRate != null
              ? `${stats.answeredFromContextRate}`
              : '—'
          }
          unit="%"
          icon={Zap}
          trend={stats?.trends?.contextRate}
          loading={overview.isLoading}
        />
        <StatCard
          label="Estimated Cost"
          value={
            stats?.estimatedCostUsd != null
              ? `$${stats.estimatedCostUsd.toFixed(2)}`
              : '—'
          }
          icon={DollarSign}
          loading={overview.isLoading}
        />
      </div>

      {/* Chart + Feedback row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily chats chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700">Chats over time</h3>

          {dailyChats.isLoading ? (
            <div className="mt-4 h-48 animate-pulse rounded-lg bg-gray-100" />
          ) : chartData.length === 0 ? (
            <div className="mt-4 flex h-48 items-center justify-center text-sm text-gray-400">
              No chat data for this period
            </div>
          ) : (
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chatGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    labelFormatter={formatDate}
                    formatter={(v) => [v, 'Chats']}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalChats"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#chatGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#0ea5e9' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent feedback */}
        <div className="card p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-700">Recent feedback</h3>

          {feedback.isLoading ? (
            <div className="mt-3 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-7 w-7 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-full rounded bg-gray-200" />
                    <div className="h-3 w-2/3 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : !feedback.data?.length ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              No feedback yet
            </div>
          ) : (
            <ul className="mt-3 flex-1 space-y-3 overflow-y-auto">
              {feedback.data.map((item) => (
                <li key={item._id} className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      item.rating === 'thumbs_up'
                        ? 'bg-green-50 text-green-500'
                        : 'bg-red-50 text-red-500'
                    )}
                  >
                    {item.rating === 'thumbs_up' ? (
                      <ThumbsUp className="h-3.5 w-3.5" />
                    ) : (
                      <ThumbsDown className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-700">
                      {item.comment || (item.rating === 'thumbs_up' ? 'Helpful' : 'Not helpful')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: 'Upload Documents',
            desc: 'Add PDFs and docs to train your widget',
            href: '/dashboard/documents',
            color: 'bg-violet-50 text-violet-600',
          },
          {
            title: 'View Analytics',
            desc: 'Dig into satisfaction and token usage',
            href: '/dashboard/analytics',
            color: 'bg-amber-50 text-amber-600',
          },
          {
            title: 'Embed Widget',
            desc: 'Copy your snippet and go live',
            href: '/dashboard/settings',
            color: 'bg-green-50 text-green-600',
          },
        ].map(({ title, desc, href, color }) => (
          <a
            key={href}
            href={href}
            className="card flex items-start gap-3 p-4 hover:shadow-md transition-shadow group"
          >
            <div className={cn('mt-0.5 h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold', color)}>
              →
            </div>
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                {title}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
