import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, HelpCircle, X, Sparkles, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useSiteSettings } from '@/hooks/useShop';
import { useCases, type DbCase } from '@/hooks/useCases';
import { useProducts } from '@/hooks/useProducts';
import { useStore } from '@/contexts/StoreContext';
import type { DbProduct } from '@/types/database';

const CaseCard = ({
  c,
  i,
  onOpen,
  onAddToCart,
  onAddMiniapp,
}: {
  c: DbCase;
  i: number;
  onOpen: () => void;
  onAddToCart: (e: React.MouseEvent) => void;
  onAddMiniapp: (e: React.MouseEvent) => void;
}) => {
  const isMiniappCta = !!c.miniapp_product_id && !!c.cta_text && c.cta_text !== 'Подробнее';
  const highlightStyle = c.highlight_enabled
    ? {
        boxShadow: `0 0 0 1px ${c.highlight_color}e6, 0 0 18px 2px ${c.highlight_color}8c, 0 0 42px 6px ${c.highlight_color}40`,
      }
    : undefined;
  const cardBgStyle = c.background_color ? { backgroundColor: c.background_color } : undefined;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06, duration: 0.4 }}
      className={`relative flex flex-col rounded-2xl overflow-hidden text-left w-full h-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        c.highlight_enabled ? 'animate-[neon-pulse_2.2s_ease-in-out_infinite]' : 'border border-border hover:border-primary/40'
      }`}
      style={{ willChange: c.highlight_enabled ? 'filter' : undefined, ...(c.highlight_enabled ? undefined : cardBgStyle) }}
    >
      <div className={c.highlight_enabled ? 'rounded-2xl p-[1.5px] h-full' : 'contents'} style={c.highlight_enabled ? { ...highlightStyle, backgroundColor: c.highlight_color } : undefined}>
        <div className="relative flex flex-col h-full rounded-[calc(1rem-1.5px)] overflow-hidden" style={cardBgStyle ?? { backgroundColor: 'hsl(var(--card))' }}>
          <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
            {c.image_url && (
              <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" loading="lazy" />
            )}

            {c.badge_type === 'hit' && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-orange-500 text-white text-[10px] font-bold rounded-full px-2.5 py-1">
                <Flame className="w-3 h-3" />
                {c.badge_text || 'Хит продаж'}
              </div>
            )}
            {c.badge_type === 'custom' && c.badge_text && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/10 backdrop-blur border border-white/30 text-white text-[10px] font-black uppercase tracking-wider rounded-full px-2.5 py-1">
                <Sparkles className="w-3 h-3" />
                {c.badge_text}
              </div>
            )}
            {c.spots_left !== null && c.spots_left !== undefined && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white text-black text-[10px] font-black uppercase tracking-wider rounded-full px-2.5 py-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-black opacity-60 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-black" />
                </span>
                Осталось {c.spots_left} мест
              </div>
            )}
          </div>
          <div className="p-4 flex flex-col flex-1 gap-2">
            <h3 className="font-display text-lg font-bold tracking-tight">{c.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{c.short_description}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold">{c.price.toLocaleString('ru')} ₽</span>
              {c.old_price ? (
                <span className="text-xs text-muted-foreground line-through">{c.old_price.toLocaleString('ru')} ₽</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={c.product_id ? (isMiniappCta ? onAddMiniapp : onAddToCart) : onOpen}
              className="mt-auto self-start flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-bold whitespace-nowrap hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              {c.product_id ? (isMiniappCta ? c.cta_text : 'Добавить') : (c.cta_text || 'Подробнее')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CasesSection = () => {
  const [openCase, setOpenCase] = useState<DbCase | null>(null);
  const { data: settings } = useSiteSettings();
  const { data: cases } = useCases();
  const { data: allProducts } = useProducts();
  const { addToCart } = useStore();
  const supportUser = (settings?.support_username || 'TeleStoreHelp').replace('@', '');
  const supportUrl = `https://t.me/${supportUser}`;

  const findProduct = (id: string | null): DbProduct | undefined =>
    id ? allProducts?.find((p) => p.id === id) : undefined;

  const addCaseProductToCart = (c: DbCase, useMiniapp: boolean) => {
    const product = findProduct(useMiniapp ? c.miniapp_product_id : c.product_id);
    if (!product) {
      toast.error('Товар для этого кейса ещё не привязан. Обратитесь в поддержку.');
      return;
    }
    const ok = addToCart(product);
    if (ok) toast.success(`«${product.title}» добавлен в корзину`);
  };

  // Base "Добавить" — adds the case's plain product straight to the cart.
  const handleAddToCart = (c: DbCase, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!c.product_id) {
      // Not linked to a real product yet — fall back to the "see details / message support" flow.
      setOpenCase(c);
      return;
    }
    setOpenCase(null);
    addCaseProductToCart(c, false);
  };

  // MiniApp upsell — adds the higher-priced MiniApp product straight to the cart (no Telegram redirect).
  const handleAddMiniappToCart = (c: DbCase, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!c.miniapp_product_id) return;
    setOpenCase(null);
    addCaseProductToCart(c, true);
  };

  useEffect(() => {
    if (!cases || cases.length === 0) return;
    const tgParam = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.start_param;
    const urlParam = new URLSearchParams(window.location.search).get('case');
    const raw = (tgParam || urlParam || '').toString().toLowerCase();
    if (!raw) return;
    const key = raw.startsWith('case_') ? raw.slice(5) : raw;
    const found = cases.find((c) => c.slug === key);
    if (found) {
      setOpenCase(found);
      requestAnimationFrame(() => {
        document.getElementById('cases')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [cases]);

  if (!cases || cases.length === 0) return null;

  const caseSupportUser = (openCase?.support_username || supportUser).replace('@', '');
  const purchaseHref = openCase?.external_link
    ? openCase.external_link
    : `https://t.me/${caseSupportUser}?text=${encodeURIComponent(
        `Здравствуйте! Хочу оформить кейс «${openCase?.title}» за ${openCase?.price} ₽. Подскажите, как оплатить?`,
      )}`;

  return (
    <section className="pt-8">
      <div className="container-main mx-auto max-w-2xl lg:max-w-6xl px-4">
        <h2 className="font-display text-2xl font-black tracking-tight mb-5 px-1">Наши кейсы</h2>
      </div>
      <div className="lg:hidden grid grid-cols-2 gap-3 px-4 pt-4 pb-8">
        {cases.map((c, i) => (
          <CaseCard key={c.id} c={c} i={i} onOpen={() => setOpenCase(c)} onAddToCart={(e) => handleAddToCart(c, e)} onAddMiniapp={(e) => handleAddMiniappToCart(c, e)} />
        ))}
      </div>
      <div className="hidden lg:grid container-main mx-auto max-w-6xl px-4 grid-cols-4 gap-6 pt-4 pb-4">
        {cases.map((c, i) => (
          <CaseCard key={c.id} c={c} i={i} onOpen={() => setOpenCase(c)} onAddToCart={(e) => handleAddToCart(c, e)} onAddMiniapp={(e) => handleAddMiniappToCart(c, e)} />
        ))}
      </div>

      <div className="container-main mx-auto max-w-2xl lg:max-w-6xl px-4 pb-8 -mt-4 lg:mt-0 flex justify-center">
        <a
          href="https://t.me/HustlifyCasesBot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black border border-border text-sm font-bold whitespace-nowrap hover:bg-white/80 transition-colors w-full sm:w-auto"
        >
          Смотреть работы
        </a>
      </div>

      <Dialog open={!!openCase} onOpenChange={(o) => !o && setOpenCase(null)}>
        <DialogContent className="p-0 border-0 outline-none ring-0 shadow-none bg-card overflow-hidden w-[calc(100vw-1rem)] sm:w-full max-w-3xl max-h-[92svh] sm:max-h-[88vh] [&>button.absolute]:hidden flex flex-col rounded-2xl [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
          {openCase && (
            <>
              <div className="absolute right-3 top-3 z-30">
                <DialogClose
                  aria-label="Закрыть"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/80 backdrop-blur border border-white/30 text-white hover:bg-black transition-colors focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
                >
                  <X className="h-5 w-5" strokeWidth={2.5} />
                </DialogClose>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 md:overflow-y-auto">
                <div className="relative aspect-[16/10] md:aspect-square bg-black shrink-0 overflow-hidden">
                  {openCase.image_url && (
                    <img src={openCase.image_url} alt={openCase.title} className="w-full h-full object-cover" />
                  )}
                  <div className="md:hidden absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card via-card/70 to-transparent" />
                  {openCase.spots_left !== null && openCase.spots_left !== undefined && (
                    <div className="md:hidden absolute top-3 left-3 flex items-center gap-1.5 bg-white text-black text-[10px] font-black uppercase tracking-wider rounded-full px-2.5 py-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-black opacity-60 animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-black" />
                      </span>
                      Осталось {openCase.spots_left} мест
                    </div>
                  )}
                </div>

                <div className="relative flex flex-col bg-card min-h-0">
                  <div className="flex-1 overflow-y-auto p-5 sm:p-8 flex flex-col gap-3 sm:gap-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-8">
                    {openCase.spots_left !== null && openCase.spots_left !== undefined && (
                      <div className="hidden md:flex self-start items-center gap-1.5 bg-white text-black text-[10px] font-black uppercase tracking-wider rounded-full px-2.5 py-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-black opacity-60 animate-ping" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-black" />
                        </span>
                        Осталось {openCase.spots_left} мест
                      </div>
                    )}

                    <h3 className="font-display text-xl sm:text-2xl font-black leading-tight pr-10">
                      {openCase.title}
                    </h3>

                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <span className="text-2xl sm:text-xl font-black sm:font-bold">
                        {openCase.price.toLocaleString('ru')} ₽
                      </span>
                      {openCase.old_price ? (
                        <span className="text-sm text-muted-foreground line-through">
                          {openCase.old_price.toLocaleString('ru')} ₽
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {openCase.full_description}
                    </p>

                    <div className="mt-auto pt-4 border-t border-border/60">
                      <p className="text-xs text-muted-foreground flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                        <span>
                          Что-то непонятно по кейсу?{' '}
                          <a
                            href={supportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-medium hover:underline"
                          >
                            Напишите в поддержку
                          </a>{' '}
                          — поможем разобраться.
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="md:hidden absolute inset-x-0 bottom-0 px-4 pt-3 bg-gradient-to-t from-card via-card to-card/95 border-t border-border/60 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex gap-2">
                    {openCase.product_id && (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(openCase)}
                        className="flex items-center justify-center gap-2 flex-1 text-center px-4 py-3.5 rounded-xl bg-foreground text-background text-base font-extrabold whitespace-nowrap active:scale-[0.98] transition-transform"
                      >
                        <ShoppingCart className="w-4 h-4 shrink-0" />
                        Добавить
                      </button>
                    )}
                    {openCase.miniapp_product_id ? (
                      <button
                        type="button"
                        onClick={() => handleAddMiniappToCart(openCase)}
                        className="flex items-center justify-center text-center flex-1 px-4 py-3.5 rounded-xl bg-secondary text-foreground border border-border text-base font-extrabold whitespace-nowrap active:scale-[0.98] transition-transform"
                      >
                        {openCase.cta_text || 'MiniApp'}
                      </button>
                    ) : (
                      <a
                        href={purchaseHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center text-center px-4 py-3.5 rounded-xl text-base font-extrabold whitespace-nowrap active:scale-[0.98] transition-transform ${
                          openCase.product_id ? 'flex-1 bg-secondary text-foreground border border-border' : 'w-full bg-foreground text-background'
                        }`}
                      >
                        {openCase.cta_text || 'Подробнее'}
                      </a>
                    )}
                  </div>

                  <div className="hidden md:flex px-8 pb-8 gap-3">
                    {openCase.product_id && (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(openCase)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-foreground text-background text-base font-extrabold whitespace-nowrap hover:opacity-90 transition-opacity"
                      >
                        <ShoppingCart className="w-4 h-4 shrink-0" />
                        Добавить
                      </button>
                    )}
                    {openCase.miniapp_product_id ? (
                      <button
                        type="button"
                        onClick={() => handleAddMiniappToCart(openCase)}
                        className="inline-flex items-center px-6 py-3 rounded-lg text-base font-extrabold whitespace-nowrap bg-secondary text-foreground border border-border hover:bg-secondary/80 transition-colors"
                      >
                        {openCase.cta_text || 'MiniApp'}
                      </button>
                    ) : (
                      <a
                        href={purchaseHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center px-6 py-3 rounded-lg text-base font-extrabold whitespace-nowrap transition-colors ${
                          openCase.product_id ? 'bg-secondary text-foreground border border-border hover:bg-secondary/80' : 'bg-foreground text-background hover:opacity-90'
                        }`}
                      >
                        {openCase.cta_text || 'Подробнее'}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </section>
  );
};

export default CasesSection;
