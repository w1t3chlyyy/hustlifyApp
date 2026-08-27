import { useEffect, useState } from 'react';
import { Loader2, Boxes, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';
import { useConfirm } from './components/ConfirmDialog';
import ListRow from './components/ListRow';
import EmptyState from './components/EmptyState';
import Pager from './components/Pager';

const PAGE_SIZE = 20;

const InventoryTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const { data, total } = await adminApi.inventory.products(p, PAGE_SIZE);
      setRows(data); setTotal(total);
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить склад', description: e?.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Товаров с остатками: <b>{total}</b>. Формат: доступно / продано.</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <ListRow
              key={p.id}
              title={<button onClick={() => setSelected(p)}>{p.title}</button>}
              meta={`Тип: ${p.product_type} · доступно ${p.available} · продано ${p.sold}`}
              onEdit={() => setSelected(p)}
            />
          ))}
          {rows.length === 0 && <EmptyState icon={Boxes} title="Товаров нет" hint="Добавьте товары в каталоге." />}
        </div>
      )}

      <Pager page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {selected && (
        <InventoryDialog productId={selected.id} onClose={() => setSelected(null)} onChanged={() => load(page)} />
      )}
    </div>
  );
};

const InventoryDialog = ({
  productId, onClose, onChanged,
}: { productId: string; onClose: () => void; onChanged: () => void }) => {
  const [product, setProduct] = useState<any | null>(null);
  const [available, setAvailable] = useState<any[]>([]);
  const [sold, setSold] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulk, setBulk] = useState('');
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.inventory.get(productId);
      setProduct(r.product); setAvailable(r.available); setSold(r.sold);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addUnits = async () => {
    const lines = bulk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setBusy(true);
    try {
      await adminApi.inventory.add(productId, lines);
      setBulk('');
      await load();
      onChanged();
      toast({ title: `Добавлено единиц: ${lines.length}` });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  const purge = async () => {
    if (!(await confirm({ description: 'Удалить все доступные единицы товара?', confirmText: 'Удалить', destructive: true }))) return;
    setBusy(true);
    try { await adminApi.inventory.purge(productId); await load(); onChanged(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const deleteOne = async (itemId: string) => {
    try { await adminApi.inventory.deleteItem(itemId); await load(); onChanged(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{product?.title ?? 'Товар'}</DialogTitle></DialogHeader>

        {loading || !product ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Доступно</div>
                <div className="font-display font-bold text-lg">{available.length}</div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Продано</div>
                <div className="font-display font-bold text-lg">{sold.length}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Добавить единицы (по одной на строку)</div>
              <Textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={4} placeholder={"login:pass\nlogin2:pass2"} />
              <Button size="sm" onClick={addUnits} disabled={busy || !bulk.trim()}>Добавить</Button>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Доступные единицы</div>
              <div className="rounded-lg border border-border divide-y divide-border max-h-48 overflow-y-auto">
                {available.length === 0 && <div className="p-2 text-xs text-muted-foreground">Нет доступных единиц</div>}
                {available.map((it) => (
                  <div key={it.id} className="p-2 text-xs flex items-center justify-between gap-2">
                    <code className="truncate">{it.content}</code>
                    <button onClick={() => deleteOne(it.id)} aria-label="Удалить"><Trash2 className="w-3.5 h-3.5 text-destructive shrink-0" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={purge} disabled={!available.length || busy}>
            <Trash2 className="w-4 h-4" /> Удалить все доступные
          </Button>
          <Button variant="ghost" onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryTab;
