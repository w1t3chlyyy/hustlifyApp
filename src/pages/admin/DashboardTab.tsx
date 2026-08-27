import { useEffect, useState } from 'react';
import { Loader2, Package, FolderTree, Boxes, Sparkles, Star, Users, ShoppingCart } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import StatCard from './components/StatCard';
import { toast } from '@/hooks/use-toast';

type Section =
  | 'products' | 'categories' | 'projects' | 'cases' | 'reviews' | 'settings'
  | 'users' | 'orders' | 'promocodes' | 'inventory' | 'moderators' | 'logs' | 'stats';

const DashboardTab = ({ onNavigate }: { onNavigate: (section: Section) => void }) => {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    products: 0, activeProducts: 0, categories: 0, projects: 0, cases: 0, pendingReviews: 0,
    users: 0, newOrders: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [products, categories, projects, cases, reviews, users, newOrders] = await Promise.all([
          adminApi.products.list(),
          adminApi.categories.list(),
          adminApi.projects.list(),
          adminApi.cases.list(),
          adminApi.reviews.list().catch(() => []),
          adminApi.users.list(0, 1).catch(() => ({ total: 0 })),
          adminApi.orders.list('new', 0, 1).catch(() => ({ total: 0 })),
        ]);
        if (cancelled) return;
        setCounts({
          products: products.length,
          activeProducts: products.filter((p: any) => p.is_active).length,
          categories: categories.length,
          projects: projects.length,
          cases: cases.length,
          pendingReviews: reviews.filter((r: any) => (r.moderation_status || (r.verified ? 'approved' : 'pending')) === 'pending').length,
          users: (users as any).total ?? 0,
          newOrders: (newOrders as any).total ?? 0,
        });
      } catch (e: any) {
        toast({ title: 'Не удалось загрузить сводку', description: e?.message, variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Обзор</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Общее состояние каталога и магазина</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={ShoppingCart}
          label="Новых заказов"
          value={counts.newOrders}
          hint={counts.newOrders > 0 ? 'Ждут обработки' : undefined}
          tone={counts.newOrders > 0 ? 'warning' : 'default'}
          onClick={() => onNavigate('orders')}
        />
        <StatCard
          icon={Users}
          label="Пользователей"
          value={counts.users}
          onClick={() => onNavigate('users')}
        />
        <StatCard
          icon={Package}
          label="Товаров в каталоге"
          value={counts.products}
          hint={`${counts.activeProducts} видны на сайте`}
          onClick={() => onNavigate('products')}
        />
        <StatCard
          icon={FolderTree}
          label="Категорий"
          value={counts.categories}
          onClick={() => onNavigate('categories')}
        />
        <StatCard
          icon={Boxes}
          label="Проектов"
          value={counts.projects}
          onClick={() => onNavigate('projects')}
        />
        <StatCard
          icon={Sparkles}
          label="Кейсов на главной"
          value={counts.cases}
          onClick={() => onNavigate('cases')}
        />
        <StatCard
          icon={Star}
          label="Отзывы на модерации"
          value={counts.pendingReviews}
          hint={counts.pendingReviews > 0 ? 'Требуют внимания' : undefined}
          tone={counts.pendingReviews > 0 ? 'warning' : 'default'}
          onClick={() => onNavigate('reviews')}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-semibold text-sm">Статистика продаж и логи</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Полная статистика (выручка, топ товаров и покупателей, динамика по дням) — в разделе «Статистика».
          Журнал действий администраторов и операций с балансом — в разделе «Логи», оба обновляются в реальном времени.
        </p>
      </div>
    </div>
  );
};

export default DashboardTab;
