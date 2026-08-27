import { cn } from '@/lib/utils';

export type PillTone = 'default' | 'success' | 'warning' | 'danger' | 'accent';

const TONE_CLASSES: Record<PillTone, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-500/15 text-emerald-500',
  warning: 'bg-amber-500/15 text-amber-500',
  danger: 'bg-red-500/15 text-red-500',
  accent: 'bg-amber-400/20 text-amber-500',
};

const Pill = ({ tone = 'default', children }: { tone?: PillTone; children: React.ReactNode }) => (
  <span className={cn('inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0', TONE_CLASSES[tone])}>
    {children}
  </span>
);

export default Pill;
