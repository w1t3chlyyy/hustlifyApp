import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';
import { useConfirm } from './components/ConfirmDialog';
import ListRow from './components/ListRow';
import Pill from './components/Pill';
import EmptyState from './components/EmptyState';

const ModeratorsTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newId, setNewId] = useState('');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ password: string; delivered: boolean } | null>(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try { setRows(await adminApi.moderators.list()); }
    catch (e: any) { toast({ title: 'Не удалось загрузить модераторов', description: e?.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!/^\d{5,}$/.test(newId.trim())) { toast({ title: 'Введите Telegram ID (число)', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const r = await adminApi.moderators.add(Number(newId.trim()));
      setIssued({ password: r.password, delivered: r.delivered });
      setNewId('');
      await load();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  const resetPassword = async (telegramId: number) => {
    setBusy(true);
    try {
      const r = await adminApi.moderators.resetPassword(telegramId);
      setIssued({ password: r.password, delivered: r.delivered });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  const toggle = async (telegramId: number) => {
    try {
      await adminApi.moderators.toggle(telegramId);
      setRows((r) => r.map((m) => (m.telegram_id === telegramId ? { ...m, is_active: !m.is_active } : m)));
    } catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };
  const remove = async (telegramId: number) => {
    if (!(await confirm({ description: 'Удалить модератора? Он потеряет доступ к веб-админке.', confirmText: 'Удалить', destructive: true }))) return;
    try { await adminApi.moderators.remove(telegramId); setRows((r) => r.filter((m) => m.telegram_id !== telegramId)); }
    catch (e: any) { toast({ title: 'Ошибка удаления', description: e?.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <p className="text-sm text-muted-foreground">Люди с доступом в веб-админку по собственному паролю.</p>
        <Button size="sm" onClick={() => setAddOpen(true)}>Добавить</Button>
      </div>

      <div className="space-y-2">
        {rows.map((m) => (
          <ListRow
            key={m.telegram_id}
            title={m.username ? `@${m.username}` : String(m.telegram_id)}
            badges={<Pill tone={m.is_active ? 'success' : 'default'}>{m.is_active ? 'активен' : 'отключен'}</Pill>}
            meta={`ID ${m.telegram_id} · добавлен ${new Date(m.created_at).toLocaleDateString('ru-RU')}`}
            onEdit={() => toggle(m.telegram_id)}
            onDelete={() => remove(m.telegram_id)}
          />
        ))}
        {rows.length === 0 && <EmptyState icon={ShieldCheck} title="Модераторов нет" hint="Добавьте по Telegram ID." />}
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rows.map((m) => (
            <Button key={m.telegram_id} size="sm" variant="ghost" onClick={() => resetPassword(m.telegram_id)} disabled={busy}>
              <KeyRound className="w-3.5 h-3.5" /> Новый пароль для {m.username ? `@${m.username}` : m.telegram_id}
            </Button>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setNewId(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Новый модератор</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="text-xs text-muted-foreground">Telegram ID человека (узнать можно у @userinfobot).</div>
            <Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="Например, 5119044165" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button onClick={async () => { await add(); setAddOpen(false); }} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!issued} onOpenChange={(o) => !o && setIssued(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Пароль выдан</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="rounded-lg border border-border p-3 font-mono text-center text-base">{issued?.password}</div>
            <p className="text-xs text-muted-foreground">
              {issued?.delivered
                ? 'Пароль также отправлен человеку в Telegram.'
                : 'Не удалось написать в Telegram (бот мог быть не запущен) — передайте пароль вручную.'}
            </p>
          </div>
          <DialogFooter><Button onClick={() => setIssued(null)}>Готово</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModeratorsTab;
