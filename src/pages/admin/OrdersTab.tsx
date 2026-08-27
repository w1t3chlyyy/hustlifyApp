import { useEffect, useState } from 'react';
import { Loader2, ShoppingCart, Send, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';
import { useConfirm } from './components/ConfirmDialog';
import ListRow from './components/ListRow';
import Pill, { PillTone } from './components/Pill';
import EmptyState from './components/EmptyState';
import Pager from './components/Pager';

const PAGE_SIZE = 20;
const money = (n: number) => `${Number(n || 0).toFixed(2)}$`;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Создан', awaiting_payment: 'Ожидает оплаты', paid: 'Оплачен', processing: 'В обработке',
  delivered: 'Выдан', completed: 'Завершён', cancelled: 'Отменён', error: 'Ошибка',
};
const STATUS_ORDER = ['pending', 'awaiting_payment', 'paid', 'processing', 'delivered', 'completed', 'cancelled', 'error'];
const PAY_LABELS: Record<string, string> = {
  unpaid: 'Не оплачен', awaiting: 'Ожидает', paid: 'Оплачен', failed: 'Ошибка', refunded: 'Возврат', expired: 'Истёк',
};
const PAY_ORDER = ['unpaid', 'awaiting', 'paid', 'failed', 'refunded', 'expired'];

const statusTone = (s: string): PillTone => {
  if (['delivered', 'completed', 'paid'].includes(s)) return 'success';
  if (['cancelled', 'error'].includes(s)) return 'danger';
  if (['pending', 'awaiting_payment', 'processing', 'awaiting'].includes(s)) return 'warning';
  return 'default';
};

const FILTERS = [
  { key: 'all', label: 'Все' }, { key: 'new', label: 'Новые' }, { key: 'active', label: 'Активные' },
  { key: 'done', label: 'Готовые' }, { key: 'issues', label: 'Проблемы' },
];

const OrdersTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async (f = filter, p = page) => {
    setLoading(true);
    try {
      const { data, total } = await adminApi.orders.list(f, p, PAGE_SIZE);
      setRows(data);
      setTotal(total);
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить заказы', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter, 0); setPage(0); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(filter, page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <p className="text-sm text-muted-foreground">Всего заказов: <b>{total}</b></p>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full border ${filter === f.key ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {rows.map((o) => (
            <ListRow
              key={o.id}
              title={<button onClick={() => setSelectedId(o.id)}>#{o.order_number}</button>}
              badges={<Pill tone={statusTone(o.status)}>{STATUS_LABELS[o.status] ?? o.status}</Pill>}
              meta={`${money(o.total_amount)} · оплата: ${PAY_LABELS[o.payment_status] ?? o.payment_status} · ${new Date(o.created_at).toLocaleString('ru-RU')}`}
              onEdit={() => setSelectedId(o.id)}
            />
          ))}
          {rows.length === 0 && <EmptyState icon={ShoppingCart} title="Заказов нет" hint="В этой категории пока пусто." />}
        </div>
      )}

      <Pager page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {selectedId && (
        <OrderDialog id={selectedId} onClose={() => setSelectedId(null)} onChanged={() => load(filter, page)} />
      )}
    </div>
  );
};

const OrderDialog = ({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) => {
  const [order, setOrder] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.orders.get(id);
      setOrder(r.order); setItems(r.items); setUser(r.user);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (status: string) => {
    setBusy(true);
    try { await adminApi.orders.setStatus(id, status); await load(); onChanged(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const setPayment = async (status: string) => {
    setBusy(true);
    try { await adminApi.orders.setPayment(id, status); await load(); onChanged(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const refund = async () => {
    if (!(await confirm({ description: `Вернуть ${money(order.total_amount)} на баланс покупателя?`, confirmText: 'Вернуть', destructive: true }))) return;
    setBusy(true);
    try { await adminApi.orders.refund(id); toast({ title: 'Возврат выполнен' }); await load(); onChanged(); }
    catch (e: any) { toast({ title: 'Ошибка возврата', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const sendMsg = async () => {
    if (!msg.trim()) return;
    setBusy(true);
    try {
      const r = await adminApi.orders.message(id, msg.trim());
      toast({ title: r.ok ? 'Отправлено покупателю' : 'Не доставлено', description: r.ok ? undefined : r.description, variant: r.ok ? 'default' : 'destructive' });
      if (r.ok) setMsg('');
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{order ? `Заказ #${order.order_number}` : 'Заказ'}</DialogTitle></DialogHeader>

        {loading || !order ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground mb-1">Статус</div>
                <Select value={order.status} onValueChange={setStatus} disabled={busy}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Оплата</div>
                <Select value={order.payment_status} onValueChange={setPayment} disabled={busy}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAY_ORDER.map((s) => <SelectItem key={s} value={s}>{PAY_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3 space-y-1 text-xs">
              <div>Сумма: <b>{money(order.total_amount)}</b>{order.balance_used > 0 ? ` (баланс: ${money(order.balance_used)})` : ''}</div>
              {order.promo_code && <div>Промокод: <code>{order.promo_code}</code> (−{money(order.discount_amount)})</div>}
              <div>Покупатель: {user?.first_name ?? '—'}{user?.username ? ` @${user.username}` : ''} · ID <code>{order.telegram_id}</code></div>
              {user && <div>Баланс покупателя: {money(user.balance)}</div>}
              <div>Создан: {new Date(order.created_at).toLocaleString('ru-RU')}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Позиции</div>
              {items.map((it, i) => (
                <div key={i} className="text-xs flex justify-between">
                  <span>{it.product_title} ×{it.quantity}</span>
                  <span>{money(Number(it.product_price) * it.quantity)}</span>
                </div>
              ))}
              {items.length === 0 && <div className="text-xs text-muted-foreground">—</div>}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Написать покупателю</div>
              <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder="Текст сообщения…" />
              <Button size="sm" variant="outline" onClick={sendMsg} disabled={busy || !msg.trim()}>
                <Send className="w-3.5 h-3.5" /> Отправить
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={refund} disabled={!order || order.payment_status === 'refunded' || busy}>
            <Undo2 className="w-4 h-4" /> Вернуть на баланс
          </Button>
          <Button variant="ghost" onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrdersTab;
