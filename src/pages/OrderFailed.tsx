import { Link } from 'react-router-dom';
import { XCircle, MessageCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupportUsername } from '@/hooks/useSupportUsername';
import { useStorefrontPath } from '@/contexts/StorefrontContext';

const OrderFailed = () => {
  const { data: supportUsername } = useSupportUsername();
  const buildPath = useStorefrontPath();
  return (
    <div className="container-main mx-auto px-4 py-12 sm:py-16 text-center max-w-md">
      <div className="animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-destructive/20 text-destructive flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7" />
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-bold">Ошибка оплаты</h1>
        <p className="text-muted-foreground text-sm mt-2">Не удалось обработать платёж через CryptoBot. Попробуйте снова.</p>

        <div className="bg-card border border-border/50 rounded-xl p-4 mt-5 text-left space-y-1 text-xs text-muted-foreground">
          <p className="font-medium text-foreground text-sm mb-1">Возможные причины:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Инвойс истёк</li>
            <li>Недостаточно средств</li>
            <li>Ошибка сети</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 mt-5">
          <Link to={buildPath('/checkout')}><Button variant="hero" size="sm" className="w-full"><RefreshCcw className="w-4 h-4 mr-1" /> Попробовать снова</Button></Link>
          <a href={`https://t.me/${supportUsername}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full"><MessageCircle className="w-4 h-4 mr-1" /> Поддержка в Telegram</Button></a>
        </div>
      </div>
    </div>
  );
};

export default OrderFailed;
