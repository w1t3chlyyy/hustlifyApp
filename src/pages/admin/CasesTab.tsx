import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';
import { useConfirm } from './components/ConfirmDialog';
import TabToolbar from './components/TabToolbar';
import ListRow, { RowThumb } from './components/ListRow';
import Pill from './components/Pill';
import EmptyState from './components/EmptyState';

const emptyCase = {
  id: undefined as string | undefined,
  slug: '',
  title: '',
  short_description: '',
  full_description: '',
  price: 0,
  old_price: null as number | null,
  image_url: '',
  badge_type: 'none' as 'none' | 'hit' | 'custom',
  badge_text: '',
  spots_left: null as number | null,
  highlight_enabled: false,
  highlight_color: '#ffffff',
  background_color: '',
  cta_text: 'Подробнее',
  support_username: '',
  external_link: '',
  product_id: null as string | null,
  miniapp_product_id: null as string | null,
  is_active: true,
  sort_order: 0,
};

type CaseRow = typeof emptyCase;

const CasesTab = () => {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [products, setProducts] = useState<{ id: string; title: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CaseRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const [data, productList] = await Promise.all([
        adminApi.cases.list(),
        adminApi.products.list().catch(() => []),
      ]);
      setCases(data);
      setProducts(productList || []);
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить кейсы', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.slug.trim() || !editing.title.trim()) {
      toast({ title: 'Заполните хотя бы slug и заголовок', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.cases.upsert(editing);
      toast({ title: 'Кейс сохранён' });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка сохранения', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ description: 'Удалить кейс безвозвратно?', confirmText: 'Удалить', destructive: true }))) return;
    try {
      await adminApi.cases.remove(id);
      toast({ title: 'Кейс удалён' });
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка удаления', description: e?.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const filtered = cases.filter((c) =>
    !search.trim() || `${c.title} ${c.slug}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <TabToolbar
        description={`Карточки в разделе «Наши кейсы» на главной (${cases.length})`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Поиск по названию…"
        actionLabel="Новый кейс"
        onAction={() => setEditing({ ...emptyCase, sort_order: cases.length })}
      />

      <div className="space-y-2">
        {filtered.map((c) => (
          <ListRow
            key={c.id}
            dragHandle
            thumb={<RowThumb src={c.image_url} />}
            title={c.title}
            badges={(
              <>
                {!c.is_active && <Pill>скрыт</Pill>}
                {c.highlight_enabled && <Pill tone="accent">подсветка</Pill>}
              </>
            )}
            meta={`${c.slug} · ${c.price} ₽`}
            onEdit={() => setEditing(c)}
            onDelete={() => c.id && remove(c.id)}
          />
        ))}
        {filtered.length === 0 && (
          <EmptyState
            icon={Sparkles}
            title={cases.length === 0 ? 'Пока нет ни одного кейса' : 'Ничего не найдено'}
            hint={cases.length === 0 ? 'Добавьте кейс — он появится блоком «Наши кейсы» на главной странице.' : 'Попробуйте изменить поисковый запрос.'}
          />
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Редактировать кейс' : 'Новый кейс'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Field label="Slug (латиницей, для ссылок ?case=)">
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="business" />
              </Field>
              <Field label="Заголовок">
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </Field>
              <Field label="Короткое описание (на карточке)">
                <Textarea rows={2} value={editing.short_description} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} />
              </Field>
              <Field label="Полное описание (в попапе)">
                <Textarea rows={5} value={editing.full_description} onChange={(e) => setEditing({ ...editing, full_description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Цена, ₽">
                  <Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
                </Field>
                <Field label="Старая цена, ₽">
                  <Input type="number" value={editing.old_price ?? ''} onChange={(e) => setEditing({ ...editing, old_price: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="Картинка (URL)">
                <Input value={editing.image_url ?? ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Бейдж">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={editing.badge_type}
                    onChange={(e) => setEditing({ ...editing, badge_type: e.target.value as any })}
                  >
                    <option value="none">Нет</option>
                    <option value="hit">Хит продаж (огонёк)</option>
                    <option value="custom">Свой текст</option>
                  </select>
                </Field>
                <Field label="Текст бейджа">
                  <Input
                    disabled={editing.badge_type === 'none'}
                    value={editing.badge_text}
                    onChange={(e) => setEditing({ ...editing, badge_text: e.target.value })}
                    placeholder="Коллаборация"
                  />
                </Field>
              </div>

              <Field label="«Осталось N мест» (пусто — скрыть)">
                <Input
                  type="number"
                  value={editing.spots_left ?? ''}
                  onChange={(e) => setEditing({ ...editing, spots_left: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </Field>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Неоновая подсветка карточки</div>
                  <div className="text-xs text-muted-foreground">Свечение по контуру, как у акционных карточек</div>
                </div>
                <Switch checked={editing.highlight_enabled} onCheckedChange={(v) => setEditing({ ...editing, highlight_enabled: v })} />
              </div>

              {editing.highlight_enabled && (
                <Field label="Цвет подсветки">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editing.highlight_color}
                      onChange={(e) => setEditing({ ...editing, highlight_color: e.target.value })}
                      className="w-10 h-10 rounded border border-input cursor-pointer bg-transparent"
                    />
                    <Input value={editing.highlight_color} onChange={(e) => setEditing({ ...editing, highlight_color: e.target.value })} />
                  </div>
                </Field>
              )}

              <Field label="Цвет фона карточки (пусто — как у остальных)">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editing.background_color || '#111111'}
                    onChange={(e) => setEditing({ ...editing, background_color: e.target.value })}
                    className="w-10 h-10 rounded border border-input cursor-pointer bg-transparent"
                  />
                  <Input
                    value={editing.background_color ?? ''}
                    onChange={(e) => setEditing({ ...editing, background_color: e.target.value })}
                    placeholder="оставьте пустым для темы по умолчанию"
                  />
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Текст кнопки">
                  <Input value={editing.cta_text} onChange={(e) => setEditing({ ...editing, cta_text: e.target.value })} />
                </Field>
                <Field label="Telegram для заявок (без @, пусто — общая поддержка)">
                  <Input value={editing.support_username ?? ''} onChange={(e) => setEditing({ ...editing, support_username: e.target.value })} placeholder="HustlifyHelp" />
                </Field>
              </div>

              <Field label="Внешняя ссылка вместо Telegram-сообщения (необязательно)">
                <Input value={editing.external_link ?? ''} onChange={(e) => setEditing({ ...editing, external_link: e.target.value })} placeholder="https://..." />
              </Field>

              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="text-sm font-medium">Добавление в корзину</div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Привяжите кейс к товару, чтобы кнопка «Добавить в корзину» реально добавляла его в общую корзину
                  и проходила обычную оплату. Без привязки кнопка по-прежнему откроет чат с поддержкой.
                </p>
                <Field label="Товар для корзины">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={editing.product_id ?? ''}
                    onChange={(e) => setEditing({ ...editing, product_id: e.target.value || null })}
                  >
                    <option value="">— не привязан (открывать чат с поддержкой) —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} · {p.price} ₽</option>
                    ))}
                  </select>
                </Field>
                <Field label="Товар с MiniApp-версией (необязательно — цена уже с наценкой)">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={editing.miniapp_product_id ?? ''}
                    onChange={(e) => setEditing({ ...editing, miniapp_product_id: e.target.value || null })}
                  >
                    <option value="">— без варианта с MiniApp —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} · {p.price} ₽</option>
                    ))}
                  </select>
                </Field>
                {editing.miniapp_product_id && (
                  <p className="text-xs text-muted-foreground">
                    Если выбрано, на сайте при добавлении в корзину появится галочка «Добавить MiniApp» — покупатель
                    сможет выбрать этот товар вместо обычного.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="text-sm font-medium">Показывать на сайте</div>
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Отмена</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
    {children}
  </div>
);

export default CasesTab;
