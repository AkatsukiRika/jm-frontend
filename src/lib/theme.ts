export type Theme = 'light' | 'dark';

const THEME_KEY = 'app_theme';

/**
 * 获取系统偏好的主题
 */
function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * 获取当前主题
 */
export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  const saved = localStorage.getItem(THEME_KEY) as Theme | null;
  return saved || getSystemTheme();
}

/**
 * 保存主题设置
 */
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

/**
 * 应用主题到 DOM
 */
export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
}

/**
 * 初始化主题（在应用启动时调用）
 */
export function initTheme(): void {
  const theme = getTheme();
  applyTheme(theme);
}
