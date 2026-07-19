import { cn } from '@/lib/utils';

export default function ChartCard({
  title,
  subtitle,
  action,
  loading = false,
  empty = false,
  emptyText = 'No data for this period',
  height = 'h-52',
  children,
  className,
}) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {loading ? (
        <div className={cn('animate-pulse rounded-lg bg-gray-100', height)} />
      ) : empty ? (
        <div
          className={cn(
            'flex items-center justify-center text-sm text-gray-400',
            height
          )}
        >
          {emptyText}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
