import { LucideIcon } from 'lucide-react';

const EmptyState = ({
  icon: Icon, title, hint,
}: { icon: LucideIcon; title: string; hint?: string }) => (
  <div className="flex flex-col items-center justify-center gap-2.5 py-14 px-6 text-center rounded-xl border border-dashed border-border">
    <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
      <Icon className="w-5 h-5" />
    </div>
    <p className="text-sm font-medium">{title}</p>
    {hint && <p className="text-xs text-muted-foreground max-w-xs">{hint}</p>}
  </div>
);

export default EmptyState;
