import { useState } from 'react';
import {
  LayoutGrid, Package, FolderTree, Boxes, Sparkles, Star, Settings, LogOut, ShieldCheck,
  Users, ShoppingCart, Ticket, Warehouse, UserCog, ScrollText, BarChart3,
} from 'lucide-react';
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter,
  SidebarTrigger, SidebarInset, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/adminApi';
import { ConfirmProvider } from './components/ConfirmDialog';
import DashboardTab from './DashboardTab';
import ProductsTab from './ProductsTab';
import CategoriesTab from './CategoriesTab';
import ProjectsTab from './ProjectsTab';
import CasesTab from './CasesTab';
import ReviewsTab from './ReviewsTab';
import SettingsTab from './SettingsTab';
import UsersTab from './UsersTab';
import OrdersTab from './OrdersTab';
import PromocodesTab from './PromocodesTab';
import InventoryTab from './InventoryTab';
import ModeratorsTab from './ModeratorsTab';
import LogsTab from './LogsTab';
import StatsTab from './StatsTab';

type Section =
  | 'dashboard' | 'products' | 'categories' | 'projects' | 'cases' | 'reviews' | 'settings'
  | 'users' | 'orders' | 'promocodes' | 'inventory' | 'moderators' | 'logs' | 'stats';

const NAV: { key: Section; label: string; icon: typeof Package; description: string }[] = [
  { key: 'dashboard', label: 'Обзор', icon: LayoutGrid, description: 'Общее состояние каталога и магазина' },
  { key: 'stats', label: 'Статистика', icon: BarChart3, description: 'Выручка, топ товаров и покупателей, динамика по дням' },
  { key: 'orders', label: 'Заказы', icon: ShoppingCart, description: 'Все заказы: статусы, оплата, возвраты, связь с покупателем' },
  { key: 'users', label: 'Пользователи', icon: Users, description: 'Все пользователи бота: баланс, блокировка, заметки' },
  { key: 'products', label: 'Товары', icon: Package, description: 'Каталог товаров, цены, остатки, доставка' },
  { key: 'inventory', label: 'Склад', icon: Warehouse, description: 'Остатки товаров по позициям' },
  { key: 'promocodes', label: 'Промокоды', icon: Ticket, description: 'Скидочные промокоды' },
  { key: 'categories', label: 'Категории', icon: FolderTree, description: 'Разделы каталога и подкатегории' },
  { key: 'projects', label: 'Проекты', icon: Boxes, description: 'Направления, к которым привязаны категории и товары' },
  { key: 'cases', label: 'Кейсы', icon: Sparkles, description: 'Карточки в разделе «Наши кейсы» на главной' },
  { key: 'reviews', label: 'Отзывы', icon: Star, description: 'Модерация отзывов покупателей' },
  { key: 'moderators', label: 'Модераторы', icon: UserCog, description: 'Доступ к веб-админке для модераторов' },
  { key: 'logs', label: 'Логи', icon: ScrollText, description: 'Журнал действий администраторов и операций с балансом' },
  { key: 'settings', label: 'Настройки', icon: Settings, description: 'Общие параметры сайта и бота' },
];

const AdminShell = ({ onLogout }: { onLogout: () => void }) => {
  const [section, setSection] = useState<Section>('dashboard');
  const active = NAV.find((item) => item.key === section) ?? NAV[0];

  return (
    <ConfirmProvider>
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-3 py-3.5">
            <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <div className="font-display font-bold text-sm leading-tight truncate">Hustlify Admin</div>
                <div className="text-[11px] text-sidebar-foreground/50 leading-tight">Панель управления</div>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <NavButton
                        isActive={section === item.key}
                        label={item.label}
                        icon={item.icon}
                        onSelect={() => setSection(item.key)}
                      />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="px-3 py-3 border-t border-sidebar-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center text-muted-foreground hover:text-destructive"
              onClick={() => { adminApi.logout(); onLogout(); }}
            >
              <LogOut className="w-4 h-4" />
              <span className="group-data-[collapsible=icon]:hidden">Выйти</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="border-b border-border sticky top-0 bg-background/85 backdrop-blur z-10">
            <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
              <SidebarTrigger />
              <div className="min-w-0">
                <h1 className="font-display text-base font-bold leading-tight truncate">{active.label}</h1>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">{active.description}</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
            {section === 'dashboard' && <DashboardTab onNavigate={(s) => setSection(s)} />}
            {section === 'stats' && <StatsTab />}
            {section === 'orders' && <OrdersTab />}
            {section === 'users' && <UsersTab />}
            {section === 'products' && <ProductsTab />}
            {section === 'inventory' && <InventoryTab />}
            {section === 'promocodes' && <PromocodesTab />}
            {section === 'categories' && <CategoriesTab />}
            {section === 'projects' && <ProjectsTab />}
            {section === 'cases' && <CasesTab />}
            {section === 'reviews' && <ReviewsTab />}
            {section === 'moderators' && <ModeratorsTab />}
            {section === 'logs' && <LogsTab />}
            {section === 'settings' && <SettingsTab />}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ConfirmProvider>
  );
};

// Closes the mobile sidebar sheet automatically after picking a section,
// so the admin doesn't have to swipe/tap it away manually on a phone.
const NavButton = ({
  isActive, label, icon: Icon, onSelect,
}: { isActive: boolean; label: string; icon: typeof Package; onSelect: () => void }) => {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenuButton
      isActive={isActive}
      tooltip={label}
      onClick={() => {
        onSelect();
        if (isMobile) setOpenMobile(false);
      }}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </SidebarMenuButton>
  );
};

export default AdminShell;
