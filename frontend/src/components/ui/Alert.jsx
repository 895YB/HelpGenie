import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const styles = {
  error: {
    wrapper: 'bg-red-50 border-red-200 text-red-800',
    icon: <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />,
  },
  success: {
    wrapper: 'bg-green-50 border-green-200 text-green-800',
    icon: <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />,
  },
  info: {
    wrapper: 'bg-brand-50 border-brand-200 text-brand-800',
    icon: <Info className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />,
  },
};

export default function Alert({ type = 'info', message, onDismiss, className }) {
  if (!message) return null;

  const { wrapper, icon } = styles[type] ?? styles.info;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm',
        wrapper,
        className
      )}
    >
      {icon}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
