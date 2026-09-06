import { useEffect, useState } from 'react';
import { Loader2, Plus, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';
import { useConfirm } from './components/ConfirmDialog';
import TabToolbar from './components/TabToolbar';
import ListRow, { RowThumb } from './components/ListRow';
import Pill from './components/Pill';
import EmptyState from './components/EmptyState';
import ImageUrlOrFileInput from './components/ImageUrlOrFileInput';

type GalleryItem = { url: string; link?: string; title?: string };

const emptyProduct = {
  id: undefined as string | undefined,
  title: '',
  subtitle: '',
  description: '',
  price: 0,
  old_price: null as number | null,
  stock: 0,
  image: '',
  guarantee: '',
  category_id: null as string | null,
  project_id: null as string | null,
  delivery_type: 'instant' as 'instant' | 'manual',
  delivery_min: 1,
  delivery_max: 24,
  delivery_unit: 'hours' as 'hours' | 'days',
  gallery: [] as GalleryItem[],
  external_link: '',
  is_active: true,
  is_featured: false,
  is_popular: false,
  is_new: false,
  hidden_from_catalog: false,
  sort_order: 0,
};

type ProductRow = typeof emptyProduct;
type RefRow = { id: string; name?: string; title?: string };

const normalizeGallery = (raw: unknown): GalleryItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => (typeof item === 'string' ? { url: item } : { url: item?.url ?? '', link: item?.link, title: item?.title }));
};

const openEditor = (p: ProductRow, set: (p: ProductRow) => void) => {
  set({ ...p, gallery: normalizeGallery((p as any).gallery) });
};

