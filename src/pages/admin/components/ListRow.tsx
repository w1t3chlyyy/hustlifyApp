import { ReactNode } from 'react';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ListRowProps = {
  thumb?: ReactNode;
  title: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  dragHandle?: boolean;
  className?: string;
};

const ListRow = ({ thumb, title, badges, meta, onEdit, onDelete, dragHandle, className }: ListRowProps) => (
  <div
    className={cn(
      'flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-foreground/20',
      className,
    )}
  >
    {dragHandle && <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />}
    {thumb}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm truncate">{title}</span>
        {badges}
      </div>
      {meta && <div className="text-xs text-muted-foreground truncate mt-0.5">{meta}</div>}
    </div>
    <div className="flex items-center gap-0.5 shrink-0">
      {onEdit && (
        <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Редактировать">
          <Pencil className="w-4 h-4" />
        </Button>
      )}
      {onDelete && (
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Удалить">
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      )}
    </div>
  </div>
);

export const RowThumb = ({ src, icon, className }: { src?: string | null; icon?: ReactNode; className?: string }) => (
  <div className={cn('w-11 h-11 rounded-lg bg-black flex items-center justify-center text-lg overflow-hidden shrink-0 border border-border/50', className)}>
    {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : icon}
  </div>
);

export default ListRow;
