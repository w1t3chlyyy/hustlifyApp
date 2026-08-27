import { useEffect, useRef, useState } from 'react';
import { Loader2, ScrollText, Radio } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { toast } from '@/hooks/use-toast';
import EmptyState from './components/EmptyState';
import Pager from './components/Pager';

const PAGE_SIZE = 20;
const POLL_MS = 5000;

const LogsTab = () => {
  const [tab, setTab] = useState<'action' | 'balance'>('action');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (t = tab, p = page, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = t === 'action' ? await adminApi.logs.adminLog(p, PAGE_SIZE) : await adminApi.logs.balanceHistory(p, PAGE_SIZE);
      setRows(r.data);
      setTotal(r.total);
    } catch (e: any) {
      if (!silent) toast({ title: 'Не удалось загрузить логи', description: e?.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(tab, 0); setPage(0); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(tab, page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live mode only makes sense on page 0 (new entries land there) — poll quietly.
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (live && page === 0) {
      timerRef.current = setInterval(() => load(tab, 0, true), POLL_MS);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [live, page, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('action')}
            className={`text-xs px-3 py-1.5 rounded-full border ${tab === 'action' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}
          >Действия</button>
          <button
            onClick={() => setTab('balance')}
            className={`text-xs px-3 py-1.5 rounded-full border ${tab === 'balance' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}
          >Баланс</button>
        </div>
        <button
          onClick={() => setLive((v) => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${live ? 'border-emerald-500/40 text-emerald-500' : 'border-border text-muted-foreground'}`}
        >
          <Radio className={`w-3 h-3 ${live ? 'animate-pulse' : ''}`} /> {live ? 'В реальном времени' : 'Обновление вручную'}
        </button>
      </div>

      <p className="text-sm text-muted-foreground">Всего записей: <b>{total}</b></p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="Пока пусто" />
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {tab === 'action'
            ? rows.map((l) => (
              <div key={l.id} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{l.action}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(l.created_at).toLocaleString('ru-RU')}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {l.target ? <>цель: <code>{l.target}</code> · </> : null}админ {l.admin_telegram_id || 'веб-панель'}
                </div>
              </div>
            ))
            : rows.map((h) => (
              <div key={h.id} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{h.type === 'credit' ? '+' : '−'}{Number(h.amount).toFixed(2)}$ → {Number(h.balance_after).toFixed(2)}$</span>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(h.created_at).toLocaleString('ru-RU')}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  пользователь <code>{h.telegram_id}</code>{h.admin_telegram_id ? ` · админ ${h.admin_telegram_id}` : ''}{h.comment ? ` · ${h.comment}` : ''}
                </div>
              </div>
            ))}
        </div>
      )}

      <Pager page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
    </div>
  );
};

export default LogsTab;
