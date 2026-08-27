import { useEffect, useState } from 'react';
import { Loader2, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';
import { useConfirm } from './components/ConfirmDialog';
import TabToolbar from './components/TabToolbar';
import ListRow from './components/ListRow';
import Pill from './components/Pill';
import EmptyState from './components/EmptyState';

const empty = {
  id: undefined as string | undefined,
  code: '', discount_type: 'percent' as 'percent' | 'fixed', discount_value: 10,
  max_uses: null as number | null, max_uses_per_user: null as number | null, valid_until: '' as string,
  is_active: true,
};

const PromocodesTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<typeof empty | null>(null);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try { setRows(await adminApi.promocodes.list()); }
    catch (e: any) { toast({ title: 'Не удалось загрузить промокоды', description: e?.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((p) => p.code.toLowerCase().includes(search.toLowerCase()));

  const toggle = async (id: string) => {
    try {
      await adminApi.promocodes.toggle(id);
      setRows((r) => r.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p)));
    } catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };
  const remove = async (id: string) => {
    if (!(await confirm({ description: 'Удалить промокод безвозвратно?', confirmText: 'Удалить', destructive: true }))) return;
    try { await adminApi.promocodes.remove(id); setRows((r) => r.filter((p) => p.id !== id)); }
    catch (e: any) { toast({ title: 'Ошибка удаления', description: e?.message, variant: 'destructive' }); }
  };
  const save = async () => {
    if (!editing) return;
    if (!/^[A-Z0-9_-]{2,32}$/.test(editing.code.toUpperCase())) {
      toast({ title: 'Код: 2–32 символа A-Z/0-9/_-', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      const row = {
        ...editing,
        code: editing.code.toUpperCase(),
        valid_until: editing.valid_until ? new Date(editing.valid_until).toISOString() : null,
      };
      const saved = await adminApi.promocodes.upsert(row);
      await load();
      setEditing(null);
      toast({ title: 'Сохранено' });
    } catch (e: any) {
      toast({ title: 'Ошибка сохранения', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <TabToolbar
        description="Промокоды на скидку в каталоге"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Поиск по коду…"
        actionLabel="Промокод"
        onAction={() => setEditing({ ...empty })}
      />

      <div className="space-y-2">
        {filtered.map((p) => {
          const v = p.discount_type === 'percent' ? `${p.discount_value}%` : `${p.discount_value}$`;
          return (
            <ListRow
              key={p.id}
              title={<button onClick={() => setEditing({ ...p, valid_until: p.valid_until ? p.valid_until.slice(0, 10) : '' })}>{p.code}</button>}
              badges={<Pill tone={p.is_active ? 'success' : 'default'}>{p.is_active ? 'активен' : 'выключен'}</Pill>}
              meta={`${v} · использован ${p.used_count}/${p.max_uses ?? '∞'}${p.valid_until ? ` · до ${new Date(p.valid_until).toLocaleDateString('ru-RU')}` : ''}`}
              onEdit={() => setEditing({ ...p, valid_until: p.valid_until ? p.valid_until.slice(0, 10) : '' })}
              onDelete={() => remove(p.id)}
            />
          );
        })}
        {filtered.length === 0 && <EmptyState icon={Ticket} title="Промокодов нет" hint="Создайте первый промокод." />}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? 'Редактировать промокод' : 'Новый промокод'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Код</div>
                <Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Тип скидки</div>
                  <Select value={editing.discount_type} onValueChange={(v: any) => setEditing({ ...editing, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Проценты</SelectItem>
                      <SelectItem value="fixed">Фикс. сумма</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Размер</div>
                  <Input type="number" value={editing.discount_value} onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Лимит всего</div>
                  <Input type="number" value={editing.max_uses ?? ''} onChange={(e) => setEditing({ ...editing, max_uses: e.target.value ? Number(e.target.value) : null })} placeholder="∞" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">На пользователя</div>
                  <Input type="number" value={editing.max_uses_per_user ?? ''} onChange={(e) => setEditing({ ...editing, max_uses_per_user: e.target.value ? Number(e.target.value) : null })} placeholder="∞" />
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Действителен до</div>
                <Input type="date" value={editing.valid_until} onChange={(e) => setEditing({ ...editing, valid_until: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm">Активен</span>
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Отмена</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromocodesTab;
