import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StatCard({
  label,
  value,
  unit,
  trend,         // number (% change) | null (no prev data) | undefined (hide trend)
  icon: Icon,
  loading = false,
  className,
}) {
  if (loading) {
    return (
      <div className={cn('card p-5 animate-pulse', className)}>
        <div className="h-3.5 w-28 rounded bg-gray-200" />
        <div className="mt-3 h-9 w-24 rounded bg-gray-200" />
        <div className="mt-2 h-3 w-20 rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
            <Icon className="h-5 w-5 text-brand-500" />
          </div>
        )}
      </div>

      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
        {value ?? '—'}
        {unit && (
          <span className="ml-1 text-base font-medium text-gray-400">{unit}</span>
        )}
      </p>

      {typeof trend === 'number' && trend !== 0 && (
        <p
          className={cn(
            'mt-1.5 flex items-center gap-1 text-xs font-medium',
            trend > 0 ? 'text-green-600' : 'text-red-500'
          )}
        >
          {trend > 0 ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs last period
        </p>
      )}

      {trend === null && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
          <Minus className="h-3.5 w-3.5" />
          No previous data
        </p>
      )}
    </div>
  );
}
