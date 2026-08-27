import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const StatCard = ({
  icon: Icon, label, value, hint, onClick, tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  onClick?: () => void;
  tone?: 'default' | 'warning';
}) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className={cn(
      'text-left rounded-2xl border border-border bg-card p-4 transition-colors',
      onClick && 'hover:border-foreground/30 cursor-pointer',
      !onClick && 'cursor-default',
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-2xl font-display font-bold tabular-nums">{value}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
        {hint && (
          <div className={cn('text-xs mt-1.5', tone === 'warning' ? 'text-warning' : 'text-muted-foreground')}>
            {hint}
          </div>
        )}
      </div>
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground',
      )}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  </button>
);

export default StatCard;
