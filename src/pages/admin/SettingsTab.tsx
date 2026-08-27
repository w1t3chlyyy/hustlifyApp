import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';

const KNOWN_KEYS: { key: string; label: string; hint?: string }[] = [
  { key: 'shop_name', label: 'Название магазина' },
  { key: 'marquee_text', label: 'Бегущая строка' },
  { key: 'welcome_text', label: 'Приветствие в боте' },
  { key: 'support_username', label: 'Поддержка (Telegram, без @)' },
  { key: 'faq_url', label: 'Ссылка на FAQ' },
  { key: 'policy_url', label: 'Ссылка на политику' },
  {
    key: 'op_channel_id',
    label: 'Обязательная подписка: ID/username канала',
    hint: 'Например @HustlifyChannel. Бот должен быть админом канала, иначе проверка не сработает. Оставьте пустым, чтобы отключить проверку.',
  },
  {
    key: 'op_channel_url',
    label: 'Обязательная подписка: ссылка на канал',
    hint: 'Публичная ссылка, которую увидит пользователь, например https://t.me/HustlifyChannel',
  },
];

const SettingsTab = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await adminApi.settings.list();
        const map: Record<string, string> = {};
        rows.forEach((r) => { map[r.key] = r.value; });
        setValues(map);
      } catch (e: any) {
        toast({ title: 'Не удалось загрузить настройки', description: e?.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (key: string) => {
    setSavingKey(key);
    try {
      await adminApi.settings.set(key, values[key] ?? '');
      toast({ title: 'Сохранено' });
    } catch (e: any) {
      toast({ title: 'Ошибка сохранения', description: e?.message, variant: 'destructive' });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 max-w-xl">
      <p className="text-sm text-muted-foreground">Общие параметры сайта и Telegram-бота. Каждое поле сохраняется отдельно.</p>
      <div className="space-y-2">
        {KNOWN_KEYS.map(({ key, label, hint }) => (
          <div key={key} className="rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-foreground/20">
            <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
              {label} <span className="font-normal text-muted-foreground/60">({key})</span>
            </label>
            <div className="flex gap-2">
              <Input value={values[key] ?? ''} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />
              <Button size="icon" onClick={() => save(key)} disabled={savingKey === key} className="shrink-0">
                {savingKey === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
            {hint && <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{hint}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsTab;
