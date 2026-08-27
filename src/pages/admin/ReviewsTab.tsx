import { useEffect, useState } from 'react';
import { Loader2, Check, X, Trash2, Star, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';
import { useConfirm } from './components/ConfirmDialog';
import Pill, { PillTone } from './components/Pill';
import EmptyState from './components/EmptyState';

const FILTERS = [
  { key: 'pending', label: 'На модерации' },
  { key: 'approved', label: 'Одобренные' },
  { key: 'rejected', label: 'Отклонённые' },
  { key: 'all', label: 'Все' },
] as const;

const ReviewsTab = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof FILTERS[number]['key']>('pending');
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      setReviews(await adminApi.reviews.list());
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить отзывы', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await adminApi.reviews.setStatus(id, status);
      setReviews((r) => r.map((x) => (x.id === id ? { ...x, moderation_status: status, verified: status === 'approved' } : x)));
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ description: 'Удалить отзыв безвозвратно?', confirmText: 'Удалить', destructive: true }))) return;
    try {
      await adminApi.reviews.remove(id);
      setReviews((r) => r.filter((x) => x.id !== id));
    } catch (e: any) {
      toast({ title: 'Ошибка удаления', description: e?.message, variant: 'destructive' });
    }
  };

  const filtered = filter === 'all' ? reviews : reviews.filter((r) => (r.moderation_status || (r.verified ? 'approved' : 'pending')) === filter);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? reviews.length : reviews.filter((r) => (r.moderation_status || (r.verified ? 'approved' : 'pending')) === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full border ${filter === f.key ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}
            >
              {f.label} {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filtered.map((r) => {
          const status = r.moderation_status || (r.verified ? 'approved' : 'pending');
          const tone: PillTone = status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';
          const statusLabel = status === 'approved' ? 'одобрен' : status === 'rejected' ? 'отклонён' : 'на модерации';
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-2 transition-colors hover:border-foreground/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-sm truncate">{r.author}</span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                    ))}
                  </span>
                </div>
                <Pill tone={tone}>{statusLabel}</Pill>
              </div>
              <p className="text-sm text-muted-foreground">{r.text}</p>
              <div className="flex flex-wrap gap-2">
                {status !== 'approved' && (
                  <Button size="sm" variant="outline" onClick={() => act(r.id, 'approved')}><Check className="w-3.5 h-3.5" /> Одобрить</Button>
                )}
                {status !== 'rejected' && (
                  <Button size="sm" variant="outline" onClick={() => act(r.id, 'rejected')}><X className="w-3.5 h-3.5" /> Отклонить</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <EmptyState
            icon={MessageSquareText}
            title="Пусто"
            hint="Отзывы в этой категории не найдены."
          />
        )}
      </div>
    </div>
  );
};

export default ReviewsTab;
