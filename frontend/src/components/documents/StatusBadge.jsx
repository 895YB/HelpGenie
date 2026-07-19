import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONFIG = {
  ready: {
    label: 'Ready',
    icon: CheckCircle2,
    cls: 'bg-green-50 text-green-700 border-green-200',
    iconCls: 'text-green-500',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    iconCls: 'text-amber-500 animate-spin',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    cls: 'bg-gray-50 text-gray-600 border-gray-200',
    iconCls: 'text-gray-400',
  },
  error: {
    label: 'Error',
    icon: XCircle,
    cls: 'bg-red-50 text-red-700 border-red-200',
    iconCls: 'text-red-500',
  },
};

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] ?? CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        cfg.cls
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', cfg.iconCls)} />
      {cfg.label}
    </span>
  );
}
