import { useEffect, useState } from 'react';
import { Loader2, Users as UsersIcon, Ban, CheckCircle2, History, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';
import { useConfirm } from './components/ConfirmDialog';
import SearchInput from './components/SearchInput';
import ListRow from './components/ListRow';
import Pill from './components/Pill';
import EmptyState from './components/EmptyState';
import Pager from './components/Pager';

const PAGE_SIZE = 20;
const money = (n: number) => `${Number(n || 0).toFixed(2)}$`;

const UsersTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const load = async (p = page, s = search) => {
    setLoading(true);
    try {
      const { data, total } = await adminApi.users.list(p, PAGE_SIZE, s);
      setRows(data);
      setTotal(total);
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить пользователей', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(0, search); setPage(0); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(page, search); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Всего пользователей: <b>{total}</b>
        </p>
        <SearchInput value={search} onChange={setSearch} placeholder="Telegram ID или @username…" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {rows.map((u) => (
            <ListRow
              key={u.telegram_id}
              title={
                <button className="text-left" onClick={() => setSelected(u)}>
                  {u.first_name || '—'}{u.username ? ` @${u.username}` : ''}
                </button>
              }
              badges={u.is_blocked ? <Pill tone="danger">заблокирован</Pill> : undefined}
              meta={`ID ${u.telegram_id} · баланс ${money(u.balance)} · рег. ${new Date(u.created_at).toLocaleDateString('ru-RU')}`}
              onEdit={() => setSelected(u)}
            />
          ))}
          {rows.length === 0 && (
            <EmptyState icon={UsersIcon} title="Никого не найдено" hint="Измените запрос поиска." />
          )}
        </div>
      )}

      <Pager page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {selected && (
        <UserDialog
          telegramId={selected.telegram_id}
          onClose={() => setSelected(null)}
          onChanged={() => load(page, search)}
        />
      )}
    </div>
  );
};

const UserDialog = ({
  telegramId, onClose, onChanged,
}: { telegramId: number; onClose: () => void; onChanged: () => void }) => {
  const [user, setUser] = useState<any | null>(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<any[] | null>(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const { user, ordersCount } = await adminApi.users.get(telegramId);
      setUser(user);
      setOrdersCount(ordersCount);
      setNote(user.internal_note ?? '');
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [telegramId]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyBalance = async (dir: 'credit' | 'deduct') => {
    const n = Number(String(amount).replace(',', '.'));
    if (!isFinite(n) || n <= 0) { toast({ title: 'Введите сумму больше 0', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      await adminApi.users.setBalance(telegramId, dir, n, comment);
      setAmount(''); setComment('');
      await load();
      onChanged();
      toast({ title: dir === 'credit' ? 'Баланс пополнен' : 'Баланс списан' });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = async () => {
    if (!(await confirm({
      description: user.is_blocked ? 'Разблокировать пользователя?' : 'Заблокировать пользователя?',
      confirmText: user.is_blocked ? 'Разблокировать' : 'Заблокировать',
      destructive: !user.is_blocked,
    }))) return;
    try {
      await adminApi.users.toggleBlock(telegramId);
      await load();
      onChanged();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  const saveNote = async () => {
    try {
      await adminApi.users.setNote(telegramId, note);
      toast({ title: 'Заметка сохранена' });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  const loadHistory = async () => {
    try {
      const { data } = await adminApi.users.balanceHistory(telegramId, 0, 20);
      setHistory(data);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? `${user.first_name ?? '—'}${user.username ? ` @${user.username}` : ''}` : 'Пользователь'}</DialogTitle>
        </DialogHeader>

        {loading || !user ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Баланс</div>
                <div className="font-display font-bold text-lg">{money(user.balance)}</div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Заказов</div>
                <div className="font-display font-bold text-lg">{ordersCount}</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Telegram ID: <code className="text-foreground">{user.telegram_id}</code></div>
              <div>Регистрация: {new Date(user.created_at).toLocaleString('ru-RU')}</div>
              <div>Статус: {user.is_blocked ? <span className="text-destructive">заблокирован</span> : 'активен'}{user.is_premium ? ' · Telegram Premium' : ''}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Баланс</div>
              <div className="flex gap-2">
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сумма USDT" className="flex-1" />
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий" className="flex-[1.4]" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => applyBalance('credit')} className="flex-1">+ Начислить</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => applyBalance('deduct')} className="flex-1">− Списать</Button>
              </div>
              <Button size="sm" variant="ghost" onClick={loadHistory} className="w-full">
                <History className="w-3.5 h-3.5" /> История баланса
              </Button>
              {history && (
                <div className="rounded-lg border border-border divide-y divide-border max-h-48 overflow-y-auto">
                  {history.length === 0 && <div className="p-2 text-xs text-muted-foreground">Нет операций</div>}
                  {history.map((h) => (
                    <div key={h.id} className="p-2 text-xs flex justify-between gap-2">
                      <span>{h.type === 'credit' ? '+' : '−'}{Number(h.amount).toFixed(2)}$ → {Number(h.balance_after).toFixed(2)}$
                        {h.comment ? <span className="text-muted-foreground"> · {h.comment}</span> : null}
                      </span>
                      <span className="text-muted-foreground shrink-0">{new Date(h.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <StickyNote className="w-3.5 h-3.5" /> Заметка (видна только админам)
              </div>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              <Button size="sm" variant="outline" onClick={saveNote}>Сохранить заметку</Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant={user?.is_blocked ? 'outline' : 'destructive'} onClick={toggleBlock} disabled={!user}>
            {user?.is_blocked ? <><CheckCircle2 className="w-4 h-4" /> Разблокировать</> : <><Ban className="w-4 h-4" /> Заблокировать</>}
          </Button>
          <Button variant="ghost" onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UsersTab;
