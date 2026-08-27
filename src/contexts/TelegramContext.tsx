import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  photoUrl?: string;
}

interface TelegramContextType {
  webApp: TelegramWebApp | null;
  user: TelegramUser | null;
  initData: string;
  isInTelegram: boolean;
  isReady: boolean;
  colorScheme: 'light' | 'dark';
  haptic: {
    impact: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notification: (type?: 'success' | 'error' | 'warning') => void;
    selection: () => void;
  };
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: string) => void) => void;
  close: () => void;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const profileEnsuredFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    const maxAttempts = 25;

    const hydrateTelegram = () => {
      if (cancelled) return;

      const tg = window.Telegram?.WebApp;
      if (tg) {
        try {
          tg.ready();
          tg.expand();
          tg.enableClosingConfirmation();
        } catch {}

        setWebApp(tg);

        const tgUser = tg.initDataUnsafe?.user;
        if (tgUser) {
          setUser({
            id: tgUser.id,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name,
            username: tgUser.username,
            languageCode: tgUser.language_code,
            isPremium: tgUser.is_premium,
            photoUrl: tgUser.photo_url,
          });
        }

        if (tg.initData || tgUser || attempts >= maxAttempts) {
          setIsReady(true);
          return;
        }
      }

      if (attempts >= maxAttempts) {
        setIsReady(true);
        return;
      }

      attempts += 1;
      timer = window.setTimeout(hydrateTelegram, 120);
    };

    hydrateTelegram();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  // Ensure the user gets a row in user_profiles as soon as the Mini App opens
  // with valid Telegram auth data — not only when they later visit Account or
  // Checkout. Fire-and-forget; server-side upsert is idempotent.
  useEffect(() => {
    const initData = webApp?.initData;
    if (!initData || profileEnsuredFor.current === initData) return;
    profileEnsuredFor.current = initData;
    supabase.functions
      .invoke('get-my-data', { body: { initData, action: 'profile' } })
      .catch(() => {
        // Non-fatal: if this fails, profile will still be created on next
        // visit to Account/Checkout. Don't block the UI on it.
        profileEnsuredFor.current = null;
      });
  }, [webApp?.initData]);

  const haptic = {
    impact: useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
      webApp?.HapticFeedback?.impactOccurred(style);
    }, [webApp]),
    notification: useCallback((type: 'success' | 'error' | 'warning' = 'success') => {
      webApp?.HapticFeedback?.notificationOccurred(type);
    }, [webApp]),
    selection: useCallback(() => {
      webApp?.HapticFeedback?.selectionChanged();
    }, [webApp]),
  };

  const openTelegramLink = useCallback((url: string) => {
    if (webApp) {
      webApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [webApp]);

  const openInvoice = useCallback((url: string, callback?: (status: string) => void) => {
    if (webApp) {
      webApp.openInvoice(url, callback);
    }
  }, [webApp]);

  const close = useCallback(() => {
    webApp?.close();
  }, [webApp]);

  return (
    <TelegramContext.Provider value={{
      webApp,
      user,
      initData: webApp?.initData || '',
      isInTelegram: !!webApp,
      isReady,
      colorScheme: webApp?.colorScheme || 'dark',
      haptic,
      openTelegramLink,
      openInvoice,
      close,
    }}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const ctx = useContext(TelegramContext);
  if (!ctx) throw new Error('useTelegram must be used within TelegramProvider');
  return ctx;
};
