import { useEffect, useState } from 'react';
import { Loader2, FolderTree } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';
import { useConfirm } from './components/ConfirmDialog';
import TabToolbar from './components/TabToolbar';
import ListRow, { RowThumb } from './components/ListRow';
import Pill from './components/Pill';
import EmptyState from './components/EmptyState';

const emptyCategory = {
  id: '',
  name: '',
  description: '',
  icon: '⚡',
  slug: '',
  project_id: null as string | null,
  parent_id: null as string | null,
  is_active: true,
  sort_order: 0,
};

type CategoryRow = typeof emptyCategory;
type ProjectRow = { id: string; title: string };

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/(^-|-$)/g, '');

const CategoriesTab = () => {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const [cats, projs] = await Promise.all([adminApi.categories.list(), adminApi.projects.list()]);
      setCategories(cats);
      setProjects(projs);
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить категории', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast({ title: 'Укажите название категории', variant: 'destructive' });
      return;
    }
    const id = editing.id || slugify(editing.name);
    if (!id) {
      toast({ title: 'Не удалось сформировать ID категории, укажите его вручную', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.categories.upsert({ ...editing, id, slug: editing.slug || id });
      toast({ title: 'Категория сохранена' });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка сохранения', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ description: 'Удалить категорию безвозвратно?', confirmText: 'Удалить', destructive: true }))) return;
    try {
      await adminApi.categories.remove(id);
      toast({ title: 'Категория удалена' });
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка удаления', description: e?.message, variant: 'destructive' });
    }
  };

  const projectTitle = (id: string | null) => projects.find((p) => p.id === id)?.title;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const filtered = categories.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <TabToolbar
        description={`Категории каталога (${categories.length})`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Поиск по названию…"
        actionLabel="Новая категория"
        onAction={() => { setIsNew(true); setEditing({ ...emptyCategory, sort_order: categories.length }); }}
      />

      <div className="space-y-2">
        {filtered.map((c) => (
          <ListRow
            key={c.id}
            thumb={<RowThumb icon={<span>{c.icon}</span>} />}
            title={c.name}
            badges={!c.is_active && <Pill>скрыта</Pill>}
            meta={`${c.id}${c.project_id ? ` · проект: ${projectTitle(c.project_id) ?? c.project_id}` : ' · без проекта'}`}
            onEdit={() => { setIsNew(false); setEditing(c); }}
            onDelete={() => remove(c.id)}
          />
        ))}
        {filtered.length === 0 && (
          <EmptyState
            icon={FolderTree}
            title={categories.length === 0 ? 'Пока нет ни одной категории' : 'Ничего не найдено'}
            hint={categories.length === 0 ? 'Создайте первую категорию, чтобы разложить товары по разделам.' : 'Попробуйте изменить поисковый запрос.'}
          />
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{!isNew ? 'Редактировать категорию' : 'Новая категория'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Field label="Название"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              {isNew && (
                <Field label="ID (латиницей; пусто — сформируется из названия)">
                  <Input value={editing.id} onChange={(e) => setEditing({ ...editing, id: slugify(e.target.value) })} placeholder="emoji" />
                </Field>
              )}
              <Field label="Описание"><Textarea rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>

              <Field label="Проект (к какому проекту относится категория)">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.project_id ?? ''}
                  onChange={(e) => setEditing({ ...editing, project_id: e.target.value || null })}
                >
                  <option value="">— без проекта —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </Field>

              <Field label="Родительская категория (для подкатегорий)">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.parent_id ?? ''}
                  onChange={(e) => setEditing({ ...editing, parent_id: e.target.value || null })}
                >
                  <option value="">— нет, это корневая категория —</option>
                  {categories.filter((c) => c.id !== editing.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Иконка (эмодзи)"><Input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} /></Field>
                <Field label="Порядок сортировки"><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
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

export default CategoriesTab;
