import { Zap, Shield, CheckCircle2, Clock, RefreshCcw, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useStorefrontPath } from '@/contexts/StorefrontContext';
import cryptobotLogo from '@/assets/cryptobot-logo.jpeg';

export const Delivery = () => {
  const buildPath = useStorefrontPath();

  return (
    <div className="container-main mx-auto px-4 py-6 sm:py-8 max-w-3xl">
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">Как работает доставка</h1>
        <p className="text-muted-foreground text-sm mt-2">Быстро, безопасно и автоматически</p>
      </div>
      <div className="space-y-4 sm:space-y-6">
        {[
          { icon: '1️⃣', title: 'Оформите заказ', desc: 'Выберите товары в каталоге, добавьте в корзину. Примените промокод или используйте средства баланса.' },
          { icon: '2️⃣', title: 'Оплатите через CryptoBot', desc: 'Оплата криптовалютой через CryptoBot прямо в Telegram. Также доступна оплата с внутреннего баланса — частичная или полная.' },
          { icon: '3️⃣', title: 'Мгновенная доставка', desc: 'Для товаров с автоматической доставкой данные доступа передаются сразу после подтверждения оплаты. Ручная доставка — от 1 до 24 часов.' },
          { icon: '4️⃣', title: 'Доступ в личном кабинете', desc: 'Данные товара (ключи, логин/пароль, инструкции) доступны в разделе «Мои заказы». Уведомление также приходит через Telegram-бота.' },
        ].map((step, i) => (
          <div key={i} className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-card border border-border/50 rounded-xl">
            <span className="text-xl sm:text-2xl shrink-0">{step.icon}</span>
            <div>
              <h3 className="font-display font-semibold text-sm sm:text-base">{step.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
        <span>Оплата через</span>
        <img src={cryptobotLogo} alt="CryptoBot" className="w-4 h-4 rounded-sm" />
        <span className="font-medium">CryptoBot</span>
      </div>
      <div className="text-center mt-4">
        <Link to={buildPath('/catalog')}><Button variant="hero" size="lg">Начать покупки</Button></Link>
      </div>
    </div>
  );
};

export const Guarantees = () => {
  const buildPath = useStorefrontPath();

  return (
    <div className="container-main mx-auto px-4 py-6 sm:py-8 max-w-3xl">
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">Наши гарантии</h1>
        <p className="text-muted-foreground text-sm mt-2">Защита покупателя на каждом этапе</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {[
          { icon: Shield, title: 'Защита покупателя', desc: 'Каждая покупка защищена. Если товар не соответствует описанию — бесплатная замена или возврат средств на баланс.' },
          { icon: CheckCircle2, title: 'Проверенные товары', desc: 'Все товары тестируются перед размещением. Мы гарантируем работоспособность на момент передачи.' },
          { icon: RefreshCcw, title: 'Бесплатная замена', desc: 'В течение гарантийного периода неисправный товар заменяется бесплатно. Обратитесь в поддержку с номером заказа.' },
          { icon: Headphones, title: 'Оперативная поддержка', desc: 'Поддержка через Telegram. Среднее время ответа — 5–30 минут. Решаем вопросы быстро.' },
          { icon: Clock, title: 'Гарантийный период', desc: 'У каждого товара свой гарантийный срок, указанный на странице. Претензии принимаются в течение этого периода.' },
          { icon: Zap, title: 'Мгновенная доставка', desc: 'Большинство товаров доставляется автоматически в течение минут после оплаты.' },
        ].map((g, i) => (
          <div key={i} className="p-4 sm:p-5 bg-card border border-border/50 rounded-xl">
            <g.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-2" />
            <h3 className="font-display font-semibold text-xs sm:text-sm">{g.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{g.desc}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-6 sm:mt-8">
        <Link to={buildPath('/catalog')}><Button variant="hero" size="lg">Покупайте с уверенностью</Button></Link>
      </div>
    </div>
  );
};
