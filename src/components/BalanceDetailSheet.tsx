import { Wallet, Copy, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { DbBalanceHistory } from '@/types/database';
import { toast } from 'sonner';

interface Props {
  entry: DbBalanceHistory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BalanceDetailSheet = ({ entry, open, onOpenChange }: Props) => {
  if (!entry) return null;

  const isCredit = entry.type === 'credit';
  const amount = Number(entry.amount);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            {isCredit ? (
              <ArrowDownCircle className="w-4 h-4 text-primary" />
            ) : (
              <ArrowUpCircle className="w-4 h-4 text-destructive" />
            )}
            {isCredit ? 'Пополнение' : 'Списание'}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* ID */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(entry.id);
              toast.success('Скопировано');
            }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            ID: {entry.id.slice(0, 8)}…
            <Copy className="w-3 h-3" />
          </button>

          {/* Amount */}
          <div className={`text-2xl font-display font-bold ${isCredit ? 'text-primary' : 'text-destructive'}`}>
            {isCredit ? '+' : '−'}${Math.abs(amount).toFixed(2)}
          </div>

          {/* Date */}
          <div className="text-[11px] text-muted-foreground">
            <div className="text-[10px] opacity-60">Дата и время</div>
            {new Date(entry.created_at).toLocaleString('ru-RU')}
          </div>

          <Separator />

          {/* Type badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Тип</span>
            <Badge variant={isCredit ? 'default' : 'destructive'} className="text-[10px]">
              {isCredit ? 'Зачисление' : 'Списание'}
            </Badge>
          </div>

          {/* Balance after */}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Баланс после</span>
            <span className="font-bold">${Number(entry.balance_after).toFixed(2)}</span>
          </div>

          {/* Comment */}
          {entry.comment && (
            <>
              <Separator />
              <div className="text-[11px] text-muted-foreground">
                <div className="text-[10px] opacity-60 mb-0.5">Комментарий</div>
                {entry.comment}
              </div>
            </>
          )}
        </div>

        <div className="p-4 pt-2">
          <DrawerClose asChild>
            <Button variant="outline" size="sm" className="w-full">Закрыть</Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default BalanceDetailSheet;
