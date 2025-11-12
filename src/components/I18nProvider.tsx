'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { getLocale, getTranslations, setLocale as setLocaleStorage } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/locales';
import type { Translations } from '@/lib/i18n/locales/en';

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // 使用 useSyncExternalStore 以避免在 effect 中同步 setState
  const subscribe = (onStoreChange: () => void) => {
    const handler = () => onStoreChange();
    // 监听自定义 localeChange 事件
    window.addEventListener('localeChange', handler as EventListener);
    return () =>
      window.removeEventListener('localeChange', handler as EventListener);
  };

  const getSnapshot = (): Locale => getLocale();
  // SSR 首屏固定为 'en'，与服务端输出保持一致，避免 Hydration Error
  const getServerSnapshot = (): Locale => 'en';

  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const translations: Translations = useMemo(
    () => getTranslations(locale),
    [locale]
  );

  const setLocale = (newLocale: Locale) => {
    // 更新本地存储并触发 localeChange 事件
    setLocaleStorage(newLocale);
  };

  return (
    <I18nContext.Provider value={{ locale, t: translations, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to use translations
 */
export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}
