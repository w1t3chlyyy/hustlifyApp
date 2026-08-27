import { useEffect, useRef, useState } from 'react';
import { Loader2, Radio, TrendingUp, Users, Package, Boxes } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { toast } from '@/hooks/use-toast';
import StatCard from './components/StatCard';

const RANGES = [
  { key: 'd', label: '24 часа' }, { key: 'w', label: '7 дней' }, { key: 'm', label: '30 дней' }, { key: 'all', label: 'Всё время' },
];
const VIEWS = [
  { key: 'mn', label: 'Свод' }, { key: 'tp', label: 'Топ товаров' }, { key: 'tb', label: 'Топ покупателей' }, { key: 'dy', label: 'По дням' },
];
const POLL_MS = 15000;
const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const fmt = (n: number) => Number(n || 0).toLocaleString('ru-RU');

const StatsTab = () => {
  const [range, setRange] = useState('w');
  const [view, setView] = useState('mn');
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [main, setMain] = useState<any | null>(null);
  const [topProducts, setTopProducts] = useState<any[] | null>(null);
  const [topBuyers, setTopBuyers] = useState<any[] | null>(null);
  const [daily, setDaily] = useState<any[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (v = view, r = range, silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (v === 'mn') setMain(await adminApi.stats.main(r));
      else if (v === 'tp') setTopProducts(await adminApi.stats.topProducts(r));
      else if (v === 'tb') setTopBuyers(await adminApi.stats.topBuyers(r));
      else if (v === 'dy') setDaily(await adminApi.stats.daily(r));
    } catch (e: any) {
      if (!silent) toast({ title: 'Не удалось загрузить статистику', description: e?.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(view, range); }, [view, range]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (live) timerRef.current = setInterval(() => load(view, range, true), POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [live, view, range]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`text-xs px-3 py-1.5 rounded-full border ${view === v.key ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}
            >{v.label}</button>
          ))}
        </div>
        <button
          onClick={() => setLive((v) => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border shrink-0 ${live ? 'border-emerald-500/40 text-emerald-500' : 'border-border text-muted-foreground'}`}
        >
          <Radio className={`w-3 h-3 ${live ? 'animate-pulse' : ''}`} /> {live ? 'В реальном времени' : 'Обновление вручную'}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`text-xs px-3 py-1.5 rounded-full border ${range === r.key ? 'bg-muted text-foreground border-foreground/30' : 'border-border text-muted-foreground'}`}
          >{r.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          {view === 'mn' && main && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard icon={TrendingUp} label="Выручка" value={money(main.revenue)} hint={`Средний чек: ${money(main.aov)}`} />
                <StatCard icon={Package} label="Заказов" value={fmt(main.ordersCount)} hint={`Оплачено: ${fmt(main.paidCount)} · конверсия ${main.conv.toFixed(1)}%`} />
                <StatCard icon={Users} label="Пользователей" value={fmt(main.usersTotal)} hint={`Новых за период: ${fmt(main.newUsers)} · забл. ${fmt(main.blocked)}`} />
                <StatCard icon={Boxes} label="Склад" value={fmt(main.invAvail)} hint={`Продано: ${fmt(main.invSold)}`} />
                <StatCard icon={Package} label="Товаров" value={fmt(main.productsTotal)} hint={`Активных: ${fmt(main.productsActive)}`} />
                <StatCard icon={Users} label="Баланс на счетах" value={money(main.totalBalance)} hint={main.reviewsPending ? `На модерации отзывов: ${main.reviewsPending}` : undefined} tone={main.reviewsPending ? 'warning' : 'default'} />
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Заказы по статусам</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(main.byStatus).map(([s, n]) => (
                    <span key={s} className="px-2 py-1 rounded-lg bg-muted"><code>{s}</code>: {n as number}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'tp' && (
            <div className="space-y-2">
              {(topProducts ?? []).map((t, i) => (
                <div key={i} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">#{i + 1}</div>
                    <div className="text-sm font-medium truncate">{t.title}</div>
                  </div>
                  <div className="text-right shrink-0 text-sm">
                    <div className="font-semibold">{money(t.revenue)}</div>
                    <div className="text-xs text-muted-foreground">{fmt(t.qty)} шт.</div>
                  </div>
                </div>
              ))}
              {(topProducts ?? []).length === 0 && <p className="text-sm text-muted-foreground">Нет данных за период.</p>}
            </div>
          )}

          {view === 'tb' && (
            <div className="space-y-2">
              {(topBuyers ?? []).map((t, i) => (
                <div key={i} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">#{i + 1}</div>
                    <div className="text-sm font-medium truncate">{t.username ? `@${t.username}` : (t.first_name || t.tid)} <span className="text-xs text-muted-foreground">ID {t.tid}</span></div>
                  </div>
                  <div className="text-right shrink-0 text-sm">
                    <div className="font-semibold">{money(t.revenue)}</div>
                    <div className="text-xs text-muted-foreground">{fmt(t.orders)} заказ(ов)</div>
                  </div>
                </div>
              ))}
              {(topBuyers ?? []).length === 0 && <p className="text-sm text-muted-foreground">Нет данных за период.</p>}
            </div>
          )}

          {view === 'dy' && (
            <div className="space-y-1.5">
              {(() => {
                const maxRev = Math.max(1, ...((daily ?? []).map((d) => d.rev)));
                return (daily ?? []).map((d) => (
                  <div key={d.date} className="flex items-center gap-3 text-xs">
                    <span className="w-14 shrink-0 text-muted-foreground">{d.date.slice(5)}</span>
                    <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                      <div className="h-full bg-foreground/80" style={{ width: `${(d.rev / maxRev) * 100}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right">{money(d.rev)} · {d.paid}/{d.all}</span>
                  </div>
                ));
              })()}
              {(daily ?? []).length === 0 && <p className="text-sm text-muted-foreground">Нет данных за период.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StatsTab;
