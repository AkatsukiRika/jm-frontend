'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  // 使用惰性初始化函数来初始化状态，避免在 effect 中同步调用 setState
  const [locale, setLocaleState] = useState<Locale>(() => getLocale());
  const [translations, setTranslations] = useState<Translations>(() =>
    getTranslations(getLocale())
  );

  useEffect(() => {
    // 监听语言变化事件
    const handleLocaleChange = (event: CustomEvent<Locale>) => {
      setLocaleState(event.detail);
      setTranslations(getTranslations(event.detail));
    };

    window.addEventListener(
      'localeChange',
      handleLocaleChange as EventListener
    );

    return () => {
      window.removeEventListener(
        'localeChange',
        handleLocaleChange as EventListener
      );
    };
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleStorage(newLocale);
    setLocaleState(newLocale);
    setTranslations(getTranslations(newLocale));
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
