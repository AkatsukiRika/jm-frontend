import { en } from './en';
import { zhCN } from './zh-CN';
import { zhTW } from './zh-TW';

export type Locale = 'en' | 'zh-CN' | 'zh-TW';

export const locales: Record<Locale, typeof en> = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

export const localeNames: Record<Locale, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
};