const ProductsTab = () => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<RefRow[]>([]);
  const [projects, setProjects] = useState<RefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const [prods, cats, projs] = await Promise.all([
        adminApi.products.list(),
        adminApi.categories.list(),
        adminApi.projects.list(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setProjects(projs);
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить товары', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast({ title: 'Укажите название товара', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.products.upsert(editing);
      toast({ title: 'Товар сохранён' });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка сохранения', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ description: 'Удалить товар безвозвратно?', confirmText: 'Удалить', destructive: true }))) return;
    try {
      await adminApi.products.remove(id);
      toast({ title: 'Товар удалён' });
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка удаления', description: e?.message, variant: 'destructive' });
    }
  };

  const addGalleryItem = () => {
    if (!editing) return;
    setEditing({ ...editing, gallery: [...editing.gallery, { url: '', link: '', title: '' }] });
  };

  const updateGalleryItem = (index: number, patch: Partial<GalleryItem>) => {
    if (!editing) return;
    const gallery = [...editing.gallery];
    gallery[index] = { ...gallery[index], ...patch };
    setEditing({ ...editing, gallery });
  };

  const removeGalleryItem = (index: number) => {
    if (!editing) return;
    setEditing({ ...editing, gallery: editing.gallery.filter((_, i) => i !== index) });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const filtered = products.filter((p) =>
    !search.trim() || p.title.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <TabToolbar
        description={`Все товары каталога (${products.length})`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Поиск по названию…"
        actionLabel="Новый товар"
        onAction={() => setEditing({ ...emptyProduct, sort_order: products.length })}
      />

      <div className="space-y-2">
        {filtered.map((p) => (
          <ListRow
            key={p.id}
            thumb={<RowThumb src={p.image} />}
            title={p.title}
            badges={!p.is_active && <Pill>скрыт</Pill>}
            meta={
              <>
                ${p.price} · остаток {p.stock}
                {p.category_id ? ` · ${categories.find((c) => c.id === p.category_id)?.name ?? p.category_id}` : ''}
                {p.project_id ? ` · ${projects.find((pr) => pr.id === p.project_id)?.title ?? p.project_id}` : ''}
              </>
            }
            onEdit={() => openEditor(p, setEditing)}
            onDelete={() => p.id && remove(p.id)}
          />
        ))}
        {filtered.length === 0 && (
          <EmptyState
            icon={Package}
            title={products.length === 0 ? 'Пока нет товаров' : 'Ничего не найдено'}
            hint={products.length === 0 ? 'Добавьте первый товар — он появится в каталоге на сайте.' : 'Попробуйте изменить поисковый запрос.'}
          />
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Редактировать товар' : 'Новый товар'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Field label="Название"><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="Подзаголовок"><Input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></Field>
              <Field label="Описание"><Textarea rows={4} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Цена, $"><Input type="number" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></Field>
                <Field label="Старая цена, $"><Input type="number" step="0.01" value={editing.old_price ?? ''} onChange={(e) => setEditing({ ...editing, old_price: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Остаток"><Input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} /></Field>
                <Field label="Гарантия"><Input value={editing.guarantee} onChange={(e) => setEditing({ ...editing, guarantee: e.target.value })} /></Field>
              </div>
              <Field label="Картинка">
                <ImageUrlOrFileInput
                  value={editing.image ?? ''}
                  onChange={(url) => setEditing({ ...editing, image: url })}
                  folder="products"
                  previewClassName="w-16 h-16"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Категория">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={editing.category_id ?? ''}
                    onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}
                  >
                    <option value="">— без категории —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Проект">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={editing.project_id ?? ''}
                    onChange={(e) => setEditing({ ...editing, project_id: e.target.value || null })}
                  >
                    <option value="">— без проекта —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Тип доставки">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.delivery_type}
                  onChange={(e) => setEditing({ ...editing, delivery_type: e.target.value as 'instant' | 'manual' })}
                >
                  <option value="instant">Мгновенная</option>
                  <option value="manual">Ручная обработка</option>
                </select>
              </Field>

              {editing.delivery_type === 'manual' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="От">
                    <Input type="number" min={0} value={editing.delivery_min} onChange={(e) => setEditing({ ...editing, delivery_min: Number(e.target.value) })} />
                  </Field>
                  <Field label="До">
                    <Input type="number" min={0} value={editing.delivery_max} onChange={(e) => setEditing({ ...editing, delivery_max: Number(e.target.value) })} />
                  </Field>
                  <Field label="Единицы">
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={editing.delivery_unit}
                      onChange={(e) => setEditing({ ...editing, delivery_unit: e.target.value as 'hours' | 'days' })}
                    >
                      <option value="hours">Часы</option>
                      <option value="days">Дни</option>
                    </select>
                  </Field>
                </div>
              )}

              <Field label="Ссылка на кнопку «Посмотреть примеры» (необязательно, если нет фото-галереи ниже)">
                <Input value={editing.external_link ?? ''} onChange={(e) => setEditing({ ...editing, external_link: e.target.value })} placeholder="https://..." />
              </Field>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">Примеры работ (галерея на странице товара)</label>
                  <Button type="button" size="sm" variant="outline" onClick={addGalleryItem}>
                    <Plus className="w-3.5 h-3.5" /> Добавить
                  </Button>
                </div>
                <div className="space-y-2">
                  {editing.gallery.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-2">
                      <div className="w-12 h-12 rounded-md bg-black overflow-hidden shrink-0">
                        {item.url && <img src={item.url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <ImageUrlOrFileInput
                          value={item.url}
                          onChange={(url) => updateGalleryItem(i, { url })}
                          folder="products/gallery"
                          placeholder="URL картинки или загрузите файл"
                          inputClassName="h-8 text-xs"
                          showPreview={false}
                        />
                        <Input
                          className="h-8 text-xs"
                          value={item.title ?? ''}
                          onChange={(e) => updateGalleryItem(i, { title: e.target.value })}
                          placeholder="Подпись (необязательно)"
                        />
                        <Input
                          className="h-8 text-xs"
                          value={item.link ?? ''}
                          onChange={(e) => updateGalleryItem(i, { link: e.target.value })}
                          placeholder="Ссылка при клике (необязательно)"
                        />
                      </div>
                      <Button size="icon" variant="ghost" className="shrink-0" onClick={() => removeGalleryItem(i)}>
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {editing.gallery.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                      Пока нет примеров. Добавьте фото — они появятся блоком «Примеры работ» на странице товара.
                    </div>
                  )}
                </div>
              </div>

              {([
                ['is_active', 'Показывать на сайте'],
                ['is_featured', 'Рекомендуемый'],
                ['is_popular', 'Популярный'],
                ['is_new', 'Новинка'],
                ['hidden_from_catalog', 'Скрыть из каталога и подборок (доступен только по прямой привязке, напр. из кейса)'],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="text-sm font-medium">{label}</div>
                  <Switch checked={(editing as any)[key]} onCheckedChange={(v) => setEditing({ ...editing, [key]: v })} />
                </div>
              ))}
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

export default ProductsTab;
