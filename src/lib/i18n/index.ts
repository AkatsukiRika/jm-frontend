import { locales, type Locale } from './locales';

const LOCALE_KEY = 'app_locale';

/**
 * 获取浏览器语言偏好
 */
function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') return 'en';

  const browserLang = navigator.language.toLowerCase();

  // 精确匹配
  if (browserLang === 'zh-cn' || browserLang === 'zh') return 'zh-CN';
  if (browserLang === 'zh-tw' || browserLang === 'zh-hk') return 'zh-TW';
  if (browserLang.startsWith('en')) return 'en';

  // 默认英语
  return 'en';
}

/**
 * 获取当前语言
 */
export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'en';

  const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
  return saved || getBrowserLocale();
}

/**
 * 设置语言
 */
export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(LOCALE_KEY, locale);

  // 触发自定义事件通知语言变化
  window.dispatchEvent(new CustomEvent('localeChange', { detail: locale }));
}

/**
 * 获取翻译文本
 */
export function getTranslations(locale: Locale) {
  return locales[locale] || locales.en;
}
