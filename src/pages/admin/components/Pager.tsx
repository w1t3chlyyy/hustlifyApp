import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Numbered pager: "1 2 3 … 8" — used everywhere the admin panel lists more
// than one page of rows (users, orders, logs, inventory…). `page` is 0-based.
const Pager = ({
  page, pageSize, total, onChange,
}: { page: number; pageSize: number; total: number; onChange: (page: number) => void }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const nums = new Set<number>([0, pageCount - 1, page, page - 1, page + 1]);
  const items: (number | 'gap')[] = [];
  let prev = -1;
  for (const n of [...nums].filter((n) => n >= 0 && n < pageCount).sort((a, b) => a - b)) {
    if (prev !== -1 && n - prev > 1) items.push('gap');
    items.push(n);
    prev = n;
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <Button size="icon" variant="ghost" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Назад">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      {items.map((it, i) =>
        it === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
        ) : (
          <button
            key={it}
            onClick={() => onChange(it)}
            className={cn(
              'min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-colors',
              it === page ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {it + 1}
          </button>
        ),
      )}
      <Button size="icon" variant="ghost" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)} aria-label="Вперёд">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default Pager;
